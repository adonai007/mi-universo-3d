// ====== Mi Universo — punto de entrada y orquestación de modos ======
import { SolarSystem } from './scene.js';
import {
  SUN, PLANETS, MOON, MOON_PHASES, MOON_PHASE_INTRO, moonPhaseEmoji,
  ECLIPSE_SCRIPT, EXTRAS, GALAXY_FACT, GRAVITY,
  QUIZ_QUESTIONS, QUIZ_LEVELS, STICKERS,
} from './planets.js';
import * as audio from './audio.js';
import { initBoti } from './boti.js';
import { initHelp } from './help.js';
import { initSky } from './sky.js';
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

// Estado global de modos: 'free' | 'tour' | 'compare' | 'galaxy' | 'quiz' | 'levels'
//                       | 'quiz2' | 'gravity' | 'moon' | 'eclipse' | 'scale'
let mode = 'free';
let visitToken = 0;       // cancela narraciones al cambiar de destino
let tourAbort = null;
let quizState = null;     // { questions, idx, correct, kind, level?, players?, turn? }
const customConfigs = loadCustomPlanets();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Boti Bot 🤖 (perfiles + bienvenida + micrófono) ----------
const boti = initBoti();

// ---------- Modo ayuda 🆘 (Boti guía + spotlight) ----------
// Boti es el narrador; el recorrido ilumina cada botón. Se lanza desde el ❓,
// desde la voz ("ayuda"/"¿cómo se juega?") y solo la 1ª vez en el aparato.
const help = initHelp({ speak: boti.speak, stopSpeech: boti.stopAllSpeech });
boti.setHelpHandler(() => help.start());

const btnHelp = document.createElement('button');
btnHelp.id = 'btn-help';
btnHelp.className = 'big-btn';
btnHelp.textContent = '❓';
btnHelp.dataset.tip = 'Ayuda: Boti te enseña a jugar';
btnHelp.setAttribute('aria-label', 'Ayuda: Boti te enseña a jugar');
btnHelp.addEventListener('click', () => help.start());
document.body.appendChild(btnHelp);

// ---------- Cielo real 🔭 (AR por sensores, módulo aislado) ----------
// Apunta el celular al cielo y Boti dice qué estrella/planeta es. No toca la
// escena ni los modos: overlay propio + efeméride real. Degrada solo si no hay
// brújula/permiso/GPS.
const sky = initSky({ speak: boti.speak, stopSpeech: boti.stopAllSpeech });
const btnSky = document.createElement('button');
btnSky.id = 'btn-sky';
btnSky.className = 'big-btn';
btnSky.textContent = '🔭';
btnSky.dataset.tip = 'Cielo real: apunta al cielo';
btnSky.setAttribute('aria-label', 'Cielo real: apunta el celular al cielo y Boti te dice qué es');
btnSky.addEventListener('click', () => sky.start());
document.body.appendChild(btnSky);

// ---------- pegatinas ----------
function award(id) {
  const st = STICKERS.find((s) => s.id === id);
  if (!st) return;
  if (unlockSticker(id)) {
    audio.fanfare();
    popSticker(st.emoji);
    boti.celebrateSticker();
  }
}

// ---------- narración por partes (datos de a uno, con pausa) ----------
// Además del token de visita, vigila la generación global de habla: si el
// micrófono 🎤 (o el 🔇) interrumpe, NO se lanza la siguiente frase.
async function speakFacts(def, token) {
  const gen = audio.getSpeechGen();
  setCardSpeaking(true);
  let spoke = await audio.speak(def.name + '.');
  for (const fact of def.facts) {
    if (token !== visitToken || gen !== audio.getSpeechGen()) break;
    spoke = (await audio.speak(fact)) || spoke;
    if (token !== visitToken || gen !== audio.getSpeechGen()) break;
    await delay(380);
  }
  // Lección día/noche al visitar la Tierra
  if (def.dayNightFact && token === visitToken && gen === audio.getSpeechGen()) {
    await audio.speak(def.dayNightFact);
  }
  setCardSpeaking(false);
  if (!spoke && gen === audio.getSpeechGen()) await delay(2500);   // sin voz: apoyo visual extra
}

// ---------- visitar un objeto (planeta, Sol, ISS, rover, estrellas...) ----------
async function visitPlanet(def, { fromTour = false } = {}) {
  if (!fromTour) stopTour();
  const token = ++visitToken;
  const gen = audio.getSpeechGen();   // si el mic/🔇 interrumpe, paramos aquí también
  audio.stopSpeaking();
  audio.blip(def.pitch);
  audio.whoosh();
  showPlanetCard(def);
  system.celebrate(def);
  audio.twinkle();

  // Al visitar el agujero negro, una estrellita cae y se espaguetiza 🍝:
  // así el niño VE lo que la narración va contando.
  if (def.id === 'agujero') system.feedBlackHole();

  await new Promise((resolve) => system.flyTo(def, resolve));
  if (token !== visitToken || gen !== audio.getSpeechGen()) return;

  // Al llegar a la ISS, un astronauta 🧑‍🚀 sale a saludar (~6 s)
  if (def.id === 'iss') system.showAstronautWave();

  audio.playMelody(def.id);        // 🎵 melodía propia del planeta
  await speakFacts(def, token);
  if (token !== visitToken || gen !== audio.getSpeechGen()) return;

  // Memoria del perfil 💙: cuenta la visita completa (favorito + pasaporte 🖨️)
  boti.recordVisit(def.id);

  // Pegatina por visita + misiones del día (también ISS 🛰️ y cometa ☄️)
  if (def.id === 'sol' || def.id === 'iss' || def.id === 'cometa'
    || PLANETS.some((p) => p.id === def.id)) {
    award(`visit-${def.id}`);
  }
  checkMissionProgress({ type: 'visit', id: def.id, def });
  // De vez en cuando Boti comenta el planeta (tras la narración)
  if (!fromTour && token === visitToken) boti.maybeCommentPlanet(def);
}

// ---------- misiones del día 📅 (3 por día: visitar ⭐ + encontrar 🔭 + quiz 🎯) ----------
const today = new Date().toISOString().slice(0, 10);
const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const missionDef = PLANETS[dayOfYear % PLANETS.length];   // mismo cálculo de siempre: la ⭐ no cambia
const findTarget = ['iss', 'rover', 'cometa'][dayOfYear % 3];

function freshMissions() {
  return {
    date: today,
    missions: [
      { type: 'visit', target: missionDef.id, done: false },
      { type: 'find', target: findTarget, done: false },
      { type: 'quiz', done: false },
    ],
  };
}

// Migración suave desde el shape viejo {date, done}: mismo dayOfYear → misma
// misión de visita, y su done se preserva (quien ya la cumplió hoy no la repite).
let missionState = loadMission();
if (missionState.date !== today) {
  missionState = freshMissions();
  saveMission(missionState);
} else if (!Array.isArray(missionState.missions)) {
  const visitDone = missionState.done === true;
  missionState = freshMissions();
  missionState.missions[0].done = visitDone;
  saveMission(missionState);
}
let missionAnnounced = false;

// La estrella dorada ⭐ señala SOLO la misión de visita
if (!missionState.missions[0].done) system.setMissionTarget(missionDef.id);

// Frase de anuncio por tipo (pre-lectores: la voz es la única guía)
function missionPhrase(m) {
  if (m.type === 'visit') {
    return `¡Misión de hoy! Vamos a explorar ${missionDef.name}. ¡Busca la estrella dorada que rebota!`;
  }
  if (m.type === 'find') {
    return '¡Nueva misión! ' + {
      iss: '¡Busca la Estación Espacial! Da vueltas a la Tierra.',
      rover: '¡Busca el robot explorador! Trabaja en Marte, el planeta rojo.',
      cometa: '¡Busca el cometa! Viaja por el espacio con su cola brillante.',
    }[m.target];
  }
  return '¡Nueva misión! Gana un juego de adivinar planetas. ¡Está en el cajón de juegos!';
}

function announceMissionOnce() {
  if (missionAnnounced) return;
  const next = missionState.missions.find((m) => !m.done);
  if (!next) return;
  missionAnnounced = true;
  audio.speak(missionPhrase(next));
}

// Generaliza el checkMission viejo: un evento ({type:'visit', id} o {type:'quiz'})
// completa la misión pendiente que corresponda. La 1ª del día da la pegatina ✅
// (semántica vieja); las 3 dan la 🌟 + celebración grande. Al completar una,
// Boti anuncia la siguiente.
async function checkMissionProgress(evt) {
  const m = missionState.missions.find((x) => !x.done && (
    x.type === 'quiz' ? evt.type === 'quiz' : evt.type === 'visit' && evt.id === x.target));
  if (!m) return;
  m.done = true;
  saveMission(missionState);
  if (m.type === 'visit') system.clearMissionTarget();
  if (evt.def) system.celebrate(evt.def);
  audio.fanfare();
  const gen = audio.getSpeechGen();   // el mic 🎤 / 🔇 corta la cadena de frases
  const doneCount = missionState.missions.filter((x) => x.done).length;
  if (doneCount === 1) award('mission');
  if (doneCount >= missionState.missions.length) {
    // 🎉 celebración grande: pegatina estrella + confeti doble + estrella fugaz
    award('mission-star');
    if (evt.def) system.celebrate(evt.def);
    system.spawnShootingStar();
    audio.fanfare();
    await audio.speak('¡Cumpliste las TRES misiones de hoy! ¡Eres una superestrella del espacio!');
    return;
  }
  await audio.speak('¡Misión cumplida, astronauta! ¡Lo hiciste genial!');
  if (gen !== audio.getSpeechGen()) return;
  const next = missionState.missions.find((x) => !x.done);
  if (next) {
    await delay(350);
    if (gen === audio.getSpeechGen()) audio.speak(missionPhrase(next));
  }
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
  // Generación de habla capturada DESPUÉS de exitSpecialModes: apretar el mic
  // (o el 🔇) la sube y mata la frase actual Y el avance a la siguiente parada.
  // Los speaks del propio tour no la tocan, así que no se auto-aborta.
  const gen = audio.getSpeechGen();
  const interrupted = () => aborted || gen !== audio.getSpeechGen();

  for (const def of stops) {
    if (interrupted()) break;
    if (def.tourIntro) {
      setCardSpeaking(true);
      await audio.speak(def.tourIntro);   // frase puente: "volamos más lejos..."
      setCardSpeaking(false);
    }
    if (interrupted()) break;
    await visitPlanet(def, { fromTour: true });
    if (interrupted()) break;
    await delay(700);
  }

  if (!interrupted()) {
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
  ui.setScaleButtonVisible(true);   // 🏔 "¿y las distancias de verdad?"
  ++visitToken;
  hidePlanetCard();
  audio.whoosh();
  await new Promise((r) => system.enterCompare(r));
  if (mode !== 'compare') return;
  setCardSpeaking(true);
  await audio.speak('¡Mira! Puse a todos en fila para comparar tamaños. ¡Júpiter es gigante: dentro caben más de mil Tierras! Toca cada uno para escucharlo.');
  setCardSpeaking(false);
}

// ---------- modo escala real 🏔 (se lanza desde el botón flotante del modo comparar) ----------
// Las distancias DE VERDAD: el dibujo normal las comprime para verlos juntos.
// Mismo patrón de aborto del tour: token + generación de habla.
async function toggleScale() {
  if (mode === 'scale') { exitSpecialModes(); system.resetView(); return; }
  if (mode !== 'compare') return;          // el 🏔 solo vive junto al 📏
  exitSpecialModes();                      // sale de comparar (y de todo lo demás)
  mode = 'scale';
  const token = ++visitToken;
  const gen = audio.getSpeechGen();        // el mic 🎤 corta la narración wow
  ui.setScaleActive(true);
  ui.setScaleButtonVisible(true);          // sigue a la vista para poder volver
  hidePlanetCard();
  audio.whoosh();
  await new Promise((r) => system.enterScale(r));
  if (token !== visitToken || mode !== 'scale') return;
  setCardSpeaking(true);
  await audio.speak('¡Guau! ¡Así de lejos viven DE VERDAD los planetas! Desde Neptuno, el Sol se ve como una estrellita chiquitita.');
  if (token === visitToken && gen === audio.getSpeechGen()) {
    await audio.speak('Por eso los dibujamos más cerca: ¡para poder verlos a todos juntos!');
  }
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
// La Luna recorre su órbita acelerada (ciclo ~22 s) y el ciclo REAL se ve:
// la mitad iluminada por el Sol cambia sola (la luz de la escena es física).
// Patrón de aborto del tour: token + generación de habla. El arrastre del
// niño sigue funcionando encima del auto-giro.
let moonNarrGen = -1;   // generación de habla que tiene permiso de narrar fases
async function enterMoonMode() {
  exitSpecialModes();
  mode = 'moon';
  const token = ++visitToken;
  const gen = audio.getSpeechGen();   // el mic 🎤 corta intro y narración automática
  audio.blip(MOON.pitch);
  audio.whoosh();
  showPlanetCard(MOON);
  system.celebrate(MOON);
  system.controls.enableRotate = false;    // el arrastre mueve la Luna
  await new Promise((r) => system.enterMoonPhase(r));
  if (token !== visitToken) return;
  ui.setEclipseButtonVisible(true);        // 🌞🌚 "¿y si se alinean?" → eclipses
  setCardSpeaking(true);
  await audio.speak(MOON_PHASE_INTRO);
  setCardSpeaking(false);
  if (token !== visitToken) return;
  system.setMoonAutoOrbit(true);           // el ciclo se VE siempre (narre o no)
  moonNarrGen = gen;                       // si el mic interrumpió, narración muda
  if (gen === audio.getSpeechGen()) speakMoonPhase(true);
}

let lastPhase = null;
let lastPhaseSpeak = 0;
function speakMoonPhase(force = false) {
  const phase = system.currentMoonPhase();
  const now = performance.now();
  // OJO: no actualizar lastPhase en el return temprano — si la fase cambia
  // durante el cooldown, se anuncia apenas el cooldown termina (sin tragársela).
  if (!force && (phase === lastPhase || now - lastPhaseSpeak < 2500)) return;
  lastPhase = phase;
  lastPhaseSpeak = now;
  audio.speak(MOON_PHASES[phase]);
  showPlanetCard({ ...MOON, name: 'Luna ' + phase });
}

// ---------- eclipses 🌞🌚 (se lanza desde el botón flotante del modo fases) ----------
async function startEclipse() {
  if (mode !== 'moon') return;             // el botón solo vive en el modo fases
  mode = 'eclipse';
  const token = ++visitToken;              // NO exitSpecialModes: seguimos en fases
  const gen = audio.getSpeechGen();
  const interrupted = () => token !== visitToken || gen !== audio.getSpeechGen();
  // Si interrumpe el mic 🎤 (gen): volver a fases sin narrar. Si fue 🏠 u otro
  // modo (token): exitSpecialModes ya dejó todo limpio y aquí no se toca nada.
  const abort = () => {
    setCardSpeaking(false);
    if (token !== visitToken) return;
    system.exitEclipse();
    backToPhases(token, { silent: true });
  };
  ui.setEclipseButtonVisible(false);
  audio.whoosh();
  showPlanetCard({ ...MOON, name: 'Eclipse', emoji: '🌞🌚' });
  setCardSpeaking(true);
  await audio.speak(ECLIPSE_SCRIPT.intro);
  if (interrupted()) return abort();

  // --- eclipse de SOL: la sombra de la Luna viaja por la Tierra ---
  await new Promise((r) => system.enterEclipse('solar', r));
  if (interrupted()) return abort();
  await audio.speak(ECLIPSE_SCRIPT.solar1);
  if (interrupted()) return abort();
  const solarDone = new Promise((r) => system.sweepEclipse('solar', r));
  await audio.speak(ECLIPSE_SCRIPT.solar2);
  await solarDone;                         // la mancha termina su paseo
  if (interrupted()) return abort();

  // --- eclipse de LUNA: la Luna entra en la sombra de la Tierra ---
  await audio.speak(ECLIPSE_SCRIPT.lunar1);
  if (interrupted()) return abort();
  await new Promise((r) => system.enterEclipse('lunar', r));
  if (interrupted()) return abort();
  const lunarDone = new Promise((r) => system.sweepEclipse('lunar', r));
  await audio.speak(ECLIPSE_SCRIPT.lunar2);
  if (!interrupted()) await audio.speak(ECLIPSE_SCRIPT.lunar3);
  await lunarDone;                         // la Luna sale de la sombra
  if (interrupted()) return abort();

  await audio.speak(ECLIPSE_SCRIPT.outro);
  setCardSpeaking(false);
  if (interrupted()) return abort();
  system.exitEclipse();
  backToPhases(token, { silent: false });
}

/** Vuelve del eclipse a la lección de fases (cámara, auto-órbita y botón). */
function backToPhases(token, { silent }) {
  if (token !== visitToken) return;
  mode = 'moon';
  showPlanetCard(MOON);
  system.enterMoonPhase(() => {
    if (token !== visitToken) return;
    system.setMoonAutoOrbit(true);
    ui.setEclipseButtonVisible(true);
    moonNarrGen = silent ? -1 : audio.getSpeechGen();
    if (!silent) speakMoonPhase(true);
  });
}

// ---------- quiz simple 🎯 y quiz por niveles 🏆 ----------
function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ---------- repaso espaciado 🔁 (Leitner por perfil) ----------
// Práctica de recuperación + espaciado (evidencia: ~3x retención frente a solo
// repetir). Aditivo: p.review = { [textoPregunta]: { box:1-5, due:'YYYY-MM-DD' } }.
// Sin datos se comporta como el quiz de siempre (todo "nuevo" → al azar).
const SR_INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 15 };   // días hasta el próximo repaso por caja
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function getReview() {
  const p = boti.getProfile();
  if (!p) return null;
  if (!p.review || typeof p.review !== 'object') p.review = {};
  return p.review;
}
function srUpdate(key, ok) {
  const rev = getReview();
  if (!rev || !key) return;
  const cur = rev[key] ?? { box: 0 };
  const box = ok ? Math.min((cur.box || 0) + 1, 5) : 1;   // acierto sube de caja; fallo vuelve a la 1
  rev[key] = { box, due: addDays(today, SR_INTERVALS[box] ?? 1) };
  boti.persist();
}
/** Ordena el pool: vencidas (toca repasar) primero, luego nuevas, luego no vencidas. */
function srPick(pool, n, keyFn) {
  const rev = getReview() ?? {};
  const due = [], fresh = [], future = [];
  for (const item of pool) {
    const st = rev[keyFn(item)];
    if (!st) fresh.push(item);
    else if (st.due <= today) due.push(item);
    else future.push(item);
  }
  due.sort((a, b) => (rev[keyFn(a)].box - rev[keyFn(b)].box)
    || (rev[keyFn(a)].due < rev[keyFn(b)].due ? -1 : 1));   // más urgente (caja baja / más vencida) primero
  return [...due, ...shuffled(fresh), ...shuffled(future)].slice(0, n);
}
function dueCount(pool, keyFn) {
  const rev = getReview() ?? {};
  return pool.filter((it) => { const s = rev[keyFn(it)]; return s && s.due <= today; }).length;
}

async function startQuiz() {
  if (mode === 'quiz') { exitSpecialModes(); return; }
  exitSpecialModes();
  mode = 'quiz';
  ui.setQuizActive(true);
  system.resetView();          // vista completa: se ven todos los planetas
  // Igual que en el tour: si el mic 🎤 interrumpe la intro, NO se lanza la pregunta
  const gen = audio.getSpeechGen();
  const due = dueCount(QUIZ_QUESTIONS, (q) => q.question);
  quizState = {
    questions: srPick(QUIZ_QUESTIONS, 5, (q) => q.question)
      .map((q) => ({ q: q.question, answers: [q.answer], hint: q.hint, rk: q.question })),
    idx: 0, correct: 0, kind: 'quiz',
  };
  showQuestionCard();
  await audio.speak(due >= 2
    ? '¡Hora de repasar lo que aprendiste! Yo pregunto y tú tocas el planeta.'
    : '¡Vamos a jugar! Yo pregunto y tú tocas el planeta.');
  if (quizState && gen === audio.getSpeechGen()) askCurrent();
}

async function startLevels() {
  if (mode === 'levels') { exitSpecialModes(); return; }
  exitSpecialModes();
  mode = 'levels';
  ui.setLevelsActive(true);
  system.resetView();          // vista completa: se ven todos los planetas
  const gen = audio.getSpeechGen();   // el mic 🎤 corta la cadena intro → pregunta
  const saved = loadQuizLevel();
  const lvl = Math.min(saved.level, QUIZ_LEVELS.length - 1);
  if (saved.level >= QUIZ_LEVELS.length) {
    await audio.speak('¡Ya completaste todos los niveles! ¡Eres un gran astronauta! Vamos a jugar el último otra vez.');
  }
  const levelData = QUIZ_LEVELS[lvl];
  quizState = {
    questions: srPick(levelData.questions, levelData.questions.length, (q) => q.q)
      .map((q) => ({ q: q.q, answers: q.answers, hint: q.hint, rk: q.q })),
    idx: 0, correct: 0, kind: 'levels', level: lvl,
  };
  showQuestionCard();
  if (gen === audio.getSpeechGen()) await audio.speak(levelData.intro);
  if (quizState && gen === audio.getSpeechGen()) askCurrent();
}

function askCurrent() {
  if (!quizState) return;
  const q = quizState.questions[quizState.idx % quizState.questions.length];
  if (quizState.kind === 'quiz2') {
    // Quiz de a dos 👫: banner con el avatar grande del jugador + "¡Te toca!"
    const pl = quizState.players[quizState.turn];
    ui.showTurnBanner(pl);
    audio.speak(`¡Te toca, ${pl.name}! ${q.q}`);
    return;
  }
  audio.speak(q.q);
}

async function handleQuizTap(def) {
  if (!quizState) return;
  // El mic 🎤 a mitad de la cadena (feedback → siguiente pregunta) la corta:
  // cancela la frase en curso Y evita que hablemos la próxima con el mic apretado.
  const gen = audio.getSpeechGen();
  const q = quizState.questions[quizState.idx % quizState.questions.length];
  system.markUserActivity();
  if (q.answers.includes(def.id)) {
    if (quizState.kind === 'quiz' || quizState.kind === 'levels') srUpdate(q.rk, true);
    quizState.correct++;
    quizState.idx++;
    if (quizState.kind === 'quiz2') {
      // Punto para quien respondió y turno para el otro (fallo NO cambia turno)
      quizState.players[quizState.turn].score++;
      quizState.turn = 1 - quizState.turn;
    }
    audio.success();
    system.celebrate(def);
    showPlanetCard(def);
    await audio.speak(`¡Muy bien! ¡Es ${def.name}! ¡Bravo!`);
    if (!quizState) return;

    if (quizState.kind === 'quiz2' && quizState.idx >= quizState.questions.length) {
      // Fin a las 6 preguntas: marcador hablado + ganador o empate
      const [p1, p2] = quizState.players;
      award('duo');
      if (gen === audio.getSpeechGen()) {
        const result = p1.score === p2.score
          ? '¡Empate! ¡Los dos son geniales!'
          : `¡Gana ${(p1.score > p2.score ? p1 : p2).name}! ¡Bravo!`;
        await audio.speak(`¡Se acabó el quiz! ${p1.name} hizo ${p1.score} puntos `
          + `y ${p2.name} hizo ${p2.score}. ${result} ¡Y los dos aprendieron un montón!`);
      }
      exitSpecialModes();
      // SIEMPRE después de exitSpecialModes (sube la generación y mataría la frase):
      // el quiz de a dos también completa la misión quiz 🎯 del día
      checkMissionProgress({ type: 'quiz', def });
      return;
    }
    if (quizState.kind === 'quiz' && quizState.idx >= quizState.questions.length) {
      award('quiz');
      if (gen === audio.getSpeechGen()) await audio.speak('¡Ganaste! ¡Eres una súper exploradora o un súper explorador!');
      exitSpecialModes();
      // Tras la limpieza (que interrumpe el habla): la misión quiz 🎯 del día
      checkMissionProgress({ type: 'quiz', def });
      return;
    }
    if (quizState.kind === 'levels' && quizState.correct >= 3) {
      const lvl = quizState.level;
      const saved = loadQuizLevel();
      if (saved.level === lvl) saveQuizLevel({ level: lvl + 1 });
      award(`level-${lvl + 1}`);
      if (gen === audio.getSpeechGen()) await audio.speak('¡Tres aciertos! ¡Subiste de nivel! ¡Fantástico!');
      exitSpecialModes();
      // Ganar por niveles 🏆 también completa la misión quiz del día
      checkMissionProgress({ type: 'quiz', def });
      return;
    }
    if (!quizState || gen !== audio.getSpeechGen()) return;   // interrumpidos: la cadena para aquí
    showQuestionCard();
    askCurrent();
  } else {
    // Error: pista amable, sin penalización (pero baja a la caja 1 para repasarla pronto)
    if (quizState.kind === 'quiz' || quizState.kind === 'levels') srUpdate(q.rk, false);
    audio.gentle();
    await audio.speak(q.hint);
    if (quizState && gen === audio.getSpeechGen()) askCurrent();
  }
}

// ---------- quiz de a dos 👫 ----------
// Cirugía mínima sobre el quiz: mismo quizState/askCurrent/handleQuizTap con
// kind:'quiz2', players y turn. Fallo = pista y reintenta el MISMO jugador.
function openDuoPicker() {
  if (mode === 'quiz2') { exitSpecialModes(); return; }
  exitSpecialModes();
  const { list, activeIdx } = boti.getProfiles();
  const guest = { name: 'Invitado', avatar: '🐙' };
  if (list.length < 2) {
    // Sin compañero registrado: jugador 2 es el Invitado 🐙 (sin crear perfil)
    startQuiz2(list[activeIdx] ?? list[0] ?? { name: 'Astronauta', avatar: '🧑‍🚀' }, guest);
    return;
  }
  // Jugador 1 = perfil activo; el picker elige al jugador 2 (o al Invitado 🐙)
  const p1 = list[activeIdx] ?? list[0];
  audio.twinkle();
  ui.showDuoPicker([...list, guest], (idx) => {
    ui.hideDuoPicker();
    startQuiz2(p1, list[idx] ?? guest);
  });
}

async function startQuiz2(p1, p2) {
  exitSpecialModes();
  mode = 'quiz2';
  ui.setDuoActive(true);
  system.resetView();          // vista completa: se ven todos los planetas
  const gen = audio.getSpeechGen();   // el mic 🎤 corta la cadena intro → pregunta
  quizState = {
    questions: shuffled(QUIZ_QUESTIONS).slice(0, 6)   // 6 preguntas: 3 por cabeza
      .map((q) => ({ q: q.question, answers: [q.answer], hint: q.hint })),
    idx: 0, correct: 0, kind: 'quiz2',
    players: [
      { name: p1.name, avatar: p1.avatar, score: 0 },
      { name: p2.name, avatar: p2.avatar, score: 0 },
    ],
    turn: 0,
  };
  showQuestionCard();
  await audio.speak(`¡Quiz de a dos! Juegan ${p1.name} y ${p2.name}. Yo pregunto y cada uno toca en su turno.`);
  if (quizState && gen === audio.getSpeechGen()) askCurrent();
}

// ---------- gravedad jugable 🏀 ----------
// Patrón startQuiz: tocar un cuerpo → flyTo + launchBall (parábola determinista
// con la gravedad REAL relativa) + frase comparativa narrada (abortable por gen).
async function startGravity() {
  if (mode === 'gravity') { exitSpecialModes(); return; }
  exitSpecialModes();
  mode = 'gravity';
  ui.setGravityActive(true);
  system.resetView();          // vista completa: se ven todos los planetas
  showPlanetCard({ emoji: '🏀', name: '¡A botar!', temp: null, moons: 0 });
  setCardSpeaking(true);
  // Intro de una sola frase: el mic 🎤 la corta solo (no hay cadena que abortar)
  await audio.speak('¡Toca un planeta o la Luna y mira cómo bota la pelota!');
  setCardSpeaking(false);
}

async function handleGravityTap(def) {
  const token = ++visitToken;         // un toque nuevo corta la narración anterior
  const gen = audio.getSpeechGen();   // el mic 🎤 / 🔇 corta la frase comparativa
  system.markUserActivity();
  audio.stopSpeaking();

  // El Sol: chiste sin pelota (¡se derrite!)
  if (def.id === 'sol') {
    system.removeBall();
    audio.blip(def.pitch);
    showPlanetCard(SUN);
    setCardSpeaking(true);
    await audio.speak('¡En el Sol no se puede: la pelota se derrite! Mejor prueba en un planeta o en la Luna.');
    setCardSpeaking(false);
    return;
  }

  const grav = GRAVITY[def.id];
  if (!grav) {
    // ISS, cometa, rover, planetas inventados…: pista amable, sin pelota
    audio.gentle();
    await audio.speak('Aquí no, ¡toca un planeta o la Luna y verás botar la pelota!');
    return;
  }

  audio.blip(def.pitch);
  audio.whoosh();
  showPlanetCard(def);
  await new Promise((r) => system.flyTo(def, r));
  if (mode !== 'gravity' || token !== visitToken) return;
  system.launchBall(def.id);          // tocar de nuevo relanza (launchBall limpia)
  audio.twinkle();
  if (gen !== audio.getSpeechGen()) return;
  setCardSpeaking(true);
  await audio.speak(grav.frase);
  setCardSpeaking(false);
}

// ---------- salir de modos especiales ----------
function exitSpecialModes() {
  stopTour();
  ++visitToken;
  if (system.compareActive) system.exitCompare();
  if (system.galaxyActive) system.exitGalaxy();
  if (system.eclipseActive) system.exitEclipse();   // antes de salir de fases
  if (system.moonPhaseActive) {
    system.exitMoonPhase();
    system.controls.enableRotate = true;
  }
  if (system.scaleActive) system.exitScale();   // restaura órbitas y maxDistance
  system.removeBall();    // la pelota 🏀 del modo gravedad nunca queda huérfana
  quizState = null;
  mode = 'free';
  ui.setCompareActive(false);
  ui.setGalaxyActive(false);
  ui.setQuizActive(false);
  ui.setLevelsActive(false);
  ui.setEclipseButtonVisible(false);
  ui.setScaleButtonVisible(false);
  ui.setScaleActive(false);
  ui.hidePhaseOverlay();
  ui.setGravityActive(false);
  ui.setDuoActive(false);
  ui.hideTurnBanner();
  ui.hideDuoPicker();
  boti.stopAllSpeech();   // interrupción TOTAL: synth, melodía y mp3 de ElevenLabs
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
  onEclipse: startEclipse,
  onScale: toggleScale,
  onTour() {
    if (mode === 'tour') stopTour();
    else startTour();
  },
  onCompare: toggleCompare,
  onQuiz: startQuiz,
  onLevels: startLevels,
  onGravity: startGravity,
  onDuo: openDuoPicker,
  onSoundToggle(on) {
    audio.setMuted(!on);                 // silenciar ya interrumpe TODO al instante
    if (!on) boti.stopAllSpeech();       // y Boti apaga su animación de hablar
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
  // Chips de estado del panel 🎨 (ui.js los repinta al abrir el panel)
  getBotiStatus: () => boti.getStatus(),
  // Perfil activo para el pasaporte espacial 🖨️ (avatar, nombre, visitas)
  getProfile: () => boti.getProfile(),
});

// El niño se alejó mucho con la rueda/pellizco: la escena soltó el planeta.
// Dejamos todo consistente: sin tarjeta, sin narración, modo libre.
system.onDeselect = () => {
  ++visitToken;             // cancela la narración en curso
  boti.stopAllSpeech();     // interrupción total (synth, melodía y mp3)
  setCardSpeaking(false);
  hidePlanetCard();
  if (mode === 'tour') stopTour();
  if (mode === 'moon' || mode === 'eclipse') {
    if (system.eclipseActive) system.exitEclipse();
    system.exitMoonPhase();
    system.controls.enableRotate = true;
    ui.setEclipseButtonVisible(false);
    ui.hidePhaseOverlay();
    mode = 'free';
  }
  if (mode === 'gravity') {
    // Soltó el planeta alejándose: la pelota se va con el juego (sin huérfanas)
    system.removeBall();
    ui.setGravityActive(false);
    mode = 'free';
  }
  if (mode !== 'compare' && mode !== 'galaxy' && mode !== 'quiz' && mode !== 'levels'
    && mode !== 'quiz2' && mode !== 'scale') {   // en escala el zoom libre no rompe el modo
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

  if (mode === 'quiz' || mode === 'levels' || mode === 'quiz2') { handleQuizTap(def); return; }

  // IMPORTANTE: el modo gravedad va ANTES del caso luna — si no, tocar la
  // Luna con la 🏀 activa entraría al modo fases en vez de botar la pelota.
  if (mode === 'gravity') { handleGravityTap(def); return; }

  if (mode === 'compare') {
    // En fila: cada toque dice su frase de tamaño
    audio.blip(def.pitch);
    showPlanetCard(def);
    audio.speak(`${def.name}. ${def.sizeFact ?? ''}`);
    return;
  }

  if (def.id === 'luna') {
    if (mode === 'moon') speakMoonPhase(true);   // ya estamos jugando: repite la fase
    else if (mode !== 'eclipse') enterMoonMode(); // durante el eclipse no se reentra
    return;
  }

  // Salir del juego lunar (o del eclipse) al tocar otra cosa
  if (mode === 'moon' || mode === 'eclipse') exitSpecialModes();
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
  // Fases/eclipses: emoji grande sincronizado con la fase + narración automática
  if (mode === 'moon' || mode === 'eclipse') {
    ui.setPhaseEmoji(moonPhaseEmoji(system.moonPhaseAngle()));
    if (mode === 'moon' && system.moonAutoOrbit && moonNarrGen === audio.getSpeechGen()) {
      speakMoonPhase();
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => saveSettings(settings));

// Gancho mínimo para pruebas automatizadas (no afecta el uso normal)
window.__universo = {
  system,
  visit: (id) => {
    const def = [SUN, MOON, ...PLANETS, ...Object.values(EXTRAS)].find((d) => d.id === id);
    if (def) return visitPlanet(def);
  },
  moonMode: () => enterMoonMode(),
  eclipse: () => startEclipse(),
  phase: () => system.currentMoonPhase(),
  mode: () => mode,
  toggleScale: () => toggleScale(),
  botiState: () => boti.getStatus(),
  ask: (q) => boti.ask(q),
  missions: () => missionState.missions,
  profile: () => boti.getProfile(),
  quizState: () => quizState,
  quizTap: (id) => {
    const def = [SUN, MOON, ...PLANETS, ...Object.values(EXTRAS)].find((d) => d.id === id);
    if (def) return handleQuizTap(def);
  },
  gravityGo: (id) => {
    const def = [SUN, MOON, ...PLANETS, ...Object.values(EXTRAS)].find((d) => d.id === id);
    if (def) return handleGravityTap(def);
  },
  log: () => window.__botiLog ?? [],
};
