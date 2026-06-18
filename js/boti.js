// ====== Boti Bot 🤖 — amigo intergaláctico conversacional ======
// - Perfiles multi-niño en localStorage (migra pegatinas existentes al 1er perfil)
// - Pantalla de bienvenida con avatares emoji (pre-lectores)
// - Botón 🎤 estilo walkie-talkie (Web Speech Recognition es-ES)
// - Respuestas: backend /api/ask (Claude) → fallback banco local de ~30 preguntas
// - Voz: backend /api/tts (ElevenLabs) → fallback speechSynthesis del navegador
import * as audio from './audio.js';
import { PLANETS, STORIES, STICKERS } from './planets.js';

const PROFILES_KEY = 'mi-universo-perfiles-v1';
const STICKERS_KEY = 'mi-universo-stickers-v1';
const QUIZ_KEY = 'mi-universo-quiz-v1';
const HELP_SEEN_KEY = 'mi-universo-help-seen-v1';

const AVATARS = ['🦁', '🦄', '🐸', '🚀', '👧', '👦', '🐱', '🐶'];
const AGES = [3, 4, 5, 6, 7, 8, 9, 10];

// ---------- Banco local de preguntas frecuentes (sin backend) ----------
// keys: palabras (sin tildes, minúsculas) que activan la respuesta.
const LOCAL_BANK = [
  { keys: ['luna'], a: 'La Luna es la mejor amiga de la Tierra. ¡Baila a su alrededor y de noche nos alumbra! 🌙' },
  { keys: ['sol'], a: 'El Sol es una estrella gigante de fuego. ¡Su superficie está a unos 5.500 grados, más caliente que mil hornos juntos! Por eso nos da luz y calor a todos. ☀️' },
  { keys: ['estrella fugaz', 'fugaz'], a: 'Una estrella fugaz es una piedrita del espacio que se enciende al caer. ¡Pide un deseo cuando veas una! 🌠' },
  { keys: ['estrella'], a: 'Las estrellas son soles lejísimos, como lucecitas en el cielo. ¡Hay más estrellas que granitos de arena! ⭐' },
  { keys: ['marte'], a: 'Marte es el planeta rojo, rojo como una manzana. ¡Los robots lo visitan para explorarlo! 🔴' },
  { keys: ['jupiter'], a: '¡Júpiter es el planeta más grandote! Dentro de él caben más de mil Tierras. 🟤' },
  { keys: ['saturno', 'anillo'], a: 'Saturno tiene anillos preciosos de hielo y piedritas que brillan. ¡Es el planeta más elegante! 🪐' },
  { keys: ['tierra'], a: 'La Tierra es tu casa. Es azul porque tiene mucha agua, ¡y es el único planeta con niños! 🌍' },
  { keys: ['venus'], a: 'Venus es el planeta más caliente, ¡como un horno! Brilla mucho en el cielo por la mañana. 🟠' },
  { keys: ['mercurio'], a: 'Mercurio es el planeta más pequeñito y el más rápido. ¡Vive pegadito al Sol! ⚪' },
  { keys: ['urano'], a: 'Urano es celeste y gira acostado, ¡como un balón rodando por el suelo! 🔵' },
  { keys: ['neptuno'], a: 'Neptuno es el planeta más lejano, azul como el mar profundo. ¡Allí hace muchísimo frío! 💙' },
  { keys: ['cohete'], a: 'Los cohetes son como flechas gigantes con fuego que llevan a los astronautas al espacio. ¡Fiuuum! 🚀' },
  { keys: ['astronauta'], a: 'Los astronautas son exploradores del espacio. ¡Flotan como globos y comen comida en bolsitas! 👨‍🚀' },
  { keys: ['agujero negro', 'agujero'], a: 'Un agujero negro es como una aspiradora gigante del espacio. ¡Vive lejísimos y desde aquí no nos puede alcanzar! ⚫' },
  { keys: ['cometa'], a: 'Un cometa es una bola de hielo con una cola brillante, ¡como un helado con estela mágica! ☄️' },
  { keys: ['galaxia', 'via lactea'], a: 'Nuestra galaxia se llama Vía Láctea. ¡Es como una ciudad gigante de estrellas y nosotros vivimos en ella! 🌌' },
  { keys: ['gravedad', 'flotan', 'flotar'], a: 'La gravedad es un abrazo invisible que nos pega al suelo. ¡En el espacio casi no hay y por eso los astronautas flotan! 🎈' },
  { keys: ['noche', 'dia ', 'de dia'], a: 'La Tierra gira como un trompo: el lado que mira al Sol tiene día, ¡y el otro lado tiene noche! 🌗' },
  { keys: ['eclipse'], a: 'Un eclipse es cuando la Luna juega a taparle la cara al Sol. ¡Se hace de noche un ratito! 🌑' },
  { keys: ['satelite', 'estacion espacial', 'iss'], a: 'La Estación Espacial es una casita que da vueltas a la Tierra. ¡Allí viven astronautas de verdad! 🛰️' },
  { keys: ['alien', 'extraterrestre', 'marciano'], a: 'Todavía no hemos encontrado amiguitos de otros planetas, ¡pero los científicos los buscan con telescopios gigantes! 👽' },
  { keys: ['telescopio'], a: 'Un telescopio es como unos ojos mágicos que ven lejísimos. ¡Con él vemos planetas y estrellas de cerquita! 🔭' },
  { keys: ['planeta'], a: 'Los planetas son bolas gigantes que dan vueltas alrededor del Sol. ¡Hay ocho y cada uno es diferente! 🪐' },
  { keys: ['lluvia de estrellas', 'meteorito'], a: 'A veces caen piedritas del espacio que se encienden como chispas. ¡Eso es una lluvia de estrellas! ✨' },
  { keys: ['frio'], a: 'En el espacio hace mucho, mucho frío, ¡brrr! Por eso los astronautas llevan trajes calentitos. 🧊' },
  { keys: ['grande'], a: '¡El universo es lo más grande que existe! Más grande que mil millones de casas juntas. 🌌' },
  { keys: ['arcoiris', 'arco iris'], a: 'Los arcoíris viven en el cielo de la Tierra, ¡pero en el espacio las nebulosas son como arcoíris de estrellas! 🌈' },
  { keys: ['nube'], a: 'En el espacio hay nubes gigantes de colores que se llaman nebulosas. ¡Allí nacen las estrellas bebés! ☁️✨' },
  { keys: ['cuantos', 'cuantas'], a: '¡Hay ocho planetas en nuestro sistema solar! Y estrellas... ¡más que granitos de arena en la playa! 🌟' },
];
const LOCAL_FALLBACK = '¡Qué buena pregunta del espacio! Pregúntame por el Sol, la Luna, los planetas, los cometas o las estrellas y te cuento todo lo que sé. 🔭';
const OFFTOPIC_HINTS = ['¡Yo solo sé de estrellas y planetas! ¿Me preguntas algo del espacio? 🚀'];

function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function localAnswer(question) {
  const q = ' ' + normalize(question) + ' ';
  for (const entry of LOCAL_BANK) {
    if (entry.keys.some((k) => q.includes(normalize(k)))) return entry.a;
  }
  return LOCAL_FALLBACK;
}

// ---------- Cuentos 📖 ----------
// Intent de cuento sobre la pregunta YA normalizada (sin tildes, minúsculas).
const STORY_INTENT = /\b(cuento|cu[eé]ntame|historia)\b/i;

// Intent de ayuda 🆘: "ayuda", "cómo se juega", "qué hago", "no sé jugar".
// Se evalúa sobre la pregunta normalizada (sin tildes), antes de gastar el LLM.
const HELP_INTENT = /\b(ayuda|ayudame|como se juega|como juego|como jugar|que hago|no se jugar)\b/i;

/** Cuento local (sin LLM): el del planeta mencionado en la pregunta o uno al azar. */
function localStory(question) {
  const q = ' ' + normalize(question) + ' ';
  const ids = Object.keys(STORIES);
  const id = ids.find((k) => new RegExp(`\\b${k}\\b`).test(q))
    ?? ids[(Math.random() * ids.length) | 0];
  return STORIES[id];
}

// Nombre hablable del lugar para armar la pregunta del botón 📖
const STORY_PLACE_NAMES = { sol: 'el Sol', luna: 'la Luna' };
function storyPlaceName(id) {
  return STORY_PLACE_NAMES[id] ?? PLANETS.find((pl) => pl.id === id)?.name ?? id;
}

// ---------- Perfiles ----------
function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) ?? null; } catch { return null; }
}
function saveProfiles(p) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(p)); } catch { /* sin almacenamiento */ }
}
function readJSON(key, fb) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; }
}
function writeJSON(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
}

export function initBoti() {
  const $ = (id) => document.getElementById(id);
  let profiles = loadProfiles();
  let capabilities = { llm: false, tts: false };
  let listening = false;
  let recognition = null;
  let currentAudio = null;
  let helpHandler = null;   // lo inyecta main.js: lanza el recorrido del modo ayuda ❓
  let lastExchange = null;  // {q, a} del último intercambio: da continuidad ("dame más")

  // Desbloqueo de la voz en el PRIMER gesto (bienvenida, mic, canvas, lo que
  // sea): Chrome Android exige un speak dentro de un gesto del usuario o Boti
  // queda mudo toda la sesión. unlockSpeech es idempotente.
  document.addEventListener('pointerdown', audio.unlockSpeech, { capture: true });
  document.addEventListener('click', audio.unlockSpeech, { capture: true });

  // Detectar capacidades del backend. En GitHub Pages no hay /api: saltamos
  // el fetch para no generar un 404 en consola — modo banco local directo.
  if (!location.hostname.endsWith('github.io')) {
    fetch('api/health').then((r) => (r.ok ? r.json() : null)).then((h) => {
      if (h) {
        capabilities = h;
        audio.logEvent('health', h);
      }
    }).catch(() => { /* estático puro: banco local + voz del navegador */ });
  }

  // ---------- estado de perfil ----------
  function activeProfile() {
    return profiles?.list?.[profiles.activeIdx] ?? null;
  }

  /** Copia pegatinas/nivel del perfil a las claves globales que usa el juego. */
  function applyProfile(idx) {
    profiles.activeIdx = idx;
    const p = profiles.list[idx];
    writeJSON(STICKERS_KEY, p.stickers ?? []);
    writeJSON(QUIZ_KEY, p.quiz ?? { level: 0 });
    lastExchange = null;          // el diálogo no se mezcla entre hermanos
    saveProfiles(profiles);
  }

  /** Guarda el progreso global actual dentro del perfil activo. */
  function snapshotProfile() {
    const p = activeProfile();
    if (!p) return;
    p.stickers = readJSON(STICKERS_KEY, []);
    p.quiz = readJSON(QUIZ_KEY, { level: 0 });
    recordDailyProgress(p);   // foto diaria para el modo padres 📈
    saveProfiles(profiles);
  }
  setInterval(snapshotProfile, 8000);
  window.addEventListener('beforeunload', snapshotProfile);

  // ---------- memoria de visitas por perfil 💙 ----------
  // Campo ADITIVO p.visits = { id: { n, last: 'YYYY-MM-DD' } } dentro del
  // perfil (misma clave de siempre). Los perfiles viejos no lo tienen: se crea
  // en el primer recordVisit. snapshotProfile/applyProfile no lo tocan, así
  // que sobrevive a los snapshots periódicos sin migración alguna.
  const VISIT_IDS = new Set(['sol', 'luna', ...PLANETS.map((pl) => pl.id)]);

  /** Apunta una visita narrada completa (solo Sol, Luna y los 8 planetas). */
  function recordVisit(defId) {
    if (!VISIT_IDS.has(defId)) return;
    const p = activeProfile();
    if (!p) return;
    if (!p.visits) p.visits = {};
    const rec = p.visits[defId] ?? { n: 0, last: '' };
    rec.n += 1;
    rec.last = new Date().toISOString().slice(0, 10);
    p.visits[defId] = rec;
    saveProfiles(profiles);
  }

  /** Planeta favorito: el más visitado (n ≥ 2) entre los 8 planetas, o null. */
  function getFavorite() {
    const visits = activeProfile()?.visits;
    if (!visits) return null;
    let best = null;
    for (const pl of PLANETS) {
      const rec = visits[pl.id];
      if (rec?.n >= 2 && (!best || rec.n > best.n)) best = { id: pl.id, name: pl.name, n: rec.n };
    }
    return best;
  }

  /** Lista de perfiles (la usará el quiz de 2 jugadores 👫). */
  function getProfiles() {
    return { list: profiles?.list ?? [], activeIdx: profiles?.activeIdx ?? 0 };
  }

  /** Último lugar visitado que tiene cuento (por fecha `last` de p.visits). */
  function lastVisitedStoryId() {
    const visits = activeProfile()?.visits;
    if (!visits) return null;
    let best = null;
    for (const [id, rec] of Object.entries(visits)) {
      if (STORIES[id] && rec?.last && (!best || rec.last > best.last)) best = { id, last: rec.last };
    }
    return best?.id ?? null;
  }

  // ---------- historial para el modo padres 👨‍👩‍👧 ----------
  // Campo ADITIVO p.questions = [{q, src: 'llm'|'banco'|'guard', t}] (cap 50).
  // 100% local: vive en el perfil (localStorage), jamás viaja al servidor.
  function recordQuestion(q, src) {
    const p = activeProfile();
    if (!p) return;
    if (!Array.isArray(p.questions)) p.questions = [];
    p.questions.push({ q: String(q).slice(0, 300), src, t: Date.now() });
    while (p.questions.length > 50) p.questions.shift();
    saveProfiles(profiles);
  }

  // ---------- métricas y mejora para el modo padres 📊📈 ----------
  // Todo se deriva de campos que el juego YA guarda (visits, stickers, quiz,
  // questions): no se rastrea nada nuevo, solo se resume.
  function profileMetrics(p) {
    const visits = p?.visits ?? {};
    const visitedIds = [...VISIT_IDS].filter((id) => (visits[id]?.n ?? 0) > 0);
    let last = '';
    for (const id of visitedIds) { if ((visits[id]?.last ?? '') > last) last = visits[id].last; }
    const qs = Array.isArray(p?.questions) ? p.questions : [];
    if (qs.length) {
      const lastQ = new Date(qs[qs.length - 1].t).toISOString().slice(0, 10);
      if (lastQ > last) last = lastQ;
    }
    return {
      visitedIds,
      planets: visitedIds.length,
      stickers: Array.isArray(p?.stickers) ? p.stickers.length : 0,
      quizLevel: p?.quiz?.level ?? 0,
      questions: qs.length,
      last,
    };
  }

  // Foto diaria ADITIVA p.history = [{d:'YYYY-MM-DD', p, s, l, q}] (cap 60).
  // Upsert de la entrada de HOY (la última lectura del día manda). Con los días
  // se forma la serie que muestra la mejora 📈. No guarda: lo hace snapshotProfile.
  function recordDailyProgress(p) {
    if (!p) return;
    const m = profileMetrics(p);
    const d = new Date().toISOString().slice(0, 10);
    if (!Array.isArray(p.history)) p.history = [];
    const row = { d, p: m.planets, s: m.stickers, l: m.quizLevel, q: m.questions };
    const today = p.history.find((e) => e.d === d);
    if (today) Object.assign(today, row);
    else p.history.push(row);
    while (p.history.length > 60) p.history.shift();
  }

  // ---------- voz de Boti ----------
  // Si ElevenLabs falla (clave sin permiso, red, etc.) caemos a la voz del
  // navegador SIN romper el flujo, y tras 2 fallos dejamos de intentar el TTS
  // remoto durante toda la sesión (el backend también se auto-degrada).
  let ttsFailures = 0;
  let speakId = 0;    // habla vigente de Boti: una nueva siempre releva a la anterior

  /**
   * Corta TODA la voz en curso de un plumazo: la de Boti (audio ElevenLabs y
   * speechSynthesis), la narración del juego, la melodía del planeta y la
   * animación "hablando". La generación global de audio.js invalida además
   * cualquier botiSpeak o tour en curso. Centralizada para no duplicar.
   */
  function stopAllSpeech() {
    audio.interruptSpeech();    // generación++, synth, melodía y mp3 de ElevenLabs
    currentAudio = null;
    setTalking(false);
  }

  /**
   * Habla de Boti. `interrupt: false` = habla "suave" para celebraciones y
   * comentarios que son PARTE del flujo: NO sube la generación global, así no
   * aborta el tour en curso ni corta la melodía del planeta. El micrófono y
   * el 🔇 sí la matan (la generación capturada aquí deja de coincidir) y de
   * paso matan también al tour que la disparó: una sola interrupción para todo.
   */
  async function botiSpeak(text, { interrupt = true } = {}) {
    if (interrupt) stopAllSpeech(); // si ya estaba hablando, la respuesta vieja se cancela (no se encola)
    const gen = audio.getSpeechGen();
    const myId = ++speakId;
    // "vigente" = ningún botiSpeak nuevo tomó el relevo; "viva" = además nadie interrumpió
    const isCurrent = () => myId === speakId;
    const isAlive = () => isCurrent() && gen === audio.getSpeechGen();
    showBubble(text);           // la burbuja SIEMPRE (muestra el ORIGINAL, con emojis):
    //                             el apoyo visual no depende de que haya voz
    const longBubble = Math.max(4000, text.length * 90);
    if (audio.isMuted()) {
      // Silenciado 🔇: el niño VE el mensaje y el botón de sonido se menea
      // (la pista de POR QUÉ Boti no habla).
      wiggleSoundBtn();
      hideBubbleSoon(longBubble);
      return;
    }
    const speechText = audio.cleanForSpeech(text); // la voz solo recibe texto limpio
    setTalking(true);
    let spoke = false;
    try {
      if (capabilities.tts && speechText) {
        try {
          const r = await fetch('api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: speechText }),
          });
          // El backend responde 200 siempre; solo es voz si llega audio real
          const isAudio = (r.headers.get('content-type') || '').includes('audio');
          if (r.ok && isAudio) {
            const blob = await r.blob();
            if (!isAlive()) return;   // nos interrumpieron mientras llegaba el audio
            if (blob.size > 0) {
              await new Promise((resolve) => {
                if (currentAudio) { currentAudio.pause(); }
                currentAudio = new Audio(URL.createObjectURL(blob));
                audio.registerExternalAudio(currentAudio);  // interruptSpeech() lo puede pausar
                currentAudio.onended = resolve;
                currentAudio.onerror = resolve;
                currentAudio.onpause = resolve;   // interrumpido por stopAllSpeech()
                currentAudio.play().catch(resolve);
              });
              spoke = true;
              audio.logEvent('speak', { engine: 'elevenlabs', len: speechText.length });
            }
          }
        } catch { /* error de red: cuenta como fallo */ }
        if (!spoke && isAlive()) {
          ttsFailures++;
          if (ttsFailures >= 2) capabilities.tts = false;   // no insistir esta sesión
        }
      }
      if (!spoke && isAlive()) {
        spoke = await audio.speak(text);   // fallback: voz del navegador
        audio.logEvent('speak', { engine: 'synth', ok: spoke, len: speechText.length });
      }
    } finally {
      // Solo la habla "vigente" toca la interfaz (una nueva ya tomó el relevo)
      if (isCurrent()) {
        if (gen === audio.getSpeechGen()) {
          setTalking(false);
          if (spoke) {
            hideBubbleSoon(1200);         // la voz REAL acaba de terminar
          } else {
            // No habló de verdad (motor mudo, sin voces): burbuja larga + pista
            wiggleSoundBtn();
            hideBubbleSoon(longBubble);
          }
        } else {
          // Interrumpidos por mic/🔇/salida: stopAllSpeech ya apagó la animación,
          // pero la burbuja NO debe quedar pegada en pantalla para siempre.
          hideBubbleSoon(longBubble);
        }
      }
    }
  }

  // ---------- preguntar ----------
  async function askBoti(question) {
    if (!question || !question.trim()) return;
    const p = activeProfile();
    // Ayuda 🆘: si el niño pide ayuda, Boti lanza el recorrido guiado (no gasta
    // LLM ni banco). Solo si main.js inyectó el handler; si no, sigue de largo.
    if (helpHandler && HELP_INTENT.test(normalize(question))) {
      recordQuestion(question, 'guard');   // queda en el historial del modo padres
      helpHandler();
      return;
    }
    // Cuentos 📖: el intent se detecta sobre la pregunta normalizada
    const wantsStory = STORY_INTENT.test(normalize(question));
    setThinking(true);
    let answer = null;
    let src = 'banco';            // fuente para el modo padres: llm | banco | guard
    if (capabilities.llm) {
      try {
        // favorite va con whitelist en el server (solo ids de planeta válidos)
        const body = { question, name: p?.name, age: p?.age, favorite: getFavorite()?.id };
        if (wantsStory) body.story = true;   // el server valida story === true
        // Diálogo: mandamos el último intercambio para que "dame más" / "¿por
        // qué?" tengan continuidad. En cuentos no (son de una sola vez).
        if (!wantsStory && lastExchange) body.context = lastExchange;
        const r = await fetch('api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await r.json().catch(() => null);
        if (data?.ok && data.text) {
          answer = data.text;
          src = data.source === 'guard' ? 'guard' : 'llm';
        } else if (data?.text) {
          answer = data.text;     // enlatada (rate limit, error): no fue el LLM
        }
      } catch { /* backend caído → banco local */ }
    }
    if (!answer) answer = wantsStory ? localStory(question) : localAnswer(question);
    recordQuestion(question, src);   // historial local del modo padres 👨‍👩‍👧
    // Recordamos el último intercambio para el diálogo (no en cuentos: el
    // siguiente "dame más" debe seguir el tema de datos, no la narración).
    if (!wantsStory) lastExchange = { q: String(question).slice(0, 300), a: String(answer).slice(0, 1000) };
    setThinking(false);
    await botiSpeak(answer);
  }

  // ---------- DOM: robot, micrófono, burbuja ----------
  const hud = document.createElement('div');
  hud.id = 'boti-hud';
  hud.innerHTML = `
    <div id="boti-bubble" class="hidden" aria-live="polite"></div>
    <div id="boti" role="img" aria-label="Boti Bot, tu amigo robot">
      <div class="boti-antenna"><div class="boti-antenna-ball"></div></div>
      <div class="boti-head">
        <div class="boti-eye left"></div>
        <div class="boti-eye right"></div>
        <div class="boti-mouth"></div>
      </div>
    </div>
    <button id="btn-mic" class="big-btn" data-tip="Habla con Boti" aria-label="Mantén apretado para hablar con Boti">🎤</button>
    <button id="btn-story" class="mini-btn" data-tip="Un cuento" aria-label="Boti te cuenta un cuento">📖</button>
  `;
  document.body.appendChild(hud);

  // Panel teclado (fallback sin reconocimiento de voz; los padres ayudan)
  const typePanel = document.createElement('div');
  typePanel.id = 'boti-type';
  typePanel.className = 'hidden';
  typePanel.innerHTML = `
    <input id="boti-type-input" type="text" maxlength="120"
      placeholder="Escribe tu pregunta del espacio…" aria-label="Pregunta para Boti" />
    <button id="boti-type-go" class="big-btn" data-tip="Preguntar" aria-label="Preguntar">🆗</button>
  `;
  document.body.appendChild(typePanel);

  const botiEl = $('boti');
  const bubble = $('boti-bubble');
  const micBtn = $('btn-mic');
  let bubbleTimer = null;

  function setTalking(on) { botiEl.classList.toggle('talking', on); }
  function setThinking(on) { botiEl.classList.toggle('thinking', on); }
  function showBubble(text) {
    clearTimeout(bubbleTimer);
    bubble.textContent = text;
    bubble.classList.remove('hidden');
  }
  function hideBubbleSoon(ms = 3500) {
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.add('hidden'), ms);
  }

  /** El 🔇/🔊 se menea: "Boti quiso hablar y no pudo" (pista para el adulto). */
  function wiggleSoundBtn() {
    const btn = $('btn-sound');
    if (!btn) return;
    btn.classList.remove('sound-wiggle');
    void btn.offsetWidth;             // reinicia la animación CSS
    btn.classList.add('sound-wiggle');
    btn.addEventListener('animationend', () => btn.classList.remove('sound-wiggle'), { once: true });
  }

  // Tocar a Boti → frase simpática. Mantenerlo apretado (~700 ms) → Boti DICE
  // su estado completo con voz (diagnóstico para el adulto, sin leer nada).
  const IDLE_PHRASES = [
    '¡Aprieta el micrófono y pregúntame algo del espacio! 🎤',
    '¿Sabías que en Júpiter caben mil Tierras? ¡Pregúntame más! 🟤',
    '¡Bip bup! ¡Me encantan las estrellas! ⭐',
    '¡Soy un robot que sabe muchísimo del espacio! ¿Le cuentas a un grande lo que aprendiste? 👨‍👩‍👧',
    '¡Bip! Soy un robot. ¿Exploramos el universo juntos y se lo mostramos a un grande? 🚀',
  ];
  let longPressTimer = null;
  let longPressFired = false;
  botiEl.addEventListener('pointerdown', () => {
    longPressFired = false;
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => { longPressFired = true; speakStatus(); }, 700);
  });
  botiEl.addEventListener('pointerup', () => clearTimeout(longPressTimer));
  botiEl.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
  botiEl.addEventListener('click', () => {
    if (longPressFired) { longPressFired = false; return; }   // ya habló el estado
    botiSpeak(IDLE_PHRASES[(Math.random() * IDLE_PHRASES.length) | 0]);
  });

  // ---------- micrófono walkie-talkie ----------
  // Máquina de estados VISIBLE: ready | listening | blocked | nosupport.
  // El niño la VE (anillo verde, 👂, 🔒) y la OYE (earcons + voz de Boti):
  // nunca más "aprieto y no pasa nada" sin explicación.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let micState = SR ? 'ready' : 'nosupport';
  const BLOCKED_MSG = 'No puedo escucharte por el micrófono. Pide ayuda a un grande para encenderlo. 🔒';
  let blockedSpoken = false;     // el aviso hablado tras un error not-allowed: 1 vez por sesión
  let audioStarted = false;      // llegó onaudiostart (el mic abrió de verdad)
  let audioStartTimer = null;
  let pendingStart = false;      // doble-tap o reintento: re-arrancar cuando el motor cierre
  let networkRetried = false;    // error 'network': 1 reintento silencioso por pulsación
  let hadError = false;
  let gotResult = false;
  let pressStart = 0;
  let lastPressMs = 0;

  function setMicState(s) {
    micState = s;
    micBtn.classList.toggle('ready', s === 'ready');
    micBtn.classList.toggle('listening', s === 'listening');
    micBtn.classList.toggle('blocked', s === 'blocked');
    botiEl.classList.toggle('listening', s === 'listening');
  }

  /** Fase 2 del feedback: "Te escucho 👂" cuando el micro abre DE VERDAD. */
  function showListeningUI() {
    if (audioStarted) return;
    audioStarted = true;
    clearTimeout(audioStartTimer);
    setMicState('listening');
    showBubble('Te escucho… 👂');
  }

  /** El permiso está denegado: NO insistir con el motor; Boti lo explica con voz. */
  function explainBlocked() {
    audio.earconBlocked();
    typePanel.classList.remove('hidden');   // los padres pueden escribir mientras tanto
    botiSpeak(BLOCKED_MSG);
  }

  if (SR) {
    recognition = new SR();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = (e.results?.[0]?.[0]?.transcript ?? '').trim();
      if (transcript) {
        gotResult = true;
        askBoti(transcript);
      }
    };
    recognition.onaudiostart = () => {
      if (listening) showListeningUI();
    };
    // Cada error tiene su señal (earcon + frase): el silencio ya no es la respuesta
    recognition.onerror = (e) => {
      const code = e?.error || 'unknown';
      audio.logEvent('rec-error', { code });
      hadError = true;
      if (code === 'aborted') return;        // lo abortamos nosotros: silencio
      if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
        audio.logEvent('not-allowed', { code });
        stopListening({ abort: true });
        setMicState('blocked');
        typePanel.classList.remove('hidden');
        audio.earconBlocked();
        if (!blockedSpoken) {
          blockedSpoken = true;
          botiSpeak(BLOCKED_MSG);
        }
        return;
      }
      if (code === 'network') {
        audio.logEvent('network', { retry: !networkRetried });
        if (!networkRetried) {
          networkRetried = true;
          pendingStart = true;               // onend re-arranca el motor: 1 reintento
          return;
        }
        stopListening();
        audio.earconConfused();
        botiSpeak('Mi antena falló un poquito. ¡Probamos otra vez! 📡');
        return;
      }
      if (code === 'no-speech') {
        stopListening();
        audio.earconConfused();
        botiSpeak('No te escuché. Aprieta el botón y háblame fuerte, ¿sí? 🎤');
        return;
      }
      stopListening();
    };
    recognition.onend = () => {
      if (pendingStart) {
        // Doble-tap o reintento de red: el motor YA cerró, ahora sí arranca
        pendingStart = false;
        if (listening) {
          hadError = false;
          try { recognition.start(); return; } catch { /* se rindió: seguimos abajo */ }
        }
      }
      const pressMs = listening ? performance.now() - pressStart : lastPressMs;
      stopListening();
      // Pulsación larga sin transcript: el niño habló pero no se entendió nada
      if (!gotResult && !hadError && pressMs > 400) {
        audio.earconConfused();
        botiSpeak('¿Me lo dices otra vez? 👂');
      }
    };
  }

  function startListening() {
    if (!recognition) return;
    if (micState === 'blocked') { explainBlocked(); return; }
    if (listening) return;
    listening = true;
    gotResult = false;
    hadError = false;
    networkRetried = false;
    pressStart = performance.now();
    lastPressMs = 0;
    stopAllSpeech();            // Boti se calla AL INSTANTE: el niño manda 🎤
    audio.earconListen();       // feedback fase 1: "botón apretado"
    micBtn.classList.add('pressed');
    audioStarted = false;
    clearTimeout(audioStartTimer);
    // Si el motor no dispara onaudiostart en 1 s, mostramos "Te escucho" igual
    audioStartTimer = setTimeout(() => { if (listening) showListeningUI(); }, 1000);
    try {
      recognition.start();
    } catch {
      // Doble-tap: el motor anterior aún estaba cerrando (InvalidStateError) →
      // abort() y re-arrancar cuando llegue su onend (pendingStart).
      pendingStart = true;
      try { recognition.abort(); } catch { /* ya parado */ }
    }
  }
  function stopListening({ abort = false } = {}) {
    clearTimeout(audioStartTimer);
    micBtn.classList.remove('pressed');
    if (!listening) return;
    listening = false;
    lastPressMs = performance.now() - pressStart;
    audioStarted = false;
    if (micState === 'listening') setMicState('ready');
    hideBubbleSoon();
    // El corte por interrupción usa abort() (tira lo oído); el pointerup
    // normal usa stop() para que el resultado pendiente sí llegue.
    try { abort ? recognition?.abort() : recognition?.stop(); } catch { /* ya parado */ }
  }

  if (SR) {
    micBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); startListening(); });
    micBtn.addEventListener('pointerup', () => stopListening());
    micBtn.addEventListener('pointerleave', () => stopListening());
    setMicState(micState);      // pinta el estado inicial (anillo verde "listo")

    // Permiso del micrófono visible desde el arranque y si cambia en vivo.
    // OJO: permissions.query({name:'microphone'}) LANZA en Firefox → try/catch.
    try {
      navigator.permissions?.query({ name: 'microphone' }).then((st) => {
        const apply = () => {
          audio.logEvent('mic-permission', { state: st.state });
          if (st.state === 'denied') setMicState('blocked');
          else if (micState === 'blocked') setMicState('ready');
        };
        apply();
        st.onchange = apply;
      }).catch(() => { /* sin Permissions API: nos enteramos al primer intento */ });
    } catch { /* Firefox y similares */ }
  } else {
    // Sin SpeechRecognition (p. ej. Firefox): teclado simple
    micBtn.textContent = '⌨️';
    micBtn.dataset.tip = 'Escríbele a Boti';
    micBtn.setAttribute('aria-label', 'Escríbele tu pregunta a Boti');
    micBtn.addEventListener('click', () => {
      typePanel.classList.toggle('hidden');
      $('boti-type-input').focus();
    });
  }
  // ---------- botón 📖: un cuento del último planeta visitado (o al azar) ----------
  // Con LLM la pregunta armada lleva el lugar y dispara story:true en askBoti;
  // sin LLM, localStory elige el cuento pre-escrito de ese mismo lugar.
  $('btn-story').addEventListener('click', () => {
    audio.blip(1.3);
    const ids = Object.keys(STORIES);
    const id = lastVisitedStoryId() ?? ids[(Math.random() * ids.length) | 0];
    askBoti(`Cuéntame un cuento de ${storyPlaceName(id)}`);
  });

  const sendTyped = () => {
    const input = $('boti-type-input');
    const q = input.value.trim();
    input.value = '';
    typePanel.classList.add('hidden');
    if (q) askBoti(q);
  };
  $('boti-type-go').addEventListener('click', sendTyped);
  $('boti-type-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendTyped(); });

  // ---------- estado para el adulto ----------
  /** Estado actual de Boti: chips del panel 🎨 y long-press sobre el robot. */
  function getStatus() {
    return {
      mic: micState,                                        // ready|listening|blocked|nosupport
      brain: capabilities.llm ? 'ia' : 'banco',             // 🧠✨ / 🧠📚
      voice: capabilities.tts ? 'premium' : 'navegador',    // 🗣️💎 / 🗣️📱
    };
  }

  /** Boti DICE su estado con voz (long-press: el adulto no necesita leer). */
  function speakStatus() {
    const s = getStatus();
    const micMsg = s.mic === 'blocked'
      ? 'Mi micrófono está bloqueado: pide ayuda a un grande para encenderlo.'
      : s.mic === 'nosupport'
        ? 'Este aparato no tiene micrófono para mí: escríbeme con el teclado.'
        : 'Mi micrófono funciona.';
    const brainMsg = s.brain === 'ia'
      ? 'Pienso con mi cerebro de robot.'
      : 'Pienso con mi libro de estrellas.';
    const voiceMsg = s.voice === 'premium'
      ? 'Hablo con mi voz especial.'
      : 'Hablo con la voz del aparato.';
    botiSpeak(`${micMsg} ${brainMsg} ${voiceMsg}`);
  }

  // ---------- modo padres 👨‍👩‍👧 (overlay 100% local) ----------
  // Acceso a propósito "escondido" de los niños: long-press de 2 s en el chip
  // 🧠 del panel 🎨 (el long-press de Boti, 700 ms, es otro elemento y sigue
  // igual). Texto pequeño OK: esto es territorio adulto.
  const parentPanel = document.createElement('div');
  parentPanel.id = 'parent-panel';
  parentPanel.className = 'hidden';
  document.body.appendChild(parentPanel);

  const SRC_ICONS = {
    llm: { icon: '🧠✨', label: 'Respondió la inteligencia artificial' },
    banco: { icon: '📚', label: 'Respondió el banco local de respuestas' },
    guard: { icon: '🛡️', label: 'Pregunta filtrada por los guardarraíles' },
  };

  /** '12/06 17:42' a partir del timestamp del historial. */
  function fmtWhen(t) {
    const d = new Date(t);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const BODY_NAMES = { sol: 'Sol', luna: 'Luna' };
  function bodyName(id) {
    return BODY_NAMES[id] ?? PLANETS.find((pl) => pl.id === id)?.name ?? id;
  }
  /** 'YYYY-MM-DD' → '12/06' (o '' si vacío). */
  function fmtDay(iso) {
    const [, m, d] = String(iso ?? '').split('-');
    return (m && d) ? `${d}/${m}` : '';
  }

  /** Texto de mejora a partir de la foto diaria p.history. */
  function trendText(p) {
    const hist = Array.isArray(p.history) ? p.history : [];
    if (hist.length < 2) return '¡Primer día registrado! Vuelve mañana para ver la mejora. 🌱';
    const latest = hist[hist.length - 1];
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    let ref = hist.find((e) => e.d >= cutoff) ?? hist[0];
    if (ref.d === latest.d) ref = hist[hist.length - 2];   // solo hoy en la ventana: compara con la lectura previa
    const dp = latest.p - ref.p, ds = latest.s - ref.s, dl = latest.l - ref.l;
    if (dp <= 0 && ds <= 0 && dl <= 0) return `Mismo progreso que el ${fmtDay(ref.d)}. ¡A explorar más! 🚀`;
    const bits = [];
    if (dl > 0) bits.push(`subió ${dl} nivel${dl > 1 ? 'es' : ''} de quiz`);
    if (ds > 0) bits.push(`ganó ${ds} pegatina${ds > 1 ? 's' : ''}`);
    if (dp > 0) bits.push(`visitó ${dp} cuerpo${dp > 1 ? 's' : ''} nuevo${dp > 1 ? 's' : ''}`);
    return `Desde el ${fmtDay(ref.d)}: ${bits.join(', ')}. ¡Va mejorando!`;
  }

  /** Bloque "boletín": progreso del juego por perfil (planetas, pegatinas, nivel…). */
  function appendBulletin(box, p) {
    const m = profileMetrics(p);
    const stats = document.createElement('div');
    stats.className = 'pp-stats';
    const rows = [
      ['🪐', `Planetas visitados: ${m.planets}/${VISIT_IDS.size}`, m.visitedIds.map(bodyName).join(', ')],
      ['⭐', `Pegatinas: ${m.stickers}/${STICKERS.length}`, ''],
      ['🏆', `Nivel de quiz: ${m.quizLevel}`, ''],
      ['❓', `Preguntas hechas: ${m.questions}`, ''],
      ['🗓️', `Última vez que jugó: ${fmtDay(m.last) || '—'}`, ''],
    ];
    for (const [icon, label, sub] of rows) {
      const row = document.createElement('div');
      row.className = 'pp-stat';
      const ic = document.createElement('span');
      ic.className = 'pp-stat-icon';
      ic.textContent = icon;
      const tx = document.createElement('span');
      tx.className = 'pp-stat-text';
      tx.textContent = sub ? `${label} — ${sub}` : label;
      row.append(ic, tx);
      stats.appendChild(row);
    }
    box.appendChild(stats);
    const trend = document.createElement('p');
    trend.className = 'pp-trend';
    trend.textContent = `📈 ${trendText(p)}`;
    box.appendChild(trend);
  }

  // Construcción 100% por DOM (textContent): las preguntas son texto del niño
  // o del reconocedor de voz y JAMÁS deben interpretarse como HTML.
  function renderParentPanel() {
    parentPanel.innerHTML = '';
    const title = document.createElement('p');
    title.className = 'pp-title';
    title.textContent = '👨‍👩‍👧 Modo padres — preguntas a Boti (solo en este aparato)';
    parentPanel.appendChild(title);
    for (const p of profiles?.list ?? []) {
      const box = document.createElement('div');
      box.className = 'pp-profile';
      const head = document.createElement('div');
      head.className = 'pp-head';
      const who = document.createElement('span');
      who.className = 'pp-who';
      who.textContent = `${p.avatar ?? '🧑‍🚀'} ${p.name ?? ''}`;
      const del = document.createElement('button');
      del.className = 'pp-del';
      del.textContent = '🗑️';
      del.setAttribute('aria-label', `Borrar el historial de ${p.name ?? 'este perfil'}`);
      del.addEventListener('click', () => {
        p.questions = [];
        saveProfiles(profiles);
        renderParentPanel();
      });
      head.append(who, del);
      box.appendChild(head);
      appendBulletin(box, p);   // boletín de progreso + mejora 📊📈
      const sub = document.createElement('p');
      sub.className = 'pp-subhead';
      sub.textContent = '❓ Preguntas a Boti:';
      box.appendChild(sub);
      const qs = Array.isArray(p.questions) ? [...p.questions].reverse() : [];
      if (!qs.length) {
        const empty = document.createElement('p');
        empty.className = 'pp-empty';
        empty.textContent = 'Sin preguntas todavía.';
        box.appendChild(empty);
      }
      for (const item of qs) {
        const row = document.createElement('div');
        row.className = 'pp-q';
        const srcInfo = SRC_ICONS[item.src] ?? SRC_ICONS.banco;
        const icon = document.createElement('span');
        icon.className = 'pp-src';
        icon.textContent = srcInfo.icon;
        icon.title = srcInfo.label;
        icon.setAttribute('aria-label', srcInfo.label);
        const txt = document.createElement('span');
        txt.className = 'pp-text';
        txt.textContent = item.q ?? '';
        const when = document.createElement('span');
        when.className = 'pp-when';
        when.textContent = fmtWhen(item.t);
        row.append(icon, txt, when);
        box.appendChild(row);
      }
      parentPanel.appendChild(box);
    }
    const print = document.createElement('button');
    print.id = 'parent-print';
    print.className = 'big-btn';
    print.textContent = '🖨️';
    print.dataset.tip = 'Imprimir reporte';
    print.setAttribute('aria-label', 'Imprimir el reporte de progreso');
    print.addEventListener('click', () => {
      // Reusa window.print(): la clase en <body> hace que @media print muestre
      // SOLO el panel de padres y oculte el resto (canvas, HUD, botones).
      document.body.classList.add('printing-parents');
      const cleanup = () => {
        document.body.classList.remove('printing-parents');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
    });
    parentPanel.appendChild(print);

    const close = document.createElement('button');
    close.id = 'parent-close';
    close.className = 'big-btn';
    close.textContent = '❌';
    close.dataset.tip = 'Cerrar';
    close.setAttribute('aria-label', 'Cerrar el modo padres');
    close.addEventListener('click', () => parentPanel.classList.add('hidden'));
    parentPanel.appendChild(close);
  }

  // Long-press de 2000 ms en el chip 🧠 (#chip-brain) del panel 🎨
  const brainChip = $('chip-brain');
  if (brainChip) {
    let ppTimer = null;
    const arm = () => {
      clearTimeout(ppTimer);
      ppTimer = setTimeout(() => {
        renderParentPanel();
        parentPanel.classList.remove('hidden');
      }, 2000);
    };
    const disarm = () => clearTimeout(ppTimer);
    brainChip.addEventListener('pointerdown', arm);
    brainChip.addEventListener('pointerup', disarm);
    brainChip.addEventListener('pointerleave', disarm);
  }

  // ---------- pantalla de bienvenida ----------
  const welcome = document.createElement('div');
  welcome.id = 'welcome';
  document.body.appendChild(welcome);

  function renderCreateForm() {
    welcome.innerHTML = `
      <div class="welcome-boti">🤖</div>
      <p class="welcome-title">¡Hola! ¿Cómo te llamas?</p>
      <input id="welcome-name" type="text" maxlength="20" placeholder="Tu nombre"
        aria-label="Escribe tu nombre" autocomplete="off" />
      <p class="welcome-sub">Elige tu animalito:</p>
      <div class="welcome-avatars">
        ${AVATARS.map((a) => `<button class="avatar-opt" data-avatar="${a}" aria-label="Avatar ${a}">${a}</button>`).join('')}
      </div>
      <p class="welcome-sub">¿Cuántos años tienes?</p>
      <div class="welcome-ages">
        ${AGES.map((n) => `<button class="age-opt" data-age="${n}" aria-label="${n} años">${n}</button>`).join('')}
      </div>
      <button id="welcome-go" class="big-btn welcome-go" aria-label="¡Empezar a jugar!">✅</button>
    `;
    let avatar = AVATARS[0];
    let age = 5;
    welcome.querySelectorAll('.avatar-opt').forEach((b) => {
      b.addEventListener('click', () => {
        avatar = b.dataset.avatar;
        welcome.querySelectorAll('.avatar-opt').forEach((x) => x.classList.toggle('active', x === b));
        audio.blip(1.4);
      });
    });
    welcome.querySelector('.avatar-opt').classList.add('active');
    welcome.querySelectorAll('.age-opt').forEach((b) => {
      b.addEventListener('click', () => {
        age = parseInt(b.dataset.age, 10);
        welcome.querySelectorAll('.age-opt').forEach((x) => x.classList.toggle('active', x === b));
        audio.blip(1.2);
      });
    });
    welcome.querySelector('[data-age="5"]').classList.add('active');
    welcome.querySelector('#welcome-go').addEventListener('click', () => {
      const name = (welcome.querySelector('#welcome-name').value.trim() || 'Astronauta').slice(0, 20);
      const isFirst = !profiles;
      if (!profiles) profiles = { activeIdx: 0, list: [] };
      // El PRIMER perfil hereda las pegatinas/nivel ya ganados (migración)
      const inherited = isFirst
        ? { stickers: readJSON(STICKERS_KEY, []), quiz: readJSON(QUIZ_KEY, { level: 0 }) }
        : { stickers: [], quiz: { level: 0 } };
      profiles.list.push({ name, avatar, age, ...inherited });
      applyProfile(profiles.list.length - 1);
      closeWelcome();
      audio.twinkle();
      // 1ª vez en el aparato: Boti saluda y GUÍA el recorrido (se marca el flag
      // para no repetirlo). Las veces siguientes (o si no hay handler), saludo normal.
      const firstEver = readJSON(HELP_SEEN_KEY, false) !== true;
      if (helpHandler && firstEver) {
        writeJSON(HELP_SEEN_KEY, true);
        helpHandler();
      } else {
        botiSpeak(`¡Hola ${name}! Soy Boti Bot, tu amigo del espacio. Mantén apretado el botón del micrófono y pregúntame lo que quieras sobre el universo.`);
      }
    });
  }

  function renderProfilePicker() {
    welcome.innerHTML = `
      <div class="welcome-boti">🤖</div>
      <p class="welcome-title">¿Quién va a jugar hoy?</p>
      <div class="welcome-profiles">
        ${profiles.list.map((p, i) =>
          `<button class="profile-opt" data-idx="${i}" aria-label="Jugar como ${p.name}">
             <span class="profile-avatar">${p.avatar}</span>
             <span class="profile-name">${p.name}</span>
           </button>`).join('')}
        <button class="profile-opt profile-new" id="profile-new" aria-label="Niño nuevo">➕</button>
      </div>
    `;
    welcome.querySelectorAll('.profile-opt[data-idx]').forEach((b) => {
      b.addEventListener('click', () => {
        applyProfile(parseInt(b.dataset.idx, 10));
        closeWelcome();
        audio.twinkle();
        // Si ya tiene un planeta favorito (2+ visitas), Boti lo recuerda 💙
        const fav = getFavorite();
        botiSpeak(fav
          ? `¡Hola otra vez, ${activeProfile().name}! ¿Volvemos a ${fav.name}? ¡Es tu favorito!`
          : `¡Hola otra vez, ${activeProfile().name}! ¡Qué bueno verte! ¿Exploramos el universo?`);
      });
    });
    welcome.querySelector('#profile-new').addEventListener('click', renderCreateForm);
  }

  function closeWelcome() { welcome.classList.add('hidden'); }

  if (profiles?.list?.length) renderProfilePicker();
  else renderCreateForm();

  // ---------- API para el resto del juego ----------
  return {
    /** Celebra una pegatina nueva por nombre del niño. */
    celebrateSticker() {
      const p = activeProfile();
      // Habla SUAVE: la celebración es parte del flujo — no debe abortar el
      // tour ni cortar la melodía del planeta (el mic sí la mata, y al tour).
      botiSpeak(`¡Bravo ${p?.name ?? ''}! ¡Pegatina nueva para tu álbum! 🎉`, { interrupt: false });
    },
    /** A veces comenta el planeta visitado (después de la narración). */
    maybeCommentPlanet(def) {
      if (Math.random() > 0.3) return;
      const p = activeProfile();
      const comments = [
        `¡${def.name} es uno de mis favoritos, ${p?.name ?? 'amiguito'}!`,
        `¡Bip bup! ¡Qué bonito se ve ${def.name} desde aquí!`,
        `¿Sabes que vine una vez a ${def.name} en mi nave? ¡Bip!`,
      ];
      // Habla SUAVE: comentario del flujo, no interrumpe melodía ni narración
      botiSpeak(comments[(Math.random() * comments.length) | 0], { interrupt: false });
    },
    speak: botiSpeak,
    stopAllSpeech,
    ask: askBoti,
    getProfile: activeProfile,
    getStatus,
    recordVisit,
    getFavorite,
    getProfiles,
    /** main.js inyecta el lanzador del modo ayuda ❓ (recorrido guiado). */
    setHelpHandler(fn) { helpHandler = typeof fn === 'function' ? fn : null; },
    /** Persiste el perfil activo (lo usa el repaso espaciado del quiz). */
    persist() { saveProfiles(profiles); },
  };
}
