// ====== Modo ayuda 🆘 — Boti guía y va iluminando cada botón ======
// Pensado para pre-lectores hasta 10 años: la VOZ de Boti es la guía y un
// "spotlight" (recorte oscuro con anillo pulsante) señala el control del que
// habla. Funciona en Android medio sin canvas ni postprocesado: cuatro tiras
// oscuras alrededor del botón dejan un "hueco" transparente y un anillo encima.
// No se toca el CSS del botón (evita líos de stacking-context): el overlay va
// por arriba y captura el toque para avanzar; el botón real no se activa.

const PAD = 10;   // margen del recorte alrededor del botón (px)

// Recorrido: solo controles SIEMPRE visibles (no hace falta abrir paneles).
// El 1er paso saluda (reemplaza el saludo suelto del primer arranque).
const STEPS = [
  { id: 'btn-mic',     line: '¡Hola! Soy Boti, tu amigo del espacio. Te enseño a jugar. Aprieta este botón del micrófono y pregúntame lo que quieras: a qué temperatura está el Sol, qué tan grande es Júpiter… ¡lo que sea!' },
  { id: 'btn-tour',    line: 'Aprieta el cohete y te llevo de paseo por todos los planetas, uno por uno.' },
  { id: 'btn-games',   line: 'Aquí están los juegos: adivinar planetas, subir de nivel, la pelota que bota y jugar de a dos.' },
  { id: 'btn-build',   line: '¿Quieres crear tu propio planeta? Aquí lo armas con colores, anillos y lunas.' },
  { id: 'btn-album',   line: 'Aquí guardas tus pegatinas y tu pasaporte espacial. ¡Cada aventura suma una!' },
  { id: 'btn-galaxy',  line: 'Viaja a la galaxia y mira el agujero negro gigante girar. ¡Es enorme!' },
  { id: 'btn-home',    line: 'Si alguna vez te pierdes, aprieta la casita y volvemos al inicio.' },
];
const CLOSING = '¡Ya sabes jugar! Toca un planeta para empezar tu aventura. 🚀';

/**
 * @param {object} opts
 * @param {(text:string)=>Promise<any>} opts.speak     - voz de Boti (botiSpeak)
 * @param {()=>void} [opts.stopSpeech]                  - corta la voz de Boti
 * @returns {{ start():void, stop():void }}
 */
export function initHelp({ speak, stopSpeech }) {
  let built = false;
  let active = false;
  let idx = 0;
  let seq = 0;            // invalida avances/auto-timers de pasos viejos
  let autoTimer = null;
  let currentEl = null;

  let overlay, strips, ring, caption;

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.className = 'hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Ayuda de Mi Universo con Boti');

    strips = ['top', 'right', 'bottom', 'left'].map((side) => {
      const s = document.createElement('div');
      s.className = `help-strip help-${side}`;
      overlay.appendChild(s);
      return s;
    });

    ring = document.createElement('div');
    ring.id = 'help-ring';
    overlay.appendChild(ring);

    const bar = document.createElement('div');
    bar.id = 'help-bar';

    caption = document.createElement('p');
    caption.id = 'help-caption';
    caption.setAttribute('aria-live', 'polite');

    const next = document.createElement('button');
    next.id = 'help-next';
    next.className = 'big-btn';
    next.textContent = '➡️';
    next.dataset.tip = 'Siguiente';
    next.setAttribute('aria-label', 'Siguiente');
    next.addEventListener('click', (e) => { e.stopPropagation(); go(idx + 1); });

    const exit = document.createElement('button');
    exit.id = 'help-exit';
    exit.className = 'big-btn';
    exit.textContent = '❌';
    exit.dataset.tip = 'Salir de la ayuda';
    exit.setAttribute('aria-label', 'Salir de la ayuda');
    exit.addEventListener('click', (e) => { e.stopPropagation(); close({ say: false }); });

    bar.append(caption, next, exit);
    overlay.appendChild(bar);

    // Tocar el fondo (no la barra) = siguiente: el niño avanza tocando donde sea.
    overlay.addEventListener('click', () => go(idx + 1));

    document.body.appendChild(overlay);
    window.addEventListener('resize', onResize);
    built = true;
  }

  function onResize() {
    if (active && currentEl) position(currentEl.getBoundingClientRect());
  }

  /** Coloca las 4 tiras oscuras y el anillo para dejar el botón "asomado". */
  function position(rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const L = Math.max(0, rect.left - PAD);
    const T = Math.max(0, rect.top - PAD);
    const R = Math.min(vw, rect.right + PAD);
    const B = Math.min(vh, rect.bottom + PAD);
    const [top, right, bottom, left] = strips;
    Object.assign(top.style,    { left: '0px', top: '0px', width: vw + 'px', height: T + 'px' });
    Object.assign(bottom.style, { left: '0px', top: B + 'px', width: vw + 'px', height: Math.max(0, vh - B) + 'px' });
    Object.assign(left.style,   { left: '0px', top: T + 'px', width: L + 'px', height: Math.max(0, B - T) + 'px' });
    Object.assign(right.style,  { left: R + 'px', top: T + 'px', width: Math.max(0, vw - R) + 'px', height: Math.max(0, B - T) + 'px' });
    Object.assign(ring.style,   { left: L + 'px', top: T + 'px', width: Math.max(0, R - L) + 'px', height: Math.max(0, B - T) + 'px', display: 'block' });
  }

  /** Oscurece toda la pantalla (sin hueco): para el cierre/saludo sin botón. */
  function dimAll() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const [top, right, bottom, left] = strips;
    Object.assign(top.style, { left: '0px', top: '0px', width: vw + 'px', height: vh + 'px' });
    for (const s of [right, bottom, left]) Object.assign(s.style, { width: '0px', height: '0px' });
    ring.style.display = 'none';
  }

  /** Muestra el paso i (salta los que no existan/estén ocultos). */
  function go(i) {
    seq++;
    const mySeq = seq;
    const here = i;
    idx = i;
    clearTimeout(autoTimer);
    if (i >= STEPS.length) { close({ say: true }); return; }
    const el = document.getElementById(STEPS[i].id);
    const rect = el?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) { go(i + 1); return; }
    currentEl = el;
    position(rect);
    const line = STEPS[i].line;
    caption.textContent = line;
    Promise.resolve(speak(line)).then(() => {
      if (mySeq !== seq) return;   // ya avanzaron / se cerró
      const pause = Math.max(900, line.length * 38);   // tiempo de lectura si está en mudo
      autoTimer = setTimeout(() => { if (mySeq === seq) go(here + 1); }, pause);
    });
  }

  function close({ say }) {
    seq++;
    clearTimeout(autoTimer);
    active = false;
    currentEl = null;
    if (overlay) overlay.classList.add('hidden');
    if (say) {
      dimAll();
      speak(CLOSING);
    } else {
      stopSpeech?.();
    }
  }

  return {
    start() {
      if (active) return;
      if (!built) build();
      active = true;
      overlay.classList.remove('hidden');
      go(0);
    },
    stop() { if (active) close({ say: false }); },
  };
}
