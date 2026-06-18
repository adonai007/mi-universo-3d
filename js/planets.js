// ====== Datos didácticos del sistema solar (en español sencillo) ======
// Tamaños relativos comprimidos pero con el ORDEN correcto (Júpiter > Saturno > ...).
// Inclinación axial REAL (axialTilt, valores IAU) y rotación propia con la
// PROPORCIÓN REAL entre planetas (spinSpeed ∝ 1/período de rotación, con la
// Tierra normalizada a 0.7 — exageración uniforme para que se note):
// Júpiter da la vuelta en ~10 h (el más rápido), Venus tarda 243 días.
//
// Campos por planeta:
//   size         radio visual (escala comprimida, ordinal correcta)
//   axialTilt    inclinación del eje en grados (Urano 97.8: ¡acostado!)
//   spinSpeed    rotación propia. OJO Venus: su eje está volteado (177.4°),
//                así que girar "normal" sobre su eje se VE al revés desde
//                arriba — así es el retrógrado real, sin trucos de signo.
//   moons        número de lunas (se muestran como 🌙 en la tarjeta)
//   temp         'hot' | 'veryhot' | 'nice' | 'cold' | 'verycold'
//   facts        4-5 datos categorizados (tamaño, temperatura, lunas, sorpresa)
//   sizeFact     frase para el modo comparación 📏
//   tourIntro    frase puente para el paseo guiado 🚀

export const SUN = {
  id: 'sol',
  name: 'Sol',
  emoji: '☀️',
  color: 0xffc23d,
  size: 9,
  pitch: 1.0,
  temp: 'veryhot',
  moons: 0,
  facts: [
    'Soy el Sol. ¡Soy una estrella gigante y muy calentita!',
    'Soy tan grande que dentro de mí caben un millón de Tierras.',
    'Doy luz y calor a todos los planetas.',
    'Tengo manchas oscuras que se llaman manchas solares.',
    '¿Ves mis llamaradas? ¡Son tormentas de fuego más grandes que la Tierra entera! Tranquilo: estás lejos y a salvo.',
  ],
  sizeFact: '¡Yo soy el más grande de todos! Soy una estrella, no un planeta.',
  tourIntro: 'Empezamos nuestro viaje en el centro: ¡el Sol!',
};

export const PLANETS = [
  {
    id: 'mercurio',
    name: 'Mercurio',
    emoji: '⚪',
    color: 0xb8a99a,
    accent: 0x7a6a5b,
    size: 0.75,
    orbitRadius: 15,
    orbitSpeed: 0.50,
    spinSpeed: 0.012,       // su día dura ~59 días terrestres: gira lentísimo
    axialTilt: 0.03,        // eje casi perfectamente derecho
    textureType: 'rocky',
    pitch: 1.8,
    temp: 'hot',
    moons: 0,
    facts: [
      'Soy Mercurio, el planeta más pequeñito.',
      'Soy el más rápido: doy la vuelta al Sol corriendo.',
      'De día soy muy caliente y de noche muy frío. ¡Uff y brrr!',
      'No tengo ninguna luna que me acompañe.',
      'Estoy lleno de agujeritos que se llaman cráteres.',
    ],
    sizeFact: 'Soy el más chiquitín. ¡La Tierra es mucho más grande que yo!',
    tourIntro: 'Volamos al primer planeta, el más cercano al Sol.',
  },
  {
    id: 'venus',
    name: 'Venus',
    emoji: '🟠',
    color: 0xe8b46a,
    accent: 0xc9883e,
    size: 1.55,
    orbitRadius: 21,
    orbitSpeed: 0.38,
    spinSpeed: 0.003,       // 243 días por vuelta: el más lento de todos
    axialTilt: 177.4,       // eje volteado: por eso se VE girar al revés (retrógrado)
    textureType: 'cloudy',
    atmosphere: { color: 0xf5d8a0, opacity: 0.16, scale: 1.12 },
    pitch: 1.6,
    temp: 'veryhot',
    moons: 0,
    facts: [
      'Soy Venus y brillo mucho en el cielo por la mañana.',
      '¡Soy el planeta más caliente de todos! Como un horno.',
      'Estoy tapado con muchas nubes amarillas.',
      'Giro al revés que los demás planetas, ¡y muy despacito!',
      'Soy casi del mismo tamaño que la Tierra.',
    ],
    sizeFact: 'Soy casi igual de grande que la Tierra. ¡Somos como gemelas!',
    tourIntro: 'Seguimos volando. Aquí hace muchísimo calor.',
  },
  {
    id: 'tierra',
    name: 'Tierra',
    emoji: '🌍',
    color: 0x2d6bc9,
    accent: 0x3da352,
    size: 1.6,
    orbitRadius: 27,
    orbitSpeed: 0.30,
    spinSpeed: 0.7,
    axialTilt: 23.4,        // la inclinación que nos regala las estaciones
    textureType: 'earth',
    hasClouds: true,
    atmosphere: { color: 0x5599ff, opacity: 0.22, scale: 1.15 },
    pitch: 1.5,
    temp: 'nice',
    moons: 1,
    hasMoon: true,
    facts: [
      'Soy la Tierra, ¡tu casa! Aquí vives tú.',
      'Soy azul porque tengo mucha agua en mis mares.',
      'No soy ni muy caliente ni muy fría: ¡perfecta para vivir!',
      'Tengo una luna que baila a mi alrededor.',
      'Soy el único planeta con animales, plantas y niños.',
      'Giro un poquito inclinadita, como de ladito. ¡Por eso hay verano calentito y también invierno con frío!',
      'Mira mi lado oscuro: ¿ves lucecitas brillantes? ¡Son las ciudades, donde la gente enciende las luces de noche!',
    ],
    dayNightFact:
      'Mira bien: el lado que mira al Sol está iluminado, ¡ahí es de día! ' +
      'El otro lado está oscuro, ¡ahí es de noche! ' +
      'Esto pasa porque giro como un trompo.',
    sizeFact: '¡Esta soy yo, tu casa! Compárame con los demás.',
    tourIntro: 'Ahora visitamos un planeta muy especial: ¡tu casa!',
  },
  {
    id: 'marte',
    name: 'Marte',
    emoji: '🔴',
    color: 0xc55a35,
    accent: 0x8a3b20,
    size: 0.9,
    orbitRadius: 33,
    orbitSpeed: 0.24,
    spinSpeed: 0.68,        // su día dura casi igual que el nuestro (24.6 h)
    axialTilt: 25.2,
    textureType: 'mars',
    atmosphere: { color: 0xff9966, opacity: 0.10, scale: 1.10 },
    pitch: 1.4,
    temp: 'cold',
    moons: 2,
    facts: [
      'Soy Marte y soy rojo como una manzana. 🍎',
      'Soy más pequeño que la Tierra y hace frío en mí.',
      'Tengo dos lunas chiquititas con forma de papa.',
      'Tengo un cañón gigante, ¡como un rasguño enorme!',
      'Los robots me visitan para explorarme.',
    ],
    sizeFact: 'Soy más pequeño que la Tierra. ¡Mírala, ella es más grandota!',
    tourIntro: 'Volamos más lejos del Sol. Empieza a hacer frío.',
  },
  {
    id: 'jupiter',
    name: 'Júpiter',
    emoji: '🟤',
    color: 0xd9a877,
    accent: 0x9c6a44,
    size: 5.2,
    orbitRadius: 47,
    orbitSpeed: 0.14,
    spinSpeed: 1.69,        // ¡el que más rápido gira! (1 día = ~10 horas)
    axialTilt: 3.1,
    textureType: 'banded',
    hasSpot: true,
    atmosphere: { color: 0xe8c39a, opacity: 0.12, scale: 1.08 },
    pitch: 0.7,
    temp: 'cold',
    moons: 95,
    facts: [
      'Soy Júpiter, ¡el planeta más grandote de todos!',
      'Dentro de mí caben más de mil Tierras.',
      'Mi mancha roja es una tormenta más grande que la Tierra.',
      'Tengo muchísimas lunas, ¡casi cien!',
      '¡Giro rapidísimo! Doy la vuelta entera en solo diez horas. ¡Mi día es cortito, cortito!',
    ],
    sizeFact: '¡Soy gigante! Dentro de mí caben más de mil Tierras.',
    tourIntro: 'Ahora volamos muy lejos. ¡Mira qué grandote viene!',
  },
  {
    id: 'saturno',
    name: 'Saturno',
    emoji: '🪐',
    color: 0xe3cf9b,
    accent: 0xb89c61,
    size: 4.5,
    orbitRadius: 60,
    orbitSpeed: 0.10,
    spinSpeed: 1.57,        // casi tan rápido como Júpiter (1 día = ~10.7 h)
    axialTilt: 26.7,
    textureType: 'banded',
    hasRings: true,
    atmosphere: { color: 0xf0ddb0, opacity: 0.10, scale: 1.07 },
    pitch: 0.8,
    temp: 'cold',
    moons: 146,
    facts: [
      'Soy Saturno y tengo anillos preciosos.',
      'Mis anillos son de hielo y rocas que brillan.',
      'Soy grandote, pero muy ligero: ¡flotaría en el agua!',
      'Soy el planeta con más lunas de todos.',
      'Aquí hace mucho frío porque el Sol queda lejos.',
    ],
    sizeFact: 'Soy casi tan grande como Júpiter, ¡y con anillos!',
    tourIntro: 'Seguimos alejándonos. Hace más frío... ¡y mira esos anillos!',
  },
  {
    id: 'urano',
    name: 'Urano',
    emoji: '🔵',
    color: 0x8fd5e3,
    accent: 0x57acc0,
    size: 3.0,
    orbitRadius: 72,
    orbitSpeed: 0.07,
    spinSpeed: 0.97,
    axialTilt: 97.8,        // ¡acostado! rueda de lado como una pelota
    textureType: 'cloudy',
    atmosphere: { color: 0xa8eef8, opacity: 0.14, scale: 1.10 },
    pitch: 1.2,
    temp: 'verycold',
    moons: 28,
    facts: [
      'Soy Urano y soy de color celeste.',
      '¡Yo giro acostado, como un balón rodando por el suelo!',
      'Soy un planeta muy, muy frío. ¡Brrrr!',
      'Tengo muchas lunas con nombres de cuentos.',
      'Huelo raro: ¡como a huevo podrido!',
    ],
    sizeFact: 'Soy mediano: más grande que la Tierra, más pequeño que Saturno.',
    tourIntro: 'Volamos lejísimos. Aquí casi no llega el calor del Sol.',
  },
  {
    id: 'neptuno',
    name: 'Neptuno',
    emoji: '💙',
    color: 0x4666d1,
    accent: 0x2c44a0,
    size: 2.9,
    orbitRadius: 82,
    orbitSpeed: 0.05,
    spinSpeed: 1.04,
    axialTilt: 28.3,
    textureType: 'cloudy',
    atmosphere: { color: 0x5f7fff, opacity: 0.14, scale: 1.10 },
    pitch: 0.9,
    temp: 'verycold',
    moons: 16,
    facts: [
      'Soy Neptuno, el planeta más lejano de todos.',
      'Soy azul como el mar profundo.',
      '¡Tengo los vientos más fuertes del espacio!',
      'Soy el más frío, frío, frío. ¡Brrrrrr!',
      'El Sol se ve chiquitito desde aquí.',
    ],
    sizeFact: 'Soy parecido a Urano: los dos somos gigantes de hielo.',
    tourIntro: 'Última parada, en el borde del sistema solar. ¡Qué frío hace aquí!',
  },
];

export const MOON = {
  id: 'luna',
  name: 'Luna',
  emoji: '🌙',
  color: 0xcfcfcf,
  size: 0.45,
  orbitRadius: 3.4,
  orbitSpeed: 2.2,
  pitch: 1.7,
  temp: 'cold',
  moons: 0,
  facts: [
    'Soy la Luna y bailo alrededor de la Tierra.',
    'Arrástrame con tu dedo alrededor de la Tierra y mira cómo cambio de forma.',
  ],
};

// Frases para el juego de fases de la Luna 🌗
export const MOON_PHASES = {
  llena: '¡Luna llena! Vemos toda su carita brillante.',
  nueva: 'Luna nueva: nos da la espalda iluminada. ¡Casi no se ve!',
  creciente: '¡Está creciendo! Cada noche se ve un poquito más.',
  menguante: 'Ahora mengua: se hace flaquita, flaquita.',
};

// Intro del modo fases (la Luna recorre su órbita acelerada)
export const MOON_PHASE_INTRO =
  '¿Ves? La Luna no cambia de forma. ¡Es la sombra! ' +
  'El Sol siempre ilumina la mitad, y nosotros vemos un pedacito distinto cada noche.';

// Emoji grande de la fase según el ángulo Sol-Tierra-Luna (8 sectores de 45°).
// ang ≈ 0 → nueva 🌑; crece por ang > 0 (🌒🌓🌔); |ang| ≈ π → llena 🌕;
// vuelve por ang < 0 (🌖🌗🌘). Orden del ciclo: 🌑🌒🌓🌔🌕🌖🌗🌘.
export function moonPhaseEmoji(ang) {
  const TAU = Math.PI * 2;
  const a = ((ang % TAU) + TAU) % TAU;             // 0..2π (0 = nueva)
  const idx = Math.round(a / (TAU / 8)) % 8;
  return ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][idx];
}

// Guion de los eclipses 🌞🌚 (frases cortas, nivel 3-6 años)
export const ECLIPSE_SCRIPT = {
  intro: '¿Y si el Sol, la Luna y la Tierra se ponen en fila? ¡Mira lo que pasa!',
  solar1: '¡Eclipse de Sol! La Luna se pone delante del Sol.',
  solar2: '¿Ves esa manchita oscura? ¡Es la sombra de la Luna paseando por la Tierra! ' +
    'Ahí abajo el día se pone oscurito un ratito.',
  lunar1: 'Ahora la Luna pasa detrás de la Tierra, justo por su sombra.',
  lunar2: '¡Eclipse de Luna! La Tierra le tapa el Sol y la Luna se pone rojita. ¡Le dicen Luna de sangre!',
  lunar3: 'Se pone roja porque solo le llega una lucecita roja, como la del atardecer.',
  outro: 'Y luego cada uno sigue su camino, y la Luna brilla blanquita otra vez.',
};

// ====== Objetos especiales tocables (fase 2) ======
export const EXTRAS = {
  iss: {
    id: 'iss',
    name: 'Estación Espacial',
    emoji: '🛰️',
    pitch: 1.9,
    temp: null,
    moons: 0,
    size: 1,
    facts: [
      '¡Aquí viven astronautas de verdad!',
      'Da vueltas a la Tierra rapidísimo, como un tren del espacio.',
      'Los astronautas flotan adentro, ¡como globos!',
      '¿Lo viste? ¡Un astronauta salió a saludarte! ¡Hola, hola desde el espacio!',
    ],
  },
  cometa: {
    id: 'cometa',
    name: 'Cometa',
    emoji: '☄️',
    pitch: 1.85,
    temp: 'cold',
    moons: 0,
    size: 1,
    focusDist: 12,   // scene.flyTo ya lee focusDist: cámara cómoda sin cirugía
    facts: [
      '¡Soy un cometa! Una bola de nieve, hielo y piedritas que viaja por el espacio.',
      'Cuando me acerco al Sol, mi cola crece grandota y brillante.',
      '¡El viento del Sol me peina la cola! Por eso siempre apunta lejos de él.',
      'Mi camino es un óvalo: paso cerquita del Sol corriendo y me voy lejos despacito.',
    ],
  },
  rover: {
    id: 'rover',
    name: 'Robot explorador',
    emoji: '🤖',
    pitch: 1.3,
    temp: null,
    moons: 0,
    size: 1,
    facts: [
      '¡Aquí trabaja un robot explorador!',
      'Saca fotos y estudia las piedras de Marte.',
      'Lo mandaron los científicos desde la Tierra.',
    ],
  },
  blackhole: {
    id: 'agujero',
    name: 'Agujero negro',
    emoji: '⚫',
    pitch: 0.5,
    temp: null,
    moons: 0,
    size: 18,
    // Física real contada para niños de 3-6: cada frase acompaña algo que
    // se VE en la simulación (disco, beaming, lensing, espaguetización).
    facts: [
      'Soy un agujero negro: como una aspiradora gigante del espacio. ¡Nada puede escapar de mí, ni la luz!',
      'Ese anillo brillante es gas calentito que da vueltas rapidísimo antes de caer. Los que están más cerca giran más rápido.',
      '¿Ves que un lado brilla más? ¡Es porque ese lado viene hacia ti volando rapidísimo!',
      'La luz se dobla a mi alrededor. ¡Por eso parezco un ojo brillante en el espacio!',
      '¡Mira esa estrella! Se estira como un fideo... Los científicos lo llaman espaguetización. 🍝',
      'Tranquilo: vivo lejísimos y desde aquí no te puedo alcanzar.',
    ],
  },
  starRed: {
    id: 'estrella-roja',
    name: 'Estrella gigante roja',
    emoji: '🌟',
    pitch: 0.8,
    temp: 'hot',
    moons: 0,
    size: 8,
    facts: [
      'Soy una estrella gigante roja, ¡mucho más grande que el Sol!',
      'Las estrellas viejitas se ponen rojas como yo.',
    ],
  },
  starBlue: {
    id: 'estrella-azul',
    name: 'Estrella azul',
    emoji: '💫',
    pitch: 1.6,
    temp: 'veryhot',
    moons: 0,
    size: 6,
    facts: [
      'Soy una estrella azul, ¡la más caliente de todas!',
      'Las estrellas jóvenes y fuertes brillan azul.',
    ],
  },
  fugaz: {
    id: 'fugaz',
    name: 'Estrella fugaz',
    emoji: '🌠',
    pitch: 2.0,
    temp: null,
    moons: 0,
    size: 1,
    facts: ['¡Atrapaste una estrella fugaz! Cierra los ojos y... ¡pide un deseo!'],
  },
};

// ====== Quiz progresivo 🏆 (niveles secuenciales) ======
// answers acepta varios ids válidos. 3 aciertos = subir de nivel + pegatina.
export const QUIZ_LEVELS = [
  {
    name: 'colores',
    emoji: '🎨',
    intro: 'Nivel uno: ¡los colores! Escucha bien.',
    questions: [
      { q: 'Toca el planeta rojo, rojo como una manzana.', answers: ['marte'], hint: 'Mmm, casi. Busca el pequeñito de color rojo.' },
      { q: 'Toca tu casa: el planeta azul con agua.', answers: ['tierra'], hint: 'Inténtalo otra vez. Es azul y tiene una lunita.' },
      { q: 'Toca el planeta celeste, como el color del cielo.', answers: ['urano'], hint: 'Casi. Es celeste clarito y gira acostado.' },
      { q: 'Toca el planeta azul oscuro, como el mar profundo.', answers: ['neptuno'], hint: 'Busca el azul más oscuro, el último de todos.' },
    ],
  },
  {
    name: 'tamaños',
    emoji: '📏',
    intro: 'Nivel dos: ¡los tamaños! Mira bien quién es grande y quién es pequeño.',
    questions: [
      { q: 'Toca el planeta más grandote de todos.', answers: ['jupiter'], hint: 'Es el más gordito, con una mancha roja.' },
      { q: 'Toca el planeta más pequeñito.', answers: ['mercurio'], hint: 'Es el más chiquitín, cerquita del Sol.' },
      { q: 'Toca el planeta grande que tiene anillos.', answers: ['saturno'], hint: 'Busca los anillos preciosos.' },
      { q: 'Toca un planeta casi igual de grande que la Tierra.', answers: ['venus'], hint: 'Es como la gemela de la Tierra, de color naranja.' },
    ],
  },
  {
    name: 'orden',
    emoji: '🔢',
    intro: 'Nivel tres: ¡el orden! ¿Quién vive cerca del Sol y quién vive lejos?',
    questions: [
      { q: 'Toca el planeta más cercano al Sol.', answers: ['mercurio'], hint: 'Es el primero, pegadito al Sol.' },
      { q: 'Toca el planeta más lejano de todos.', answers: ['neptuno'], hint: 'Es el último, el azul oscuro.' },
      { q: 'Toca el segundo planeta, entre Mercurio y la Tierra.', answers: ['venus'], hint: 'Es el naranja brillante.' },
      { q: 'Toca el tercer planeta: ¡tu casa!', answers: ['tierra'], hint: 'Es azul con nubes blancas.' },
    ],
  },
  {
    name: 'temperatura',
    emoji: '🌡️',
    intro: 'Nivel cuatro: ¡calor y frío! Los planetas cerca del Sol son calientes, los lejanos son fríos.',
    questions: [
      { q: 'Toca un planeta muy, muy frío.', answers: ['urano', 'neptuno'], hint: 'Busca lejos del Sol, donde no llega el calorcito.' },
      { q: 'Toca el planeta más caliente, ¡como un horno!', answers: ['venus'], hint: 'Es el naranja con muchas nubes.' },
      { q: 'Toca el planeta perfecto: ni frío ni caliente.', answers: ['tierra'], hint: '¡Es donde vives tú!' },
      { q: 'Toca un planeta calientito, muy cerquita del Sol.', answers: ['mercurio', 'venus'], hint: 'Los primeros planetas son los calientes.' },
    ],
  },
];

// ====== Álbum de pegatinas 📒 ======
// id, emoji y cómo se gana cada una (unlock se maneja en main.js)
export const STICKERS = [
  { id: 'visit-sol', emoji: '☀️', name: 'Sol' },
  { id: 'visit-mercurio', emoji: '⚪', name: 'Mercurio' },
  { id: 'visit-venus', emoji: '🟠', name: 'Venus' },
  { id: 'visit-tierra', emoji: '🌍', name: 'Tierra' },
  { id: 'visit-marte', emoji: '🔴', name: 'Marte' },
  { id: 'visit-jupiter', emoji: '🟤', name: 'Júpiter' },
  { id: 'visit-saturno', emoji: '🪐', name: 'Saturno' },
  { id: 'visit-urano', emoji: '🔵', name: 'Urano' },
  { id: 'visit-neptuno', emoji: '💙', name: 'Neptuno' },
  { id: 'visit-iss', emoji: '🛰️', name: 'Estación Espacial' },
  { id: 'visit-cometa', emoji: '☄️', name: 'Cometa' },
  { id: 'tour', emoji: '🚀', name: 'Gran paseo' },
  { id: 'quiz', emoji: '🎯', name: 'Adivina' },
  { id: 'level-1', emoji: '🥉', name: 'Nivel 1' },
  { id: 'level-2', emoji: '🥈', name: 'Nivel 2' },
  { id: 'level-3', emoji: '🥇', name: 'Nivel 3' },
  { id: 'level-4', emoji: '🏆', name: 'Nivel 4' },
  { id: 'duo', emoji: '👫', name: 'Quiz de a dos' },
  { id: 'mission', emoji: '✅', name: 'Misión' },
  { id: 'mission-star', emoji: '🌟', name: 'Tres misiones' },
  { id: 'create', emoji: '🛠️', name: 'Inventor' },
  { id: 'wish', emoji: '🌠', name: 'Deseo' },
];

// ====== Modo escala real 🏔 (distancias verdaderas) ======
// Distancia media al Sol en Unidades Astronómicas (1 UA = Sol→Tierra).
// En escena: radioReal = max(UA × 27, 14) — la Tierra conserva su 27 y
// Neptuno se va a ~812 (por eso el dibujo normal comprime las órbitas).
export const REAL_AU = {
  mercurio: 0.39,
  venus: 0.72,
  tierra: 1.0,
  marte: 1.52,
  jupiter: 5.2,
  saturno: 9.54,
  urano: 19.2,
  neptuno: 30.06,
};

// ====== Gravedad jugable 🏀 (modo 'gravity') ======
// g = gravedad relativa a la Tierra (superficie, valores reales). La pelota
// bota con parábola determinista: h = size·0.9/g — en la Luna sube ALTÍSIMO
// y en Júpiter casi nada. `frase` = comparación narrada al lanzar la pelota.
// El Sol no está: ahí la pelota se derrite (chiste en main.js).
export const GRAVITY = {
  mercurio: { g: 0.38, frase: '¡Mira qué alto bota! Mercurio es chiquito y casi no aprieta la pelota.' },
  venus:    { g: 0.91, frase: 'En Venus la pelota bota casi como en tu casa. ¡Son planetas gemelos!' },
  tierra:   { g: 1.0,  frase: '¡Como en casa! Así bota tu pelota en el parque.' },
  marte:    { g: 0.38, frase: '¡En Marte la pelota salta súper alto! Aquí pesarías menos que en casa.' },
  jupiter:  { g: 2.53, frase: '¿Viste? ¡Casi no sube: Júpiter pesa muchísimo y atrae la pelota fuerte, fuerte!' },
  saturno:  { g: 1.06, frase: 'En Saturno bota casi igual que en la Tierra, ¡aunque es gigante es muy livianito!' },
  urano:    { g: 0.89, frase: 'En Urano la pelota bota un poquito más alto que en casa. ¡Y de costado, como él!' },
  neptuno:  { g: 1.14, frase: 'Neptuno aprieta un poquito más fuerte que la Tierra: la pelota bota un poquito menos.' },
  luna:     { g: 0.17, frase: '¡En la Luna saltas ALTÍSIMO! La Luna es pequeñita y casi no te aprieta. ¡Como volar despacito!' },
};

// ====== Cuentos de Boti 📖 (fallback local sin LLM) ======
// 10 cuentos pre-escritos (8 planetas + Luna + Sol), 4-6 frases cada uno,
// estilo dulce de los facts: un personaje amable + el lugar, cero miedo,
// cierre dulce. boti.js elige el del planeta mencionado o uno aleatorio.
export const STORIES = {
  mercurio:
    'Tita la lagartija astronauta aterrizó en Mercurio, el planeta más pequeñito y veloz. ' +
    'Jugaron a las escondidas entre los cráteres, que son como agujeritos de queso. ' +
    '"¡Aquí los años pasan rapidísimo!", se reía Tita dando vueltas con su amigo el planeta. ' +
    'El Sol, su vecino gigante, les regaló una luz calentita. ' +
    'Cuando llegó la noche fresquita, Tita se acurrucó en su nave y Mercurio le cantó una canción de cráteres. ' +
    'Y la lagartija se durmió feliz, soñando con dar otra vuelta al Sol. 🚀',
  venus:
    'La gatita Nube viajaba en su nave cuando vio brillar a Venus como una lucecita de la mañana. ' +
    '"¡Qué planeta tan elegante, todo tapadito con nubes amarillas!", maulló contenta. ' +
    'Venus le contó que era el más calentito de todos, ¡como un horno de hacer galletas! ' +
    'Así que Nube no aterrizó: se quedó flotando cerquita, y juntos miraron pasar las estrellas. ' +
    'Venus le regaló su brillo más bonito para el camino a casa. ' +
    'Y la gatita volvió feliz, contando a todos que el lucero de la mañana era su amigo. ⭐',
  tierra:
    'El robotito Bip viajó por todo el espacio buscando el planeta más bonito. ' +
    'Visitó planetas grandes y chiquitos, pero ninguno era como su foto favorita. ' +
    'De pronto vio una bolita azul con nubes blancas: ¡la Tierra! ' +
    'Allí encontró mares para chapotear, flores que olían rico y niños que lo saludaron con la mano. ' +
    '"¡Este es el planeta de los abrazos!", dijo Bip muy contento. ' +
    'Y se quedó una temporada, aprendiendo a regar las plantas con sus nuevos amigos. 🌍',
  marte:
    'En Marte, el planeta rojo, vivía un robot explorador que se llamaba Curi. ' +
    'Cada mañana sacaba fotos de las piedras rojas y se las mandaba a los niños de la Tierra. ' +
    'Un día encontró una piedrita con forma de corazón y la guardó para su mejor amiga, una estrella. ' +
    'Por la noche, las dos lunas de Marte, que parecen papas, le hacían cosquillas de luz. ' +
    'Curi se dormía feliz, arropado por el cielo rosadito de Marte. ' +
    'Y soñaba con el día en que los niños vinieran a visitarlo. 🔴',
  jupiter:
    'Había una vez una mariposa espacial llamada Lila que quiso abrazar a Júpiter, el planeta más grandote. ' +
    'Abrió mucho, mucho las alas... ¡pero Júpiter era gigante como mil Tierras juntas! ' +
    '"No te preocupes", le dijo Júpiter con voz suave, "los abrazos chiquitos también llegan al corazón". ' +
    'Lila se posó en una de sus nubes de colores y pasearon juntos dando la vuelta más rápida del espacio. ' +
    'Sus casi cien lunas salieron a hacerles compañía, como lucecitas amigas. ' +
    'Y Lila aprendió que hasta el gigante más grande quiere un amiguito pequeño. 🟤',
  saturno:
    'La tortuga Renata soñaba con tener un hula-hula brillante. ' +
    'Un día su nave pasó al lado de Saturno y... ¡guau! ¡Sus anillos de hielo y piedritas brillaban como caramelos! ' +
    '"¿Me enseñas a girar así?", le pidió Renata. ' +
    'Saturno, que es muy elegante, le enseñó a bailar despacito mientras sus anillos hacían música de campanitas. ' +
    'Renata bailó hasta que le dio risa de tanta vuelta. ' +
    'Y volvió a casa con un regalo: una piedrita de anillo que brilla cuando la miras con cariño. 🪐',
  urano:
    'El pingüino Tito buscaba el mejor tobogán del universo. ' +
    'Llegó a Urano, el planeta celeste que gira acostado, ¡como un balón rodando por el suelo! ' +
    '"¿Por qué duermes de ladito?", le preguntó Tito. ' +
    '"Así ruedo y ruedo, ¡es mi manera de bailar!", le contestó Urano riéndose. ' +
    'Tito se deslizó por su aire celeste, dando volteretas suavecitas de frío fresquito. ' +
    'Cuando se cansaron, contaron lunas juntos hasta quedarse dormidos, ¡y Urano tiene un montón! 🔵',
  neptuno:
    'Muy, muy lejos del Sol vive Neptuno, el planeta azul como el mar profundo. ' +
    'Allí llegó la ballenita espacial Perla, que buscaba un lugar tranquilo para cantar. ' +
    'El viento de Neptuno, el más fuerte del espacio, hacía bailar su canción por todo el cielo. ' +
    '"Desde aquí el Sol se ve chiquitito, como una estrellita", le contó Neptuno. ' +
    'Juntos miraron esa lucecita lejana y mandaron besos de buenas noches hasta la Tierra. ' +
    'Y la ballenita se durmió flotando, arrulladita por el planeta más azul. 💙',
  luna:
    'La conejita Mimi vivía en la Luna y su trabajo era encenderla cada noche. ' +
    'Con su plumero de estrellas les sacaba brillo a los cráteres, dejándola blanquita y redonda. ' +
    'Una noche la Luna jugó a esconderse y se puso flaquita, flaquita, como una sonrisa en el cielo. ' +
    '"¡No me encuentran!", se reía, mientras Mimi saltaba altísimo de cráter en cráter, porque en la Luna casi no pesas. ' +
    'Desde la Tierra, los niños la saludaban antes de dormir. ' +
    'Y Mimi les mandaba polvito de luna para los sueños bonitos. 🌙',
  sol:
    'El Sol es una estrella gigante y calentita que todas las mañanas se despierta el primero. ' +
    'Un girasol llamado Gira lo esperaba siempre con la carita levantada. ' +
    '"¡Buenos días, Sol!", le decía, y el Sol le mandaba un rayito de luz como un abrazo. ' +
    'Con su calorcito crecen las plantas, juegan los niños y los planetas bailan a su alrededor. ' +
    'Por la tarde, el Sol se pone su pijama de colores naranjas y rosados. ' +
    'Y se despide hasta mañana, dejando a la Luna de niñera. ☀️',
};

export const GALAXY_FACT =
  '¡Mira! Nuestro Sol es una estrella entre millones y millones. ' +
  'Vivimos en una galaxia que se llama Vía Láctea. ¡Es nuestro barrio del espacio!';

// Emojis de temperatura para la tarjeta (apoyo visual pre-lector)
export const TEMP_EMOJI = {
  veryhot: '🔥🔥',
  hot: '🔥',
  nice: '🙂',
  cold: '🧊',
  verycold: '🧊🧊',
};

// ====== Preguntas del quiz por voz 🎯 (sin lectura) ======
export const QUIZ_QUESTIONS = [
  {
    question: '¿Dónde está el planeta rojo, rojo como una manzana?',
    answer: 'marte',
    hint: 'Mmm, casi. Busca el planeta pequeñito de color rojo.',
  },
  {
    question: '¿Dónde está el planeta de los anillos preciosos?',
    answer: 'saturno',
    hint: 'Casi, casi. Busca el planeta que tiene aros alrededor.',
  },
  {
    question: '¿Dónde está tu casa, el planeta azul con agua?',
    answer: 'tierra',
    hint: 'Inténtalo otra vez. Es azul y tiene una lunita.',
  },
  {
    question: '¿Dónde está el planeta más grandote de todos?',
    answer: 'jupiter',
    hint: 'Casi. Busca el más gordito, con una mancha roja.',
  },
  {
    question: '¿Dónde está el planeta más pequeñito, cerquita del Sol?',
    answer: 'mercurio',
    hint: 'Mmm, busca el más chiquitín, al ladito del Sol.',
  },
  {
    question: '¿Dónde está el planeta celeste que gira acostado?',
    answer: 'urano',
    hint: 'Casi. Es de color celeste, como el cielo.',
  },
];
