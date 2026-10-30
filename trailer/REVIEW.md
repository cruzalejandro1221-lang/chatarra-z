# REVIEW: tráiler Chatarra Z

## Decisiones
- Storyline A "De piedras a fuego" (ver STORYLINES.md). B "Una noche en la muralla" y C "El taller" no se construyeron.
- Todo el gameplay es el código real del juego (assets/game/, copia de chatarra-z/js con fuentes Outfit/Archivo Black), simulado de forma determinista por assets/trailer/player.js a 60 pasos/s con azar sembrado. Los planos están en assets/trailer/scenes.js.
- Sonido: la banda sonora y los efectos sintetizados del propio juego, renderizados offline (tools/render-audio.html + tools/log-sfx.cjs registra cada sonido con su tiempo) y normalizados a -16 LUFS; encima, efectos de la librería incluida (whoosh, impacto, riser, pop, click). Sin catálogo de música HeyGen.

## Medido vs. mirado
- `hyperframes check`: 0 errores. Avisos que se quedan a propósito: `line_unread` en las cifras de la ruleta de las tarjetas de nivel (efecto tragamonedas de 0.09 s por número) y `timeline_track_too_dense` en captions/chapters.
- Revisado a ojo en hojas de contacto: hook, título, tarjetas 2-9, cortes juego→tarjeta, taller, jefe, cierre.
- El audio se midió (volumen, picos), no se escuchó.

## Autorrevisión del MP4 (46 cuadros + zooms)
- Corregido tras el primer render: tiros guionizados que no se veían en "Más arrastre, más fuerza", en el rebote del casco y en la escena de puntería (objetivo fuera del alcance de la piedra, vmax 950); espacio sobrante en "Solo 3 ." / "Solo 2 ."; título del taller chocando con los contadores; iconos de armas demasiado pequeños; corte a fondo vacío al final de cada plano.
- Volumen final: el render salió a -21.8 LUFS; se normalizó el MP4 a -16.7 LUFS (pico -1.2 dBFS) con ffmpeg, sin recodificar la imagen. Si se vuelve a renderizar, repetir ese paso o subir data-volume de a-game.

## Punto más débil
- Los planos de capítulo duran 5.6 s y algunos (Púas, Aliado) muestran la mecánica de forma sutil; con más tiempo daría a cada uno un punch-in sobre la acción clave.

## Para regenerar
- Cambiar planos: editar assets/trailer/scenes.js; luego `node tools/log-sfx.cjs`, abrir tools/render-audio.html con `python tools/audio-server.py` corriendo, y normalizar a assets/audio/game-audio.mp3.
- Textos de leyendas y tarjetas: generados por gen_trailer.py (scratchpad); se pueden editar directamente en compositions/captions.html y chapters.html.
