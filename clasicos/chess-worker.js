'use strict';
// Calcula la jugada del bot fuera del hilo principal para que la pantalla no se congele.
importScripts('chess-engine.js');
onmessage = e => {
  const { id, moves, level } = e.data;
  const g = new Chess.Game();
  for (const u of moves) g.playUCI(u);
  const m = Chess.best(g, level);
  postMessage({ id, move: m ? Chess.uci(m) : '' });
};
