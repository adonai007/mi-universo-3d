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
  llena: '¡Luna llena! Se ve redondita y brillante, porque el Sol la ilumina toda.',
  nueva: 'Luna nueva. Casi no se ve, porque el Sol ilumina su otro lado.',
  creciente: 'Luna creciente. ¡Se ve como una sonrisa! Cada noche crece un poquito.',
  menguante: 'Luna menguante. Se va haciendo más flaquita cada noche.',
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
  { id: 'tour', emoji: '🚀', name: 'Gran paseo' },
  { id: 'quiz', emoji: '🎯', name: 'Adivina' },
  { id: 'level-1', emoji: '🥉', name: 'Nivel 1' },
  { id: 'level-2', emoji: '🥈', name: 'Nivel 2' },
  { id: 'level-3', emoji: '🥇', name: 'Nivel 3' },
  { id: 'level-4', emoji: '🏆', name: 'Nivel 4' },
  { id: 'mission', emoji: '✅', name: 'Misión' },
  { id: 'create', emoji: '🛠️', name: 'Inventor' },
  { id: 'wish', emoji: '🌠', name: 'Deseo' },
];

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
