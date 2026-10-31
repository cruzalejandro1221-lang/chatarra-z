# Chatarra Z: guía para agentes

Juego de defensa 2D con física, en el navegador. HTML + canvas + JavaScript sin dependencias ni build: se abre `game/index.html` y funciona.
Idioma del juego y de los textos: español.

El repo es **público** y se publica solo con GitHub Pages desde `main`:
- App: https://cruzalejandro1221-lang.github.io/chatarra-z/
- Juego directo: https://cruzalejandro1221-lang.github.io/chatarra-z/game/
Todo lo que entra en `main` queda en línea en 1-2 minutos: no subas nada roto ni secretos.

## Estructura

```
index.html, app.css, app.js   app móvil "Giorgio Games" (pestañas Juegos App, Clásicos, Trend, Perfil)
account.js, config.js         cuentas Giorgio con Supabase (config.js solo lleva la URL y la clave pública anon)
vendor/supabase.min.js        supabase-js 2.45.4 (copia local, sin CDN)
supabase/migrations/          tablas, reglas RLS y funciones del servidor (fuente de verdad de la base)
media/giorgio/                el gato Giorgio (mascota del canal Quiz con Giorgio) en varias poses
manifest.webmanifest, sw.js   instalable como app (PWA) y funciona sin conexión
clasicos/                     Ajedrez, Póker, Batalla Naval y Ludo (bot de 3 niveles y partida online por enlace)
icons/, media/                iconos de la app; miniatura, clip y tráiler ligero (720p) sacados del render real
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

## App Giorgio Games

- **Marca**: Giorgio Games es la marca del canal de YouTube "Quiz con Giorgio" (gato siamés con moño naranja). Colores: amarillo `#ffc629`, azul marino `#1d2a5b`, naranja `#ff7a1a`; letras Lilita One + Nunito; botones con relieve. La app NO tiene temática zombi: Chatarra Z es solo uno de los juegos.
- **Cuentas** (`account.js`): registro con usuario, correo y contraseña (mín. 10, letras y números). Las contraseñas las procesa Supabase Auth (bcrypt); la app nunca las guarda. Los resultados se mandan a la función `record_match` (valida, limita frecuencia y calcula la XP en el servidor). Nunca pongas la service_role key ni la contraseña de la base en el repo: el repo es público.
- **Invitado vs cuenta**: al abrir la app sale una bienvenida (Google/Facebook si están en `config.js` → `oauth`, correo + código, o invitado). El invitado juega todo (también online por enlace) pero no se guarda nada; los enlaces de invitación saltan la bienvenida.
- **Perfil de juego**: nivel/XP, victorias y horas por juego (función `heartbeat` cada minuto; el servidor mide el tiempo), amigos (`friend_request`, `my_friends`, `get_profile`; "en línea / jugando" solo lo ven los amigos).
- Cambios de base: añade un archivo nuevo en `supabase/migrations/` (no edites los ya aplicados) y mantén RLS en toda tabla nueva.
- Copias de seguridad: repo privado `giorgio-games-backups` (pg_dump diario cifrado con GPG, 30 días).

- Pestañas con `#juegos`, `#clasicos`, `#trend`, `#perfil` en la URL.
- **Perfil** lee el guardado del juego (`localStorage` `chatarraZ_v2`, mismo origen). Si cambias `RANKS` o `OPEN_LEVELS` en `game/js/data.js`, copia el cambio en `app.js`.
- **Jugar** abre `game/index.html` en un iframe a pantalla completa, intenta bloquear la pantalla en horizontal y en vertical pide girar el teléfono.
- Para añadir un juego propio, crea su carpeta (como `game/`) y enlázalo desde una tarjeta con `data-play`.
- Al cambiar archivos que la app guarda para uso sin conexión, sube la versión `CACHE` en `sw.js` (ahora `gg-v4`).
- En celulares el juego activa la clase `phone` (`game/js/main.js`) y `game/style.css` agranda la interfaz.

## Juegos de fiesta (fiesta/, pestaña Trend)

- Un solo celular para jugar en persona: **El Impostor** (rol oculto con "mantén presionado"), **Charada** (inclinar el celular; usa `deviceorientation` y la componente vertical `cos(beta)·cos(gamma)`; en iPhone pide permiso al tocar; si no hay sensor se juega tocando los lados; en vertical gira la pantalla por CSS) y **Es un 10 pero…** (número gigante del 1 al 10 en la frente, en horizontal; el público inventa el "pero" y toca "Siguiente persona"). Chatarra Z ya no pide pantalla completa (en Android mostraba un aviso que tapaba el juego); se sale desde su menú ("Giorgio Games") o con el botón Atrás.
- Todo es local, sin servidor ni cuenta. Se cargan al abrirlos (`openParty` en app.js). Para añadir palabras o cartas edita solo `fiesta/data.js`; para un juego nuevo añade su función en `fiesta/fiesta.js` y una tarjeta `data-party` en index.html.

## Clásicos (clasicos/)

- `core.js`: lobby (bot o amigo), conexión online, sesión y revancha. Cada juego se registra con `CG.register(id, { start(ctx) })` y recibe `ctx` (`ctx.root`, `ctx.mode`, `ctx.level` 0-2, `ctx.isHost`, `ctx.send`, `ctx.onmsg`, `ctx.later`, `ctx.finish`). Para añadir un juego: crear `clasicos/<id>.js`, añadirlo a `INFO` en core.js, a `CORE` en sw.js y una tarjeta en index.html.
- **Online** = WebRTC directo con PeerJS (copia local en `clasicos/vendor/`); solo se usa el servidor gratuito de PeerJS para que los dos se encuentren. Mensajes con número de secuencia y reenvío tras cortes cortos; reconexión automática. Enlace: `?juego=<id>&sala=<CÓDIGO>`. Todo lo que llega de la red se trata como no confiable (validar tipos y rangos; escapar nombres con `CG.esc`).
- Lógica pura y testeable en `*-engine.js` (ajedrez, póker, batalla, ludo); la interfaz va en `<id>.js`.
- Tests (Node, sin dependencias): `node tests/chess-perft.cjs`, `node tests/chess-bots.cjs`, `node tests/poker.cjs 150`, `node tests/batalla.cjs`, `node tests/ludo.cjs 200`. Los de bots comprueban que Difícil > Medio > Fácil: correrlos tras tocar un bot.
- Perfil lee `gg_records` (ganadas/perdidas/empates por juego y modo) que escribe `CG.record`; con cuenta, lee los totales del servidor. `CG.fx(nombre)` da sonidos sintetizados (se apagan con `gg_sound`).

## Cómo trabajar

- Probar en el navegador: servir la raíz del repo (`python -m http.server 8770`) y abrir http://localhost:8770 (app) o http://localhost:8770/game/ (juego). Prueba también en tamaño celular, vertical y horizontal.
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
