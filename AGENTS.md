# Chatarra Z: guía para agentes

Juego de defensa 2D con física, en el navegador. HTML + canvas + JavaScript sin dependencias ni build: se abre `game/index.html` y funciona.
Idioma del juego y de los textos: español.

## Estructura

```
game/                 el juego (lo que se publica)
  index.html          contenedor, HUD y pantallas (los scripts se cargan en orden, sin módulos)
  style.css           estilos de la interfaz
  js/util.js          utilidades (azar sembrado, colores, iconos SVG)
  js/data.js          TODO el contenido: armas, munición, materiales, mejoras, zombis, mundos, niveles 1-10
  js/save.js          guardado en localStorage (clave chatarraZ_v2), munición, fabricación, desbloqueos
  js/audio.js         sonido y música sintetizados con WebAudio (no hay archivos de audio)
  js/art.js           arte procedural: escenarios, muralla, zombis, defensas antiguas
  js/art2.js          arte del Mundo 1: superviviente, objetos lanzables, materiales, barricada/púas/aliado
  js/game.js          motor: física, lanzamientos, zombis, oleadas, fin de nivel
  js/ui.js            menú, mapa, pantalla de equipo, HUD, taller, progreso
  js/main.js          bucle, render del canvas, entrada (arrastrar para lanzar), escalado
tools/balance-sim.cjs simulador sin pantalla: un bot que apunta con error humano juega los 10 niveles
trailer/              proyecto HyperFrames del tráiler (ver trailer/REVIEW.md)
legacy/v1-torres/     versión anterior (torretas, 40 niveles generados); referencia para mundos futuros
```

## Diseño (no romper sin pedirlo)

- El jugador es un superviviente sobre la muralla: **arrastrar hacia atrás y soltar** para lanzar. La trayectoria visible depende de la mejora Puntería.
- **Armas super limitadas al principio**: piedras infinitas; palos y honda infinitos pero desbloqueados por nivel; arco, flechas de fuego y molotov gastan munición que se **fabrica** con materiales (madera, tela, chatarra) que sueltan los zombis.
- Antes de cada nivel se elige el equipo (casillas limitadas por la mejora Mochila).
- Golpe a la cabeza = doble daño; las piedras rebotan en el casco del Obrero.
- Progresión del Mundo 1 (niveles 1-10, a mano en `LEVELS` de data.js): piedras → barricada → palos → honda → púas → arco → aliado → flechas de fuego → molotov → jefe Mamut.
- Mundos 2-4 están marcados "Próximamente" (`OPEN_LEVELS = 10` en data.js). Plan: era de la pólvora, del metal y de la chatarra eléctrica; las torretas de `legacy/` son el material de partida para la última.

## Cómo trabajar

- Probar en el navegador: servir la carpeta `game/` (por ejemplo `python -m http.server 8765 --directory game`) y abrir http://localhost:8765.
- Comprobar sintaxis: `for f in game/js/*.js; do node --check "$f"; done`
- **Dificultad**: después de tocar niveles, armas, vida o materiales, correr el simulador con tres perfiles y comparar:
  - bueno: `GEST=0.9 node tools/balance-sim.cjs 0.05 0.3`
  - casual: `GEST=1.3 node tools/balance-sim.cjs 0.1 0.1`
  - novato: `GEST=1.6 node tools/balance-sim.cjs 0.14 0.05`
  Objetivo actual: el novato necesita reintentos en 4-6 y sufre con el jefe; el casual gana casi todo; el bueno saca 3 estrellas casi siempre con presión al final; los tres terminan los 10 niveles.
- Guardado: si cambias la forma de `SAVE`, sube la clave (`chatarraZ_v3`) o migra en `loadSave()`.
- Todo el arte es código canvas: no añadir imágenes salvo que se pida.
- Mantener el estilo existente: funciones pequeñas, comentarios en español, sin frameworks.

## Tráiler

`trailer/` es un proyecto HyperFrames (`npx hyperframes ...`). `trailer/assets/game/` es una **copia** de `game/js` con las fuentes cambiadas a Outfit/Archivo Black. Si cambia el juego y se quiere un tráiler actualizado:

```bash
for f in util data save art art2 game; do sed -e "s/Rubik/Outfit/g" -e "s/Bungee/Archivo Black/g" game/js/$f.js > trailer/assets/game/$f.js; done
```

Luego seguir los pasos de `trailer/REVIEW.md` (planos en `assets/trailer/scenes.js`, audio con `tools/log-sfx.cjs` + `tools/render-audio.html`). El MP4 renderizado está como archivo adjunto en la release `trailer-v1` de GitHub, no en el repo.
