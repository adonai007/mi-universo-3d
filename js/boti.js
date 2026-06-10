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

  // Detectar capacidades del backend. En GitHub Pages no hay /api: saltamos
  // el fetch para no generar un 404 en consola — modo banco local directo.
  if (!location.hostname.endsWith('github.io')) {
    fetch('api/health').then((r) => (r.ok ? r.json() : null)).then((h) => {
      if (h) capabilities = h;
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
  let speakGen = 0;   // generación de habla: al subir, las hablas anteriores se invalidan

  /**
   * Corta TODA la voz en curso de un plumazo: la de Boti (audio ElevenLabs y
   * speechSynthesis), la narración del juego (audio.js usa speechSynthesis
   * también) y la animación "hablando". Centralizada para no duplicar.
   */
  function stopAllSpeech() {
    speakGen++;                 // invalida cualquier botiSpeak en curso
    audio.stopSpeaking();       // speechSynthesis: voz de Boti y narración de planetas
    if (currentAudio) {
      try { currentAudio.pause(); } catch { /* ya parado */ }
      currentAudio = null;
    }
    setTalking(false);
  }

  async function botiSpeak(text) {
    if (audio.isMuted()) return;
    stopAllSpeech();            // si ya estaba hablando, la respuesta vieja se cancela (no se encola)
    const gen = speakGen;
    setTalking(true);
    showBubble(text);                              // la burbuja muestra el ORIGINAL (con emojis)
    const speechText = audio.cleanForSpeech(text); // la voz solo recibe texto limpio
    try {
      if (capabilities.tts && speechText) {
        let played = false;
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
            if (gen !== speakGen) return;   // nos interrumpieron mientras llegaba el audio
            if (blob.size > 0) {
              await new Promise((resolve) => {
                if (currentAudio) { currentAudio.pause(); }
                currentAudio = new Audio(URL.createObjectURL(blob));
                currentAudio.onended = resolve;
                currentAudio.onerror = resolve;
                currentAudio.onpause = resolve;   // interrumpido por stopAllSpeech()
                currentAudio.play().catch(resolve);
              });
              played = true;
            }
          }
        } catch { /* error de red: cuenta como fallo */ }
        if (played || gen !== speakGen) return;
        ttsFailures++;
        if (ttsFailures >= 2) capabilities.tts = false;   // no insistir esta sesión
      }
      if (gen !== speakGen) return;   // interrumpido: no arrancar la voz del navegador
      await audio.speak(text);   // fallback: voz del navegador
    } finally {
      // Solo la habla "vigente" puede apagar la animación (una nueva ya tomó el relevo)
      if (gen === speakGen) {
        setTalking(false);
        hideBubbleSoon();
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
    <button id="btn-mic" class="big-btn" aria-label="Mantén apretado para hablar con Boti">🎤</button>
  `;
  document.body.appendChild(hud);

  // Panel teclado (fallback sin reconocimiento de voz; los padres ayudan)
  const typePanel = document.createElement('div');
  typePanel.id = 'boti-type';
  typePanel.className = 'hidden';
  typePanel.innerHTML = `
    <input id="boti-type-input" type="text" maxlength="120"
      placeholder="Escribe tu pregunta del espacio…" aria-label="Pregunta para Boti" />
    <button id="boti-type-go" class="big-btn" aria-label="Preguntar">🆗</button>
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
  function hideBubbleSoon() {
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.add('hidden'), 3500);
  }

  // Tocar a Boti → frase simpática
  const IDLE_PHRASES = [
    '¡Aprieta el micrófono y pregúntame algo del espacio! 🎤',
    '¿Sabías que en Júpiter caben mil Tierras? ¡Pregúntame más! 🟤',
    '¡Bip bup! ¡Me encantan las estrellas! ⭐',
  ];
  botiEl.addEventListener('click', () => {
    botiSpeak(IDLE_PHRASES[(Math.random() * IDLE_PHRASES.length) | 0]);
  });

  // ---------- micrófono walkie-talkie ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    recognition = new SR();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) askBoti(transcript);
    };
    recognition.onerror = () => { stopListening(); };
    recognition.onend = () => { stopListening(); };
  }

  let listenTimer = null;

  function startListening() {
    if (!recognition || listening) return;
    listening = true;
    stopAllSpeech();            // Boti se calla AL INSTANTE: el niño manda 🎤
    audio.blip(1.6);            // feedback inmediato: "te escucho"
    micBtn.classList.add('listening');
    botiEl.classList.add('listening');
    showBubble('Te escucho… 👂');
    // Pequeña espera tras cortar la voz para que el micro no capture
    // la cola del audio de Boti (eco) antes de empezar a reconocer.
    clearTimeout(listenTimer);
    listenTimer = setTimeout(() => {
      if (!listening) return;
      try { recognition.start(); } catch { /* ya activo */ }
    }, 150);
  }
  function stopListening() {
    if (!listening) return;
    listening = false;
    clearTimeout(listenTimer);
    micBtn.classList.remove('listening');
    botiEl.classList.remove('listening');
    hideBubbleSoon();
    try { recognition?.stop(); } catch { /* ya parado */ }
  }

  if (SR) {
    micBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); startListening(); });
    micBtn.addEventListener('pointerup', stopListening);
    micBtn.addEventListener('pointerleave', stopListening);
  } else {
    // Sin SpeechRecognition (p. ej. Firefox): teclado simple
    micBtn.textContent = '⌨️';
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
      botiSpeak(`¡Bravo ${p?.name ?? ''}! ¡Pegatina nueva para tu álbum! 🎉`);
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
      botiSpeak(comments[(Math.random() * comments.length) | 0]);
    },
    speak: botiSpeak,
    stopAllSpeech,
    ask: askBoti,
    getProfile: activeProfile,
  };
}
