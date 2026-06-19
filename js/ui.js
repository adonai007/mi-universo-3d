// ====== Interfaz para pre-lectores: botones grandes con emojis ======
import { TEMP_EMOJI, STICKERS, SUN, PLANETS } from './planets.js';

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
  captions: false,
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
 * onHome, onGalaxy, onEclipse, onScale, onTour, onCompare, onQuiz, onLevels,
 * onGravity, onDuo, onBuildCreate(cfg), onBuildDelete, onSoundToggle,
 * onPauseToggle, onSettingChange(key, value)
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

  // Botón flotante de eclipses 🌞🌚 (solo visible durante el modo fases 🌗)
  $('btn-eclipse').addEventListener('click', () => { closeAllPanels(); handlers.onEclipse(); });

  // Botón flotante de escala real 🏔 (solo visible con 📏 comparar o ya en escala)
  $('btn-scale').addEventListener('click', () => { closeAllPanels(); handlers.onScale(); });

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
  $('btn-gravity').addEventListener('click', () => { closeAllPanels(); handlers.onGravity(); });
  $('btn-duo').addEventListener('click', () => { closeAllPanels(); handlers.onDuo(); });
  $('duo-close').addEventListener('click', () => $('duo-picker').classList.add('hidden'));
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

  const toggleCaptions = $('toggle-captions');
  if (toggleCaptions) {
    toggleCaptions.addEventListener('click', () => {
      settings.captions = !settings.captions;
      toggleCaptions.classList.toggle('active', settings.captions);
      saveSettings(settings);
      handlers.onSettingChange('captions', settings.captions);
    });
    toggleCaptions.classList.toggle('active', settings.captions);
  }

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
    // El pasaporte se pre-renderiza: un Ctrl+P directo también imprime algo digno
    renderPassport(handlers.getProfile?.() ?? null);
    $('album').classList.remove('hidden');
  }

  // --- Pasaporte espacial 🖨️ (vive dentro del álbum) ---
  $('btn-print').addEventListener('click', () => {
    renderPassport(handlers.getProfile?.() ?? null);
    $('album').classList.add('hidden');
    $('passport').classList.remove('hidden');
    window.print();
  });
  $('passport-close').addEventListener('click', () => $('passport').classList.add('hidden'));

  // --- Overlay de fase lunar 🌗 (emoji grande sobreimpreso, sin texto) ---
  const phaseOverlay = $('phase-overlay');
  const phaseEmojiEl = $('phase-emoji');
  let lastPhaseEmoji = null;

  // --- Banner de turno 👫 (avatar grande + nombre, animación pop) ---
  let turnTimer = null;

  return {
    setTourActive(active) { $('btn-tour').classList.toggle('active', active); },
    setGalaxyActive(active) { $('btn-galaxy').classList.toggle('active', active); },
    setCompareActive(active) { $('btn-compare').classList.toggle('active', active); },
    setQuizActive(active) { $('btn-quiz').classList.toggle('active', active); },
    setLevelsActive(active) { $('btn-levels').classList.toggle('active', active); },
    setGravityActive(active) { $('btn-gravity').classList.toggle('active', active); },
    setDuoActive(active) { $('btn-duo').classList.toggle('active', active); },
    /** Banner "¡Te toca!" del quiz de a dos: avatar grande + nombre, pop. */
    showTurnBanner(player) {
      const banner = $('turn-banner');
      $('turn-avatar').textContent = player.avatar ?? '🧑‍🚀';
      $('turn-name').textContent = player.name ?? '';
      banner.classList.remove('hidden');
      // Reinicia la animación pop aunque el banner ya estuviera visible
      banner.style.animation = 'none';
      void banner.offsetWidth;
      banner.style.animation = '';
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => banner.classList.add('hidden'), 3200);
    },
    hideTurnBanner() {
      clearTimeout(turnTimer);
      $('turn-banner').classList.add('hidden');
    },
    /** Overlay 👫: lista de jugadores (reusa .welcome-profiles/.profile-opt). */
    showDuoPicker(players, onPick) {
      const box = $('duo-list');
      box.innerHTML = '';
      players.forEach((p, i) => {
        const btn = document.createElement('button');
        btn.className = 'profile-opt';
        btn.setAttribute('aria-label', `Jugar con ${p.name}`);
        const avatar = document.createElement('span');
        avatar.className = 'profile-avatar';
        avatar.textContent = p.avatar ?? '🧑‍🚀';
        const name = document.createElement('span');
        name.className = 'profile-name';
        name.textContent = p.name ?? '';
        btn.append(avatar, name);
        btn.addEventListener('click', () => onPick(i));
        box.appendChild(btn);
      });
      $('duo-picker').classList.remove('hidden');
    },
    hideDuoPicker() { $('duo-picker').classList.add('hidden'); },
    setEclipseButtonVisible(v) { $('btn-eclipse').classList.toggle('hidden', !v); },
    setScaleButtonVisible(v) { $('btn-scale').classList.toggle('hidden', !v); },
    setScaleActive(active) { $('btn-scale').classList.toggle('active', active); },
    /** Se llama por frame: solo toca el DOM cuando el emoji cambia. */
    setPhaseEmoji(emoji) {
      if (phaseOverlay.classList.contains('hidden')) phaseOverlay.classList.remove('hidden');
      if (emoji !== lastPhaseEmoji) {
        lastPhaseEmoji = emoji;
        phaseEmojiEl.textContent = emoji;
      }
    },
    hidePhaseOverlay() {
      phaseOverlay.classList.add('hidden');
      lastPhaseEmoji = null;
    },
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

// ---------- Pasaporte espacial 🖨️ ----------
const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Fecha amable para los sellos: '2026-06-12' → '12 jun 2026'. */
function prettyDate(iso) {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  if (!y || !m || !d) return '';
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${MESES[m - 1]} ${y}`;
}

/**
 * Pinta el pasaporte del perfil en #passport-page: avatar + nombre, sellos del
 * Sol y los 8 planetas (con fecha si hay p.visits; si no, vale la pegatina
 * visit-{id} de partidas viejas), pegatinas ganadas y pie de certificación.
 * Lo que se imprime con window.print() es exactamente esto (CSS @media print).
 */
export function renderPassport(profile) {
  const page = document.getElementById('passport-page');
  const visits = profile?.visits ?? {};
  const unlocked = new Set(loadStickers());
  const stamps = [SUN, ...PLANETS].map((b) => {
    const v = visits[b.id];
    const visited = !!v || unlocked.has(`visit-${b.id}`);
    if (!visited) {
      return `<div class="pass-stamp pending" aria-label="${b.name}: todavía sin visitar">
        <span class="pass-stamp-emoji">❔</span>
        <span class="pass-stamp-name">${b.name}</span>
      </div>`;
    }
    const date = v?.last ? `<span class="pass-stamp-date">${prettyDate(v.last)}</span>` : '';
    return `<div class="pass-stamp visited" aria-label="${b.name}: visitado">
      <span class="pass-stamp-emoji">${b.emoji}</span>
      <span class="pass-stamp-name">${b.name}</span>
      ${date}
    </div>`;
  }).join('');
  const stickers = STICKERS.filter((s) => unlocked.has(s.id))
    .map((s) => `<span class="pass-sticker" aria-label="${s.name}">${s.emoji}</span>`).join('')
    || '<span class="pass-none">Todavía sin pegatinas… ¡a explorar! 🚀</span>';
  page.innerHTML = `
    <div class="pass-header">
      <span class="pass-avatar">${profile?.avatar ?? '🧑‍🚀'}</span>
      <div class="pass-id">
        <span class="pass-name">${escapeHTML(profile?.name ?? 'Astronauta')}</span>
        <span class="pass-title">🚀 Pasaporte Espacial 🪐</span>
      </div>
      <span class="pass-deco">🌟</span>
    </div>
    <div class="pass-stamps">${stamps}</div>
    <div class="pass-sub">✨ Mis pegatinas</div>
    <div class="pass-stickers">${stickers}</div>
    <div class="pass-foot">🧑‍🚀 Astronauta certificado · Mi Universo 🌌</div>
  `;
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
