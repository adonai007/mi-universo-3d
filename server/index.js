// ====== Boti Bot 🤖 — backend mínimo ======
// Sirve la app estática y expone /api/ask (Claude) y /api/tts (ElevenLabs).
// Las claves viven SOLO aquí (.env), nunca en el frontend.
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8342;

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

// ---------- Rate limit casero: 10 preguntas/minuto por IP ----------
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (list.length >= 10) return true;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 1000) hits.clear();   // higiene de memoria
  return false;
}

// ---------- Rutas ----------
app.get('/api/health', (_req, res) => {
  res.json({ llm: !!anthropic, tts: !!TTS_KEY && !ttsDead });
});

app.post('/api/ask', async (req, res) => {
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
    return res.json({ ok: true, text: CANNED.blocked(cleanName), source: 'guard' });
  }
  // Sin clave: el frontend usa su banco local (responder con gracia, nunca 500)
  if (!anthropic) {
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
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    console.error('[tts]', err.message);
    res.json({ ok: false, reason: 'network' });
  }
});

app.listen(PORT, () => {
  console.log(`🪐 Mi Universo + Boti Bot en http://localhost:${PORT}`);
  console.log(`   LLM (Claude): ${anthropic ? 'activo' : 'sin clave — modo banco local'}`);
  console.log(`   TTS (ElevenLabs): ${TTS_KEY ? 'activo' : 'sin clave — voz del navegador'}`);
});
