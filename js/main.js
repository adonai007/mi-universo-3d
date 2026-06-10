// ====== Mi Universo — punto de entrada y orquestación de modos ======
import { SolarSystem } from './scene.js';
import {
  SUN, PLANETS, MOON, MOON_PHASES, EXTRAS, GALAXY_FACT,
  QUIZ_QUESTIONS, QUIZ_LEVELS, STICKERS,
} from './planets.js';
import * as audio from './audio.js';
import {
  loadSettings, saveSettings, initUI,
  showPlanetCard, hidePlanetCard, setCardSpeaking, showQuestionCard,
  loadCustomPlanets, saveCustomPlanets,
  loadQuizLevel, saveQuizLevel, loadMission, saveMission,
  unlockSticker, popSticker, renderAlbum,
} from './ui.js';

// --- Comprobación de WebGL ---
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
if (!hasWebGL()) {
  document.getElementById('no-webgl').classList.remove('hidden');
  throw new Error('WebGL no disponible');
}

// --- Inicialización ---
const settings = loadSettings();
const canvas = document.getElementById('space');
const system = new SolarSystem(canvas);

audio.setMuted(!settings.sound);
system.setSpeedFactor(settings.speed);
system.buildStars(settings.stars);
system.setSkyColor(settings.sky);
system.setAmbient(settings.ambient);
system.setOrbitLinesVisible(settings.orbitLines);
system.setLabelsVisible(settings.labels);

// Estado global de modos: 'free' | 'tour' | 'compare' | 'galaxy' | 'quiz' | 'levels' | 'moon'
let mode = 'free';
let visitToken = 0;       // cancela narraciones al cambiar de destino
let tourAbort = null;
let quizState = null;     // { questions, idx, correct, level? }
const customConfigs = loadCustomPlanets();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- pegatinas ----------
function award(id) {
  const st = STICKERS.find((s) => s.id === id);
  if (!st) return;
  if (unlockSticker(id)) {
    audio.fanfare();
    popSticker(st.emoji);
  }
}

// ---------- narración por partes (datos de a uno, con pausa) ----------
async function speakFacts(def, token) {
  setCardSpeaking(true);
  let spoke = await audio.speak(def.name + '.');
  for (const fact of def.facts) {
    if (token !== visitToken) break;
    spoke = (await audio.speak(fact)) || spoke;
    if (token !== visitToken) break;
    await delay(380);
  }
  // Lección día/noche al visitar la Tierra
  if (def.dayNightFact && token === visitToken) {
    await audio.speak(def.dayNightFact);
  }
  setCardSpeaking(false);
  if (!spoke) await delay(2500);   // sin voz: apoyo visual extra
}

// ---------- visitar un objeto (planeta, Sol, ISS, rover, estrellas...) ----------
async function visitPlanet(def, { fromTour = false } = {}) {
  if (!fromTour) stopTour();
  const token = ++visitToken;
  audio.stopSpeaking();
  audio.blip(def.pitch);
  audio.whoosh();
  showPlanetCard(def);
  system.celebrate(def);
  audio.twinkle();

  await new Promise((resolve) => system.flyTo(def, resolve));
  if (token !== visitToken) return;

  audio.playMelody(def.id);        // 🎵 melodía propia del planeta
  await speakFacts(def, token);
  if (token !== visitToken) return;

  // Pegatina por visita + misión del día
  if (def.id === 'sol' || PLANETS.some((p) => p.id === def.id)) {
    award(`visit-${def.id}`);
  }
  checkMission(def);
}

// ---------- misión del día 📅 ----------
const today = new Date().toISOString().slice(0, 10);
const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const missionDef = PLANETS[dayOfYear % PLANETS.length];
let missionState = loadMission();
if (missionState.date !== today) missionState = { date: today, done: false };
let missionAnnounced = false;

if (!missionState.done) system.setMissionTarget(missionDef.id);

function announceMissionOnce() {
  if (missionAnnounced || missionState.done) return;
  missionAnnounced = true;
  audio.speak(`¡Misión de hoy! Vamos a explorar ${missionDef.name}. ¡Busca la estrella dorada que rebota!`);
}

function checkMission(def) {
  if (missionState.done || def.id !== missionDef.id) return;
  missionState.done = true;
  saveMission(missionState);
  system.clearMissionTarget();
  system.celebrate(def);
  audio.fanfare();
  award('mission');
  audio.speak('¡Misión cumplida, astronauta! ¡Lo hiciste genial!');
}

// ---------- paseo guiado 🚀 ----------
async function startTour() {
  exitSpecialModes();
  mode = 'tour';
  ui.setTourActive(true);
  audio.twinkle();
  const stops = [SUN, ...PLANETS];
  let aborted = false;
  tourAbort = () => { aborted = true; };

  for (const def of stops) {
    if (aborted) break;
    if (def.tourIntro) {
      setCardSpeaking(true);
      await audio.speak(def.tourIntro);   // frase puente: "volamos más lejos..."
      setCardSpeaking(false);
    }
    if (aborted) break;
    await visitPlanet(def, { fromTour: true });
    if (aborted) break;
    await delay(700);
  }

  if (!aborted) {
    award('tour');
    await audio.speak('¡Fin del paseo! ¡Hasta pronto, astronauta!');
    hidePlanetCard();
    system.resetView();
  }
  if (mode === 'tour') mode = 'free';
  tourAbort = null;
  ui.setTourActive(false);
}

function stopTour() {
  if (tourAbort) tourAbort();
  audio.stopSpeaking();
  setCardSpeaking(false);
  if (mode === 'tour') mode = 'free';
  tourAbort = null;
  ui.setTourActive(false);
}

// ---------- modo comparación 📏 ----------
async function toggleCompare() {
  if (mode === 'compare') { exitSpecialModes(); system.resetView(); return; }
  exitSpecialModes();
  mode = 'compare';
  ui.setCompareActive(true);
  ++visitToken;
  hidePlanetCard();
  audio.whoosh();
  await new Promise((r) => system.enterCompare(r));
  if (mode !== 'compare') return;
  setCardSpeaking(true);
  await audio.speak('¡Mira! Puse a todos en fila para comparar tamaños. ¡Júpiter es gigante: dentro caben más de mil Tierras! Toca cada uno para escucharlo.');
  setCardSpeaking(false);
}

// ---------- modo galaxia 🌌 ----------
async function toggleGalaxy() {
  if (mode === 'galaxy') { exitSpecialModes(); system.resetView(); return; }
  exitSpecialModes();
  mode = 'galaxy';
  ui.setGalaxyActive(true);
  ++visitToken;
  hidePlanetCard();
  audio.whoosh();
  await new Promise((r) => system.enterGalaxy(r));
  if (mode !== 'galaxy') return;
  setCardSpeaking(true);
  await audio.speak(GALAXY_FACT + ' Toca las estrellas de colores y el agujero negro.');
  setCardSpeaking(false);
}

// ---------- fases de la Luna 🌗 ----------
async function enterMoonMode() {
  exitSpecialModes();
  mode = 'moon';
  const token = ++visitToken;
  audio.blip(MOON.pitch);
  audio.whoosh();
  showPlanetCard(MOON);
  system.celebrate(MOON);
  system.controls.enableRotate = false;    // el arrastre mueve la Luna
  await new Promise((r) => system.enterMoonPhase(r));
  if (token !== visitToken) return;
  setCardSpeaking(true);
  await audio.speak(
    'Soy la Luna. Arrástrame con tu dedo alrededor de la Tierra y mira cómo cambio de forma. ' +
    'El Sol siempre ilumina una mitad.'
  );
  setCardSpeaking(false);
  if (token === visitToken) speakMoonPhase(true);
}

let lastPhase = null;
let lastPhaseSpeak = 0;
function speakMoonPhase(force = false) {
  const phase = system.currentMoonPhase();
  const now = performance.now();
  if (!force && (phase === lastPhase || now - lastPhaseSpeak < 2500)) { lastPhase = phase; return; }
  lastPhase = phase;
  lastPhaseSpeak = now;
  audio.speak(MOON_PHASES[phase]);
  showPlanetCard({ ...MOON, name: 'Luna ' + phase });
}

// ---------- quiz simple 🎯 y quiz por niveles 🏆 ----------
function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

async function startQuiz() {
  if (mode === 'quiz') { exitSpecialModes(); return; }
  exitSpecialModes();
  mode = 'quiz';
  ui.setQuizActive(true);
  system.resetView();          // vista completa: se ven todos los planetas
  quizState = {
    questions: shuffled(QUIZ_QUESTIONS).slice(0, 5)
      .map((q) => ({ q: q.question, answers: [q.answer], hint: q.hint })),
    idx: 0, correct: 0, kind: 'quiz',
  };
  showQuestionCard();
  await audio.speak('¡Vamos a jugar! Yo pregunto y tú tocas el planeta.');
  askCurrent();
}

async function startLevels() {
  if (mode === 'levels') { exitSpecialModes(); return; }
  exitSpecialModes();
  mode = 'levels';
  ui.setLevelsActive(true);
  system.resetView();          // vista completa: se ven todos los planetas
  const saved = loadQuizLevel();
  const lvl = Math.min(saved.level, QUIZ_LEVELS.length - 1);
  if (saved.level >= QUIZ_LEVELS.length) {
    await audio.speak('¡Ya completaste todos los niveles! ¡Eres un gran astronauta! Vamos a jugar el último otra vez.');
  }
  const levelData = QUIZ_LEVELS[lvl];
  quizState = {
    questions: shuffled(levelData.questions).map((q) => ({ q: q.q, answers: q.answers, hint: q.hint })),
    idx: 0, correct: 0, kind: 'levels', level: lvl,
  };
  showQuestionCard();
  await audio.speak(levelData.intro);
  askCurrent();
}

function askCurrent() {
  if (!quizState) return;
  const q = quizState.questions[quizState.idx % quizState.questions.length];
  audio.speak(q.q);
}

async function handleQuizTap(def) {
  if (!quizState) return;
  const q = quizState.questions[quizState.idx % quizState.questions.length];
  system.markUserActivity();
  if (q.answers.includes(def.id)) {
    quizState.correct++;
    quizState.idx++;
    audio.success();
    system.celebrate(def);
    showPlanetCard(def);
    await audio.speak(`¡Muy bien! ¡Es ${def.name}! ¡Bravo!`);
    if (!quizState) return;

    if (quizState.kind === 'quiz' && quizState.idx >= quizState.questions.length) {
      award('quiz');
      await audio.speak('¡Ganaste! ¡Eres una súper exploradora o un súper explorador!');
      exitSpecialModes();
      return;
    }
    if (quizState.kind === 'levels' && quizState.correct >= 3) {
      const lvl = quizState.level;
      const saved = loadQuizLevel();
      if (saved.level === lvl) saveQuizLevel({ level: lvl + 1 });
      award(`level-${lvl + 1}`);
      await audio.speak('¡Tres aciertos! ¡Subiste de nivel! ¡Fantástico!');
      exitSpecialModes();
      return;
    }
    showQuestionCard();
    askCurrent();
  } else {
    // Error: pista amable, sin penalización
    audio.gentle();
    await audio.speak(q.hint);
    if (quizState) askCurrent();
  }
}

// ---------- salir de modos especiales ----------
function exitSpecialModes() {
  stopTour();
  ++visitToken;
  if (system.compareActive) system.exitCompare();
  if (system.galaxyActive) system.exitGalaxy();
  if (system.moonPhaseActive) {
    system.exitMoonPhase();
    system.controls.enableRotate = true;
  }
  quizState = null;
  mode = 'free';
  ui.setCompareActive(false);
  ui.setGalaxyActive(false);
  ui.setQuizActive(false);
  ui.setLevelsActive(false);
  audio.stopSpeaking();
  audio.stopMelody();
  setCardSpeaking(false);
}

// ---------- interfaz ----------
const ui = initUI(settings, {
  onHome() {
    exitSpecialModes();
    audio.whoosh();
    hidePlanetCard();
    system.resetView();
    system.markUserActivity();
  },
  onGalaxy: toggleGalaxy,
  onTour() {
    if (mode === 'tour') stopTour();
    else startTour();
  },
  onCompare: toggleCompare,
  onQuiz: startQuiz,
  onLevels: startLevels,
  onSoundToggle(on) {
    audio.setMuted(!on);
    if (on) audio.twinkle();
    setCardSpeaking(false);
  },
  onPauseToggle() {
    system.paused = !system.paused;
    audio.click();
    return system.paused;
  },
  async onBuildCreate(cfg) {
    exitSpecialModes();
    const def = system.addCustomPlanet({
      color: parseInt(cfg.color.slice(1), 16),
      size: cfg.size,
      rings: cfg.rings,
      moons: cfg.moons,
    });
    customConfigs.push(cfg);
    saveCustomPlanets(customConfigs);
    award('create');
    audio.twinkle();
    system.celebrate(def);
    showPlanetCard(def);
    await new Promise((r) => system.flyTo(def, r));
    audio.speak('¡Mira! ¡Tu planeta! Lo hiciste tú solito y ahora gira en el espacio.');
  },
  onBuildDelete() {
    if (system.removeLastCustomPlanet()) {
      customConfigs.pop();
      saveCustomPlanets(customConfigs);
      audio.click();
      audio.speak('Adiós, planetita. ¡Puedes hacer otro cuando quieras!');
      hidePlanetCard();
    }
  },
  onSettingChange(key, value) {
    audio.click();
    switch (key) {
      case 'speed': system.setSpeedFactor(value); break;
      case 'stars': system.buildStars(value); break;
      case 'sky': system.setSkyColor(value); break;
      case 'ambient': system.setAmbient(value); break;
      case 'orbitLines': system.setOrbitLinesVisible(value); break;
      case 'labels': system.setLabelsVisible(value); break;
    }
  },
});

// El niño se alejó mucho con la rueda/pellizco: la escena soltó el planeta.
// Dejamos todo consistente: sin tarjeta, sin narración, modo libre.
system.onDeselect = () => {
  ++visitToken;             // cancela la narración en curso
  audio.stopSpeaking();
  audio.stopMelody();
  setCardSpeaking(false);
  hidePlanetCard();
  if (mode === 'tour') stopTour();
  if (mode === 'moon') {
    system.exitMoonPhase();
    system.controls.enableRotate = true;
    mode = 'free';
  }
  if (mode !== 'compare' && mode !== 'galaxy' && mode !== 'quiz' && mode !== 'levels') {
    mode = 'free';
  }
};

// Recrear los planetas guardados del niño
for (const cfg of customConfigs) {
  system.addCustomPlanet({
    color: parseInt(cfg.color.slice(1), 16),
    size: cfg.size,
    rings: cfg.rings,
    moons: cfg.moons,
  });
}

// ---------- estrellas fugaces 🌠 ----------
function scheduleShootingStar() {
  const wait = 30000 + Math.random() * 30000;   // cada 30-60 s
  setTimeout(() => {
    if (!document.hidden && (mode === 'free' || mode === 'galaxy') && !system.paused) {
      system.spawnShootingStar();
    }
    scheduleShootingStar();
  }, wait);
}
scheduleShootingStar();

// ---------- tocar / arrastrar ----------
let downPos = null;
let downTime = 0;
let lastDragX = null;

canvas.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
  downTime = performance.now();
  lastDragX = e.clientX;
  system.markUserActivity();
});

canvas.addEventListener('pointermove', (e) => {
  if (mode === 'moon' && downPos !== null && lastDragX !== null) {
    // Arrastrar mueve la Luna alrededor de la Tierra
    const dx = e.clientX - lastDragX;
    lastDragX = e.clientX;
    system.nudgeMoon(dx * 0.012);
    speakMoonPhase();
  }
});

canvas.addEventListener('pointerup', (e) => {
  system.markUserActivity();
  announceMissionOnce();
  if (!downPos) return;
  const dx = e.clientX - downPos.x;
  const dy = e.clientY - downPos.y;
  const isTap = Math.hypot(dx, dy) < 12 && performance.now() - downTime < 600;
  downPos = null;
  lastDragX = null;
  if (!isTap) return;

  const def = system.pick(e.clientX, e.clientY);
  if (!def) return;
  ui.hidePanels();

  // Estrella fugaz: ¡atrápala a tiempo!
  if (def.id === 'fugaz') {
    system.catchShootingStar();
    audio.twinkle();
    showPlanetCard(def);
    award('wish');
    audio.speak(def.facts[0]);
    return;
  }

  if (mode === 'quiz' || mode === 'levels') { handleQuizTap(def); return; }

  if (mode === 'compare') {
    // En fila: cada toque dice su frase de tamaño
    audio.blip(def.pitch);
    showPlanetCard(def);
    audio.speak(`${def.name}. ${def.sizeFact ?? ''}`);
    return;
  }

  if (def.id === 'luna') {
    if (mode === 'moon') speakMoonPhase(true);   // ya estamos jugando: repite la fase
    else enterMoonMode();
    return;
  }

  if (mode === 'moon') exitSpecialModes();       // salir del juego lunar al tocar otra cosa
  visitPlanet(def);
});

// Evitar menú contextual y gestos de zoom del navegador
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------- bucle de animación ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  system.update(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => saveSettings(settings));

// Gancho mínimo para pruebas automatizadas (no afecta el uso normal)
window.__universo = {
  system,
  visit: (id) => {
    const def = [SUN, MOON, ...PLANETS, ...Object.values(EXTRAS)].find((d) => d.id === id);
    if (def) visitPlanet(def);
  },
  moonMode: () => enterMoonMode(),
};
