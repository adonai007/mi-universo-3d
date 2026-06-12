// ====== Boti Bot 🤖 — amigo intergaláctico conversacional ======
// - Perfiles multi-niño en localStorage (migra pegatinas existentes al 1er perfil)
// - Pantalla de bienvenida con avatares emoji (pre-lectores)
// - Botón 🎤 estilo walkie-talkie (Web Speech Recognition es-ES)
// - Respuestas: backend /api/ask (Claude) → fallback banco local de ~30 preguntas
// - Voz: backend /api/tts (ElevenLabs) → fallback speechSynthesis del navegador
import * as audio from './audio.js';

const PROFILES_KEY = 'mi-universo-perfiles-v1';
const STICKERS_KEY = 'mi-universo-stickers-v1';
const QUIZ_KEY = 'mi-universo-quiz-v1';

const AVATARS = ['🦁', '🦄', '🐸', '🚀', '👧', '👦', '🐱', '🐶'];
const AGES = [3, 4, 5, 6];

// ---------- Banco local de preguntas frecuentes (sin backend) ----------
// keys: palabras (sin tildes, minúsculas) que activan la respuesta.
const LOCAL_BANK = [
  { keys: ['luna'], a: 'La Luna es la mejor amiga de la Tierra. ¡Baila a su alrededor y de noche nos alumbra! 🌙' },
  { keys: ['sol'], a: 'El Sol es una estrella gigante y calentita. ¡Nos da luz y calor a todos! ☀️' },
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
const LOCAL_FALLBACK = '¡Esa es una pregunta súper difícil! ¡Preguntemos a un astrónomo! Pero si quieres, pregúntame por la Luna, los cohetes o los planetas. 🔭';
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
    saveProfiles(profiles);
  }

  /** Guarda el progreso global actual dentro del perfil activo. */
  function snapshotProfile() {
    const p = activeProfile();
    if (!p) return;
    p.stickers = readJSON(STICKERS_KEY, []);
    p.quiz = readJSON(QUIZ_KEY, { level: 0 });
    saveProfiles(profiles);
  }
  setInterval(snapshotProfile, 8000);
  window.addEventListener('beforeunload', snapshotProfile);

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
    setThinking(true);
    let answer = null;
    if (capabilities.llm) {
      try {
        const r = await fetch('api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, name: p?.name, age: p?.age }),
        });
        const data = await r.json().catch(() => null);
        if (data?.ok && data.text) answer = data.text;
        else if (data?.text) answer = data.text;     // enlatada (rate limit, error)
      } catch { /* backend caído → banco local */ }
    }
    if (!answer) answer = localAnswer(question);
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
      botiSpeak(`¡Hola ${name}! Soy Boti Bot, tu amigo del espacio. Mantén apretado el botón del micrófono y pregúntame lo que quieras sobre el universo.`);
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
        botiSpeak(`¡Hola otra vez, ${activeProfile().name}! ¡Qué bueno verte! ¿Exploramos el universo?`);
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
  };
}
