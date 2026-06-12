// ====== Boti Bot 🤖 — backend mínimo ======
// Sirve la app estática y expone /api/ask (Claude) y /api/tts (ElevenLabs).
// Las claves viven SOLO aquí (.env), nunca en el frontend.
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import selfsigned from 'selfsigned';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8342;           // HTTPS (PC y celular por la LAN)
const HTTP_PORT = process.env.HTTP_PORT || 8343; // HTTP solo 127.0.0.1 (curl/pruebas)

const LLM_KEY = process.env.ANTHROPIC_API_KEY || '';
const TTS_KEY = process.env.ELEVENLABS_API_KEY || '';
// Voz cálida multilingüe de ElevenLabs (se puede cambiar en .env)
const TTS_VOICE = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

const anthropic = LLM_KEY ? new Anthropic({ apiKey: LLM_KEY }) : null;

// Auto-degradación de TTS: si ElevenLabs devuelve 401/403 (p. ej. la clave
// existe pero le falta el permiso text_to_speech), se desactiva para toda la
// sesión y /api/health pasa a reportar tts:false → el frontend deja de
// intentarlo y usa la voz del navegador.
let ttsDead = false;

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(express.static(ROOT));

// ---------- Guardarraíles ----------
// Filtro de entrada: si la pregunta toca temas prohibidos, NI SIQUIERA
// llamamos al LLM — respuesta enlatada amable.
const BLOCKED_INPUT = [
  /\b(matar|muerte|morir|sangre|pistola|arma|cuchillo|pelea|golpear|guerra)\b/i,
  /\b(direcci[oó]n|tel[eé]fono|contrase[ñn]a|d[oó]nde viv|colegio|escuela donde)\b/i,
  /\b(droga|alcohol|cigarr|fumar|veneno|qu[ií]mico)\b/i,
  /\b(youtube|tiktok|instagram|video de|p[aá]gina web|link|enlace)\b/i,
  /\b(novio|novia|beso|desnud|cuerpo humano|hacer beb[eé]s)\b/i,
];

function buildSystemPrompt(name, age) {
  const safeName = String(name || 'amiguito').slice(0, 24).replace(/[^\p{L}\p{N} ]/gu, '');
  const safeAge = Math.min(Math.max(parseInt(age, 10) || 5, 3), 6);
  return `Eres Boti Bot 🤖, el amigo intergaláctico de ${safeName}, que tiene ${safeAge} años.

REGLAS ESTRICTAS (no negociables):
- SOLO respondes sobre el universo: espacio, planetas, estrellas, la Luna, el Sol, astronautas, cohetes, cometas, galaxias.
- Respuestas de 1 a 3 frases CORTAS, en español muy simple para un niño de ${safeAge} años. Tono alegre y cariñoso.
- Usa comparaciones de la vida del niño: manzanas, pelotas, casas, juguetes, helados.
- Si preguntan algo FUERA del espacio: responde exactamente "¡Yo solo sé de estrellas y planetas, ${safeName}! ¿Me preguntas algo del espacio?" y nada más.
- NUNCA contenido aterrador: los agujeros negros son "aspiradoras gigantes del espacio que viven lejísimos", nunca algo que destruye o da miedo.
- NUNCA pidas ni repitas datos personales (dirección, escuela, teléfono).
- NUNCA des instrucciones de hacer cosas peligrosas, ni menciones enlaces, marcas, apps o videos.
- Si no sabes la respuesta: "¡Esa es una pregunta súper difícil! ¡Preguntemos a un astrónomo!".
- Puedes usar 1 o 2 emojis del espacio (🚀🌙⭐🪐) por respuesta.
- Responde SOLO en texto plano: NUNCA uses markdown ni asteriscos (*texto*) ni guiones bajos (_texto_) para dar énfasis. Tu respuesta se lee en voz alta tal cual.`;
}

const CANNED = {
  blocked: (name) => `¡Yo solo sé de estrellas y planetas, ${name || 'amiguito'}! ¿Me preguntas algo del espacio? 🚀`,
  rateLimit: '¡Uf, cuántas preguntas! Mi batería necesita un descansito. Pregúntame de nuevo en un ratito. 🤖🔋',
  error: '¡Ay! Mis circuitos se enredaron un poquito. ¿Me lo preguntas otra vez? 🤖',
};

// ---------- Rate limit casero: 10 req/minuto por IP y por CUBETA ----------
// /api/ask y /api/log usan cubetas SEPARADAS: los beacons de depuración jamás
// deben gastarle las preguntas al niño (el cliente además se autolimita a 5).
const hits = new Map();
function rateLimited(ip, bucket = 'ask') {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (list.length >= 10) return true;
  list.push(now);
  hits.set(key, list);
  if (hits.size > 1000) hits.clear();   // higiene de memoria
  return false;
}

// ---------- Rutas ----------
app.get('/api/health', (_req, res) => {
  res.json({ llm: !!anthropic, tts: !!TTS_KEY && !ttsDead });
});

app.post('/api/ask', async (req, res) => {
  const t0 = Date.now();
  const { question, name, age } = req.body ?? {};
  const cleanName = String(name || '').slice(0, 24);

  if (!question || typeof question !== 'string' || question.length > 300) {
    return res.status(400).json({ ok: false, text: CANNED.error });
  }
  if (rateLimited(req.ip)) {
    return res.status(429).json({ ok: false, text: CANNED.rateLimit });
  }
  // Filtro de entrada: temas prohibidos → respuesta enlatada, sin LLM
  if (BLOCKED_INPUT.some((re) => re.test(question))) {
    console.log('[ask] guard', `${Date.now() - t0}ms`);
    return res.json({ ok: true, text: CANNED.blocked(cleanName), source: 'guard' });
  }
  // Sin clave: el frontend usa su banco local (responder con gracia, nunca 500)
  if (!anthropic) {
    console.log('[ask] no-llm', `${Date.now() - t0}ms`);
    return res.json({ ok: false, reason: 'no-llm' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,                       // respuestas cortas = control de costo
      system: buildSystemPrompt(cleanName, age),
      messages: [{ role: 'user', content: question.slice(0, 300) }],
    });
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    // Log de éxito (no solo de error): en Render es la única pista de que
    // el pipeline completo respondió, aunque en el aparato no se oiga nada.
    console.log('[ask] llm', `${Date.now() - t0}ms`);
    res.json({ ok: true, text: text || CANNED.error, source: 'llm' });
  } catch (err) {
    console.error('[ask]', err.status ?? '', err.message);
    res.status(200).json({ ok: false, reason: 'llm-error', text: CANNED.error });
  }
});

// Los errores de TTS se devuelven como 200 + JSON {ok:false, reason} a
// propósito: una respuesta HTTP de error genera "Failed to load resource" en
// la consola del navegador en cada frase de Boti. El frontend distingue
// audio real de error por el Content-Type.
app.post('/api/tts', async (req, res) => {
  const t0 = Date.now();
  if (!TTS_KEY) return res.json({ ok: false, reason: 'no-tts' });
  if (ttsDead) return res.json({ ok: false, reason: 'tts-disabled' });
  const text = String(req.body?.text || '').slice(0, 500);
  if (!text) return res.json({ ok: false, reason: 'empty' });

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE}?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': TTS_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.55, similarity_boost: 0.7, style: 0.35 },
        }),
      }
    );
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('[tts]', r.status, detail.slice(0, 300));
      const isPermission = r.status === 401 || r.status === 403;
      if (isPermission) {
        ttsDead = true;
        console.error(
          '[tts] ⚠️ Clave de ElevenLabs rechazada (¿falta el permiso "text_to_speech"?). ' +
          'Voz de ElevenLabs DESACTIVADA para esta sesión; Boti usará la voz del ' +
          'navegador. /api/health ya reporta tts:false.'
        );
      }
      return res.json({
        ok: false,
        reason: isPermission ? 'permission' : 'upstream',
        status: r.status,
      });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buf);
    // Log de éxito: bytes reales enviados (si dio 200 pero 0 bytes, se ve aquí)
    console.log('[tts] ok', `${buf.length}B`, `${Date.now() - t0}ms`);
  } catch (err) {
    console.error('[tts]', err.message);
    res.json({ ok: false, reason: 'network' });
  }
});

// ---------- Bitácora del cliente ----------
// El frontend manda un beacon SOLO en fallos graves (speak-fail / not-allowed /
// network): así se puede depurar la voz en Render sin tener el aparato en la mano.
app.post('/api/log', (req, res) => {
  if (rateLimited(req.ip, 'log')) return res.status(429).json({ ok: false });
  const tag = String(req.body?.tag ?? '').slice(0, 40);
  if (!tag) return res.status(400).json({ ok: false });
  let data = '';
  try { data = JSON.stringify(req.body?.data ?? null).slice(0, 300); } catch { /* sin datos */ }
  console.log('[client]', tag, data);
  res.json({ ok: true });
});

// ---------- HTTPS con certificado auto-firmado ----------
// El micrófono (SpeechRecognition/getUserMedia) exige "secure context": en el
// PC localhost cuenta como seguro, pero desde el celular (IP de la LAN) HTTP
// no lo es y Chrome NI SIQUIERA ofrece el permiso de micrófono. Por eso el
// puerto principal 8342 sirve HTTPS; el cert se genera solo la primera vez.
const CERT_DIR = path.join(__dirname, 'certs');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');

/** IPs IPv4 de la LAN (para meterlas en el SAN del certificado y los logs). */
function lanIPs() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
    }
  }
  return ips;
}

/** Lee el certificado, o lo genera (auto-firmado, 10 años) si aún no existe. */
async function ensureCert() {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    return { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) };
  }
  const ips = [...new Set(['192.168.40.137', ...lanIPs()])];
  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    {
      days: 3650,
      keySize: 2048,
      extensions: [{
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },          // type 2 = DNS
          { type: 7, ip: '127.0.0.1' },             // type 7 = IP
          ...ips.map((ip) => ({ type: 7, ip })),
        ],
      }],
    }
  );
  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(CERT_FILE, pems.cert);
  fs.writeFileSync(KEY_FILE, pems.private);
  console.log('🔐 Certificado auto-firmado generado en server/certs/ (válido 10 años)');
  return { cert: pems.cert, key: pems.private };
}

// ---------- Arranque ----------
// En Render (process.env.RENDER === 'true') el proxy de Render ya termina TLS:
// servimos HTTP plano en 0.0.0.0:$PORT y NO generamos certificados.
// En local se mantiene el HTTPS auto-firmado (el micrófono exige secure context
// desde el celular por la LAN) + el HTTP de cortesía en 127.0.0.1.
const IS_RENDER = process.env.RENDER === 'true';

if (IS_RENDER) {
  // Detrás del proxy de Render, req.ip debe salir de X-Forwarded-For para que
  // el rate limit por IP no trate a todos los visitantes como una sola IP.
  app.set('trust proxy', 1);
  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`🪐 Mi Universo + Boti Bot — Render (HTTP plano) en 0.0.0.0:${PORT}`);
    console.log(`   LLM (Claude): ${anthropic ? 'activo' : 'sin clave — modo banco local'}`);
    console.log(`   TTS (ElevenLabs): ${TTS_KEY ? 'activo' : 'sin clave — voz del navegador'}`);
  });
} else {
  const tls = await ensureCert();
  const lan = lanIPs()[0] ?? '192.168.40.137';

  https.createServer(tls, app).listen(PORT, () => {
    console.log('🪐 Mi Universo + Boti Bot');
    console.log(`   PC:   https://localhost:${PORT}`);
    console.log(`   Celu: https://${lan}:${PORT} (acepta el aviso de seguridad la primera vez)`);
    console.log(`   LLM (Claude): ${anthropic ? 'activo' : 'sin clave — modo banco local'}`);
    console.log(`   TTS (ElevenLabs): ${TTS_KEY ? 'activo' : 'sin clave — voz del navegador'}`);
  });

  // HTTP de cortesía SOLO en 127.0.0.1 (curl y pruebas locales sin warnings de cert)
  http.createServer(app).listen(HTTP_PORT, '127.0.0.1', () => {
    console.log(`   Pruebas locales (HTTP): http://127.0.0.1:${HTTP_PORT}`);
  });
}
