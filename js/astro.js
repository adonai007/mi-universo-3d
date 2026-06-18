// ====== Efeméride de baja precisión (Sol, Luna y planetas a ojo) ======
// Portado del clásico "Computing planetary positions" de Paul Schlyter.
// Precisión de pocos grados: de sobra para que un niño APUNTE el celular y
// Boti diga qué está mirando. Sin dependencias. Todo en grados.
//
// Salida: para una fecha + (lat, lon) del observador, el azimut (0=Norte,
// 90=Este, medido en sentido horario) y la altitud (0=horizonte, 90=cenit)
// de cada cuerpo. Eso es lo que el modo "Cielo real" compara con hacia dónde
// apunta el teléfono.

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const sin = (x) => Math.sin(x * D2R);
const cos = (x) => Math.cos(x * D2R);
const asin = (x) => Math.asin(Math.max(-1, Math.min(1, x))) * R2D;
const atan2 = (y, x) => Math.atan2(y, x) * R2D;
const rev = (x) => ((x % 360) + 360) % 360;

/** Día (con fracción) desde 2000 Jan 0.0 UT — la variable `d` de Schlyter. */
function dayNumber(date) {
  const Y = date.getUTCFullYear(), M = date.getUTCMonth() + 1, D = date.getUTCDate();
  const ut = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const d = 367 * Y
    - Math.floor((7 * (Y + Math.floor((M + 9) / 12))) / 4)
    + Math.floor((275 * M) / 9)
    + D - 730530;
  return { d: d + ut / 24, ut };
}

/** Anomalía excéntrica E (grados) resolviendo Kepler. */
function kepler(M, e) {
  M = rev(M);
  let E = M + R2D * e * sin(M) * (1 + e * cos(M));
  for (let k = 0; k < 8; k++) {
    const dE = (E - R2D * e * sin(E) - M) / (1 - e * cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-6) break;
  }
  return E;
}

/** Sol: posición eclíptica geocéntrica + datos para el tiempo sidéreo. */
function sunPos(d) {
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = rev(356.0470 + 0.9856002585 * d);
  const E = kepler(M, e);
  const xv = cos(E) - e, yv = Math.sqrt(1 - e * e) * sin(E);
  const v = atan2(yv, xv), r = Math.hypot(xv, yv);
  const lon = rev(v + w);
  return { lon, r, xs: r * cos(lon), ys: r * sin(lon), Ls: rev(w + M), Ms: M };
}

// Elementos orbitales (función de d). a en UA salvo la Luna (radios terrestres).
const PLANETS = {
  mercurio: { N: (d) => 48.3313 + 3.24587e-5 * d, i: (d) => 7.0047 + 5.00e-8 * d, w: (d) => 29.1241 + 1.01444e-5 * d, a: 0.387098, e: (d) => 0.205635 + 5.59e-10 * d, M: (d) => 168.6562 + 4.0923344368 * d },
  venus:    { N: (d) => 76.6799 + 2.46590e-5 * d, i: (d) => 3.3946 + 2.75e-8 * d, w: (d) => 54.8910 + 1.38374e-5 * d, a: 0.723330, e: (d) => 0.006773 - 1.302e-9 * d, M: (d) => 48.0052 + 1.6021302244 * d },
  marte:    { N: (d) => 49.5574 + 2.11081e-5 * d, i: (d) => 1.8497 - 1.78e-8 * d, w: (d) => 286.5016 + 2.92961e-5 * d, a: 1.523688, e: (d) => 0.093405 + 2.516e-9 * d, M: (d) => 18.6021 + 0.5240207766 * d },
  jupiter:  { N: (d) => 100.4542 + 2.76854e-5 * d, i: (d) => 1.3030 - 1.557e-7 * d, w: (d) => 273.8777 + 1.64505e-5 * d, a: 5.20256, e: (d) => 0.048498 + 4.469e-9 * d, M: (d) => 19.8950 + 0.0830853001 * d },
  saturno:  { N: (d) => 113.6634 + 2.38980e-5 * d, i: (d) => 2.4886 - 1.081e-7 * d, w: (d) => 339.3939 + 2.97661e-5 * d, a: 9.55475, e: (d) => 0.055546 - 9.499e-9 * d, M: (d) => 316.9670 + 0.0334442282 * d },
};

/** Coordenadas eclípticas GEOCÉNTRICAS (x,y,z) de un planeta. */
function planetGeo(el, d, S) {
  const N = el.N(d), i = el.i(d), w = el.w(d), a = el.a, e = el.e(d), M = el.M(d);
  const E = kepler(M, e);
  const xo = a * (cos(E) - e), yo = a * Math.sqrt(1 - e * e) * sin(E);
  const r = Math.hypot(xo, yo), v = rev(atan2(yo, xo));
  const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
  const yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
  const zh = r * (sin(v + w) * sin(i));
  return { x: xh + S.xs, y: yh + S.ys, z: zh };   // heliocéntrico + Sol = geocéntrico
}

/** Coordenadas eclípticas geocéntricas de la Luna (con perturbaciones mayores). */
function moonGeo(d, S) {
  const N = rev(125.1228 - 0.0529538083 * d), i = 5.1454, w = rev(318.0634 + 0.1643573223 * d);
  const a = 60.2666, e = 0.054900, M = rev(115.3654 + 13.0649929509 * d);
  const E = kepler(M, e);
  const xo = a * (cos(E) - e), yo = a * Math.sqrt(1 - e * e) * sin(E);
  const r = Math.hypot(xo, yo), v = rev(atan2(yo, xo));
  const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
  const yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
  const zh = r * (sin(v + w) * sin(i));
  let lon = rev(atan2(yh, xh)), lat = atan2(zh, Math.hypot(xh, yh));
  // Perturbaciones principales (Schlyter): la Luna se mueve rápido y se mira mucho.
  const Ls = S.Ls, Ms = S.Ms, Lm = rev(N + w + M), Mm = M, Dm = rev(Lm - Ls), F = rev(Lm - N);
  lon += -1.274 * sin(Mm - 2 * Dm) + 0.658 * sin(2 * Dm) - 0.186 * sin(Ms)
    - 0.059 * sin(2 * Mm - 2 * Dm) - 0.057 * sin(Mm - 2 * Dm + Ms) + 0.053 * sin(Mm + 2 * Dm)
    + 0.046 * sin(2 * Dm - Ms) + 0.041 * sin(Mm - Ms) - 0.035 * sin(Dm)
    - 0.031 * sin(Mm + Ms) - 0.015 * sin(2 * F - 2 * Dm) + 0.011 * sin(Mm - 4 * Dm);
  lat += -0.173 * sin(F - 2 * Dm) - 0.055 * sin(Mm - F - 2 * Dm) - 0.046 * sin(Mm + F - 2 * Dm)
    + 0.033 * sin(F + 2 * Dm) + 0.017 * sin(2 * Mm + F);
  const cl = cos(lat);
  return { x: r * cl * cos(lon), y: r * cl * sin(lon), z: r * sin(lat) };
}

/** Eclíptica geocéntrica (x,y,z) -> azimut/altitud para el observador. */
function toAltAz(g, d, ut, latDeg, lonDeg, S) {
  const ecl = 23.4393 - 3.563e-7 * d;
  const xe = g.x;
  const ye = g.y * cos(ecl) - g.z * sin(ecl);
  const ze = g.y * sin(ecl) + g.z * cos(ecl);
  const RA = rev(atan2(ye, xe));
  const Dec = atan2(ze, Math.hypot(xe, ye));
  // Tiempo sidéreo local (horas) y ángulo horario
  const GMST0 = S.Ls / 15 + 12;                 // (Ls + 180)/15
  const LST = GMST0 + ut + lonDeg / 15;         // lon Este positivo
  const HA = rev(LST * 15 - RA);
  const x = cos(HA) * cos(Dec), y = sin(HA) * cos(Dec), z = sin(Dec);
  const xhor = x * sin(latDeg) - z * cos(latDeg);
  const yhor = y;
  const zhor = x * cos(latDeg) + z * sin(latDeg);
  return { az: rev(atan2(yhor, xhor) + 180), alt: asin(zhor) };
}

// Nombre + emoji + frase corta de Boti por cuerpo (tono niño, kid-safe).
export const SKY_BODIES = [
  { id: 'sol', name: 'el Sol', emoji: '☀️', blurb: 'el Sol, nuestra estrella. ¡No lo mires directo, quema los ojitos!' },
  { id: 'luna', name: 'la Luna', emoji: '🌙', blurb: 'la Luna, la mejor amiga de la Tierra.' },
  { id: 'mercurio', name: 'Mercurio', emoji: '⚪', blurb: 'Mercurio, el planeta más pequeño y veloz, pegadito al Sol.' },
  { id: 'venus', name: 'Venus', emoji: '🟠', blurb: 'Venus, el lucero brillante. ¡Es el planeta más caliente!' },
  { id: 'marte', name: 'Marte', emoji: '🔴', blurb: 'Marte, el planeta rojo donde trabajan los robots.' },
  { id: 'jupiter', name: 'Júpiter', emoji: '🟤', blurb: 'Júpiter, el planeta más grandote. ¡Caben mil Tierras!' },
  { id: 'saturno', name: 'Saturno', emoji: '🪐', blurb: 'Saturno, el de los anillos preciosos.' },
];

/**
 * Posiciones (az, alt) de todos los cuerpos del cielo para un instante y lugar.
 * @param {Date} date  momento (usa UTC internamente)
 * @param {number} latDeg  latitud (Norte +)
 * @param {number} lonDeg  longitud (Este +; La Paz ≈ -68.15)
 * @returns {Array<{id,name,emoji,blurb,az,alt,up}>}
 */
export function skyPositions(date, latDeg, lonDeg) {
  const { d, ut } = dayNumber(date);
  const S = sunPos(d);
  const out = [];
  for (const b of SKY_BODIES) {
    let g;
    if (b.id === 'sol') g = { x: S.xs, y: S.ys, z: 0 };
    else if (b.id === 'luna') g = moonGeo(d, S);
    else g = planetGeo(PLANETS[b.id], d, S);
    const { az, alt } = toAltAz(g, d, ut, latDeg, lonDeg, S);
    out.push({ ...b, az, alt, up: alt > 0 });
  }
  return out;
}
