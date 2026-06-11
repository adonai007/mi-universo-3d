// ====== Agujero negro realista (estilo Gargantua, barato para móvil) ======
// Física real conocida, representada de forma visual y simplificada:
//  - Horizonte de eventos: esfera negra perfecta con silueta nítida
//    (de ahí no escapa nada, ni la luz).
//  - Disco de acreción: gas brillante con rotación kepleriana (el borde
//    interno gira mucho más rápido, ~r^-1.5) y hueco hasta la ISCO
//    (~3 radios del horizonte): entre el horizonte y el disco no hay gas.
//  - Doppler beaming: el lado del disco que viene hacia la cámara brilla
//    más y se ve azul-blanco; el que se aleja, más tenue y rojizo.
//  - Lente gravitacional (sin raymarching): anillo de fotones fino pegado
//    a la silueta + arcos del disco "doblados" por arriba y por abajo,
//    dibujados en un billboard con shader (estilo foto del M87/Interstellar).
//  - Espaguetización: cada cierto tiempo una estrellita cae en espiral,
//    se estira como un fideo y se deshace en un hilo de chispas que
//    alimenta el disco (el disco se aviva un momento).
//  - Jets polares tenues de partículas (animados 100% en el shader).
//
// Rendimiento: 8 draw calls en total, geometrías estáticas, ruido senoidal
// barato en los shaders, ~240 partículas CPU. Sin postprocesado ni texturas.
import * as THREE from 'three';

// Dimensiones (unidades de escena)
const HOLE_R = 14;          // radio del horizonte (esfera negra)
const PHOTON_R = 15.6;      // anillo de fotones, casi pegado a la silueta
const DISK_IN = 40;         // borde interno del disco ≈ ISCO (~3 × horizonte)
const DISK_OUT = 98;        // borde externo del disco
const ARC_R = 44;           // alcance de los arcos lensados arriba/abajo
const HALO_S = 56;          // medio-lado del billboard de lensing
const DISK_TILT = 1.32;     // inclinación del disco (casi de canto, Gargantua)
const JET_LEN = 105;        // largo de los jets polares
const N_PARTICLES = 240;    // pool de chispas de la espaguetización

// Velocidad angular kepleriana (rad/s) usada por estrella y chispas
const omega = (r) => 380 * Math.pow(Math.max(r, 2), -1.5);

// ---------- Disco de acreción ----------
const DISK_VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vWorld;
  varying vec3 vVel;
  void main() {
    vPos = position;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    // Dirección tangencial (giro antihorario en el plano local XY):
    // velocidad del gas en ese punto, para el Doppler beaming.
    vVel = normalize((modelMatrix * vec4(-position.y, position.x, 0.0, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const DISK_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uInner;
  uniform float uOuter;
  uniform float uBoost;
  varying vec3 vPos;
  varying vec3 vWorld;
  varying vec3 vVel;
  void main() {
    float r = length(vPos.xy);
    float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float ang = atan(vPos.y, vPos.x);
    // Bandas de gas: espirales logarítmicas a dos velocidades. La capa
    // interna gira mucho más rápido (rotación kepleriana visible) sin que
    // el patrón se "enrolle" infinitamente con el tiempo.
    float lr = log(r);
    float aF = ang - uTime * 1.30;   // capa interna: rápida
    float aS = ang - uTime * 0.22;   // capa externa: lenta
    float wIn = 1.0 - smoothstep(0.0, 0.55, t);
    float arm = mix(sin(aS * 5.0 - lr * 9.0), sin(aF * 6.0 - lr * 11.0), wIn);
    float det = mix(sin(aS * 13.0 - lr * 21.0 + 1.7), sin(aF * 16.0 - lr * 25.0 + 0.6), wIn);
    float rad = sin(r * 1.9 - uTime * 0.35);
    float bands = 0.58 + 0.26 * arm + 0.16 * det * (0.5 + 0.5 * arm) + 0.10 * rad;
    bands = clamp(bands, 0.0, 1.4);
    // Gradiente térmico: blanco junto a la ISCO, rojo oscuro afuera
    vec3 cHot  = vec3(1.05, 0.99, 0.93);
    vec3 cMid  = vec3(1.00, 0.62, 0.20);
    vec3 cCold = vec3(0.45, 0.13, 0.03);
    vec3 col = mix(cHot, cMid, smoothstep(0.0, 0.42, t));
    col = mix(col, cCold, smoothstep(0.42, 1.0, t));
    float heat = 1.0 - t;
    float bright = (0.30 + 1.45 * heat * heat) * (0.28 + 1.05 * bands);
    // Doppler beaming: el lado que viene hacia la cámara brilla más y más azul.
    // El lado que se aleja queda tenue pero visible (como en la foto del M87).
    vec3 view = normalize(cameraPosition - vWorld);
    float dop = dot(vVel, view);
    float beam = 0.22 + pow(clamp(1.0 + 0.60 * dop, 0.40, 1.80), 3.0) * 0.45;
    col = mix(col, vec3(0.80, 0.88, 1.25), clamp(dop * 0.55, 0.0, 0.60));
    col = mix(col, vec3(1.00, 0.34, 0.10), clamp(-dop * 0.50, 0.0, 0.55));
    float inFade  = smoothstep(0.0, 0.05, t);
    float outFade = 1.0 - smoothstep(0.72, 1.0, t);
    vec3 final = col * bright * beam * inFade * outFade * (1.0 + 0.9 * uBoost);
    gl_FragColor = vec4(final, 1.0);
  }
`;

// ---------- Lente gravitacional (billboard: anillo de fotones + arcos) ----------
const HALO_VERT = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HALO_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uHoleR;
  uniform float uPhotonR;
  uniform float uArcR;
  uniform vec2 uBeamDir;
  varying vec2 vP;
  void main() {
    float r = length(vP);
    vec2 dir = vP / max(r, 0.001);
    // Nada dentro de la sombra (la esfera negra además tapa por z-buffer)
    float mask = smoothstep(uHoleR * 0.96, uHoleR * 1.06, r);
    // Anillo de fotones: fino y brillante, pegado a la silueta
    float photon = exp(-pow((r - uPhotonR) / 0.8, 2.0));
    // Resplandor lensado alrededor de la sombra (luz del disco doblada)
    float glow = (1.0 - smoothstep(uPhotonR, uPhotonR + 12.0, r)) * 0.22;
    // Arcos arriba y abajo: la imagen del disco doblada por la gravedad
    float vert = abs(dir.y);
    float arcs = pow(vert, 2.4)
      * (1.0 - smoothstep(uPhotonR + 1.5, uArcR, r))
      * smoothstep(uPhotonR - 2.0, uPhotonR + 2.5, r);
    // El beaming también se ve en la imagen lensada (un lado más brillante)
    float side = dot(dir, uBeamDir);
    float beam = 1.0 + 0.8 * side;
    vec3 hot  = vec3(1.00, 0.97, 0.90);
    vec3 warm = vec3(1.00, 0.72, 0.38);
    vec3 col = photon * hot * (1.80 + 0.55 * max(side, 0.0))
             + (arcs * 1.05 + glow) * mix(warm, hot, 0.35) * beam;
    col *= 0.95 + 0.05 * sin(uTime * 2.1 + r * 0.6);
    col *= mask;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------- Jets polares (todo animado en el shader) ----------
const JET_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSide;
  attribute float aAng;
  uniform float uTime;
  uniform float uLen;
  varying float vFade;
  void main() {
    float speed = 0.05 + 0.05 * fract(aSeed * 7.31);
    float prog = fract(aSeed + uTime * speed);
    float spread = 1.6 + prog * 10.0;
    vec3 p = vec3(cos(aAng) * spread, sin(aAng) * spread, (4.0 + prog * uLen) * aSide);
    vFade = 1.0 - prog;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (4.0 + 7.0 * (1.0 - prog)) * (160.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const JET_FRAG = /* glsl */ `
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.08, d) * vFade * 0.50;
    gl_FragColor = vec4(vec3(0.55, 0.70, 1.00) * a, 1.0);
  }
`;

/**
 * Crea el agujero negro completo. Devuelve { group, update(dt, camera), feed() }.
 * - group: añadirlo a la escena y posicionarlo.
 * - update: llamar cada frame mientras el modo galaxia esté activo.
 * - feed: lanza ya mismo una estrella a espaguetizarse (también ocurre solo).
 */
export function createBlackHole({ glowTexture, dotTexture }) {
  const group = new THREE.Group();

  // --- Horizonte de eventos: esfera negra perfecta ---
  const hole = new THREE.Mesh(
    new THREE.SphereGeometry(HOLE_R, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  group.add(hole);

  // --- Subgrupo inclinado: disco + jets + estrella espaguetizada ---
  const tilted = new THREE.Group();
  tilted.rotation.x = DISK_TILT;
  group.add(tilted);

  const diskMat = new THREE.ShaderMaterial({
    vertexShader: DISK_VERT,
    fragmentShader: DISK_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: DISK_IN },
      uOuter: { value: DISK_OUT },
      uBoost: { value: 0 },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(DISK_IN, DISK_OUT, 96, 1), diskMat);
  tilted.add(disk);

  // --- Billboard de lensing (siempre de cara a la cámara) ---
  const haloMat = new THREE.ShaderMaterial({
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uHoleR: { value: HOLE_R },
      uPhotonR: { value: PHOTON_R },
      uArcR: { value: ARC_R },
      uBeamDir: { value: new THREE.Vector2(1, 0) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(HALO_S * 2, HALO_S * 2), haloMat);
  group.add(halo);

  // --- Jets polares tenues ---
  const NJ = 130 * 2;
  const jetGeo = new THREE.BufferGeometry();
  jetGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NJ * 3), 3));
  const seeds = new Float32Array(NJ), sides = new Float32Array(NJ), angs = new Float32Array(NJ);
  for (let i = 0; i < NJ; i++) {
    seeds[i] = Math.random();
    sides[i] = i < NJ / 2 ? 1 : -1;
    angs[i] = Math.random() * Math.PI * 2;
  }
  jetGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  jetGeo.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
  jetGeo.setAttribute('aAng', new THREE.BufferAttribute(angs, 1));
  const jetMat = new THREE.ShaderMaterial({
    vertexShader: JET_VERT,
    fragmentShader: JET_FRAG,
    uniforms: { uTime: { value: 0 }, uLen: { value: JET_LEN } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const jets = new THREE.Points(jetGeo, jetMat);
  jets.frustumCulled = false;   // las posiciones viven en el shader
  tilted.add(jets);

  // --- Resplandor ambiente suave ---
  const ambient = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: 0xff8540, transparent: true,
    opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  ambient.scale.setScalar(190);
  group.add(ambient);

  // --- Estrella que cae (espaguetización 🍝) ---
  const starHolder = new THREE.Group();
  const starMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff6dc })
  );
  starHolder.add(starMesh);
  const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: 0xffd9a0, transparent: true,
    opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  starGlow.scale.setScalar(20);
  starHolder.add(starGlow);
  starHolder.visible = false;
  tilted.add(starHolder);

  // --- Chispas (pool fijo, coordenadas polares en el plano del disco) ---
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N_PARTICLES * 3);
  const pCol = new Float32Array(N_PARTICLES * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 3.2, map: dotTexture, vertexColors: true,
    transparent: true, opacity: 0.95, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  particles.frustumCulled = false;
  tilted.add(particles);

  const pR = new Float32Array(N_PARTICLES);
  const pAng = new Float32Array(N_PARTICLES);
  const pZ = new Float32Array(N_PARTICLES);
  const pLife = new Float32Array(N_PARTICLES);
  const pMax = new Float32Array(N_PARTICLES);
  let pCursor = 0;

  function spawnParticle(r, ang, z, life) {
    for (let k = 0; k < N_PARTICLES; k++) {
      const i = (pCursor + k) % N_PARTICLES;
      if (pLife[i] <= 0) {
        pR[i] = r; pAng[i] = ang; pZ[i] = z;
        pLife[i] = life; pMax[i] = life;
        pCursor = i + 1;
        return;
      }
    }
  }

  // --- Estado de la estrella ---
  const FALL_R0 = 175, SHRED_R = 24;
  let state = 'wait';        // 'wait' | 'fall' | 'shred'
  let waitT = 6;             // la primera estrella cae poco después de entrar
  let shredT = 0;
  let sR = 0, sAng = 0, sZ = 0, sZ0 = 0;
  let sPrev = new THREE.Vector3();
  let spawnAcc = 0;
  let boost = 0;
  let time = 0;

  const _dir = new THREE.Vector3();
  const _zAxis = new THREE.Vector3(0, 0, 1);
  const _q = new THREE.Quaternion();
  const _n = new THREE.Vector3();
  const _v = new THREE.Vector3();
  const _vp = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _bhPos = new THREE.Vector3();

  function startFall() {
    state = 'fall';
    sR = FALL_R0;
    sAng = Math.random() * Math.PI * 2;
    sZ0 = 42 + Math.random() * 12;   // llega desde "arriba": se distingue del disco
    sZ = sZ0;
    starHolder.visible = true;
    starMesh.scale.set(1, 1, 1);
    starGlow.scale.setScalar(20);
    sPrev.set(Math.cos(sAng) * sR, Math.sin(sAng) * sR, sZ);
    spawnAcc = 0;
  }

  function shred() {
    // La estrella-fideo se deshace en un hilo de chispas que cae al disco
    for (let i = 0; i < 95; i++) {
      const u = Math.random();
      spawnParticle(
        sR + u * 26 + (Math.random() - 0.5) * 4,
        sAng - u * 1.3 + (Math.random() - 0.5) * 0.15,
        sZ * u + (Math.random() - 0.5) * 2,
        1.6 + Math.random() * 1.8
      );
    }
    starHolder.visible = false;
    boost = 1;                 // el disco se aviva: la estrella "se suma" a él
    state = 'shred';
    shredT = 3.2;
  }

  function updateStar(dt) {
    if (state === 'wait') {
      waitT -= dt;
      if (waitT <= 0) startFall();
      return;
    }
    if (state === 'shred') {
      shredT -= dt;
      if (shredT <= 0) { state = 'wait'; waitT = 22 + Math.random() * 16; }
      return;
    }
    // Caída en espiral: cuanto más cerca, más rápido (kepleriano)
    sAng += omega(sR) * dt;
    sR -= (7 + 520 / sR) * dt;
    sZ = sZ0 * THREE.MathUtils.clamp((sR - SHRED_R) / (FALL_R0 - SHRED_R), 0, 1);
    const x = Math.cos(sAng) * sR, y = Math.sin(sAng) * sR;
    starHolder.position.set(x, y, sZ);
    // Orientación: el eje local Z apunta en la dirección del movimiento
    _dir.set(x - sPrev.x, y - sPrev.y, sZ - sPrev.z);
    if (_dir.lengthSq() > 1e-6) {
      _dir.normalize();
      starHolder.quaternion.setFromUnitVectors(_zAxis, _dir);
    }
    sPrev.set(x, y, sZ);
    // Espaguetización: se estira a lo largo del movimiento, se adelgaza a lo ancho
    const e = THREE.MathUtils.clamp((110 - sR) / 85, 0, 1);
    starMesh.scale.set(1 - 0.5 * e, 1 - 0.5 * e, 1 + 13 * e * e);
    starGlow.scale.setScalar(20 * (1 - 0.55 * e));
    // Hilo de chispas que va dejando atrás
    if (e > 0.1) {
      spawnAcc += (20 + 70 * e) * dt;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        spawnParticle(
          sR + (Math.random() - 0.5) * 2.5,
          sAng + (Math.random() - 0.5) * 0.06,
          sZ + (Math.random() - 0.5) * 1.5,
          1.4 + Math.random() * 1.4
        );
      }
    }
    if (sR <= SHRED_R) shred();
  }

  function updateParticles(dt) {
    for (let i = 0; i < N_PARTICLES; i++) {
      if (pLife[i] <= 0) {
        pPos[i * 3] = 0; pPos[i * 3 + 1] = 0; pPos[i * 3 + 2] = 0;   // dentro del horizonte
        pCol[i * 3] = 0; pCol[i * 3 + 1] = 0; pCol[i * 3 + 2] = 0;
        continue;
      }
      pAng[i] += omega(pR[i]) * dt;
      pR[i] -= (7 + 340 / pR[i]) * dt;
      pZ[i] -= pZ[i] * 1.6 * dt;
      pLife[i] -= dt;
      if (pR[i] < HOLE_R + 1.5) pLife[i] = 0;
      const f = THREE.MathUtils.clamp(pLife[i] / pMax[i], 0, 1);
      pPos[i * 3] = Math.cos(pAng[i]) * pR[i];
      pPos[i * 3 + 1] = Math.sin(pAng[i]) * pR[i];
      pPos[i * 3 + 2] = pZ[i];
      pCol[i * 3] = f; pCol[i * 3 + 1] = f * 0.86; pCol[i * 3 + 2] = f * 0.6;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }

  function update(dt, camera) {
    time += dt;
    diskMat.uniforms.uTime.value = time;
    haloMat.uniforms.uTime.value = time;
    jetMat.uniforms.uTime.value = time;
    boost = Math.max(0, boost - dt * 0.35);
    diskMat.uniforms.uBoost.value = boost;

    // El billboard de lensing siempre mira a la cámara
    halo.quaternion.copy(camera.quaternion);

    // Lado "que se acerca" (beaming) proyectado al plano de pantalla:
    // u* = v̂ × n, donde n es el eje del disco y v̂ la vista ⊥ a n.
    group.getWorldPosition(_bhPos);
    tilted.getWorldQuaternion(_q);
    _n.set(0, 0, 1).applyQuaternion(_q);
    _v.copy(camera.position).sub(_bhPos).normalize();
    _vp.copy(_v).addScaledVector(_n, -_v.dot(_n));
    if (_vp.lengthSq() > 1e-4) {
      _vp.normalize();
      _u.crossVectors(_vp, _n);
      _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      haloMat.uniforms.uBeamDir.value.set(_u.dot(_right), _u.dot(_up)).normalize();
    }

    updateStar(dt);
    updateParticles(dt);
  }

  /** Lanza ya mismo una estrella a la espiral (al tocar el agujero negro). */
  function feed() {
    if (state === 'wait') startFall();
  }

  /** Estado interno (solo para pruebas automatizadas). */
  function debug() {
    const w = new THREE.Vector3();
    if (starHolder.visible) starHolder.getWorldPosition(w);
    return { state, r: sR, starWorld: starHolder.visible ? [w.x, w.y, w.z] : null };
  }

  return { group, update, feed, debug };
}
