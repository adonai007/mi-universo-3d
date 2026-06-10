# 🪐 Mi Universo

Un sistema solar 3D interactivo para niños y niñas de **3 a 6 años**. No hace falta saber leer: todo se maneja con botones grandes de emojis y una voz amable en español cuenta datos curiosos de cada planeta.

## ✨ Qué incluye

### Realismo
- **Texturas reales** de los planetas (Solar System Scope, 2K) con fallback procedural si faltan los archivos.
- **Lado día/noche real**: los planetas solo los ilumina el Sol (luz puntual física + tone mapping ACES).
- **Inclinación axial real** por planeta (¡Urano gira acostado!), rotaciones ordinales correctas (Júpiter rapidísimo, Venus lentísimo y al revés) y tamaños relativos comprimidos pero ordenados.
- Tierra con **capa de nubes aparte** que rota distinto y **halo atmosférico azul**; Venus y Marte con atmósfera tenue.
- Sol con **granulación animada y manchas solares**, anillos de Saturno con división de Cassini, Luna con cráteres, **Vía Láctea** real de fondo, cinturón de asteroides, cometa con cola.

### Didáctica
- **Toca cualquier planeta** → la cámara vuela, confeti, melodía propia 🎵 y la voz narra 4-5 datos de a uno (tamaño, temperatura, lunas, sorpresa). En la Tierra explica el **día y la noche**.
- **📏 Comparar**: todos en fila junto al Sol; cada toque dice su frase de tamaño ("¡en Júpiter caben mil Tierras!").
- **🌗 Fases de la Luna**: toca la Luna y arrástrala alrededor de la Tierra; la voz explica llena/nueva/creciente/menguante (la iluminación real del Sol hace las fases).
- **🌌 Galaxia**: zoom narrado más allá del sistema solar, con nebulosas, un **agujero negro** con disco animado y estrellas tocables.
- **🛰️ ISS** orbitando la Tierra y **🤖 rover** en Marte, ambos tocables.
- **📅 Misión del día**: cada día se destaca un planeta con un anillo dorado pulsante; visitarlo completa la misión.
- **🌠 Estrellas fugaces** cada 30-60 s: tócala a tiempo y ¡pide un deseo!

### Juegos y recompensas
- **🎯 Quiz por voz**: "¿dónde está el planeta rojo?" — acierto = fiesta; error = pista amable, sin castigo.
- **🏆 Quiz por niveles**: colores → tamaños → orden → temperatura. 3 aciertos suben de nivel (guardado).
- **📒 Álbum de pegatinas**: se desbloquean visitando planetas, completando el tour, los quizzes, la misión y creando planetas.
- **🪐 Construye tu planeta**: color, tamaño (🐜→🐘), anillos y lunas; queda orbitando y se guarda. 🗑️ lo quita.

### Botones (solo iconos, mínimo 64 px)
🏠 ver todo · 🌌 galaxia · 🚀 paseo guiado · 📏 comparar · 🎮 juegos (🎯 🏆 📒 🪐) · ⏸️ pausa · 🔊 sonido · 🎨 personalizar (velocidad 🐢→🐇, estrellas, cielo, luz, órbitas, nombres)

Todo se guarda en `localStorage`. Respeta `prefers-reduced-motion`, funciona con ratón y táctil, y avisa si no hay WebGL.

### 🤖 Boti Bot, el amigo intergaláctico
- **Pantalla de bienvenida**: cada niño elige su avatar (🦁🦄🐸🚀👧👦🐱🐶), su edad y escribe su nombre (con ayuda). Multi-perfil: cada niño guarda sus propias pegatinas y nivel; al volver, eliges quién juega.
- **Botón 🎤 walkie-talkie**: mantén apretado, pregunta lo que quieras del universo y suelta. Boti responde por voz, corto, alegre y seguro. Sin micrófono (p. ej. Firefox) aparece un teclado ⌨️ para que ayuden los padres.
- **Con claves** (`.env` en el servidor): respuestas inteligentes con Claude (Anthropic) y voz bonita con ElevenLabs.
- **Sin claves o en la web estática**: Boti responde desde su banco local de ~30 preguntas del universo con la voz del navegador.
- **Guardarraíles para niños**: Boti SOLO habla del espacio (filtro de temas en el servidor + system prompt estricto), respuestas de 1-3 frases, cero contenido aterrador, nunca pide datos personales, límite de 10 preguntas/minuto y respuestas cortas (control de costo).

## ▶️ Cómo ejecutarlo

### Opción A — Completa, con Boti Bot inteligente (servidor Node)

```bash
npm install
copy .env.example .env   # (o cp en Mac/Linux) — pon tus claves, son opcionales
npm start                # → http://localhost:8342
```

Claves en `.env` (ambas opcionales, la app funciona sin ellas):

| Clave | Qué activa | Dónde conseguirla |
|---|---|---|
| `ANTHROPIC_API_KEY` | Respuestas inteligentes de Boti (Claude Haiku) | console.anthropic.com |
| `ELEVENLABS_API_KEY` | Voz cálida de Boti | elevenlabs.io |

Las claves viven SOLO en el servidor (`.env` está en `.gitignore`); nunca llegan al navegador.

### Opción B — Solo estática (Boti en modo banco local)

```bash
npx serve .          # o python -m http.server 8341
```

Sin backend, Boti detecta que no hay `/api` y responde desde su banco local con la voz del navegador. Es el modo en que funciona la versión publicada en GitHub Pages.

Se necesita internet la primera vez para Three.js (CDN); las texturas de planetas ya están en `textures/` (funcionan offline).

## 🛠️ Cómo personalizarlo

| Quiero cambiar… | Archivo |
|---|---|
| Datos, hechos, inclinaciones, quiz, pegatinas | `js/planets.js` |
| Texturas procedurales de respaldo | `js/textures.js` |
| Escena 3D, modos (comparar, galaxia, luna...) | `js/scene.js` |
| Sonidos, melodías 🎵 y voz | `js/audio.js` |
| Botones, paneles y álbum | `js/ui.js` + `index.html` |
| Lógica de juegos, misión, tour | `js/main.js` |
| Estilos | `css/styles.css` |

## 🧰 Tecnología

- [Three.js 0.160](https://threejs.org/) por import map desde CDN (sin bundler)
- JavaScript vanilla con módulos ES
- Web Speech API (`speechSynthesis`, voz `es-ES`) y Web Audio API (efectos y melodías procedurales)
- Tone mapping ACES, iluminación física de un solo punto (el Sol)

## 🖼️ Créditos de texturas

Las texturas de planetas en `textures/` provienen de
[Solar System Scope](https://www.solarsystemscope.com/textures/) y se usan bajo licencia
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). © INOVE CC BY 4.0.
Si los archivos faltan, la app genera texturas procedurales propias automáticamente.
