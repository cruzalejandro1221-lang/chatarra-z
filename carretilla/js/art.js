'use strict';
// La Carretilla de Giorgio: dibujos en SVG (estilo caricatura con contorno). Todo se arma con funciones que devuelven texto SVG.
(() => {
  const INK = '#3b2412';
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b), k = Math.max(0, Math.min(1, t)); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  // color según la cocción: p < 1 crudo → listo; entre 1,45 y 1,9 se va oscureciendo; desde 1,9 quemado
  const COOK = {
    papas: ['#f6e7b4', '#f2b53e', '#3e2410'], salchicha: ['#ee9a95', '#b4542f', '#2a160e'],
    pollo: ['#f3cdb0', '#d48a2c', '#341b0b'], carne: ['#cf5560', '#70402a', '#1e1210'],
  };
  const cookColor = (k, p) => { const c = COOK[k]; return p < 1 ? mix(c[0], c[1], p) : p < 1.45 ? c[1] : mix(c[1], c[2], (p - 1.45) / 0.45); };

  // ---------------------------------------------------------------- piezas sueltas (se usan en estaciones, recipientes y pedidos)
  const fries = (f, w) => { let s = ''; const xs = [10, 18, 26, 34, 42, 50, 22, 38, 30]; xs.forEach((x, i) => { const h = 34 - (i % 3) * 5, r = (i % 5 - 2) * 6; s += '<rect x="' + x + '" y="' + (16 + (i % 3) * 3) + '" width="7" height="' + h + '" rx="2.5" transform="rotate(' + r + ' ' + (x + 3) + ' 40)" fill="' + f + '" stroke="' + INK + '" stroke-width="1.6"/>'; }); return '<g' + (w ? ' transform="' + w + '"' : '') + '>' + s + '</g>'; };
  const sausage = (f, grill) => '<rect x="6" y="20" width="56" height="18" rx="9" fill="' + f + '" stroke="' + INK + '" stroke-width="2"/><rect x="12" y="23" width="40" height="4" rx="2" fill="#fff" opacity=".35"/>' + (grill ? '<path d="M20 22l-4 14M32 22l-4 14M44 22l-4 14" stroke="' + INK + '" stroke-width="2.2" opacity=".55" stroke-linecap="round"/>' : '');
  const drum = f => '<path d="M14 30c0-12 12-20 24-18 10 2 16 10 14 20-2 9-10 13-20 13-11 0-18-6-18-15z" fill="' + f + '" stroke="' + INK + '" stroke-width="2"/><path d="M20 26c3-4 7-6 12-6M24 34c4 2 9 2 13-1" stroke="#fff" stroke-width="2" opacity=".35" fill="none" stroke-linecap="round"/><rect x="48" y="26" width="14" height="7" rx="3" fill="#f7efe2" stroke="' + INK + '" stroke-width="1.8"/><circle cx="64" cy="26" r="4.500" fill="#f7efe2" stroke="' + INK + '" stroke-width="1.8"/><circle cx="64" cy="34" r="4.500" fill="#f7efe2" stroke="' + INK + '" stroke-width="1.8"/>';
  const patty = f => '<ellipse cx="34" cy="31" rx="27" ry="11" fill="' + f + '" stroke="' + INK + '" stroke-width="2"/><ellipse cx="34" cy="27" rx="22" ry="5" fill="#fff" opacity=".15"/><g fill="' + INK + '" opacity=".35"><circle cx="24" cy="31" r="1.400"/><circle cx="38" cy="34" r="1.400"/><circle cx="46" cy="29" r="1.400"/><circle cx="30" cy="27" r="1.200"/></g>';
  const bunHD = () => '<path d="M4 30c0-6 6-10 14-10h32c8 0 14 4 14 10s-6 10-14 10H18C10 40 4 36 4 30z" fill="#e8b062" stroke="' + INK + '" stroke-width="2"/><path d="M12 26c10-3 34-3 44 0" stroke="#fff" stroke-width="2" opacity=".4" fill="none" stroke-linecap="round"/>';
  const bunHB = () => '<path d="M8 34c0-14 12-22 26-22s26 8 26 22z" fill="#e8a955" stroke="' + INK + '" stroke-width="2"/><g fill="#fff6dc"><ellipse cx="24" cy="22" rx="2" ry="1.200"/><ellipse cx="34" cy="18" rx="2" ry="1.200"/><ellipse cx="44" cy="23" rx="2" ry="1.200"/><ellipse cx="30" cy="27" rx="2" ry="1.200"/></g><rect x="8" y="36" width="52" height="8" rx="3" fill="#d8954a" stroke="' + INK + '" stroke-width="2"/>';
  const lettuce = () => '<path d="M6 32c4-8 8-2 12-8s8 2 12-5 8 3 12-4 8 4 12-2 8 6 6 12c-2 6-50 6-54 7z" fill="#6cc04a" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/><path d="M14 33c8-4 16-2 22-6M34 32c6-3 12-2 18-6" stroke="#b9ea8e" stroke-width="2" fill="none" stroke-linecap="round"/>';
  const rice = () => '<path d="M10 40c0-14 11-22 24-22s24 8 24 22z" fill="#fbfaf3" stroke="' + INK + '" stroke-width="2"/><g fill="#e6e1cf"><ellipse cx="24" cy="30" rx="2.200" ry="1.200"/><ellipse cx="34" cy="25" rx="2.200" ry="1.200"/><ellipse cx="43" cy="31" rx="2.200" ry="1.200"/><ellipse cx="30" cy="35" rx="2.200" ry="1.200"/><ellipse cx="40" cy="37" rx="2.200" ry="1.200"/></g>';
  const salad = () => lettuce() + '<circle cx="26" cy="27" r="7" fill="#e5383b" stroke="' + INK + '" stroke-width="1.800"/><circle cx="26" cy="27" r="3.500" fill="#ff8a7a"/><circle cx="42" cy="26" r="7" fill="#e5383b" stroke="' + INK + '" stroke-width="1.800"/><circle cx="42" cy="26" r="3.500" fill="#ff8a7a"/><path d="M30 34h10" stroke="#f3f0e6" stroke-width="4" stroke-linecap="round"/>';
  const DRINK = { inca: { body: '#ffd21f', cap: '#2f6fe4', band: '#2f6fe4', name: 'Kola Dorada' }, coca: { body: '#3a120f', cap: '#e5383b', band: '#e5383b', name: 'Kola Negra' } };
  const bottle = k => { const d = DRINK[k]; return '<path d="M30 6h8v8c0 4 6 6 6 14v24c0 3-2 5-5 5H29c-3 0-5-2-5-5V28c0-8 6-10 6-14z" fill="' + d.body + '" stroke="' + INK + '" stroke-width="2"/><rect x="29" y="2" width="10" height="6" rx="2" fill="' + d.cap + '" stroke="' + INK + '" stroke-width="1.8"/><rect x="24" y="34" width="20" height="10" fill="' + d.band + '"/><path d="M28 18c-2 4-2 14-2 30" stroke="#fff" stroke-width="2.4" opacity=".45" fill="none" stroke-linecap="round"/>'; };
  const SAUCE = { mayo: { c: '#fff4c9', name: 'Mayonesa' }, ketchup: { c: '#e5383b', name: 'Kétchup' }, mostaza: { c: '#ffd21f', name: 'Mostaza' }, aji: { c: '#7cc242', name: 'Ají' } };
  const squeeze = k => '<path d="M26 18h16l3 6v30c0 3-2 5-5 5H28c-3 0-5-2-5-5V24z" fill="' + SAUCE[k].c + '" stroke="' + INK + '" stroke-width="2"/><path d="M31 18l3-12 3 12z" fill="#fff" stroke="' + INK + '" stroke-width="1.800"/><rect x="25" y="32" width="18" height="12" rx="2" fill="#fff" opacity=".7"/><path d="M29 24c-1 6-1 20-1 26" stroke="#fff" stroke-width="2" opacity=".5" fill="none" stroke-linecap="round"/>';
  const ITEM = {
    papas: c => fries(c || COOK.papas[1]), salchicha: (c, p) => sausage(c || COOK.salchicha[1], p === undefined ? true : p >= 1),
    pollo: c => drum(c || COOK.pollo[1]), carne: c => patty(c || COOK.carne[1]), pan_hd: bunHD, pan_hb: bunHB, lechuga: lettuce, arroz: rice, ensalada: salad,
  };
  const svg = (inner, vb, cls) => '<svg viewBox="' + (vb || '0 0 68 60') + '"' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true">' + inner + '</svg>';
  const zig = (c, y, w) => { let d = 'M' + (55 - w) + ' ' + y; for (let x = 55 - w + 8; x <= 55 + w; x += 8) d += ' L' + x + ' ' + (y + ((x / 8) % 2 ? -4 : 4)); return '<path d="' + d + '" stroke="' + INK + '" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" stroke="' + c + '" stroke-width="3.400" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; };

  // ---------------------------------------------------------------- plato armado (las piezas se apilan como el plato real)
  // items: { papas: {c}, salchicha: {c}, ... }  sauces: Set / array
  function plate(items, sauces, empty) {
    const has = k => !!items[k], c = k => (items[k] && items[k].c) || (COOK[k] ? COOK[k][1] : null);   // sin color guardado: en su punto
    let s = '<ellipse cx="55" cy="58" rx="50" ry="17" fill="#000" opacity=".18"/><ellipse cx="55" cy="54" rx="50" ry="17" fill="#fbf7ef" stroke="' + INK + '" stroke-width="2"/><ellipse cx="55" cy="54" rx="36" ry="11" fill="none" stroke="#e7dfcf" stroke-width="2"/>';
    if (empty) return svg(s, '0 0 110 80');
    const at = (x, y, sc, inner) => '<g transform="translate(' + x + ' ' + y + ') scale(' + (sc || 1) + ')">' + inner + '</g>';
    if (has('arroz')) s += at(58, 22, 0.75, rice());
    if (has('ensalada')) s += at(4, 26, 0.7, salad());
    if (has('papas')) s += at(has('pollo') ? 46 : 22, has('pollo') ? 10 : 6, 0.9, '<path d="M6 46h52l-6 12H12z" fill="#e5383b" stroke="' + INK + '" stroke-width="2"/>' + fries(c('papas')));
    if (has('pan_hd')) s += at(21, 20, 1.02, bunHD());
    if (has('salchicha') && !has('pan_hd') && has('papas')) { s += at(26, 18, 0.55, sausage(c('salchicha'), true)) + at(46, 24, 0.55, sausage(c('salchicha'), true)); }
    else if (has('salchicha')) s += at(22, has('pan_hd') ? 9 : 18, 1, sausage(c('salchicha'), items.salchicha.q !== 'raw'));
    if (has('pan_hb')) s += at(21, 36, 1, '<rect x="8" y="2" width="52" height="9" rx="4" fill="#d8954a" stroke="' + INK + '" stroke-width="2"/>');
    if (has('carne')) s += at(21, has('pan_hb') ? 13 : 20, 1, patty(c('carne')));
    if (has('lechuga')) s += at(21, has('carne') ? 4 : 18, 1, lettuce());
    if (has('pan_hb')) s += at(21, has('carne') || has('lechuga') ? -7 : 8, 1, '<path d="M8 34c0-14 12-22 26-22s26 8 26 22z" fill="#e8a955" stroke="' + INK + '" stroke-width="2"/><g fill="#fff6dc"><ellipse cx="24" cy="22" rx="2" ry="1.200"/><ellipse cx="34" cy="18" rx="2" ry="1.200"/><ellipse cx="44" cy="23" rx="2" ry="1.200"/></g>');
    if (has('pollo')) s += at(6, 18, 0.95, drum(c('pollo')));
    const list = Array.from(sauces || []);
    const yTop = has('pan_hb') ? 30 : has('pan_hd') ? 30 : 36;
    list.forEach((k, i) => { s += zig(SAUCE[k].c, yTop + i * 4 - (has('pan_hb') ? 0 : 2), has('pan_hd') ? 26 : 18); });
    return svg(s, '0 0 110 80');
  }

  // ---------------------------------------------------------------- clientes (diseño propio, varios estilos)
  const SKIN = ['#f2c79a', '#e0aa7e', '#c58d5f', '#8d5a3b'], HAIR = ['#2b1a0e', '#5a3510', '#d9a865', '#1b1b1b', '#a0522d', '#7b3fe4'];
  const SHIRT = ['#2f6fe4', '#e5383b', '#22a35a', '#ff7a1a', '#7b3fe4', '#1fb5a3', '#ffc629', '#3b4466'];
  function person(seed, mood) {
    const r = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
    const skin = SKIN[r(4)], hair = HAIR[r(6)], shirt = SHIRT[r(8)], style = r(5), glasses = r(4) === 0, cap = r(5) === 0;
    let s = '<path d="M14 150c0-34 18-52 46-52s46 18 46 52z" fill="' + shirt + '" stroke="' + INK + '" stroke-width="2.500"/><path d="M48 100l12 14 12-14" fill="#fff" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="50" y="78" width="20" height="22" rx="6" fill="' + skin + '" stroke="' + INK + '" stroke-width="2"/>';
    if (style === 2) s += '<path d="M28 60c0-24 14-38 32-38s32 14 32 38v34H28z" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.500"/>';
    s += '<ellipse cx="60" cy="58" rx="27" ry="30" fill="' + skin + '" stroke="' + INK + '" stroke-width="2.500"/>';
    if (style === 0) s += '<path d="M33 50c0-18 12-26 27-26s27 8 27 26c-6-8-16-12-27-12s-21 4-27 12z" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.500"/>';
    if (style === 1) s += '<path d="M33 48c2-20 16-26 30-24 14 2 24 12 24 26l-8-6-6 4-8-6-8 6-8-4-8 6z" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.500"/>';
    if (style === 2) s += '<path d="M33 52c2-18 14-26 27-26s25 8 27 26c-10-10-44-10-54 0z" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.500"/>';
    if (style === 3) s += '<circle cx="60" cy="24" r="12" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.500"/><path d="M33 50c0-18 12-26 27-26s27 8 27 26c-8-6-18-9-27-9s-19 3-27 9z" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.500"/>';
    if (style === 4) s += '<path d="M35 44c4-14 14-18 25-18s21 4 25 18" fill="none" stroke="' + hair + '" stroke-width="7" stroke-linecap="round"/>';
    if (cap) s += '<path d="M32 46c0-16 12-24 28-24s28 8 28 24z" fill="' + SHIRT[(r(8) + 3) % 8] + '" stroke="' + INK + '" stroke-width="2.500"/><path d="M80 44h18c2 0 2 4 0 4H80z" fill="' + SHIRT[(r(8) + 3) % 8] + '" stroke="' + INK + '" stroke-width="2"/>';
    s += '<circle cx="33" cy="62" r="5" fill="' + skin + '" stroke="' + INK + '" stroke-width="2"/><circle cx="87" cy="62" r="5" fill="' + skin + '" stroke="' + INK + '" stroke-width="2"/>';
    const ey = 60;
    if (mood === 'angry') s += '<path d="M42 50l12 5M78 50l-12 5" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><circle cx="49" cy="' + ey + '" r="3.200" fill="' + INK + '"/><circle cx="71" cy="' + ey + '" r="3.200" fill="' + INK + '"/><path d="M50 78c6-6 14-6 20 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
    else if (mood === 'happy') s += '<path d="M44 60c3-5 8-5 11 0M65 60c3-5 8-5 11 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M47 72c6 9 20 9 26 0z" fill="#fff" stroke="' + INK + '" stroke-width="2.500" stroke-linejoin="round"/><ellipse cx="42" cy="70" rx="5" ry="3" fill="#ff8a8a" opacity=".55"/><ellipse cx="78" cy="70" rx="5" ry="3" fill="#ff8a8a" opacity=".55"/>';
    else if (mood === 'wait') s += '<circle cx="49" cy="' + ey + '" r="3.200" fill="' + INK + '"/><circle cx="71" cy="' + ey + '" r="3.200" fill="' + INK + '"/><path d="M52 76h16" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M42 52l10-2M78 52l-10-2" stroke="' + INK + '" stroke-width="2.500" stroke-linecap="round"/>';
    else s += '<circle cx="49" cy="' + ey + '" r="3.200" fill="' + INK + '"/><circle cx="71" cy="' + ey + '" r="3.200" fill="' + INK + '"/><path d="M50 73c6 5 14 5 20 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
    if (glasses) s += '<circle cx="49" cy="60" r="8" fill="none" stroke="' + INK + '" stroke-width="2.500"/><circle cx="71" cy="60" r="8" fill="none" stroke="' + INK + '" stroke-width="2.500"/><path d="M57 60h6" stroke="' + INK + '" stroke-width="2.500"/>';
    return svg(s, '0 0 120 150');
  }

  // ---------------------------------------------------------------- escenario: calle de noche y la carretilla
  function street() {
    let s = '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16123a"/><stop offset="1" stop-color="#4a2a5c"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd48a" stop-opacity=".8"/><stop offset="1" stop-color="#ffd48a" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="390" height="300" fill="url(#sky)"/>';
    const B = [[0, 70, 70], [62, 40, 58], [116, 90, 74], [184, 52, 56], [236, 78, 70], [300, 34, 50], [344, 66, 60]];
    B.forEach(([x, y, w], i) => { s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (300 - y) + '" fill="' + ['#241c4a', '#2c2256', '#211a44'][i % 3] + '"/>'; for (let wy = y + 12; wy < 230; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 16) if ((wx * 7 + wy * 3 + i) % 5 > 1) s += '<rect x="' + wx + '" y="' + wy + '" width="8" height="11" rx="1.500" fill="' + ((wx + wy) % 3 ? '#ffd27a' : '#ffb35c') + '" opacity="' + (0.55 + ((wx + wy) % 4) * 0.1) + '"/>'; });
    s += '<path d="M0 118 Q97 146 195 118 T390 118" fill="none" stroke="#1b1630" stroke-width="2"/>';
    for (let i = 0; i < 13; i++) { const x = 12 + i * 31, y = 118 + Math.sin(i / 12 * Math.PI * 2) * -4 + (i % 2 ? 8 : 12); s += '<circle cx="' + x + '" cy="' + y + '" r="14" fill="url(#glow)"/><circle cx="' + x + '" cy="' + y + '" r="4" fill="' + ['#ffd23f', '#ff7a1a', '#ff5a8a', '#7fe7a8'][i % 4] + '"/>'; }
    s += '<rect y="236" width="390" height="64" fill="#2a2433"/><path d="M0 244h390" stroke="#3b3346" stroke-width="3"/>';
    return '<svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + s + '</svg>';
  }
  function umbrella() {
    let s = ''; const n = 10, w = 390 / n;
    for (let i = 0; i < n; i++) s += '<path d="M' + i * w + ' 0h' + w + 'v40q-' + w / 2 + ' 18 -' + w + ' 0z" fill="' + (i % 2 ? '#ffc629' : '#e5383b') + '" stroke="#7a1b14" stroke-width="2"/>';
    return '<svg viewBox="0 0 390 60" preserveAspectRatio="none" aria-hidden="true">' + s + '<path d="M0 2h390" stroke="#7a1b14" stroke-width="4"/></svg>';
  }

  window.CART_ART = { INK, mix, COOK, cookColor, ITEM, DRINK, SAUCE, svg, bottle, squeeze, plate, person, street, umbrella };
})();
