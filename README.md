# Giorgio Games

App de juegos del canal **Quiz con Giorgio**: clásicos (ajedrez, póker, batalla naval, ludo) contra el bot o contra amigos por enlace, cuentas con historial y juegos propios como **Chatarra Z**.

## Chatarra Z

Juego de defensa 2D con física para el navegador. Eres un superviviente sobre una muralla: empiezas con piedras y, nivel a nivel, consigues palos, honda, arco, flechas de fuego y molotov, administrando una munición que fabricas con lo que sueltan los zombis.

- **Jugar en línea (celular o PC):** https://cruzalejandro1221-lang.github.io/chatarra-z/ · se puede instalar como app desde el navegador.
- **Jugar en local:** `python -m http.server 8770` en la raíz y abre http://localhost:8770.
- **Controles:** arrastra hacia atrás en el campo y suelta para lanzar · teclas 1-6 para cambiar de arma · toca una defensa y luego una ranura para colocarla · Espacio pausa · F velocidad.
- **Contenido actual:** Mundo 1 completo (10 niveles y un jefe), taller de mejoras y fabricación, modo infinito. Mundos 2-4 en camino.
- **Cuentas:** Supabase (contraseñas con hash bcrypt, reglas RLS). Ver `supabase/migrations/`.
- **Clásicos:** Ajedrez, Póker, Batalla Naval y Ludo, contra un bot (Fácil, Medio o Difícil) o contra un amigo online con solo mandarle un enlace.
- **Tráiler:** proyecto HyperFrames en `trailer/`; el video está en la release `trailer-v1`.

Para agentes y colaboradores: ver [AGENTS.md](AGENTS.md).
