// ====== Cielo real 🔭 — apunta el celular y Boti dice qué estás mirando ======
// Modo AISLADO y aditivo (no toca la escena three.js ni los demás modos). Sin
// cámara: usa la orientación del aparato (brújula + inclinación) + la efeméride
// real (astro.js) para saber hacia dónde está cada cuerpo, y cuando apuntas a
// uno, Boti lo nombra. Degradación elegante: sin sensores/permiso/GPS, lo
// explica y se sale sin afectar nada.
import { skyPositions } from './astro.js';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const LA_PAZ = { lat: -16.5, lon: -68.15 };     // fallback si el niño no da ubicación
const FOV = 67;                                  // campo de visión horizontal aprox (grados)
const HIT = 8;                                   // grados para considerar que "apuntas" a un cuerpo

const rev = (x) => ((x % 360) + 360) % 360;
const shortest = (deg) => ((deg + 180) % 360 + 360) % 360 - 180;

/** Hacia dónde mira la cámara trasera (az desde Norte horario, alt sobre horizonte). */
function lookDir(alpha, beta, gamma) {
  const a = alpha * D2R, b = beta * D2R, g = gamma * D2R;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  const vx = -(ca * sg + sa * sb * cg);     // Este
  const vy = ca * sb * cg - sa * sg;        // Norte
  const vz = -cb * cg;                      // Arriba
  const alt = Math.asin(Math.max(-1, Math.min(1, vz))) * R2D;
  const az = rev(Math.atan2(vx, vy) * R2D);
  return { az, alt };
}

/** Separación angular (grados) entre la mira y un cuerpo. */
function sep(look, b) {
  const c = Math.sin(look.alt * D2R) * Math.sin(b.alt * D2R)
    + Math.cos(look.alt * D2R) * Math.cos(b.alt * D2R) * Math.cos((b.az - look.az) * D2R);
  return Math.acos(Math.max(-1, Math.min(1, c))) * R2D;
}

export function initSky({ speak, stopSpeech }) {
  let built = false;
  let active = false;
  let overlay, markersBox, hint, calBtn, reticle;
  let coords = null;
  let positions = [];
  let lastEphem = 0;
  let headingOffset = 0;          // calibración manual (corrige la brújula)
  let haveHeading = false;        // ¿la orientación es absoluta (Norte real)?
  let lastOrient = null;          // {az, alt} crudo del sensor
  let raf = 0;
  let announcedId = null;
  let lastAnnounce = 0;
  const markers = new Map();      // id -> {el, emojiEl, nameEl}

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'sky-overlay';
    overlay.className = 'hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Cielo real: apunta el celular al cielo');

    markersBox = document.createElement('div');
    markersBox.id = 'sky-markers';
    overlay.appendChild(markersBox);

    reticle = document.createElement('div');
    reticle.id = 'sky-reticle';
    overlay.appendChild(reticle);

    hint = document.createElement('p');
    hint.id = 'sky-hint';
    hint.setAttribute('aria-live', 'polite');
    overlay.appendChild(hint);

    const bar = document.createElement('div');
    bar.id = 'sky-bar';
    calBtn = document.createElement('button');
    calBtn.id = 'sky-cal';
    calBtn.className = 'big-btn';
    calBtn.textContent = '🧭';
    calBtn.dataset.tip = 'Apunta al Sol o la Luna y toca para calibrar';
    calBtn.setAttribute('aria-label', 'Calibrar: apunta al Sol o la Luna y toca');
    calBtn.addEventListener('click', (e) => { e.stopPropagation(); calibrate(); });

    const exit = document.createElement('button');
    exit.id = 'sky-exit';
    exit.className = 'big-btn';
    exit.textContent = '❌';
    exit.dataset.tip = 'Salir del cielo';
    exit.setAttribute('aria-label', 'Salir del cielo real');
    exit.addEventListener('click', (e) => { e.stopPropagation(); stop(); });

    bar.append(calBtn, exit);
    overlay.appendChild(bar);
    document.body.appendChild(overlay);
    built = true;
  }

  function ensureMarker(b) {
    let m = markers.get(b.id);
    if (m) return m;
    const el = document.createElement('div');
    el.className = 'sky-marker';
    const emojiEl = document.createElement('span');
    emojiEl.className = 'sky-emoji';
    emojiEl.textContent = b.emoji;
    const nameEl = document.createElement('span');
    nameEl.className = 'sky-name';
    nameEl.textContent = b.name;
    el.append(emojiEl, nameEl);
    markersBox.appendChild(el);
    m = { el, emojiEl, nameEl };
    markers.set(b.id, m);
    return m;
  }

  // ---- orientación del aparato ----
  function onOrient(e) {
    let alpha = e.alpha, beta = e.beta, gamma = e.gamma;
    if (alpha == null || beta == null || gamma == null) return;
    if (typeof e.webkitCompassHeading === 'number') {       // iOS: brújula real
      alpha = 360 - e.webkitCompassHeading;                 // heading horario -> alpha antihorario
      haveHeading = true;
    } else if (e.absolute === true) {
      haveHeading = true;                                    // 'deviceorientationabsolute' ya es Norte real
    }
    lastOrient = lookDir(alpha, beta, gamma);
  }

  /** El niño apunta al Sol (o la Luna) visible y toca: alinea la brújula a la realidad. */
  function calibrate() {
    if (!lastOrient) return;
    const ref = positions.find((b) => b.id === 'sol' && b.up)
      ?? positions.find((b) => b.id === 'luna' && b.up);
    if (!ref) { speak?.('Para calibrar, apunta al Sol o a la Luna cuando se vean. 🧭'); return; }
    headingOffset = shortest(ref.az - lastOrient.az);
    haveHeading = true;
    speak?.(`¡Listo! Calibré con ${ref.name}. Ahora apunta a cualquier parte del cielo. 🔭`);
  }

  function refreshEphemeris() {
    const now = performance.now();
    if (positions.length && now - lastEphem < 4000) return;  // los astros se mueven lento
    lastEphem = now;
    positions = skyPositions(new Date(), coords.lat, coords.lon);
    const up = positions.filter((b) => b.up).map((b) => b.emoji).join(' ');
    hint.textContent = haveHeading
      ? `Ahora en el cielo: ${up || '… nada visible ahora'}`
      : 'Apunta al Sol o la Luna y toca 🧭 para calibrar la brújula';
  }

  function frame() {
    if (!active) return;
    raf = requestAnimationFrame(frame);
    if (!coords || !lastOrient) return;
    refreshEphemeris();
    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H / 2, margin = 34;
    const pxPerDeg = W / FOV;
    const look = { az: rev(lastOrient.az + headingOffset), alt: lastOrient.alt };

    let centered = null, centeredSep = HIT;
    for (const b of positions) {
      const m = ensureMarker(b);
      if (!b.up) { m.el.style.display = 'none'; continue; }
      m.el.style.display = '';
      const daz = shortest(b.az - look.az);
      const dalt = b.alt - look.alt;
      let x = cx + daz * pxPerDeg;
      let y = cy - dalt * pxPerDeg;
      const off = Math.abs(daz) > FOV / 2 || Math.abs(y - cy) > H / 2 - margin || Math.abs(daz) > 90;
      m.el.classList.toggle('sky-edge', off);
      if (off) {
        // Pegado al borde, indicando hacia dónde girar
        x = Math.max(margin, Math.min(W - margin, x));
        y = Math.max(margin, Math.min(H - margin, y));
        const arrow = Math.abs(daz) >= Math.abs(dalt) ? (daz > 0 ? ' ▶' : ' ◀') : (dalt > 0 ? ' ▲' : ' ▼');
        m.nameEl.textContent = b.name + arrow;
      } else {
        m.nameEl.textContent = b.name;
      }
      m.el.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px)`;
      const s = sep(look, b);
      m.el.classList.toggle('sky-hit', s < HIT);
      if (s < centeredSep) { centeredSep = s; centered = b; }
    }

    reticle.classList.toggle('locked', !!centered);
    const now = performance.now();
    if (centered) {
      if (centered.id !== announcedId && now - lastAnnounce > 1500) {
        announcedId = centered.id;
        lastAnnounce = now;
        speak?.(`¡Estás apuntando a ${centered.blurb}`);
      }
    } else {
      announcedId = null;
    }
  }

  async function requestSensors() {
    // iOS 13+: el permiso de orientación EXIGE gesto del usuario (este click vale)
    try {
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res !== 'granted') return false;
      }
    } catch { return false; }
    if (!('DeviceOrientationEvent' in window)) return false;
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
    return true;
  }

  function getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve({ ...LA_PAZ, fallback: true }); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, fallback: false }),
        () => resolve({ ...LA_PAZ, fallback: true }),
        { timeout: 6000, maximumAge: 600000 }
      );
    });
  }

  async function start() {
    if (active) return;
    if (!built) build();
    active = true;
    overlay.classList.remove('hidden');
    hint.textContent = 'Pidiendo permiso para la brújula…';

    const ok = await requestSensors();
    if (!ok) {
      hint.textContent = 'Este aparato no tiene brújula para el cielo. Pero puedes explorar el universo con los otros botones. 🚀';
      speak?.('Este aparato no me deja ver hacia dónde apuntas. ¡Pero podemos explorar el universo con los otros botones! 🚀');
      return;
    }
    coords = await getLocation();
    refreshEphemeris();
    speak?.('¡Apunta el celular al cielo y muévelo despacito! Te digo qué estrella o planeta estás mirando. Si está corrido, apunta al Sol o la Luna y toca la brújula. 🔭');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('deviceorientationabsolute', onOrient, true);
    window.removeEventListener('deviceorientation', onOrient, true);
    overlay.classList.add('hidden');
    stopSpeech?.();
  }

  return { start, stop };
}
