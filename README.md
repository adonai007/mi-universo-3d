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

## ▶️ Cómo ejecutarlo

Es una web estática (sin build). Solo necesitas un servidor estático porque usa módulos ES:

```bash
# opción 1
npx serve .

# opción 2
python -m http.server 8341
```

Luego abre `http://localhost:8341`. Se necesita internet la primera vez para Three.js (CDN); las texturas de planetas ya están en `textures/` (funcionan offline).

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
