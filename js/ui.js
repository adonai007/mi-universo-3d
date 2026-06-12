// ====== Interfaz para pre-lectores: botones grandes con emojis ======
import { TEMP_EMOJI, STICKERS } from './planets.js';

const STORAGE_KEY = 'mi-universo-settings-v1';
const STICKERS_KEY = 'mi-universo-stickers-v1';
const CUSTOM_KEY = 'mi-universo-planetas-v1';
const QUIZ_KEY = 'mi-universo-quiz-v1';
const MISSION_KEY = 'mi-universo-mision-v1';

export const DEFAULT_SETTINGS = {
  speed: 1,
  stars: 'normal',
  sky: '#03020f',
  ambient: 'night',
  orbitLines: true,
  labels: true,
  sound: true,
};

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
}

export function loadSettings() { return { ...DEFAULT_SETTINGS, ...loadJSON(STORAGE_KEY, {}) }; }
export function saveSettings(s) { saveJSON(STORAGE_KEY, s); }

export function loadStickers() { return loadJSON(STICKERS_KEY, []); }
export function saveStickers(list) { saveJSON(STICKERS_KEY, list); }

export function loadCustomPlanets() { return loadJSON(CUSTOM_KEY, []); }
export function saveCustomPlanets(list) { saveJSON(CUSTOM_KEY, list); }

export function loadQuizLevel() { return loadJSON(QUIZ_KEY, { level: 0 }); }
export function saveQuizLevel(state) { saveJSON(QUIZ_KEY, state); }

export function loadMission() { return loadJSON(MISSION_KEY, {}); }
export function saveMission(m) { saveJSON(MISSION_KEY, m); }

/**
 * Conecta la interfaz. `handlers`:
 * onHome, onGalaxy, onTour, onCompare, onQuiz, onLevels, onBuildCreate(cfg),
 * onBuildDelete, onSoundToggle, onPauseToggle, onSettingChange(key, value)
 */
export function initUI(settings, handlers) {
  const $ = (id) => document.getElementById(id);
  const panels = {
    style: $('style-panel'),
    build: $('build-panel'),
    games: $('games-row'),
  };

  const closeAllPanels = () => {
    panels.style.classList.add('hidden');
    panels.build.classList.add('hidden');
    panels.games.classList.add('hidden');
    $('btn-style').classList.remove('active');
    $('btn-build').classList.remove('active');
    $('btn-games').classList.remove('active');
  };

  const togglePanel = (panel, btn) => {
    const isOpen = !panels[panel].classList.contains('hidden');
    if (panel !== 'games') panels.games.classList.toggle('hidden', panel !== 'games');
    panels.style.classList.add('hidden');
    panels.build.classList.add('hidden');
    $('btn-style').classList.remove('active');
    $('btn-build').classList.remove('active');
    if (!isOpen) {
      panels[panel].classList.remove('hidden');
      btn.classList.add('active');
    }
  };

  // --- Botonera principal ---
  $('btn-home').addEventListener('click', () => { closeAllPanels(); handlers.onHome(); });
  $('btn-galaxy').addEventListener('click', () => { closeAllPanels(); handlers.onGalaxy(); });
  $('btn-tour').addEventListener('click', () => { closeAllPanels(); handlers.onTour(); });
  $('btn-compare').addEventListener('click', () => { closeAllPanels(); handlers.onCompare(); });

  $('btn-games').addEventListener('click', () => {
    const open = panels.games.classList.contains('hidden');
    closeAllPanels();
    if (open) {
      panels.games.classList.remove('hidden');
      $('btn-games').classList.add('active');
    }
  });

  $('btn-quiz').addEventListener('click', () => { closeAllPanels(); handlers.onQuiz(); });
  $('btn-levels').addEventListener('click', () => { closeAllPanels(); handlers.onLevels(); });
  $('btn-album').addEventListener('click', () => { closeAllPanels(); showAlbum(); });
  $('btn-build').addEventListener('click', (e) => {
    panels.games.classList.add('hidden');
    $('btn-games').classList.remove('active');
    togglePanel('build', e.currentTarget);
  });

  const btnSound = $('btn-sound');
  const paintSound = () => {
    btnSound.textContent = settings.sound ? '🔊' : '🔇';
    btnSound.dataset.tip = settings.sound ? 'Sonido' : 'Sonido apagado';
  };
  btnSound.addEventListener('click', () => {
    settings.sound = !settings.sound;
    paintSound();
    saveSettings(settings);
    handlers.onSoundToggle(settings.sound);
  });
  paintSound();

  const btnPause = $('btn-pause');
  const paintPause = (paused) => {
    btnPause.textContent = paused ? '▶️' : '⏸️';
    btnPause.dataset.tip = paused ? 'Reanudar' : 'Pausar órbitas';
  };
  btnPause.addEventListener('click', () => {
    paintPause(handlers.onPauseToggle());
  });

  $('btn-style').addEventListener('click', (e) => {
    togglePanel('style', e.currentTarget);
    if (!panels.style.classList.contains('hidden')) paintStatusChips();
  });

  // --- Chips de estado de Boti (territorio adulto, solo emoji) ---
  // Se repintan cada vez que se abre el panel 🎨 con el estado real de Boti.
  function paintStatusChips() {
    const s = handlers.getBotiStatus?.();
    if (!s) return;
    const mic = $('chip-mic');
    const brain = $('chip-brain');
    const voice = $('chip-voice');
    if (!mic || !brain || !voice) return;
    const micOk = s.mic !== 'blocked' && s.mic !== 'nosupport';
    mic.textContent = micOk ? '🎤✅' : '🎤🚫';
    mic.setAttribute('aria-label', micOk
      ? 'Micrófono funcionando'
      : s.mic === 'blocked'
        ? 'Micrófono bloqueado: revisa el permiso del navegador'
        : 'Sin reconocimiento de voz: usa el teclado');
    brain.textContent = s.brain === 'ia' ? '🧠✨' : '🧠📚';
    brain.setAttribute('aria-label', s.brain === 'ia'
      ? 'Respuestas con inteligencia artificial'
      : 'Respuestas del banco local de preguntas');
    voice.textContent = s.voice === 'premium' ? '🗣️💎' : '🗣️📱';
    voice.setAttribute('aria-label', s.voice === 'premium'
      ? 'Voz premium de ElevenLabs'
      : 'Voz del navegador');
  }

  // --- Panel de personalización 🎨 ---
  const slider = $('speed-slider');
  slider.value = settings.speed;
  slider.addEventListener('input', () => {
    settings.speed = parseFloat(slider.value);
    saveSettings(settings);
    handlers.onSettingChange('speed', settings.speed);
  });

  const markActive = (selector, attr, value) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.classList.toggle('active', el.dataset[attr] === String(value));
    });
  };

  document.querySelectorAll('.star-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.stars = btn.dataset.stars;
      markActive('.star-opt', 'stars', settings.stars);
      saveSettings(settings);
      handlers.onSettingChange('stars', settings.stars);
    });
  });
  markActive('.star-opt', 'stars', settings.stars);

  document.querySelectorAll('#style-panel .swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.sky = btn.dataset.sky;
      markActive('#style-panel .swatch', 'sky', settings.sky);
      saveSettings(settings);
      handlers.onSettingChange('sky', settings.sky);
    });
  });
  markActive('#style-panel .swatch', 'sky', settings.sky);

  document.querySelectorAll('.amb-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.ambient = btn.dataset.amb;
      markActive('.amb-opt', 'amb', settings.ambient);
      saveSettings(settings);
      handlers.onSettingChange('ambient', settings.ambient);
    });
  });
  markActive('.amb-opt', 'amb', settings.ambient);

  const toggleOrbits = $('toggle-orbits');
  toggleOrbits.addEventListener('click', () => {
    settings.orbitLines = !settings.orbitLines;
    toggleOrbits.classList.toggle('active', settings.orbitLines);
    saveSettings(settings);
    handlers.onSettingChange('orbitLines', settings.orbitLines);
  });
  toggleOrbits.classList.toggle('active', settings.orbitLines);

  const toggleLabels = $('toggle-labels');
  toggleLabels.addEventListener('click', () => {
    settings.labels = !settings.labels;
    toggleLabels.classList.toggle('active', settings.labels);
    saveSettings(settings);
    handlers.onSettingChange('labels', settings.labels);
  });
  toggleLabels.classList.toggle('active', settings.labels);

  // --- Panel construye tu planeta 🪐 ---
  const buildCfg = { color: '#4f8cff', size: 1.8, rings: false, moons: 0 };
  document.querySelectorAll('.build-color').forEach((btn) => {
    btn.addEventListener('click', () => {
      buildCfg.color = btn.dataset.color;
      markActive('.build-color', 'color', buildCfg.color);
    });
  });
  markActive('.build-color', 'color', buildCfg.color);

  $('build-size').addEventListener('input', (e) => {
    buildCfg.size = parseFloat(e.target.value);
  });
  const ringsBtn = $('build-rings');
  ringsBtn.addEventListener('click', () => {
    buildCfg.rings = !buildCfg.rings;
    ringsBtn.classList.toggle('active', buildCfg.rings);
  });
  $('build-moons').addEventListener('click', () => {
    buildCfg.moons = (buildCfg.moons + 1) % 4;   // 0,1,2,3 lunas
    $('build-moons-n').textContent = buildCfg.moons;
  });
  $('build-go').addEventListener('click', () => handlers.onBuildCreate({ ...buildCfg }));
  $('build-del').addEventListener('click', () => handlers.onBuildDelete());

  // --- Álbum 📒 ---
  $('album-close').addEventListener('click', () => $('album').classList.add('hidden'));

  function showAlbum() {
    renderAlbum();
    $('album').classList.remove('hidden');
  }

  return {
    setTourActive(active) { $('btn-tour').classList.toggle('active', active); },
    setGalaxyActive(active) { $('btn-galaxy').classList.toggle('active', active); },
    setCompareActive(active) { $('btn-compare').classList.toggle('active', active); },
    setQuizActive(active) { $('btn-quiz').classList.toggle('active', active); },
    setLevelsActive(active) { $('btn-levels').classList.toggle('active', active); },
    setPaused(paused) { paintPause(paused); },
    hidePanels: closeAllPanels,
    showAlbum,
  };
}

// ---------- Álbum de pegatinas ----------
export function renderAlbum() {
  const grid = document.getElementById('album-grid');
  const unlocked = new Set(loadStickers());
  grid.innerHTML = '';
  for (const st of STICKERS) {
    const cell = document.createElement('div');
    cell.className = `sticker ${unlocked.has(st.id) ? 'unlocked' : 'locked'}`;
    cell.setAttribute('aria-label', st.name);
    cell.textContent = st.emoji;
    grid.appendChild(cell);
  }
}

/** Desbloquea una pegatina. Devuelve true si es nueva (para celebrar). */
export function unlockSticker(id) {
  const list = loadStickers();
  if (list.includes(id)) return false;
  list.push(id);
  saveStickers(list);
  return true;
}

/** Animación grande de pegatina nueva. */
export function popSticker(emoji) {
  const pop = document.getElementById('sticker-pop');
  const el = document.getElementById('sticker-pop-emoji');
  el.textContent = emoji;
  pop.classList.remove('hidden');
  // Reinicia la animación CSS
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  setTimeout(() => pop.classList.add('hidden'), 1900);
}

// ---------- Tarjeta del planeta ----------
export function showPlanetCard(def) {
  const card = document.getElementById('planet-card');
  document.getElementById('card-emoji').textContent = def.emoji;
  document.getElementById('card-name').textContent = def.name;

  // Temperatura con animación de color 🔥/🧊
  const tempEl = document.getElementById('card-temp');
  card.classList.remove('card-hot', 'card-cold');
  if (def.temp && TEMP_EMOJI[def.temp]) {
    tempEl.textContent = TEMP_EMOJI[def.temp];
    if (def.temp === 'hot' || def.temp === 'veryhot') card.classList.add('card-hot');
    if (def.temp === 'cold' || def.temp === 'verycold') card.classList.add('card-cold');
  } else {
    tempEl.textContent = '';
  }

  // Contador de lunas 🌙🌙🌙 (máximo 5 + ➕ si tiene muchas)
  const moonsEl = document.getElementById('card-moons');
  const n = def.moons ?? 0;
  moonsEl.textContent = n === 0 ? '' : '🌙'.repeat(Math.min(n, 5)) + (n > 5 ? '➕' : '');

  card.classList.remove('hidden');
}

export function setCardSpeaking(speaking) {
  document.getElementById('planet-card').classList.toggle('speaking', speaking);
}

export function hidePlanetCard() {
  const card = document.getElementById('planet-card');
  card.classList.add('hidden');
  card.classList.remove('card-hot', 'card-cold');
}

/** Tarjeta especial para preguntas del quiz. */
export function showQuestionCard() {
  showPlanetCard({ emoji: '🎯', name: '¿…?', temp: null, moons: 0 });
}
