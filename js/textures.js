// ====== Texturas procedurales en canvas (sin descargas externas, máx. 1024px) ======
import * as THREE from 'three';

// Pequeño generador pseudoaleatorio con semilla para texturas reproducibles.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(c) {
  return '#' + new THREE.Color(c).getHexString();
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function asTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Manchas suaves de ruido (nubes/turbulencia) sobre un contexto. */
function softBlobs(ctx, rnd, w, h, { count, color, alpha, rx, ry, band = null }) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const y = band ? band.y + (rnd() - 0.5) * band.spread : rnd() * h;
    ctx.globalAlpha = alpha * (0.5 + rnd() * 0.5);
    ctx.beginPath();
    ctx.ellipse(rnd() * w, y, rx * (0.4 + rnd()), ry * (0.4 + rnd()), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- TIERRA: continentes reconocibles, océanos, polos ----------
export function createEarthTexture() {
  const w = 1024, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(12);

  // Océano con degradado (más oscuro en los polos)
  const og = ctx.createLinearGradient(0, 0, 0, h);
  og.addColorStop(0, '#16345e');
  og.addColorStop(0.5, '#1f63b8');
  og.addColorStop(1, '#16345e');
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, w, h);

  // Brillo del agua poco profundo
  softBlobs(ctx, rnd, w, h, { count: 50, color: '#3a8ad6', alpha: 0.25, rx: 60, ry: 18 });

  // Continentes (formas aproximadas, reconocibles para un niño)
  const drawLand = (pts, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const px = x * w, py = y * h;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  };
  const green = '#3f9a4d', darkGreen = '#2e7a3a', sand = '#c9b06a';

  // América del Norte
  drawLand([[0.06,0.22],[0.13,0.16],[0.21,0.18],[0.24,0.26],[0.21,0.33],[0.23,0.38],[0.18,0.42],[0.13,0.38],[0.09,0.32]], green);
  // América del Sur
  drawLand([[0.20,0.46],[0.25,0.46],[0.28,0.55],[0.26,0.68],[0.22,0.76],[0.20,0.66],[0.18,0.54]], darkGreen);
  // África (con desierto)
  drawLand([[0.46,0.32],[0.54,0.30],[0.58,0.38],[0.56,0.50],[0.52,0.62],[0.48,0.58],[0.45,0.44]], green);
  drawLand([[0.46,0.32],[0.54,0.30],[0.57,0.37],[0.52,0.42],[0.46,0.40]], sand); // Sahara
  // Europa
  drawLand([[0.46,0.20],[0.53,0.17],[0.58,0.22],[0.54,0.28],[0.47,0.27]], green);
  // Asia
  drawLand([[0.58,0.14],[0.74,0.12],[0.86,0.18],[0.84,0.30],[0.74,0.38],[0.66,0.34],[0.60,0.26]], green);
  // India
  drawLand([[0.66,0.36],[0.71,0.36],[0.69,0.46]], darkGreen);
  // Australia
  drawLand([[0.80,0.62],[0.88,0.60],[0.90,0.68],[0.84,0.72],[0.79,0.69]], sand);
  // Groenlandia
  drawLand([[0.30,0.10],[0.37,0.08],[0.39,0.15],[0.33,0.17]], '#e8f2f5');

  // Textura interior de los continentes (montañas/bosques)
  softBlobs(ctx, rnd, w, h, { count: 120, color: '#2a6b34', alpha: 0.15, rx: 14, ry: 8 });

  // Casquetes polares con borde irregular
  ctx.fillStyle = '#f2f8fa';
  ctx.fillRect(0, 0, w, 26);
  ctx.fillRect(0, h - 30, w, 30);
  for (let x = 0; x < w; x += 14) {
    ctx.beginPath();
    ctx.arc(x, 26, 6 + rnd() * 12, 0, Math.PI * 2);
    ctx.arc(x, h - 30, 6 + rnd() * 12, 0, Math.PI * 2);
    ctx.fill();
  }
  return asTexture(canvas);
}

/** Capa de nubes de la Tierra (canvas transparente, rota aparte). */
export function createEarthCloudsTexture() {
  const w = 1024, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(77);
  // Frentes de nubes alargados
  for (let i = 0; i < 90; i++) {
    const cx = rnd() * w, cy = rnd() * h;
    const len = 3 + (rnd() * 6) | 0;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let s = 0; s < len; s++) {
      ctx.globalAlpha = 0.25 + rnd() * 0.3;
      ctx.beginPath();
      ctx.ellipse((cx + s * 22) % w, cy + Math.sin(s) * 8, 16 + rnd() * 26, 6 + rnd() * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  return asTexture(canvas);
}

// ---------- MARTE: casquetes polares + Valles Marineris ----------
export function createMarsTexture() {
  const w = 512, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(4);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#a34a2a');
  g.addColorStop(0.5, '#c55a35');
  g.addColorStop(1, '#94401f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Terreno: manchas oscuras y claras
  softBlobs(ctx, rnd, w, h, { count: 70, color: '#7d3318', alpha: 0.3, rx: 26, ry: 12 });
  softBlobs(ctx, rnd, w, h, { count: 50, color: '#e08b5a', alpha: 0.22, rx: 18, ry: 9 });

  // Cráteres
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w, y = rnd() * h, r = 2 + rnd() * 6;
    ctx.fillStyle = 'rgba(60,25,12,0.4)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(240,170,120,0.35)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  // Valles Marineris: cañón oscuro cerca del ecuador
  ctx.strokeStyle = 'rgba(50,18,8,0.75)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.54);
  ctx.bezierCurveTo(w * 0.38, h * 0.50, w * 0.48, h * 0.56, w * 0.58, h * 0.52);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(30,10,5,0.8)';
  ctx.stroke();

  // Casquetes polares
  ctx.fillStyle = 'rgba(245,250,252,0.95)';
  ctx.beginPath(); ctx.ellipse(w / 2, 4, w / 2, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w / 2, h - 4, w / 2, 14, 0, 0, Math.PI * 2); ctx.fill();
  return asTexture(canvas);
}

// ---------- LUNA: cráteres ----------
export function createMoonTexture() {
  const w = 256, h = 128;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(8);
  ctx.fillStyle = '#b8b8b4';
  ctx.fillRect(0, 0, w, h);
  // Mares lunares (manchas grises oscuras)
  softBlobs(ctx, rnd, w, h, { count: 12, color: '#8d8d8a', alpha: 0.6, rx: 22, ry: 14 });
  // Cráteres con sombra y borde claro
  for (let i = 0; i < 55; i++) {
    const x = rnd() * w, y = rnd() * h, r = 1.5 + rnd() * 6;
    ctx.fillStyle = 'rgba(70,70,68,0.55)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(230,230,225,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, -2.6, 0.5); ctx.stroke();
  }
  return asTexture(canvas);
}

// ---------- GIGANTES GASEOSOS: bandas turbulentas + Gran Mancha Roja ----------
function bandedBase(ctx, rnd, w, h, base, accent) {
  // Bandas con bordes ondulados (turbulencia)
  let y = 0;
  while (y < h) {
    const bh = 10 + rnd() * 30;
    const mix = base.clone().lerp(accent, rnd()).multiplyScalar(0.82 + rnd() * 0.35);
    ctx.fillStyle = hex(mix);
    const amp = 2 + rnd() * 6;            // amplitud de la ondulación
    const freq = 2 + rnd() * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) {
      ctx.lineTo(x, y + Math.sin((x / w) * Math.PI * freq + rnd() * 2) * amp);
    }
    ctx.lineTo(w, y + bh);
    for (let x = w; x >= 0; x -= 16) {
      ctx.lineTo(x, y + bh + Math.sin((x / w) * Math.PI * freq + 1.7) * amp);
    }
    ctx.closePath();
    ctx.fill();
    // Remolinos en el borde de la banda
    softBlobs(ctx, rnd, w, h, {
      count: 6, color: hex(mix.clone().multiplyScalar(1.18)), alpha: 0.35,
      rx: 16, ry: 4, band: { y: y + bh, spread: 8 },
    });
    y += bh;
  }
}

export function createBandedTexture(def, seed = 7) {
  const w = 1024, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed + def.orbitRadius * 31);
  const base = new THREE.Color(def.color);
  const accent = new THREE.Color(def.accent ?? def.color);
  bandedBase(ctx, rnd, w, h, base, accent);

  if (def.hasSpot) {
    // Gran Mancha Roja con anillos concéntricos y remolino
    const cx = w * 0.68, cy = h * 0.63;
    const rings = ['#8a2f1d', '#b14228', '#d05a36', '#e8794f'];
    rings.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 95 - i * 20, 48 - i * 10, -0.1, 0, Math.PI * 2);
      ctx.fill();
    });
    // Brazos del remolino
    ctx.strokeStyle = 'rgba(255,200,170,0.5)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 60 - i * 14, 30 - i * 7, 0.3 * i, 0.6, 3.2);
      ctx.stroke();
    }
    // Estela turbulenta alrededor de la mancha
    softBlobs(ctx, rnd, w, h, {
      count: 14, color: '#f0d7b0', alpha: 0.3, rx: 24, ry: 6,
      band: { y: cy, spread: 70 },
    });
  }
  return asTexture(canvas);
}

// ---------- Resto de tipos ----------
export function createPlanetTexture(def, seed = 7) {
  if (def.textureType === 'earth') return createEarthTexture();
  if (def.textureType === 'mars') return createMarsTexture();
  if (def.textureType === 'banded') return createBandedTexture(def, seed);

  const w = 512, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed + def.orbitRadius * 31);
  const base = new THREE.Color(def.color);
  const accent = new THREE.Color(def.accent ?? def.color);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, hex(base.clone().multiplyScalar(0.85)));
  grad.addColorStop(0.5, hex(base));
  grad.addColorStop(1, hex(base.clone().multiplyScalar(0.8)));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (def.textureType === 'cloudy') {
    // Remolinos suaves de nubes en franjas
    for (let i = 0; i < 70; i++) {
      const mix = base.clone().lerp(accent, rnd());
      ctx.fillStyle = hex(mix);
      ctx.globalAlpha = 0.16 + rnd() * 0.2;
      ctx.beginPath();
      ctx.ellipse(rnd() * w, rnd() * h, 24 + rnd() * 80, 6 + rnd() * 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // 'rocky': cráteres con sombra y manchas
    softBlobs(ctx, rnd, w, h, { count: 60, color: hex(accent), alpha: 0.3, rx: 16, ry: 10 });
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, r = 2 + rnd() * 8;
      ctx.fillStyle = 'rgba(40,32,25,0.4)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,220,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r, -2.6, 0.5); ctx.stroke();
    }
  }
  return asTexture(canvas);
}

// ---------- SOL: granulación + manchas solares ----------
export function createSunTexture() {
  const w = 512, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(42);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ff9d00');
  grad.addColorStop(0.5, '#ffd75e');
  grad.addColorStop(1, '#ff8c00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Granulación: celdas pequeñas claras/oscuras
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,245,190,0.30)' : 'rgba(235,120,10,0.25)';
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 1.5 + rnd() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Manchas solares: núcleo oscuro + penumbra
  for (let i = 0; i < 7; i++) {
    const x = rnd() * w, y = h * 0.2 + rnd() * h * 0.6, r = 4 + rnd() * 9;
    ctx.fillStyle = 'rgba(140,60,0,0.55)';
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.8, r * 1.2, rnd(), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(60,20,0,0.8)';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, rnd(), 0, Math.PI * 2); ctx.fill();
  }
  return asTexture(canvas);
}

/** Capa transparente de granulación que contra-rota: da vida al Sol. */
export function createSunOverlayTexture() {
  const w = 512, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(101);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,250,210,0.22)' : 'rgba(255,110,0,0.20)';
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 2 + rnd() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  return asTexture(canvas);
}

// ---------- VÍA LÁCTEA: banda de fondo en esfera gigante ----------
export function createMilkyWayTexture() {
  const w = 1024, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');   // transparente: deja ver el color del cielo
  const rnd = mulberry32(2024);
  const bandY = (x) => h * 0.5 + Math.sin((x / w) * Math.PI * 2) * h * 0.13;

  // Resplandor difuso de la banda
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w;
    const y = bandY(x) + (rnd() + rnd() + rnd() - 1.5) * h * 0.10;
    const r = 6 + rnd() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const warm = rnd() > 0.7;
    g.addColorStop(0, warm ? 'rgba(255,235,200,0.05)' : 'rgba(190,210,255,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Nubes oscuras de polvo en el centro de la banda
  for (let i = 0; i < 60; i++) {
    const x = rnd() * w;
    const y = bandY(x) + (rnd() - 0.5) * h * 0.05;
    ctx.fillStyle = 'rgba(5,3,10,0.20)';
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + rnd() * 50, 4 + rnd() * 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Estrellitas concentradas en la banda
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * w;
    const y = bandY(x) + (rnd() + rnd() - 1) * h * 0.14;
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.5})`;
    ctx.fillRect(x, y, rnd() > 0.9 ? 2 : 1, 1);
  }
  return asTexture(canvas);
}

/** Sprite radial para el resplandor del Sol y partículas. */
export function createGlowTexture(inner = 'rgba(255,230,150,1)', outer = 'rgba(255,160,30,0)') {
  const s = 256;
  const canvas = makeCanvas(s, s);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(',1)', ',0.55)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return asTexture(canvas);
}

/** Punto blanco suave para estrellas/partículas. */
export function createDotTexture() {
  const s = 64;
  const canvas = makeCanvas(s, s);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(canvas);
}

/** Anillos de Saturno con franjas y división de Cassini. */
export function createRingTexture() {
  const w = 256, h = 16;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(99);
  for (let x = 0; x < w; x++) {
    let a = 0.25 + rnd() * 0.6;
    // División de Cassini: hueco oscuro a 2/3 del anillo
    if (x > w * 0.62 && x < w * 0.70) a *= 0.15;
    const tone = 190 + Math.floor(rnd() * 60);
    ctx.fillStyle = `rgba(${tone},${tone - 25},${tone - 70},${a})`;
    ctx.fillRect(x, 0, 1, h);
  }
  return asTexture(canvas);
}

/** Etiqueta flotante: emoji + nombre (para niños que aprenden letras). */
export function createLabelTexture(emoji, name) {
  const w = 512, h = 160;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 84px "Comic Sans MS", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${emoji} ${name}`, w / 2, h / 2);
  return asTexture(canvas);
}
