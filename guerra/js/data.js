'use strict';
// Guerra Zombie: datos del juego (balance). Cambiar números aquí no requiere tocar la lógica.
window.GZ = window.GZ || {};
(() => {
  const N = 15, C = 7;                                   // mapa de 15×15 casillas; la fogata va en el centro (7,7)
  const RADIUS = [3, 5];                                 // terreno despejado según el nivel de la fogata (era 0 y era 1)
  const RES = {
    palos: { name: 'Palos', icon: '🪵' }, piedras: { name: 'Piedras', icon: '🪨' },
    comida: { name: 'Comida', icon: '🫐' }, agua: { name: 'Agua', icon: '💧' },
  };
  // t: tipo de casilla natural; give: lo que da al recogerla (gasta 1 de energía)
  const NATURE = {
    arbol: { name: 'Árbol', give: { palos: 2 }, regrow: 2 },
    roca: { name: 'Roca', give: { piedras: 2 }, regrow: 3 },
    arbusto: { name: 'Arbusto de bayas', give: { comida: 2 }, regrow: 2 },
    rio: { name: 'Río', give: { agua: 2 }, regrow: 0 },
  };
  // era: era mínima; need: edificio necesario; days: días de obra; beds: camas; prod: producción por día
  const B = {
    fogata: { name: 'Fogata', desc: 'El corazón de tu refugio. Si se apaga de noche, pierdes la noche.', hp: [100, 160], era: 0, max: 1, cost: {} },
    tienda: { name: 'Tienda', desc: 'Dos camas: para ti y para un superviviente.', cost: { palos: 6, piedras: 2 }, days: 0, beds: 2, hp: 40, era: 0, max: 3 },
    pila: { name: 'Pila de palos', desc: 'Junta palos cada día.', cost: { palos: 6 }, days: 1, prod: { palos: 3 }, hp: 40, era: 0, max: 2 },
    bayas: { name: 'Recolector de bayas', desc: 'Canastas que se llenan de bayas cada día.', cost: { palos: 5 }, days: 1, prod: { comida: 3 }, hp: 35, era: 0, max: 2 },
    cubetas: { name: 'Cubetas del río', desc: 'Traen agua del río cada día.', cost: { palos: 4, piedras: 3 }, days: 1, prod: { agua: 3 }, hp: 35, era: 0, max: 2 },
    taller: { name: 'Taller de palos', desc: 'Permite hacer muros, estacas y, en la era 1, la lanza.', cost: { palos: 10, piedras: 6 }, days: 2, hp: 60, era: 0, max: 1 },
    muro: { name: 'Muro de palos', desc: 'Bloquea a los zombies: tienen que romperlo para pasar.', cost: { palos: 3 }, days: 0, hp: 60, era: 0, max: 40, need: 'taller', wall: true },
    estacas: { name: 'Estacas', desc: 'Frenan y lastiman a los zombies que pasan encima.', cost: { palos: 2, piedras: 1 }, days: 0, hp: 30, era: 0, max: 20, need: 'taller', trap: true },
    cabana: { name: 'Cabaña', desc: 'Cuatro camas: más supervivientes pueden quedarse.', cost: { palos: 14, piedras: 10 }, days: 2, beds: 4, hp: 80, era: 1, max: 4 },
    huerto: { name: 'Huerto', desc: 'Más comida cada día. Necesita agua para empezar.', cost: { palos: 8, piedras: 4, agua: 4 }, days: 2, prod: { comida: 5 }, hp: 40, era: 1, max: 3 },
    pedrera: { name: 'Pedrera', desc: 'Un aliado parte rocas: piedras cada día.', cost: { palos: 10 }, days: 1, prod: { piedras: 3 }, hp: 50, era: 1, max: 2 },
  };
  const BUILD_ORDER = ['tienda', 'pila', 'bayas', 'cubetas', 'taller', 'muro', 'estacas', 'cabana', 'huerto', 'pedrera'];
  const FOGATA_LIGHT = { palos: 3, piedras: 2 };
  const FOGATA_UP = { cost: { palos: 20, piedras: 15, comida: 6 }, allies: 2, need: 'taller' };
  const LANZA = { cost: { palos: 6, piedras: 2 } };
  const ERAS = ['Fogata', 'Piedra y palos'];

  const JOBS = {
    recolector: { name: 'Recolector/a', bonus: { comida: 2, agua: 1 }, dmg: 1 },
    lenador: { name: 'Leñador/a', bonus: { palos: 3 }, dmg: 1 },
    cantero: { name: 'Cantero/a', bonus: { piedras: 2, palos: 1 }, dmg: 1 },
    aguatero: { name: 'Aguatero/a', bonus: { agua: 3 }, dmg: 1 },
    cazador: { name: 'Cazador/a', bonus: { comida: 2 }, dmg: 1.6 },
  };
  const NAMES = ['Tomás', 'Lucía', 'Mateo', 'Valeria', 'Diego', 'Camila', 'Joaquín', 'Martina', 'Andrés', 'Sofía', 'Bruno', 'Elena', 'Nico', 'Paula', 'Hugo', 'Inés', 'Gael', 'Renata', 'Iker', 'Abril'];

  // Zombies. Crecen por noche como en la propuesta: vida +4,5 %, daño +3 %, velocidad +0,4 % (tope +25 %).
  const Z = {
    errante: { name: 'Errante', hp: 20, speed: 17, dmg: 5 },
    corredor: { name: 'Corredor', hp: 12, speed: 40, dmg: 4, from: 4 },
  };
  const scale = n => ({ hp: 1 + 0.045 * (n - 1), dmg: 1 + 0.03 * (n - 1), speed: Math.min(1.25, 1 + 0.004 * (n - 1)) });
  const count = n => Math.round(3 + 1.4 * Math.pow(n - 1, 0.92));
  const runnerShare = n => (n < Z.corredor.from ? 0 : Math.min(0.35, 0.1 + 0.02 * n));
  const nightLength = n => Math.min(60, 14 + 2.5 * n);     // segundos en los que van apareciendo

  const WEAPONS = {
    piedra: { name: 'Piedra', dmg: 7, cd: 0.5, radius: 18, speed: 430 },
    lanza: { name: 'Lanza', dmg: 15, cd: 0.85, pierce: 2, speed: 540, range: 640 },
  };
  const ALLY_ATTACK = { dmg: 5, cd: 1.6, range: 250 };
  const ENERGY = 10, START = { palos: 0, piedras: 0, comida: 6, agua: 6 };

  // Guía del narrador (Giorgio). check(S) dice si el objetivo está cumplido.
  const has = (S, t, built) => S.b.some(b => b.t === t && (!built || !b.build));
  const QUESTS = [
    { text: 'Junta 5 palos: toca los árboles 🌳 cerca de la fogata.', check: S => S.res.palos >= 5 },
    { text: 'Ahora junta 4 piedras: toca las rocas 🪨.', check: S => S.res.piedras >= 4 },
    { text: 'Toca la fogata para encenderla 🔥 (3 palos y 2 piedras).', check: S => S.lit },
    { text: 'Levanta tu tienda: pulsa Construir y elige Tienda ⛺.', check: S => has(S, 'tienda') },
    { text: 'Ya cae el sol. Cuando estés listo, pulsa 🌙 Pasar la noche.', check: S => S.day >= 2 },
    { text: 'Construye una Pila de palos para tener madera cada día.', check: S => has(S, 'pila') },
    { text: 'Construye el Recolector de bayas y las Cubetas del río: cada persona come y bebe 1 al día.', check: S => has(S, 'bayas') && has(S, 'cubetas') },
    { text: 'Construye el Taller de palos y espera a que esté listo (2 días): con él harás defensas.', check: S => has(S, 'taller', true) },
    { text: 'Pon 3 muros o estacas entre el bosque y la fogata.', check: S => S.b.filter(b => b.t === 'muro' || b.t === 'estacas').length >= 3 },
    { text: 'Consigue 2 aliados (construye otra tienda: sin camas libres no llega nadie) y mejora la fogata a nivel 2.', check: S => S.era >= 1 },
    { text: '¡Era de Piedra y palos! Toca el taller para hacer tu lanza, construye cabaña, huerto y pedrera… y sobrevive.', check: () => false },
  ];

  Object.assign(GZ, { N, C, RADIUS, RES, NATURE, B, BUILD_ORDER, FOGATA_LIGHT, FOGATA_UP, LANZA, ERAS, JOBS, NAMES, Z, scale, count, runnerShare, nightLength, WEAPONS, ALLY_ATTACK, ENERGY, START, QUESTS, has });
})();
