// ====== Escena 3D del sistema solar ======
// Realismo: tone mapping ACES, lado día/noche real (solo ilumina el Sol),
// inclinación axial real, atmósferas, nubes en capa aparte, Vía Láctea de fondo.
// Texturas: reales (./textures/, Solar System Scope CC BY 4.0) con
// FALLBACK procedural si el archivo no carga (funciona offline u offline parcial).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SUN, PLANETS, MOON, EXTRAS, REAL_AU, GRAVITY } from './planets.js';
import {
  createPlanetTexture, createSunTexture,
  createGlowTexture, createDotTexture, createRingTexture, createLabelTexture,
  createMoonTexture, createEarthCloudsTexture, createMilkyWayTexture,
  createShadowSpotTexture,
} from './textures.js';
import { createBlackHole } from './blackhole.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STAR_COUNTS = { low: 1200, normal: 4000, high: 9000 };

// Cometa ☄️: órbita elíptica con el Sol en el foco (r = p / (1 + e·cosθ)),
// plano inclinado y velocidad kepleriana (dθ/dt = K/r²: corre en el perihelio,
// pasea en el afelio). Perihelio ≈ 24.8, afelio ≈ 99.2 (entre Marte y Júpiter
// REALES en modo escala — no estorba). K = 190 → período ≈ 102 s.
const COMET_A = 62;
const COMET_E = 0.6;
const COMET_INCL = 0.35;
const COMET_P = COMET_A * (1 - COMET_E * COMET_E);   // semi-latus rectum ≈ 39.7
const COMET_K = 190;

// En vista libre el target es el Sol (origen): el zoom nunca debe meter la
// cámara dentro del resplandor (sprites aditivos de corona = pantalla amarilla).
const FREE_MIN_DISTANCE = SUN.size * 2.6;   // ~23.4 unidades
const AMBIENTS = {
  night: { color: 0x334466, intensity: 0.55 },
  warm:  { color: 0xffb070, intensity: 0.9 },
  day:   { color: 0x99aaff, intensity: 2.2 },
};

// Mapa de texturas reales por id (con fallback procedural si fallan)
const REAL_TEXTURES = {
  sol: '2k_sun.jpg',
  mercurio: '2k_mercury.jpg',
  venus: '2k_venus_atmosphere.jpg',
  tierra: '2k_earth_daymap.jpg',
  marte: '2k_mars.jpg',
  jupiter: '2k_jupiter.jpg',
  saturno: '2k_saturn.jpg',
  urano: '2k_uranus.jpg',
  neptuno: '2k_neptune.jpg',
  luna: '2k_moon.jpg',
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ---------- Shaders inline (baratos: pensados para un Android medio) ----------
// Granulación del Sol: 3 octavas de value-noise animado sobre la esfera.
// Va en una capa semitransparente ENCIMA de la textura real: el Sol "hierve".
const SUN_BOIL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SUN_BOIL_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv * vec2(22.0, 11.0);
    float t = uTime * 0.35;
    float v = 0.5   * vnoise(p       + vec2(t, -t * 0.7));
    v      += 0.25  * vnoise(p * 2.1 - vec2(t * 1.6, t));
    v      += 0.125 * vnoise(p * 4.3 + vec2(-t, t * 1.3));
    v /= 0.875;
    // Células brillantes (gránulos) y calles oscuras entre ellas
    vec3 col = mix(vec3(0.85, 0.32, 0.02), vec3(1.0, 0.93, 0.55), smoothstep(0.25, 0.8, v));
    float alpha = 0.28 + 0.34 * smoothstep(0.2, 0.9, v);
    gl_FragColor = vec4(col, alpha);
  }
`;

// Atmósfera con borde fresnel: brilla en la silueta del planeta y se apaga
// hacia afuera; el lado que mira al Sol (origen) brilla más que el lado noche.
const ATMO_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vE;
  varying vec3 vW;
  varying vec3 vC;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vE = -mv.xyz;
    vW = (modelMatrix * vec4(position, 1.0)).xyz;
    vC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uEdge;   // cos del ángulo donde está el borde del planeta
  varying vec3 vN;
  varying vec3 vE;
  varying vec3 vW;
  varying vec3 vC;
  void main() {
    float d = abs(dot(normalize(vN), normalize(vE)));
    float rim = pow(clamp(d / uEdge, 0.0, 1.0), 2.0);   // 1 en el borde, 0 afuera
    float day = 0.3 + 0.7 * smoothstep(-0.55, 0.5, dot(normalize(vW - vC), normalize(-vC)));
    gl_FragColor = vec4(uColor, rim * day * uOpacity);
  }
`;

export class SolarSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.speedFactor = REDUCED_MOTION ? 0.4 : 1;
    this.paused = false;
    this.selected = null;
    this.elapsed = 0;
    this.idleTime = 0;
    this.cameraTween = null;
    this.followTarget = null;
    this.confettiBursts = [];
    this.onFlyDone = null;
    this.compareActive = false;
    this.galaxyActive = false;
    this.moonPhaseActive = false;
    this.moonAutoOrbit = false;     // modo fases 🌗: la Luna recorre su órbita sola
    this.eclipseActive = false;     // sub-modo eclipses 🌞🌚 (vive dentro de fases)
    this.eclipseKind = null;        // 'solar' | 'lunar'
    this.eclipseParts = null;       // { spot, cone } se crean perezosamente
    this.moonDrive = null;          // tween/barrido del ángulo orbital de la Luna
    this.moonDirSign = 1;           // sentido pivote→fase (se sondea al alinear)
    this.moonOrigColor = null;      // color/emissive originales de la Luna (restaurables)
    this.customPlanets = [];
    this.missionDefId = null;
    this.shootingStar = null;
    this.astronaut = null;          // 🧑‍🚀 saluda ~6 s al visitar la ISS
    this.scaleActive = false;       // modo escala real 🏔 (distancias verdaderas)
    this.scaleMix = 0;              // 0 = dibujo compacto, 1 = REAL_AU
    this.scaleGoal = 0;
    this.ball = null;               // 🏀 pelota del modo gravedad (un solo cuerpo a la vez)
    this.earthNightUniforms = null;   // luces de ciudad 🌃 (si carga el nightmap)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;   // tone mapping físico
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03020f);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);
    this.homePosition = new THREE.Vector3(0, 52, 108);
    this.camera.position.copy(this.homePosition);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = FREE_MIN_DISTANCE;
    this.controls.maxDistance = 260;
    this.controls.enablePan = false;
    this.controls.autoRotateSpeed = 0.35;

    this.texLoader = new THREE.TextureLoader();
    this.dotTexture = createDotTexture();
    this.glowTexture = createGlowTexture();
    this.labelTextures = new Map();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pickables = [];
    this.comparePickables = [];
    this.galaxyPickables = [];
    this.focusTargets = new Map();   // id -> Object3D para volar hasta él

    // Grupo del sistema solar completo (se oculta en modo comparación)
    this.solarGroup = new THREE.Group();
    this.scene.add(this.solarGroup);

    this.#buildLights();
    this.#buildSun();
    this.#buildPlanets();
    this.#buildAsteroidBelt();
    this.#buildComet();
    this.#buildMilkyWay();
    this.#buildGalaxy();
    this.stars = null;
    this.buildStars('normal');
    this.compareGroup = null;

    window.addEventListener('resize', () => this.#onResize());

    // Aviso a la app cuando el niño "suelta" un planeta alejándose mucho
    this.onDeselect = null;

    // Zoom predecible: si el niño usa la rueda (o pone un segundo dedo para
    // pellizcar) DURANTE un vuelo, el vuelo termina al instante en su destino
    // y el zoom manda. Antes el tween pisaba la cámara y la rueda "no hacía nada".
    canvas.addEventListener('wheel', () => {
      this.markUserActivity();
      this.#finishTweenNow();
    }, { passive: true });
    this.activePointers = 0;
    canvas.addEventListener('pointerdown', () => {
      this.activePointers++;
      if (this.activePointers >= 2) this.#finishTweenNow();   // pinch
    });
    const releasePointer = () => { this.activePointers = Math.max(0, this.activePointers - 1); };
    canvas.addEventListener('pointerup', releasePointer);
    canvas.addEventListener('pointercancel', releasePointer);
  }

  /** Completa el vuelo de cámara en curso de inmediato (el destino se respeta). */
  #finishTweenNow() {
    const tw = this.cameraTween;
    if (!tw) return;
    let toPos, toTarget;
    if (tw.fixed) {
      toPos = tw.toPos; toTarget = tw.toTarget;
    } else {
      toTarget = this.worldPositionOf(this.followTarget ?? SUN);
      toPos = toTarget.clone().add(tw.dir.clone().multiplyScalar(tw.dist));
    }
    this.camera.position.copy(toPos);
    this.controls.target.copy(toTarget);
    this.cameraTween = null;
    const cb = this.onFlyDone;
    this.onFlyDone = null;
    if (cb) cb();
  }

  /** Suelta el planeta seguido (zoom-out grande): estado limpio y consistente. */
  #releaseFollow() {
    this.followTarget = null;
    this.selected = null;
    this.controls.minDistance = FREE_MIN_DISTANCE;
    // Mantiene la posición de la cámara pero recentra la mirada en el Sol
    this.cameraTween = {
      t: 0, duration: REDUCED_MOTION ? 0.01 : 1.1,
      fromPos: this.camera.position.clone(),
      toPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(0, 0, 0),
      fixed: true,
    };
    if (this.onDeselect) this.onDeselect();
  }

  /** Intenta cargar una textura real; si falla se queda la procedural. */
  #loadReal(file, onLoad) {
    this.texLoader.load(
      `textures/${file}`,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        onLoad(t);
      },
      undefined,
      () => { /* sin conexión o archivo ausente: fallback procedural ya activo */ }
    );
  }

  #labelTex(def) {
    if (!this.labelTextures.has(def.id)) {
      this.labelTextures.set(def.id, createLabelTexture(def.emoji, def.name));
    }
    return this.labelTextures.get(def.id);
  }

  // ---------- construcción ----------
  #buildLights() {
    this.ambient = new THREE.AmbientLight(AMBIENTS.night.color, AMBIENTS.night.intensity);
    this.scene.add(this.ambient);
    // Única luz direccionable: el Sol. Crea el lado día/noche real.
    this.sunLight = new THREE.PointLight(0xfff2dd, 2200, 0, 1.8);
    this.solarGroup.add(this.sunLight);
  }

  #buildSun() {
    const mat = new THREE.MeshBasicMaterial({ map: createSunTexture() });
    this.#loadReal(REAL_TEXTURES.sol, (t) => { mat.map = t; mat.needsUpdate = true; });
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(SUN.size, 48, 32), mat);
    this.sun.userData = { def: SUN, isPickable: true };
    this.solarGroup.add(this.sun);
    this.pickables.push(this.sun);
    this.focusTargets.set('sol', this.sun);

    // Capa de granulación VIVA: ruido animado en shader sobre la textura real,
    // y además contra-rota — el Sol "hierve" de verdad, nunca se ve congelado.
    this.sunUniforms = { uTime: { value: 0 } };
    this.sunOverlay = new THREE.Mesh(
      new THREE.SphereGeometry(SUN.size * 1.012, 48, 32),
      new THREE.ShaderMaterial({
        uniforms: this.sunUniforms,
        vertexShader: SUN_BOIL_VERT,
        fragmentShader: SUN_BOIL_FRAG,
        transparent: true,
        depthWrite: false,
      })
    );
    this.solarGroup.add(this.sunOverlay);

    // Prominencias/llamaradas ☀️🔥: arcos de plasma que brotan del borde,
    // crecen, tiemblan y se apagan; luego reaparecen en otro lugar.
    this.prominences = [];
    for (let i = 0; i < 3; i++) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(SUN.size * 0.34, SUN.size * 0.045, 5, 20, Math.PI),
        new THREE.MeshBasicMaterial({
          color: 0xff7a33, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      const g = new THREE.Group();
      g.add(arc);
      this.solarGroup.add(g);
      const p = { group: g, arc, t: -i * 2.5 - Math.random() * 3 };
      this.#repositionProminence(p);
      this.prominences.push(p);
    }

    // Resplandor (corona) con sprites aditivos
    const glowMat = new THREE.SpriteMaterial({
      map: this.glowTexture, color: 0xffcc55,
      transparent: true, opacity: 0.8, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.sunGlow = new THREE.Sprite(glowMat);
    this.sunGlow.scale.setScalar(SUN.size * 4.6);
    this.solarGroup.add(this.sunGlow);

    const glow2 = new THREE.Sprite(glowMat.clone());
    glow2.material.opacity = 0.3;
    glow2.scale.setScalar(SUN.size * 8);
    this.solarGroup.add(glow2);
    this.sunGlow2 = glow2;
  }

  /** Mueve una prominencia a un punto al azar del borde del Sol. */
  #repositionProminence(p) {
    const dir = new THREE.Vector3().randomDirection();
    p.group.position.copy(dir).multiplyScalar(SUN.size * 0.99);
    // El medio-toro arquea hacia su +Y local: lo apuntamos hacia afuera
    p.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    p.group.rotateY(Math.random() * Math.PI * 2);
    p.arc.scale.set(1, 0.001, 1);
    p.arc.material.opacity = 0;
  }

  /** Crea el conjunto de un planeta (también usado por "construye tu planeta"). */
  #createPlanetObject(def) {
    const pivot = new THREE.Group();           // órbita alrededor del Sol
    pivot.rotation.y = Math.random() * Math.PI * 2;
    this.solarGroup.add(pivot);

    // holder: posición + inclinación axial real
    const holder = new THREE.Group();
    holder.position.x = def.orbitRadius;
    holder.rotation.z = THREE.MathUtils.degToRad(def.axialTilt ?? 0);
    pivot.add(holder);

    const mat = new THREE.MeshStandardMaterial({
      map: createPlanetTexture(def),
      roughness: 0.9,
      metalness: 0.02,
    });
    if (REAL_TEXTURES[def.id]) {
      this.#loadReal(REAL_TEXTURES[def.id], (t) => { mat.map = t; mat.needsUpdate = true; });
    }

    // Lado nocturno de la Tierra 🌃: lucecitas de ciudades mezcladas en el
    // shader según la dirección al Sol (origen). Si la textura no carga, el
    // onBeforeCompile nunca se instala y todo sigue como antes.
    if (def.id === 'tierra') {
      this.#loadReal('2k_earth_nightmap.jpg', (nightTex) => {
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uNightMap = { value: nightTex };
          shader.uniforms.uNightOn = { value: 1 };
          this.earthNightUniforms = shader.uniforms;
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vNightWP;\nvarying vec3 vNightWN;')
            .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
              vNightWP = (modelMatrix * vec4(position, 1.0)).xyz;
              vNightWN = normalize((modelMatrix * vec4(normal, 0.0)).xyz);`);
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
              uniform sampler2D uNightMap;
              uniform float uNightOn;
              varying vec3 vNightWP;
              varying vec3 vNightWN;`)
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
              float nDay = dot(normalize(vNightWN), normalize(-vNightWP));
              float nF = smoothstep(0.12, -0.22, nDay) * uNightOn;
              vec3 city = texture2D(uNightMap, vMapUv).rgb;
              totalEmissiveRadiance += city * vec3(1.0, 0.82, 0.5) * nF * 1.6;`);
        };
        mat.customProgramCacheKey = () => 'tierra-luces-noche';
        mat.needsUpdate = true;
      });
    }
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(def.size, 48, 32), mat);
    mesh.userData = { def, isPickable: true };
    holder.add(mesh);
    this.focusTargets.set(def.id, mesh);

    // Esfera invisible grande: fácil de tocar con dedos pequeños
    const pickRadius = Math.max(def.size * 1.8, 2.6);
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(pickRadius, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pick.userData = { def, isPickable: true };
    holder.add(pick);
    this.pickables.push(pick, mesh);

    // Atmósfera con borde fresnel (azul en la Tierra, del color de cada
    // gigante gaseoso): brilla pegada a la silueta y se apaga hacia afuera.
    if (def.atmosphere) {
      const s = def.atmosphere.scale;
      const atm = new THREE.Mesh(
        new THREE.SphereGeometry(def.size * s, 32, 24),
        new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: new THREE.Color(def.atmosphere.color) },
            uOpacity: { value: def.atmosphere.opacity * 2.8 },
            uEdge: { value: Math.sqrt(Math.max(1 - 1 / (s * s), 1e-4)) },
          },
          vertexShader: ATMO_VERT,
          fragmentShader: ATMO_FRAG,
          side: THREE.BackSide, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      holder.add(atm);
    }

    // Nubes de la Tierra: capa aparte que rota distinto
    let clouds = null;
    if (def.hasClouds) {
      const cloudMat = new THREE.MeshStandardMaterial({
        map: createEarthCloudsTexture(), transparent: true,
        depthWrite: false, roughness: 1,
      });
      this.#loadReal('2k_earth_clouds.jpg', (t) => {
        // La textura real son nubes blancas sobre negro: úsala como alphaMap
        cloudMat.map = null;
        cloudMat.color.set(0xffffff);
        cloudMat.alphaMap = t;
        cloudMat.needsUpdate = true;
      });
      clouds = new THREE.Mesh(new THREE.SphereGeometry(def.size * 1.025, 48, 32), cloudMat);
      holder.add(clouds);
    }

    // Anillos (Saturno o planetas creados por el niño)
    if (def.hasRings) {
      holder.add(this.#makeRings(def));
    }

    // Lunas
    let moonPivot = null;
    let moonMesh = null;
    if (def.hasMoon) {
      moonPivot = new THREE.Group();
      holder.add(moonPivot);
      const moonMat = new THREE.MeshStandardMaterial({ map: createMoonTexture(), roughness: 1 });
      this.#loadReal(REAL_TEXTURES.luna, (t) => { moonMat.map = t; moonMat.needsUpdate = true; });
      moonMesh = new THREE.Mesh(new THREE.SphereGeometry(MOON.size, 24, 16), moonMat);
      moonMesh.position.x = MOON.orbitRadius;
      moonMesh.userData = { def: MOON, isPickable: true };
      moonPivot.add(moonMesh);
      this.focusTargets.set('luna', moonMesh);
      // Zona de toque generosa para la Luna
      const moonPick = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 8, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      moonPick.userData = { def: MOON, isPickable: true };
      moonMesh.add(moonPick);
      this.pickables.push(moonPick, moonMesh);
    }
    // Mini-lunas de planetas creados por el niño
    if (def.miniMoons) {
      moonPivot = new THREE.Group();
      holder.add(moonPivot);
      for (let i = 0; i < Math.min(def.miniMoons, 5); i++) {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 1 })
        );
        const a = (i / Math.min(def.miniMoons, 5)) * Math.PI * 2;
        const r = def.size + 0.9 + i * 0.45;
        m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        moonPivot.add(m);
      }
    }

    // Línea de órbita sutil
    const orbitPts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * def.orbitRadius, 0, Math.sin(a) * def.orbitRadius));
    }
    const orbit = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orbitPts),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
    );
    this.orbitLines.add(orbit);

    // Etiqueta flotante (emoji + nombre)
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.#labelTex(def), transparent: true, depthWrite: false,
    }));
    label.scale.set(10, 3.1, 1);
    this.labels.add(label);

    return { def, pivot, holder, mesh, clouds, moonPivot, moonMesh, label, orbit, pick };
  }

  #makeRings(def, { shadow = true } = {}) {
    const inner = def.size * 1.4, outer = def.size * 2.35;
    const ringGeo = new THREE.RingGeometry(inner, outer, 96);
    // UV radial: u = radio normalizado (compatible con la textura real en franja)
    const pos = ringGeo.attributes.position;
    const uv = ringGeo.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      uv.setXY(i, (v3.length() - inner) / (outer - inner), 0.5);
    }
    const ringMat = new THREE.MeshBasicMaterial({
      map: createRingTexture(), side: THREE.DoubleSide,
      transparent: true, depthWrite: false,
    });
    if (def.id === 'saturno') {
      this.#loadReal('2k_saturn_ring_alpha.png', (t) => { ringMat.map = t; ringMat.needsUpdate = true; });
    }
    // Sombra del planeta sobre los anillos: el cono de sombra apunta en
    // dirección Sol→planeta (el Sol vive en el origen). Solo en la escena
    // real — en el modo comparación el Sol de origen no aplica (shadow:false).
    if (shadow) {
      ringMat.onBeforeCompile = (shader) => {
        shader.uniforms.uPlanetR = { value: def.size };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vRingWP;\nvarying vec3 vRingC;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            vRingWP = (modelMatrix * vec4(position, 1.0)).xyz;
            vRingC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;`);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
            uniform float uPlanetR;
            varying vec3 vRingWP;
            varying vec3 vRingC;`)
          .replace('#include <map_fragment>', `#include <map_fragment>
            vec3 shL = normalize(vRingC);             // dirección de la luz solar
            vec3 shD = vRingWP - vRingC;
            float shT = dot(shD, shL);                // ¿detrás del planeta?
            float shR = length(shD - shL * shT);      // distancia al eje de sombra
            float sh = shT > 0.0 ? smoothstep(uPlanetR * 0.88, uPlanetR * 1.08, shR) : 1.0;
            diffuseColor.rgb *= mix(0.22, 1.0, sh);`);
      };
      ringMat.customProgramCacheKey = () => 'anillos-sombra';
    }
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    return ring;
  }

  #buildPlanets() {
    this.planets = [];
    this.orbitLines = new THREE.Group();
    this.labels = new THREE.Group();
    this.solarGroup.add(this.orbitLines, this.labels);

    for (const def of PLANETS) {
      const rec = this.#createPlanetObject(def);
      this.planets.push(rec);
      if (def.id === 'tierra') this.#buildISS(rec);
      if (def.id === 'marte') this.#buildRover(rec);
    }

    // Etiqueta del Sol
    const sunLabel = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.#labelTex(SUN), transparent: true, depthWrite: false,
    }));
    sunLabel.scale.set(10, 3.1, 1);
    sunLabel.position.set(0, SUN.size + 4, 0);
    this.labels.add(sunLabel);
    this.sunLabel = sunLabel;
  }

  /** Estación Espacial low-poly orbitando la Tierra. 🛰️ */
  #buildISS(earthRec) {
    this.issPivot = new THREE.Group();
    this.issPivot.rotation.x = 0.9;     // órbita inclinada, fácil de ver
    earthRec.holder.add(this.issPivot);

    const iss = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e8f0, roughness: 0.6 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2a4fd0, roughness: 0.4, metalness: 0.3 });
    // Módulos centrales
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.16), white);
    const mod1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.4), white);
    mod1.position.z = 0.16;
    // Paneles solares
    const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.26), blue);
    panelL.position.x = -0.62;
    const panelR = panelL.clone();
    panelR.position.x = 0.62;
    iss.add(body, mod1, panelL, panelR);
    iss.position.x = 3.6;   // fuera de la esfera de toque de la Tierra
    this.issPivot.add(iss);
    this.iss = iss;
    this.focusTargets.set('iss', iss);

    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pick.userData = { def: EXTRAS.iss, isPickable: true };
    iss.add(pick);
    this.pickables.push(pick);
  }

  /** Textura canvas-emoji del astronauta (patrón #missionStarTexture).
   *  Si el sistema no une 🧑+ZWJ+🚀 en UN glifo (tofu doble), fallback 👋. */
  #astronautTexture() {
    if (!this._astronautTex) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      ctx.font = '100px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const joined = ctx.measureText('🧑‍🚀').width;
      const single = ctx.measureText('🧑').width;
      const emoji = joined <= single * 1.4 ? '🧑‍🚀' : '👋';
      ctx.shadowColor = 'rgba(160,200,255,0.9)';
      ctx.shadowBlur = 14;
      ctx.fillText(emoji, 64, 70);
      this._astronautTex = new THREE.CanvasTexture(c);
      this._astronautTex.colorSpace = THREE.SRGBColorSpace;
    }
    return this._astronautTex;
  }

  /** Un astronauta 🧑‍🚀 sale de la estación y saluda ~6 s al visitante. */
  showAstronautWave() {
    if (!this.iss) return;
    this.#removeAstronaut();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.#astronautTexture(), transparent: true, depthWrite: false,
    }));
    sprite.scale.set(1.4, 1.4, 1);
    sprite.position.set(0, 1.1, 0);
    this.iss.add(sprite);
    this.astronaut = { sprite, life: 0, maxLife: 6 };
  }

  #removeAstronaut() {
    const a = this.astronaut;
    if (!a) return;
    this.iss.remove(a.sprite);
    a.sprite.material.dispose();   // la textura está cacheada: no se libera
    this.astronaut = null;
  }

  // ---------- gravedad jugable 🏀 ----------
  /** Textura canvas-emoji de la pelota (cacheada, patrón #missionStarTexture). */
  #ballTexture() {
    if (!this._ballTex) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      ctx.font = '100px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,160,60,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText('🏀', 64, 70);
      this._ballTex = new THREE.CanvasTexture(c);
      this._ballTex.colorSpace = THREE.SRGBColorSpace;
    }
    return this._ballTex;
  }

  /**
   * Lanza la pelota 🏀 sobre un cuerpo del modo gravedad. Parábola determinista
   * y = size + v·t − ½·(g·A)·t² con A = 12, v = √(2·g·A·h) y pico h = size·0.9/g:
   * en la Luna (g 0.17) sube ALTÍSIMO y en Júpiter (g 2.53) casi nada.
   * 3 rebotes con restitución 0.55 y reposo. Tocar de nuevo relanza.
   */
  launchBall(id) {
    this.removeBall();
    const grav = GRAVITY[id];
    if (!grav) return false;
    let parent = null;
    let size = 0;
    if (id === 'luna') {
      const earth = this.planets.find((p) => p.def.id === 'tierra');
      parent = earth?.moonMesh;          // viaja con la Luna en su órbita
      size = MOON.size;
    } else {
      const rec = this.planets.find((p) => p.def.id === id);
      parent = rec?.holder;              // mismo padre que el marcador de misión ⭐
      size = rec?.def.size ?? 0;
    }
    if (!parent) return false;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.#ballTexture(), transparent: true, depthWrite: false,
    }));
    // Sprite dinámico nuevo: sin culling (regla del proyecto — la esfera
    // envolvente inicial queda obsoleta cuando el holder viaja por su órbita).
    sprite.frustumCulled = false;
    const d = THREE.MathUtils.clamp(size * 0.42, 0.42, 1.7);   // pelota a escala del cuerpo
    sprite.scale.set(d, d, 1);
    sprite.position.set(0, size, 0);
    parent.add(sprite);
    const accel = grav.g * 12;                 // A = 12 (aceleración de juego)
    const h = (size * 0.9) / grav.g;           // pico del primer bote
    this.ball = {
      sprite, parent, size,
      accel, v: Math.sqrt(2 * accel * h),
      t: 0, bounces: 0, resting: false,
    };
    return true;
  }

  /** Quita la pelota (salida del modo gravedad o relanzamiento). */
  removeBall() {
    const b = this.ball;
    if (!b) return;
    b.parent.remove(b.sprite);
    b.sprite.material.dispose();   // la textura está cacheada: no se libera
    this.ball = null;
  }

  /** Rover explorador sobre la superficie de Marte. 🤖 */
  #buildRover(marsRec) {
    const rover = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.09, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.7 })
    );
    body.position.y = 0.08;
    const mast = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.12, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    mast.position.set(0.06, 0.18, 0);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.04, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    head.position.set(0.06, 0.25, 0);
    rover.add(body, mast, head);
    const wheelGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 });
    for (const [x, z] of [[-0.08, 0.08], [0.08, 0.08], [-0.08, -0.08], [0.08, -0.08]]) {
      const wh = new THREE.Mesh(wheelGeo, wheelMat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(x, 0.035, z);
      rover.add(wh);
    }
    // Colocado sobre la superficie (latitud ~25°)
    const dir = new THREE.Vector3(0.9, 0.42, 0.1).normalize();
    rover.position.copy(dir.clone().multiplyScalar(marsRec.def.size * 0.99));
    rover.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    marsRec.mesh.add(rover);   // gira con el planeta
    this.rover = rover;
    this.focusTargets.set('rover', rover);

    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pick.userData = { def: EXTRAS.rover, isPickable: true };
    rover.add(pick);
    this.pickables.push(pick);
  }

  #buildAsteroidBelt() {
    const count = 1400;
    const inner = 37, outer = 42;
    const geo = new THREE.DodecahedronGeometry(0.18);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a8c7a, roughness: 1 });
    this.belt = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = inner + Math.random() * (outer - inner);
      dummy.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 1.8, Math.sin(a) * r);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.scale.setScalar(0.4 + Math.random() * 1.6);
      dummy.updateMatrix();
      this.belt.setMatrixAt(i, dummy.matrix);
    }
    this.solarGroup.add(this.belt);
  }

  /** Cometa ☄️ tocable y visitable: órbita kepleriana + cola anti-solar. */
  #buildComet() {
    this.comet = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xcfeaff })
    );
    this.comet.add(head);
    // Cabellera (coma): halo suave para que se vea de lejos
    const coma = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture, color: 0xbfe2ff, transparent: true,
      opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    coma.scale.setScalar(3.2);
    this.comet.add(coma);
    const N = 120;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.cometPoints = new THREE.Points(trailGeo, new THREE.PointsMaterial({
      size: 1.4, map: this.dotTexture, color: 0x9fd4ff,
      transparent: true, opacity: 0.75, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    // La cola se recalcula entera cada frame y viaja por TODA la órbita: la
    // esfera envolvente inicial queda obsoleta y three.js la sacaría de cámara
    // (cola invisible). Sin culling: 120 puntos no le cuestan nada al GPU.
    this.cometPoints.frustumCulled = false;
    this.solarGroup.add(this.comet, this.cometPoints);
    this.cometAngle = 0;
    // Zona de toque generosa (dedos pequeños) + foco para volar hasta él
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(6, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pick.userData = { def: EXTRAS.cometa, isPickable: true };
    this.comet.add(pick);
    this.pickables.push(pick);
    this.focusTargets.set('cometa', this.comet);
  }

  /** Esfera gigante con la Vía Láctea (textura real con fallback procedural). */
  #buildMilkyWay() {
    this.milkyMat = new THREE.MeshBasicMaterial({
      map: createMilkyWayTexture(), side: THREE.BackSide,
      transparent: true, depthWrite: false,
    });
    this.#loadReal('2k_stars_milky_way.jpg', (t) => {
      this.milkyMat.map = t;
      this.milkyMat.transparent = false;
      this.milkyMat.needsUpdate = true;
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 32), this.milkyMat);
    sphere.rotation.z = 0.4;   // banda inclinada, como se ve en el cielo
    this.scene.add(sphere);
  }

  /** Vecindario galáctico 🌌: nebulosas, agujero negro y otras estrellas. */
  #buildGalaxy() {
    this.galaxyGroup = new THREE.Group();
    this.galaxyGroup.visible = false;
    this.scene.add(this.galaxyGroup);

    // Nebulosas: sprites de colores aditivos
    const nebulaColors = [0xff6fae, 0x7ce8ff, 0xb98cff, 0x8cffb0, 0xffb15e, 0x6f9aff];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTexture, color: nebulaColors[i],
        transparent: true, opacity: 0.32, depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      const a = (i / 6) * Math.PI * 2;
      s.position.set(Math.cos(a) * 480, (Math.random() - 0.3) * 220, Math.sin(a) * 480);
      s.scale.setScalar(140 + Math.random() * 130);
      this.galaxyGroup.add(s);
    }

    // Agujero negro realista (módulo aparte): horizonte de eventos, disco
    // kepleriano con Doppler beaming, lente gravitacional barata (anillo de
    // fotones + arcos) y estrellas que se espaguetizan. Ver js/blackhole.js.
    this.blackHole = createBlackHole({
      glowTexture: this.glowTexture,
      dotTexture: this.dotTexture,
    });
    const bh = this.blackHole.group;
    bh.position.set(-330, 110, -380);
    this.galaxyGroup.add(bh);
    this.focusTargets.set('agujero', bh);
    const bhPick = new THREE.Mesh(
      new THREE.SphereGeometry(60, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    bhPick.userData = { def: EXTRAS.blackhole, isPickable: true };
    bh.add(bhPick);
    this.galaxyPickables.push(bhPick);

    // Otras estrellas tocables
    const mkStar = (def, color, pos) => {
      const g = new THREE.Group();
      g.position.copy(pos);
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(def.size, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTexture, color, transparent: true,
        opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      glow.scale.setScalar(def.size * 9);
      g.add(core, glow);
      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(def.size * 4, 8, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      pick.userData = { def, isPickable: true };
      g.add(pick);
      this.galaxyGroup.add(g);
      this.galaxyPickables.push(pick);
      this.focusTargets.set(def.id, g);
    };
    mkStar(EXTRAS.starRed, 0xff5030, new THREE.Vector3(420, -60, 250));
    mkStar(EXTRAS.starBlue, 0x4f8cff, new THREE.Vector3(180, 200, 480));
  }

  /** Crea (o recrea) el campo de estrellas según la densidad. */
  buildStars(density) {
    if (this.stars) {
      this.stars.geometry.dispose();
      this.stars.material.dispose();
      this.scene.remove(this.stars);
    }
    const count = STAR_COUNTS[density] ?? STAR_COUNTS.normal;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0xbcd4ff), new THREE.Color(0xffe9b0), new THREE.Color(0xffc4ec)];
    for (let i = 0; i < count; i++) {
      const r = 300 + Math.random() * 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = palette[(Math.random() * palette.length) | 0];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.2, map: this.dotTexture, vertexColors: true,
      transparent: true, depthWrite: false, sizeAttenuation: true,
    }));
    this.scene.add(this.stars);
  }

  // ---------- personalización ----------
  setSkyColor(hexStr) {
    this.scene.background.set(hexStr);
    // Tinte suave de la Vía Láctea para que el tema se note
    this.milkyMat.color.set(hexStr).lerp(new THREE.Color(0xffffff), 0.72);
  }
  setAmbient(name) {
    const a = AMBIENTS[name] ?? AMBIENTS.night;
    this.ambient.color.set(a.color);
    this.ambient.intensity = a.intensity;
  }
  setOrbitLinesVisible(v) { this.orbitLines.visible = v; }
  setLabelsVisible(v) { this.labels.visible = v; }
  setSpeedFactor(f) { this.speedFactor = REDUCED_MOTION ? f * 0.4 : f; }

  // ---------- planetas creados por el niño 🪐 ----------
  addCustomPlanet(cfg) {
    const idx = this.customPlanets.length;
    const def = {
      id: `custom-${Date.now()}-${idx}`,
      name: 'Tu Planeta',
      emoji: '🪐',
      color: cfg.color,
      accent: new THREE.Color(cfg.color).multiplyScalar(0.6).getHex(),
      size: cfg.size,
      orbitRadius: 92 + idx * 8,
      orbitSpeed: 0.045,
      spinSpeed: 0.6,
      axialTilt: Math.random() * 30,
      textureType: 'cloudy',
      hasRings: cfg.rings,
      miniMoons: cfg.moons,
      pitch: 1 + Math.random() * 0.6,
      temp: 'nice',
      moons: cfg.moons,
      facts: [
        '¡Este planeta lo hiciste tú! Eres una gran inventora o inventor.',
        'Gira feliz en el borde del sistema solar.',
      ],
      sizeFact: '¡Tu planeta también juega a compararse!',
    };
    const rec = this.#createPlanetObject(def);
    rec.custom = true;
    this.planets.push(rec);
    this.customPlanets.push(rec);
    return def;
  }

  removeLastCustomPlanet() {
    const rec = this.customPlanets.pop();
    if (!rec) return false;
    this.planets.splice(this.planets.indexOf(rec), 1);
    this.solarGroup.remove(rec.pivot);
    this.orbitLines.remove(rec.orbit);
    this.labels.remove(rec.label);
    this.pickables = this.pickables.filter((o) => o.userData?.def !== rec.def);
    this.focusTargets.delete(rec.def.id);
    rec.mesh.geometry.dispose();
    rec.mesh.material.map?.dispose();
    rec.mesh.material.dispose();
    rec.orbit.geometry.dispose();
    if (this.selected === rec.def) { this.selected = null; this.followTarget = null; }
    return true;
  }

  // ---------- misión del día 📅 ----------
  // OJO: nunca usar geometría de anillo aquí — un toro plano alrededor del
  // planeta se confunde con los anillos de Saturno (bug reportado en Venus).
  // El marcador es una estrella ⭐ que rebota encima + halo radial suave.
  #missionStarTexture() {
    if (!this._missionStarTex) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      ctx.font = '100px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,200,60,0.9)';
      ctx.shadowBlur = 18;
      ctx.fillText('⭐', 64, 70);
      this._missionStarTex = new THREE.CanvasTexture(c);
      this._missionStarTex.colorSpace = THREE.SRGBColorSpace;
    }
    return this._missionStarTex;
  }

  setMissionTarget(defId) {
    this.clearMissionTarget();
    const rec = this.planets.find((p) => p.def.id === defId);
    if (!rec) return;
    this.missionDefId = defId;

    const marker = new THREE.Group();
    // Estrella que rebota sobre el planeta
    this.missionStar = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.#missionStarTexture(), transparent: true, depthWrite: false,
    }));
    this.missionStar.scale.set(2.4, 2.4, 1);
    this.missionStar.position.y = rec.def.size + 1.8;
    // Halo radial suave (esférico, no un anillo)
    this.missionHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture, color: 0xffd75e, transparent: true,
      opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.missionHalo.scale.setScalar(rec.def.size * 4.2);
    marker.add(this.missionStar, this.missionHalo);
    rec.holder.add(marker);
    this.missionMarker = marker;
    this.missionRec = rec;
  }

  clearMissionTarget() {
    if (this.missionMarker && this.missionRec) {
      this.missionRec.holder.remove(this.missionMarker);
      this.missionStar.material.dispose();
      this.missionHalo.material.dispose();   // la textura glow es compartida: no se libera
    }
    this.missionMarker = null;
    this.missionStar = null;
    this.missionHalo = null;
    this.missionRec = null;
    this.missionDefId = null;
  }

  // ---------- estrellas fugaces 🌠 ----------
  spawnShootingStar() {
    if (this.shootingStar) return;
    const side = Math.random() > 0.5 ? 1 : -1;
    const start = new THREE.Vector3(side * (130 + Math.random() * 60), 60 + Math.random() * 60, (Math.random() - 0.5) * 220);
    const vel = new THREE.Vector3(-side * (60 + Math.random() * 30), -14 - Math.random() * 10, (Math.random() - 0.5) * 30);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture, color: 0xfff7d0, transparent: true,
      opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sprite.scale.setScalar(7);
    sprite.position.copy(start);
    // Cola
    const N = 22;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({
      size: 3.4, map: this.dotTexture, color: 0xffeeaa,
      transparent: true, opacity: 0.85, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    // Zona tocable generosa
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(14, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pick.userData = { def: EXTRAS.fugaz, isPickable: true };
    pick.position.copy(start);
    this.scene.add(sprite, trail, pick);
    this.pickables.push(pick);
    this.shootingStar = { sprite, trail, pick, vel, life: 0, maxLife: 3.4, history: [] };
  }

  catchShootingStar() {
    if (!this.shootingStar) return null;
    const pos = this.shootingStar.sprite.position.clone();
    this.#removeShootingStar();
    this.#confettiAt(pos);
    return pos;
  }

  #removeShootingStar() {
    const s = this.shootingStar;
    if (!s) return;
    this.scene.remove(s.sprite, s.trail, s.pick);
    s.trail.geometry.dispose();
    s.trail.material.dispose();
    s.sprite.material.dispose();
    this.pickables = this.pickables.filter((o) => o !== s.pick);
    this.shootingStar = null;
  }

  // ---------- modo comparación 📏 ----------
  enterCompare(onDone) {
    if (!this.compareGroup) this.#buildCompare();
    // La Tierra comparte material con su copia de la fila: ahí el Sol no está
    // en el origen, así que las luces de ciudad se apagan durante este modo.
    if (this.earthNightUniforms) this.earthNightUniforms.uNightOn.value = 0;
    this.compareActive = true;
    this.followTarget = null;
    this.selected = null;
    this.solarGroup.visible = false;
    this.compareGroup.visible = true;
    const c = this.compareCenter;
    this.onFlyDone = onDone ?? null;
    this.cameraTween = {
      t: 0, duration: REDUCED_MOTION ? 0.01 : 1.6,
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(c.x, 210, 66),
      fromTarget: this.controls.target.clone(),
      toTarget: c.clone(),
      fixed: true,
    };
  }

  exitCompare() {
    this.compareActive = false;
    if (this.compareGroup) this.compareGroup.visible = false;
    if (this.earthNightUniforms) this.earthNightUniforms.uNightOn.value = 1;
    this.solarGroup.visible = true;
  }

  #buildCompare() {
    this.compareGroup = new THREE.Group();
    this.compareGroup.position.y = 200;   // lejos del sistema solar
    this.compareGroup.visible = false;
    this.scene.add(this.compareGroup);
    this.compareItems = [];

    // El Sol queda oculto en este modo: luz propia para la fila
    const light = new THREE.DirectionalLight(0xffffff, 2.4);
    light.position.set(-40, 60, 90);
    this.compareGroup.add(light, light.target);

    const defs = [SUN, ...PLANETS];
    let x = 0, prevR = 0;
    for (const def of defs) {
      x += prevR + def.size + 2.2;
      prevR = def.size;
      let mesh;
      if (def.id === 'sol') {
        mesh = new THREE.Mesh(this.sun.geometry, this.sun.material);
      } else {
        const rec = this.planets.find((p) => p.def === def);
        mesh = new THREE.Mesh(rec.mesh.geometry, rec.mesh.material);
        if (def.hasRings) mesh.add(this.#makeRings(def, { shadow: false }));
      }
      mesh.position.x = x;
      mesh.rotation.z = THREE.MathUtils.degToRad(def.axialTilt ?? 0);
      mesh.userData = { def, isPickable: true };
      this.compareGroup.add(mesh);
      this.compareItems.push(mesh);

      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(def.size * 1.6, 2.4), 8, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      pick.userData = { def, isPickable: true };
      mesh.add(pick);
      this.comparePickables.push(pick, mesh);

      const label = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.#labelTex(def), transparent: true, depthWrite: false,
      }));
      label.scale.set(9, 2.8, 1);
      label.position.set(x, def.size + 3, 0);
      this.compareGroup.add(label);
    }
    this.compareCenter = new THREE.Vector3(x / 2, 200, 0);
  }

  // ---------- modo galaxia 🌌 ----------
  enterGalaxy(onDone) {
    this.galaxyActive = true;
    this.galaxyGroup.visible = true;
    this.followTarget = null;
    this.selected = null;
    this.controls.maxDistance = 1300;
    this.onFlyDone = onDone ?? null;
    this.cameraTween = {
      t: 0, duration: REDUCED_MOTION ? 0.01 : 3.2,
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(120, 320, 760),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(0, 0, 0),
      fixed: true,
    };
  }

  exitGalaxy() {
    this.galaxyActive = false;
    this.galaxyGroup.visible = false;
    this.controls.maxDistance = 260;
  }

  // ---------- modo escala real 🏔 ----------
  // Las distancias DE VERDAD: lerp de holder.position.x + scale de la línea
  // de órbita (escalar Object3D, NUNCA regenerar geometría — Android medio).
  // El dibujo normal comprime las órbitas para ver a todos juntos.
  enterScale(onDone) {
    this.scaleActive = true;
    this.scaleGoal = 1;
    this.followTarget = null;
    this.selected = null;
    this.controls.maxDistance = 1300;     // patrón enterGalaxy: el cielo crece
    this.onFlyDone = onDone ?? null;
    this.cameraTween = {
      t: 0, duration: REDUCED_MOTION ? 0.01 : 3,
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(0, 430, 980),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(0, 0, 0),
      fixed: true,
    };
  }

  exitScale() {
    this.scaleActive = false;
    this.scaleGoal = 0;                   // las órbitas vuelven solas (animado)
    this.controls.maxDistance = 260;
  }

  /** Aplica scaleMix (0 = dibujo compacto, 1 = distancias reales). */
  #applyScaleMix() {
    const mix = this.scaleMix;
    for (const p of this.planets) {
      const au = REAL_AU[p.def.id];
      if (!au) continue;                  // los planetas del niño no se mueven
      const radioReal = Math.max(au * 27, 14);   // Tierra conserva 27; Neptuno ~812
      p.holder.position.x = THREE.MathUtils.lerp(p.def.orbitRadius, radioReal, mix);
      p.orbit.scale.setScalar(THREE.MathUtils.lerp(1, radioReal / p.def.orbitRadius, mix));
      const ls = 1 + 2 * mix;             // etiquetas más grandes de tan lejos
      p.label.scale.set(10 * ls, 3.1 * ls, 1);
    }
    // Cinturón real (2.2-3.2 UA): de 37-42 del dibujo a ~69-79
    this.belt.scale.setScalar(THREE.MathUtils.lerp(1, 1.87, mix));
  }

  /** El agujero negro "come" una estrellita ya mismo (espaguetización 🍝). */
  feedBlackHole() {
    this.blackHole?.feed();
  }

  // ---------- fases de la Luna 🌗 ----------
  enterMoonPhase(onDone) {
    this.moonPhaseActive = true;
    const earth = this.planets.find((p) => p.def.id === 'tierra');
    // Luna agrandada SOLO en esta lección: a escala de la escena es demasiado
    // pequeña para ver su mitad iluminada en un celular (se restaura al salir)
    earth.moonMesh.scale.setScalar(1.8);
    this.followTarget = earth.def;
    this.selected = MOON;
    this.controls.minDistance = 6;   // la cámara queda a 10.5 de la Tierra
    const target = this.worldPositionOf(earth.def);
    // Cámara perpendicular a la línea Sol-Tierra: las fases se ven clarísimas
    const sunDir = target.clone().normalize();
    const sideDir = new THREE.Vector3(-sunDir.z, 0.45, sunDir.x).normalize();
    this.onFlyDone = onDone ?? null;
    this.cameraTween = {
      t: 0, duration: REDUCED_MOTION ? 0.01 : 1.5,
      fromPos: this.camera.position.clone(),
      dir: sideDir, dist: 10.5,
      fromTarget: this.controls.target.clone(),
      fixed: false,
    };
  }

  exitMoonPhase() {
    if (this.eclipseActive) this.exitEclipse();   // defensivo: nunca dejar restos
    this.moonPhaseActive = false;
    this.moonAutoOrbit = false;
    this.#cancelMoonDrive();
    const earth = this.planets.find((p) => p.def.id === 'tierra');
    if (earth?.moonMesh) earth.moonMesh.scale.setScalar(1);   // tamaño normal
    this.selected = null;
  }

  /** Enciende/apaga la órbita lunar automática del modo fases (ciclo ~22 s). */
  setMoonAutoOrbit(on) {
    this.moonAutoOrbit = on;
    if (on) {
      // Sonda del sentido pivote→fase: el ciclo SIEMPRE avanza como el real
      // (nueva → creciente → llena → menguante), nunca al revés.
      const earth = this.planets.find((p) => p.def.id === 'tierra');
      if (earth?.moonPivot) this.#pivotAngleForPhase(earth, 0);
    }
  }

  /** Gira la Luna alrededor de la Tierra (arrastre del niño). */
  nudgeMoon(deltaAngle) {
    const earth = this.planets.find((p) => p.def.id === 'tierra');
    if (earth.moonPivot) earth.moonPivot.rotation.y += deltaAngle;
  }

  /** Ángulo Sol-Tierra-Luna continuo (-π..π): 0 = nueva, ±π = llena. */
  moonPhaseAngle() {
    const earth = this.planets.find((p) => p.def.id === 'tierra');
    const e = new THREE.Vector3(), m = new THREE.Vector3();
    earth.mesh.getWorldPosition(e);
    earth.moonMesh.getWorldPosition(m);
    const toSun = e.clone().negate().setY(0).normalize();      // Sol en el origen
    const toMoon = m.sub(e).setY(0).normalize();
    const dot = toSun.dot(toMoon);
    const cross = toSun.x * toMoon.z - toSun.z * toMoon.x;
    return Math.atan2(cross, dot);                             // -π..π
  }

  /** Fase actual: 'llena' | 'nueva' | 'creciente' | 'menguante'.
   *  Umbrales alineados con los sectores del emoji grande (π/8 = 22.5°). */
  currentMoonPhase() {
    const ang = this.moonPhaseAngle();
    if (Math.abs(ang) < Math.PI / 8) return 'nueva';
    if (Math.abs(ang) > Math.PI * 7 / 8) return 'llena';
    return ang > 0 ? 'creciente' : 'menguante';
  }

  /** Avance de la Luna en modo fases (se llama desde update, solo la Tierra). */
  #updateMoonDrive(earthRec, dt) {
    const pivot = earthRec.moonPivot;
    const d = this.moonDrive;
    if (d) {
      d.t += dt / d.duration;
      // Alineación con easing (llegada suave); barrido lineal (velocidad constante)
      const k = d.kind === 'align' ? easeInOutCubic(Math.min(d.t, 1)) : Math.min(d.t, 1);
      pivot.rotation.y = THREE.MathUtils.lerp(d.from, d.to, k);
      if (d.t >= 1) {
        this.moonDrive = null;
        if (d.onDone) d.onDone();
      }
    } else if (this.moonAutoOrbit) {
      // Ciclo completo de fases en ~22 s: tranquilo y predecible (independiente
      // del slider de velocidad para que la lección siempre dure lo mismo)
      pivot.rotation.y += this.moonDirSign * (Math.PI * 2 / 22) * dt;
    }
    if (this.eclipseActive) this.#updateEclipse(earthRec);
  }

  /** Cancela el tween/barrido lunar despertando a quien lo esperaba. */
  #cancelMoonDrive() {
    const d = this.moonDrive;
    this.moonDrive = null;
    if (d?.onDone) d.onDone();   // el flujo despierta y ve su token viejo
  }

  // ---------- eclipses 🌞🌚 (sub-modo dentro de fases) ----------
  // Sombras FAKE baratas y legibles (el PointLight no proyecta sombras reales):
  //  - solar: disco oscuro (umbra + penumbra) pegado a la superficie terrestre,
  //    posicionado intersectando el rayo Sol→Luna con la esfera de la Tierra,
  //    así la mancha VIAJA por la Tierra mientras la Luna barre la alineación.
  //  - lunar: cono de sombra translúcido tras la Tierra + Luna teñida rojiza
  //    según qué tan adentro va ("Luna de sangre").
  #buildEclipseParts(earthRec) {
    if (this.eclipseParts) return;
    const R = earthRec.def.size;
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.7, 24),
      new THREE.MeshBasicMaterial({
        map: createShadowSpotTexture(), color: 0x000000,
        transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    spot.visible = false;
    this.solarGroup.add(spot);

    // Cono de sombra terrestre en DOS capas (umbra + penumbra) en índigo
    // translúcido: negro puro no se lee contra el espacio negro.
    const L = MOON.orbitRadius * 2.1;     // el cono pasa de largo la órbita lunar
    const mkCone = (r, opacity) => {
      const g = new THREE.ConeGeometry(r, L, 24, 1, true);
      g.translate(0, L / 2, 0);           // base en la Tierra, punta hacia afuera
      return new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        color: 0x1b1545, transparent: true, opacity,
        depthWrite: false, side: THREE.DoubleSide,
      }));
    };
    const cone = new THREE.Group();
    cone.add(mkCone(R * 0.92, 0.4), mkCone(R * 1.18, 0.18));
    cone.visible = false;
    this.solarGroup.add(cone);
    this.eclipseParts = { spot, cone };
  }

  /** Ángulo del pivote lunar para una fase deseada (mapeo casi lineal). */
  #pivotAngleForPhase(earthRec, targetPhase) {
    const pivot = earthRec.moonPivot;
    const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
    const theta0 = pivot.rotation.y;
    const a0 = this.moonPhaseAngle();
    pivot.rotation.y = theta0 + 0.05;          // sonda: ¿hacia dónde crece la fase?
    const a1 = this.moonPhaseAngle();
    pivot.rotation.y = theta0;
    this.moonDirSign = wrap(a1 - a0) >= 0 ? 1 : -1;
    return theta0 + this.moonDirSign * wrap(targetPhase - a0);
  }

  /**
   * Entra al eclipse: alinea la Luna (un pelín ANTES de la fila perfecta) y
   * vuela la cámara a un encuadre claro. onDone al terminar el vuelo.
   */
  enterEclipse(kind, onDone) {
    const earth = this.planets.find((p) => p.def.id === 'tierra');
    this.#buildEclipseParts(earth);
    this.eclipseActive = true;
    this.eclipseKind = kind;
    this.moonAutoOrbit = false;
    const mat = earth.moonMesh.material;
    if (!this.moonOrigColor) {
      this.moonOrigColor = mat.color.clone();
      this.moonOrigEmissive = mat.emissive.clone();
    }

    const half = 0.5;                          // medio barrido (rad) a cada lado
    const targetPhase = kind === 'solar' ? -half : Math.PI - half;
    const duration = REDUCED_MOTION ? 0.01 : 2.0;
    this.moonDrive = {
      kind: 'align', from: earth.moonPivot.rotation.y,
      to: this.#pivotAngleForPhase(earth, targetPhase),
      t: 0, duration, onDone: null,
    };

    // Cámara fija: para el solar se mira la cara iluminada de la Tierra (ahí
    // viaja la mancha); para el lunar se ve la Tierra y la Luna en su sombra.
    const E = this.worldPositionOf(earth.def);
    const dirSE = E.clone().normalize();                     // Sol(origen) → Tierra
    const side = new THREE.Vector3(-dirSE.z, 0, dirSE.x);    // perpendicular
    let toPos, toTarget;
    if (kind === 'solar') {
      // Poco desplazada del eje Sol-Tierra: la mancha se ve de frente, casi
      // redonda, y la Luna queda grande en primer plano al lado de la Tierra
      toPos = E.clone().addScaledVector(dirSE, -6.8).addScaledVector(side, 2.4);
      toPos.y += 2.0;
      toTarget = E.clone();
    } else {
      const moonFar = E.clone().addScaledVector(dirSE, MOON.orbitRadius);
      toPos = E.clone().addScaledVector(side, 8.5).addScaledVector(dirSE, 2.2);
      toPos.y += 3.2;
      toTarget = E.clone().lerp(moonFar, 0.55);
    }
    this.followTarget = null;                  // cámara quieta durante el eclipse
    this.onFlyDone = onDone ?? null;
    this.cameraTween = {
      t: 0, duration, fromPos: this.camera.position.clone(),
      toPos, fromTarget: this.controls.target.clone(), toTarget, fixed: true,
    };
  }

  /** El barrido: la Luna cruza la alineación y la sombra VIAJA. */
  sweepEclipse(kind, onDone) {
    const earth = this.planets.find((p) => p.def.id === 'tierra');
    const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
    const half = 0.5;
    const targetPhase = kind === 'solar' ? half : Math.PI + half;
    const delta = this.moonDirSign * wrap(targetPhase - this.moonPhaseAngle());
    this.moonDrive = {
      kind: 'sweep', from: earth.moonPivot.rotation.y,
      to: earth.moonPivot.rotation.y + delta,
      t: 0, duration: REDUCED_MOTION ? 0.01 : (kind === 'solar' ? 9 : 8),
      onDone,
    };
  }

  /** Visuales del eclipse por frame: mancha viajera, cono y Luna rojiza. */
  #updateEclipse(earthRec) {
    const { spot, cone } = this.eclipseParts;
    const E = new THREE.Vector3();
    earthRec.mesh.getWorldPosition(E);
    const R = earthRec.def.size;

    // La órbita lunar va inclinada con el eje terrestre: durante el eclipse la
    // Luna se pega al plano Sol-Tierra (corrección en su Y local) para que la
    // fila sea PERFECTA y la sombra cruce el centro. Legibilidad > física.
    const moonMesh = earthRec.moonMesh;
    moonMesh.position.y = 0;
    const m0 = new THREE.Vector3();
    moonMesh.getWorldPosition(m0);
    const qPivot = new THREE.Quaternion();
    earthRec.moonPivot.getWorldQuaternion(qPivot);
    const upY = new THREE.Vector3(0, 1, 0).applyQuaternion(qPivot).y;
    if (Math.abs(upY) > 0.5) {
      moonMesh.position.y = THREE.MathUtils.clamp((E.y - m0.y) / upY, -1.6, 1.6);
    }
    const M = new THREE.Vector3();
    moonMesh.getWorldPosition(M);

    if (this.eclipseKind === 'solar') {
      spot.visible = true;
      cone.visible = false;
      // Rayo Sol(origen)→Luna prolongado hasta la esfera de la Tierra
      const d = M.clone().normalize();
      const f = M.clone().sub(E);
      const b = 2 * f.dot(d);
      const c = f.lengthSq() - R * R;
      const disc = b * b - 4 * c;
      // Fundido suave cuando el rayo pasa cerca del borde (entra/sale limpio)
      const perp = f.clone().sub(d.clone().multiplyScalar(f.dot(d))).length();
      const fade = 1 - THREE.MathUtils.smoothstep(perp, R * 0.85, R * 1.05);
      if (disc > 0) {
        const t = (-b - Math.sqrt(disc)) / 2;
        if (t > 0) {
          const P = M.clone().addScaledVector(d, t);
          const n = P.clone().sub(E).normalize();
          spot.position.copy(E).addScaledVector(n, R * 1.03);
          spot.lookAt(E.clone().addScaledVector(n, R * 3));
        }
      }
      spot.material.opacity = fade;
      this.#tintMoon(earthRec, 0);
    } else {
      // Lunar: cono de sombra terrestre + Luna de sangre
      spot.visible = false;
      cone.visible = true;
      cone.position.copy(E);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), E.clone().normalize());
      const delta = Math.PI - Math.abs(this.moonPhaseAngle());
      const redness = 1 - THREE.MathUtils.smoothstep(delta, 0.12, 0.40);
      this.#tintMoon(earthRec, redness);
    }
  }

  /** Tinte "Luna de sangre" 0..1 (siempre restaurable al original). */
  #tintMoon(earthRec, redness) {
    if (!this.moonOrigColor) return;
    const mat = earthRec.moonMesh.material;
    mat.color.copy(this.moonOrigColor).lerp(new THREE.Color(0xa83c22), redness * 0.85);
    mat.emissive.copy(this.moonOrigEmissive).lerp(new THREE.Color(0x4a0f05), redness);
  }

  /** Sale del eclipse restaurando TODO (sombras ocultas, Luna blanca, Y = 0). */
  exitEclipse() {
    this.eclipseActive = false;
    this.eclipseKind = null;
    this.#cancelMoonDrive();
    if (this.eclipseParts) {
      this.eclipseParts.spot.visible = false;
      this.eclipseParts.cone.visible = false;
    }
    const earth = this.planets.find((p) => p.def.id === 'tierra');
    if (earth?.moonMesh) {
      earth.moonMesh.position.y = 0;
      if (this.moonOrigColor) {
        earth.moonMesh.material.color.copy(this.moonOrigColor);
        earth.moonMesh.material.emissive.copy(this.moonOrigEmissive);
      }
    }
  }

  // ---------- interacción ----------
  pick(clientX, clientY) {
    this.pointer.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const list = this.compareActive
      ? this.comparePickables
      : this.galaxyActive
        ? [...this.galaxyPickables, ...this.pickables]
        : this.pickables;
    const hits = this.raycaster.intersectObjects(list, false);
    return hits.length ? hits[0].object.userData.def : null;
  }

  worldPositionOf(def) {
    if (def.id === 'sol') return new THREE.Vector3(0, 0, 0);
    const obj = this.focusTargets.get(def.id);
    if (!obj) return new THREE.Vector3(0, 0, 0);
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    return v;
  }

  flyTo(def, onDone) {
    const dist = def.focusDist
      ?? (def.id === 'sol' ? def.size * 4
        : def.id === 'iss' || def.id === 'rover' ? 4
          : def.id === 'agujero' ? 215
            : def.id.startsWith('estrella') ? 60
              : Math.max(def.size * 5.2, 6.5));
    this.followTarget = def;
    this.selected = def;
    this.onFlyDone = onDone ?? null;
    // El zoom-in nunca entra dentro del planeta (Júpiter mide 5.2 de radio)
    this.controls.minDistance = Math.max((def.size ?? 2) * 1.5 + 0.8, 3);
    const target = this.worldPositionOf(def);
    const dir = this.camera.position.clone().sub(target).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0.4, 1).normalize();
    // Llegar por el lado iluminado: mezcla con la dirección hacia el Sol
    if (def.id !== 'sol' && !this.galaxyActive && target.lengthSq() > 1) {
      const sunDir = target.clone().multiplyScalar(-1).normalize();
      dir.lerp(sunDir, 0.8).normalize();
    }
    dir.y = Math.max(dir.y, 0.22);
    dir.normalize();
    this.cameraTween = {
      t: 0, duration: REDUCED_MOTION ? 0.01 : 1.5,
      fromPos: this.camera.position.clone(),
      dir, dist,
      fromTarget: this.controls.target.clone(),
      fixed: false,
    };
  }

  resetView(onDone) {
    this.followTarget = null;
    this.selected = null;
    this.controls.minDistance = FREE_MIN_DISTANCE;
    this.onFlyDone = onDone ?? null;
    this.cameraTween = {
      t: 0, duration: REDUCED_MOTION ? 0.01 : 1.6,
      fromPos: this.camera.position.clone(),
      toPos: this.homePosition.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(0, 0, 0),
      fixed: true,
    };
  }

  celebrate(def) {
    this.#confettiAt(this.worldPositionOf(def));
  }

  #confettiAt(origin) {
    const N = 90;
    const positions = new Float32Array(N * 3);
    const velocities = [];
    const colors = new Float32Array(N * 3);
    const palette = [0xffd75e, 0xff6fae, 0x7ce8ff, 0xa0ff8c, 0xffb15e];
    for (let i = 0; i < N; i++) {
      positions.set([origin.x, origin.y, origin.z], i * 3);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5)
        .normalize().multiplyScalar(4 + Math.random() * 9);
      velocities.push(v);
      const c = new THREE.Color(palette[(Math.random() * palette.length) | 0]);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.6, map: this.glowTexture, vertexColors: true,
      transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.scene.add(points);
    this.confettiBursts.push({ points, velocities, life: 0, maxLife: 1.8 });
  }

  markUserActivity() { this.idleTime = 0; }

  // ---------- bucle de animación ----------
  update(dt) {
    this.elapsed += dt;
    const speed = this.paused ? 0 : this.speedFactor;
    const wp = new THREE.Vector3();

    for (const p of this.planets) {
      // En modo fases de la Luna se congela la órbita terrestre para no marear
      const orbitSpeed = (this.moonPhaseActive && p.def.id === 'tierra') ? 0 : speed;
      p.pivot.rotation.y += p.def.orbitSpeed * 0.22 * orbitSpeed * dt;
      p.mesh.rotation.y += p.def.spinSpeed * speed * dt;
      if (p.clouds) p.clouds.rotation.y += p.def.spinSpeed * 1.35 * speed * dt;
      if (p.moonPivot && !this.moonPhaseActive) {
        p.moonPivot.rotation.y += MOON.orbitSpeed * 0.5 * speed * dt;
      } else if (p.moonPivot && p.def.id === 'tierra' && this.moonPhaseActive && !this.paused) {
        // Modo fases 🌗 / eclipses 🌞🌚: tween de alineación, barrido o auto-órbita
        this.#updateMoonDrive(p, dt);
      }

      p.mesh.getWorldPosition(wp);
      p.label.position.set(wp.x, wp.y + p.def.size + 2.2, wp.z);
      // La etiqueta se desvanece si la cámara está muy cerca (no tapa la vista)
      // y la del planeta visitado se oculta (la tarjeta ya muestra el nombre)
      const labelDist = this.camera.position.distanceTo(p.label.position);
      p.label.material.opacity = THREE.MathUtils.clamp((labelDist - 6) / 10, 0, 1);
      p.label.visible = this.selected !== p.def && p.label.material.opacity > 0.05;

      if (this.selected === p.def) {
        const s = 1 + Math.sin(this.elapsed * 5) * 0.07;
        p.holder.scale.setScalar(s);
      } else if (p.holder.scale.x !== 1) {
        p.holder.scale.setScalar(THREE.MathUtils.lerp(p.holder.scale.x, 1, Math.min(1, dt * 6)));
      }
    }

    // ISS: vuelta rápida a la Tierra
    if (this.issPivot) this.issPivot.rotation.y += 1.1 * speed * dt;

    // Astronauta 🧑‍🚀 saludando junto a la ISS (~6 s y se despide)
    if (this.astronaut) {
      const a = this.astronaut;
      a.life += dt;
      a.sprite.material.rotation = Math.sin(this.elapsed * 5) * 0.3;   // ¡hola, hola!
      a.sprite.position.y = 1.1 + Math.sin(this.elapsed * 2.2) * 0.18;
      a.sprite.material.opacity = THREE.MathUtils.clamp((a.maxLife - a.life) / 0.7, 0, 1);
      if (a.life >= a.maxLife) this.#removeAstronaut();
    }

    // Pelota 🏀 del modo gravedad: parábola determinista + 3 rebotes (0.55).
    // Tiempo real (independiente del slider 🐢/🐇): la lección dura lo mismo.
    if (this.ball && !this.paused && !this.ball.resting) {
      const b = this.ball;
      b.t += dt;
      let y = b.size + b.v * b.t - 0.5 * b.accel * b.t * b.t;
      if (y <= b.size && b.t > dt * 0.5) {     // tocó el suelo (no el frame inicial)
        if (b.bounces >= 3) {
          b.resting = true;                    // reposo sobre la superficie
          y = b.size;
        } else {
          b.bounces++;
          b.v *= 0.55;                         // restitución: cada bote sube menos
          b.t = 0;
          y = b.size;
        }
      }
      b.sprite.position.y = y;
    }

    // Transición del modo escala real 🏔 (entrada 3 s, vuelta más rápida)
    if (this.scaleMix !== this.scaleGoal) {
      const dur = REDUCED_MOTION ? 0.01 : (this.scaleGoal === 1 ? 3 : 1.2);
      const step = dt / dur;
      this.scaleMix = this.scaleGoal === 1
        ? Math.min(1, this.scaleMix + step)
        : Math.max(0, this.scaleMix - step);
      this.#applyScaleMix();
    }

    // Sol vivo: rotación, granulación animada (shader), llamaradas y corona
    this.sun.rotation.y += 0.02 * speed * dt;
    this.sunOverlay.rotation.y -= 0.045 * speed * dt;
    this.sunOverlay.rotation.x = Math.sin(this.elapsed * 0.3) * 0.04;
    this.sunUniforms.uTime.value = this.elapsed;

    // Llamaradas: brotan del borde, crecen, tiemblan y se apagan en otro lado
    for (const p of this.prominences) {
      p.t += dt;
      if (p.t < 0) continue;
      let h, op;
      if (p.t < 1.2) { h = easeInOutCubic(p.t / 1.2); op = h; }
      else if (p.t < 2.8) { h = 1; op = 0.75 + Math.sin(this.elapsed * 7 + p.t) * 0.2; }
      else if (p.t < 3.8) { h = 1 - (p.t - 2.8); op = h * 0.8; }
      else { p.t = -(2 + Math.random() * 6); this.#repositionProminence(p); continue; }
      p.arc.scale.set(0.6 + h * 0.4, Math.max(h, 0.001), 0.6 + h * 0.4);
      p.arc.material.opacity = op * 0.85;
    }

    // La corona "respira": dos senos lentos desfasados (nunca mecánico)
    const pulse = 1 + Math.sin(this.elapsed * 1.4) * 0.05 + Math.sin(this.elapsed * 0.47) * 0.035;
    // La corona se atenúa y se encoge cuando la cámara se acerca al Sol:
    // grande y brillante de lejos, nunca una pantalla amarilla ciega de cerca.
    const sunDist = this.camera.position.length();
    const glowFade = THREE.MathUtils.clamp((sunDist - 14) / 40, 0.12, 1);
    const glowShrink = THREE.MathUtils.clamp(sunDist / 55, 0.4, 1);
    this.sunGlow.scale.setScalar(SUN.size * 4.6 * pulse * glowShrink);
    this.sunGlow2.scale.setScalar(SUN.size * 8 * (2 - pulse) * glowShrink);
    this.sunGlow.material.opacity = 0.8 * glowFade;
    this.sunGlow2.material.opacity = 0.3 * glowFade;
    this.sun.scale.setScalar(this.selected?.id === 'sol' ? 1 + Math.sin(this.elapsed * 5) * 0.05 : 1);
    const sunLabelDist = this.camera.position.distanceTo(this.sunLabel.position);
    this.sunLabel.material.opacity = THREE.MathUtils.clamp((sunLabelDist - 12) / 14, 0, 1);
    this.sunLabel.visible = this.selected?.id !== 'sol' && this.sunLabel.material.opacity > 0.05;

    this.belt.rotation.y += 0.018 * speed * dt;

    // Cometa ☄️: órbita elíptica kepleriana (corre cerca del Sol, pasea lejos)
    {
      const r0 = COMET_P / (1 + COMET_E * Math.cos(this.cometAngle));
      this.cometAngle += (COMET_K / (r0 * r0)) * speed * dt;
      const r = COMET_P / (1 + COMET_E * Math.cos(this.cometAngle));
      const cx = Math.cos(this.cometAngle) * r;
      const cz = Math.sin(this.cometAngle) * r;
      // Plano orbital inclinado COMET_INCL alrededor del eje X
      this.comet.position.set(cx, cz * Math.sin(COMET_INCL), cz * Math.cos(COMET_INCL));
      // Cola SIEMPRE anti-solar: el viento del Sol la peina lejos de él y
      // CRECE al acercarse (L = 1400/r entre 5 y 30) — "¡le peina la cola!"
      const away = this.comet.position.clone().normalize();
      const L = THREE.MathUtils.clamp(1400 / r, 5, 30);
      const trailPos = this.cometPoints.geometry.attributes.position;
      const nTail = trailPos.count;
      for (let i = 0; i < nTail; i++) {
        const t = i / (nTail - 1);
        const spread = t * 1.4;          // la cola se abre hacia la punta
        trailPos.setXYZ(i,
          this.comet.position.x + away.x * L * t + (Math.random() - 0.5) * spread,
          this.comet.position.y + away.y * L * t + (Math.random() - 0.5) * spread,
          this.comet.position.z + away.z * L * t + (Math.random() - 0.5) * spread);
      }
      trailPos.needsUpdate = true;
    }

    // Agujero negro: disco, lensing, jets y espaguetización
    if (this.galaxyActive) this.blackHole.update(dt, this.camera);

    // Marcador de la misión del día: estrella que rebota + halo pulsante
    if (this.missionMarker) {
      this.missionStar.position.y = this.missionRec.def.size + 1.8 + Math.sin(this.elapsed * 3) * 0.45;
      const mp = 1 + Math.sin(this.elapsed * 3.2) * 0.12;
      this.missionHalo.scale.setScalar(this.missionRec.def.size * 4.2 * mp);
      this.missionHalo.material.opacity = 0.28 + (Math.sin(this.elapsed * 3.2) + 1) * 0.09;
      // La estrella se encoge si la cámara está cerca (no tapa la pantalla)
      const starPos = new THREE.Vector3();
      this.missionStar.getWorldPosition(starPos);
      const starDist = this.camera.position.distanceTo(starPos);
      const starScale = 2.4 * THREE.MathUtils.clamp(starDist / 30, 0.45, 1.2);
      this.missionStar.scale.set(starScale, starScale, 1);
    }

    // Comparación: rotación suave para dar vida
    if (this.compareActive && this.compareItems) {
      for (const m of this.compareItems) m.rotation.y += 0.15 * dt;
    }

    // Estrella fugaz
    if (this.shootingStar) {
      const s = this.shootingStar;
      s.life += dt;
      s.sprite.position.addScaledVector(s.vel, dt);
      s.pick.position.copy(s.sprite.position);
      s.history.unshift(s.sprite.position.clone());
      if (s.history.length > 22) s.history.pop();
      const tp = s.trail.geometry.attributes.position;
      for (let i = 0; i < tp.count; i++) {
        const h = s.history[Math.min(i, s.history.length - 1)] ?? s.sprite.position;
        tp.setXYZ(i, h.x, h.y, h.z);
      }
      tp.needsUpdate = true;
      s.sprite.material.opacity = Math.max(0, 1 - s.life / s.maxLife);
      if (s.life >= s.maxLife) this.#removeShootingStar();
    }

    // Confeti
    for (let i = this.confettiBursts.length - 1; i >= 0; i--) {
      const b = this.confettiBursts[i];
      b.life += dt;
      const pos = b.points.geometry.attributes.position;
      for (let j = 0; j < b.velocities.length; j++) {
        const v = b.velocities[j];
        pos.setXYZ(j, pos.getX(j) + v.x * dt, pos.getY(j) + v.y * dt - b.life * 1.2 * dt, pos.getZ(j) + v.z * dt);
      }
      pos.needsUpdate = true;
      b.points.material.opacity = Math.max(0, 1 - b.life / b.maxLife);
      if (b.life >= b.maxLife) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        b.points.material.dispose();
        this.confettiBursts.splice(i, 1);
      }
    }

    // Vuelo de cámara
    if (this.cameraTween) {
      const tw = this.cameraTween;
      tw.t += dt / tw.duration;
      const k = easeInOutCubic(Math.min(tw.t, 1));
      let toPos, toTarget;
      if (tw.fixed) {
        toPos = tw.toPos; toTarget = tw.toTarget;
      } else {
        toTarget = this.worldPositionOf(this.followTarget ?? SUN);
        toPos = toTarget.clone().add(tw.dir.clone().multiplyScalar(tw.dist));
      }
      this.camera.position.lerpVectors(tw.fromPos, toPos, k);
      this.controls.target.lerpVectors(tw.fromTarget, toTarget, k);
      if (tw.t >= 1) {
        this.cameraTween = null;
        const cb = this.onFlyDone;
        this.onFlyDone = null;
        if (cb) cb();
      }
    } else if (this.followTarget) {
      const t = this.worldPositionOf(this.followTarget);
      const offset = this.camera.position.clone().sub(this.controls.target);
      this.controls.target.lerp(t, Math.min(1, dt * 5));
      this.camera.position.copy(this.controls.target).add(offset);
      // Si el niño se aleja mucho con la rueda/pellizco, soltamos el planeta:
      // tarjeta fuera, mirada de vuelta al Sol — estado siempre consistente.
      const dist = this.camera.position.distanceTo(this.controls.target);
      const releaseDist = Math.max((this.followTarget.size ?? 2) * 12, 60);
      if (dist > releaseDist && !this.moonPhaseActive && !this.galaxyActive) this.#releaseFollow();
    }

    this.idleTime += dt;
    this.controls.autoRotate = !REDUCED_MOTION && this.idleTime > 10
      && !this.followTarget && !this.cameraTween && !this.compareActive && !this.moonPhaseActive;
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  #onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
