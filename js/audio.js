// ====== Sonidos procedurales (Web Audio) y voz en español (Web Speech) ======

let ctx = null;
let muted = false;
let spanishVoice = undefined; // undefined = aún no buscada; null = no hay
let melodyNodes = [];         // para poder detener melodías al cambiar de planeta

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(m) {
  muted = m;
  if (m) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    stopMelody();
  }
}
export function isMuted() { return muted; }

/** Tono simple con envolvente. Devuelve los nodos por si hay que pararlos. */
function tone({ freq = 600, time = 0.15, type = 'sine', gain = 0.2, slideTo = null, delay = 0, detune = 0 }) {
  const ac = audioCtx();
  if (!ac || muted) return null;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + time);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + time + 0.05);
  return { osc, g };
}

/** Golpe de ruido corto (percusión para Marte). */
function noiseHit({ delay = 0, time = 0.12, gain = 0.15, freq = 800 }) {
  const ac = audioCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const buf = ac.createBuffer(1, ac.sampleRate * time, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t0);
}

/** Blip alegre al tocar (la altura depende del planeta). */
export function blip(pitch = 1) {
  tone({ freq: 520 * pitch, time: 0.12, type: 'triangle', gain: 0.25 });
  tone({ freq: 780 * pitch, time: 0.14, type: 'sine', gain: 0.15, delay: 0.06 });
}

/** Whoosh al volar la cámara. */
export function whoosh() {
  const ac = audioCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime;
  const dur = 0.7;
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(300, t0);
  filter.frequency.exponentialRampToValueAtTime(1800, t0 + dur * 0.6);
  filter.Q.value = 1.2;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t0);
}

/** Campanitas mágicas (celebración pequeña). */
export function twinkle() {
  [880, 1175, 1568, 2093].forEach((f, i) =>
    tone({ freq: f, time: 0.35, type: 'sine', gain: 0.14, delay: i * 0.09 })
  );
}

/** Fanfarria grande (pegatina nueva, nivel superado). */
export function fanfare() {
  const seq = [523, 659, 784, 1047, 784, 1047];
  seq.forEach((f, i) => {
    tone({ freq: f, time: 0.3, type: 'triangle', gain: 0.18, delay: i * 0.13 });
    tone({ freq: f * 2, time: 0.25, type: 'sine', gain: 0.07, delay: i * 0.13 });
  });
  [1568, 2093, 2637].forEach((f, i) =>
    tone({ freq: f, time: 0.5, type: 'sine', gain: 0.1, delay: 0.8 + i * 0.07 })
  );
}

/** Tono suave de acierto en el quiz. */
export function success() {
  tone({ freq: 660, time: 0.18, type: 'triangle', gain: 0.2 });
  tone({ freq: 880, time: 0.3, type: 'triangle', gain: 0.2, delay: 0.14 });
}

/** Tono amable de "casi" (sin castigo). */
export function gentle() {
  tone({ freq: 392, time: 0.25, type: 'sine', gain: 0.14 });
  tone({ freq: 440, time: 0.3, type: 'sine', gain: 0.12, delay: 0.18 });
}

export function click() {
  tone({ freq: 420, time: 0.08, type: 'square', gain: 0.12 });
}

// ---------- Melodías por planeta 🎵 (procedurales, timbres y escalas propios) ----------
const MELODIES = {
  sol:      { wave: 'triangle', vol: 0.10, notes: [[523, .3], [659, .3], [784, .3], [1047, .7]] },
  mercurio: { wave: 'triangle', vol: 0.09, notes: [[880, .14], [990, .14], [1175, .14], [1320, .14], [1175, .14], [990, .3]] },
  venus:    { wave: 'sine',     vol: 0.10, notes: [[392, .55], [494, .55], [440, .9]] },
  tierra:   { wave: 'triangle', vol: 0.10, notes: [[523, .25], [659, .25], [784, .25], [659, .25], [1047, .6]] },
  marte:    { wave: 'square',   vol: 0.05, perc: true, notes: [[196, .22], [196, .22], [233, .22], [196, .22], [262, .45]] },
  jupiter:  { wave: 'sawtooth', vol: 0.045, notes: [[262, .35], [330, .35], [392, .35], [523, .5], [392, .6]] },
  saturno:  { wave: 'triangle', vol: 0.09, notes: [[349, .3], [440, .3], [523, .55], [440, .3], [349, .6]] },
  urano:    { wave: 'sine',     vol: 0.09, notes: [[523, .22], [587, .22], [659, .22], [740, .22], [831, .55]] },
  neptuno:  { wave: 'sine',     vol: 0.08, pad: true, notes: [[220, 1.1], [277, 1.1], [330, 1.6]] },
};

export function stopMelody() {
  if (!ctx) { melodyNodes = []; return; }
  for (const n of melodyNodes) {
    try {
      n.g.gain.cancelScheduledValues(ctx.currentTime);
      n.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      n.osc.stop(ctx.currentTime + 0.2);
    } catch { /* ya detenida */ }
  }
  melodyNodes = [];
}

/** Toca la melodía corta del planeta (suave, respeta silencio 🔇). */
export function playMelody(defId) {
  if (muted) return;
  const m = MELODIES[defId] ?? MELODIES.tierra;
  stopMelody();
  let t = 0.05;
  for (const [f, d] of m.notes) {
    const n1 = tone({ freq: f, time: d * (m.pad ? 1.6 : 1.05), type: m.wave, gain: m.vol, delay: t });
    if (n1) melodyNodes.push(n1);
    if (m.pad) {
      // Etéreo: segunda voz desafinada (Neptuno)
      const n2 = tone({ freq: f, time: d * 1.8, type: 'sine', gain: m.vol * 0.6, delay: t, detune: 8 });
      if (n2) melodyNodes.push(n2);
    }
    if (m.perc) noiseHit({ delay: t, time: 0.1, gain: 0.12, freq: 900 }); // Marte percusivo
    t += d;
  }
}

// ---------- Voz en español ----------

/**
 * Limpia el texto ANTES de dárselo a la voz (speechSynthesis o ElevenLabs):
 * quita emojis/pictogramas (que la voz lee en alto: "cohete", "estrella"…)
 * y el markdown del LLM (*énfasis*, **negrita**, _subrayado_).
 * La burbuja visual muestra el texto ORIGINAL (los emojis ayudan a los
 * pre-lectores); solo la voz recibe el texto limpio.
 */
export function cleanForSpeech(text) {
  return String(text ?? '')
    // Emojis y pictogramas: Extended_Pictographic + selectores de variación,
    // ZWJ (emojis compuestos), tonos de piel, banderas regionales y keycaps
    .replace(/[\p{Extended_Pictographic}\u{FE0E}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}\u{20E3}]/gu, '')
    // Markdown del LLM: *énfasis*, **negrita**, _subrayado_
    .replace(/[*_]+/g, '')
    // Puntuación huérfana: pares vacíos ("¡ !" / "¿ ?") y espacio antes de signo
    .replace(/¡\s*!|¿\s*\?/g, '')
    .replace(/\s+([!?.,;:])/g, '$1')
    // Colapsar los espacios que quedaron al quitar emojis
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function findSpanishVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return undefined; // aún no cargadas
  return (
    voices.find((v) => v.lang === 'es-ES') ||
    voices.find((v) => v.lang && v.lang.startsWith('es')) ||
    null
  );
}

if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener?.('voiceschanged', () => { spanishVoice = findSpanishVoice(); });
}

/**
 * Habla en español con voz amable para niños.
 * Resuelve con true si habló, false si no pudo (para mostrar apoyo visual).
 */
export function speak(text) {
  return new Promise((resolve) => {
    if (muted || !('speechSynthesis' in window)) return resolve(false);
    // La voz NO lee emojis ni asteriscos (la burbuja muestra el original)
    const clean = cleanForSpeech(text);
    if (!clean) return resolve(false);
    if (spanishVoice === undefined) spanishVoice = findSpanishVoice();
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'es-ES';
      if (spanishVoice) u.voice = spanishVoice;
      u.pitch = 1.25;   // voz un poco más aguda, amistosa
      u.rate = 0.85;    // más despacio para niños pequeños
      u.volume = 1;
      let done = false;
      const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      // Red de seguridad por si onend nunca llega
      setTimeout(() => finish(true), 1000 + clean.length * 120);
      speechSynthesis.speak(u);
    } catch {
      resolve(false);
    }
  });
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
