// Giorgio Turbo: dibujo 3D (Three.js), controles y menús. Las reglas y los niveles están en levels.js.
import * as THREE from '../../vendor/three-0.160.0.module.min.js';
const T = window.TURBO, { M, RING, STEP, LEVELS, GAP, BOX, FISH, BOOST } = T;
const RT = 3.4, AHEAD = 42, BEHIND = 3, SAVE = 'gg_turbo', CAT = 0.78;
const $ = s => document.querySelector(s);
const load = () => { try { return Object.assign({ open: 1, stars: {} }, JSON.parse(localStorage.getItem(SAVE))); } catch (e) { return { open: 1, stars: {} }; } };
const store = d => { try { localStorage.setItem(SAVE, JSON.stringify(d)); } catch (e) { /* lleno */ } };
let P = load();

// ------------------------------------------------------------ escena
const renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, 1, 0.1, 140);
scene.fog = new THREE.Fog(0xffffff, 26, 92);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 2.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(2, 3, 6); scene.add(sun);
const SPACE = new THREE.Color(0x000000), tube = new THREE.Group(); scene.add(tube);
// fuera del tubo solo hay espacio: negro con estrellas
const starP = new Float32Array(900 * 3);
for (let i = 0; i < 900; i++) { const a = Math.random() * 6.283, r = 14 + Math.random() * 70; starP[i * 3] = Math.cos(a) * r; starP[i * 3 + 1] = Math.sin(a) * r; starP[i * 3 + 2] = -Math.random() * 130 + 4; }
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starP, 3)), new THREE.PointsMaterial({ size: 0.34, color: 0xffffff, fog: false, sizeAttenuation: true })); scene.add(stars);
const MAXI = (AHEAD + BEHIND + 1) * M;
const tileW = 2 * RT * Math.tan(Math.PI / M) * 0.95;
const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(tileW, 0.26, RING * 0.94), new THREE.MeshLambertMaterial(), MAXI);
const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(tileW * 0.82, 1.15, 1.5), new THREE.MeshLambertMaterial(), MAXI / 3 | 0);
const fishG = new THREE.SphereGeometry(0.3, 12, 8); fishG.scale(1.25, 0.8, 0.5);
const fishes = new THREE.InstancedMesh(fishG, new THREE.MeshLambertMaterial({ color: 0xffc629, emissive: 0x8a5a00 }), MAXI / 6 | 0);
const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(tileW * 0.7, 0.05, 1.5), new THREE.MeshBasicMaterial({ color: 0x35f0ff }), 40);
[tiles, boxes, fishes, pads].forEach(m => { m.frustumCulled = false; tube.add(m); });
const gate = new THREE.Mesh(new THREE.TorusGeometry(RT - 0.2, 0.22, 10, 40), new THREE.MeshBasicMaterial({ color: 0xffc629 })); tube.add(gate);

// Giorgio en 3D, hecho con piezas simples
const cat = new THREE.Group(); scene.add(cat);
const mat = c => new THREE.MeshLambertMaterial({ color: c }), cream = mat(0xf3e6d2), brown = mat(0x5a4032), orange = mat(0xff7a1a), blue = mat(0x4aa0e8), dark = mat(0x15101f);
const part = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); (p || cat).add(o); return o; };
const body = part(new THREE.SphereGeometry(0.36, 16, 12), cream, 0, 0.5, 0.1); body.scale.set(0.95, 0.9, 1.35);
const head = new THREE.Group(); head.position.set(0, 0.86, -0.34); cat.add(head);
part(new THREE.SphereGeometry(0.33, 16, 12), cream, 0, 0, 0, head);
part(new THREE.SphereGeometry(0.17, 12, 10), brown, 0, -0.05, -0.2, head).scale.set(1.1, 0.8, 0.8);
for (const s of [-1, 1]) {
  const ear = part(new THREE.ConeGeometry(0.13, 0.26, 4), brown, s * 0.2, 0.33, 0, head); ear.rotation.z = -s * 0.25;
  part(new THREE.SphereGeometry(0.075, 10, 8), blue, s * 0.14, 0.06, -0.28, head); part(new THREE.SphereGeometry(0.04, 8, 6), dark, s * 0.14, 0.06, -0.345, head);
}
const bow = new THREE.Group(); bow.position.set(0, 0.62, -0.42); cat.add(bow);
for (const s of [-1, 1]) { const w = part(new THREE.ConeGeometry(0.1, 0.18, 4), orange, s * 0.1, 0, 0, bow); w.rotation.z = s * Math.PI / 2; }
const legs = [[-0.2, -0.22], [0.2, -0.22], [-0.2, 0.42], [0.2, 0.42]].map(([x, z]) => { const l = part(new THREE.CapsuleGeometry(0.075, 0.2, 4, 8), brown, x, 0.18, z); return l; });
const tail = part(new THREE.CapsuleGeometry(0.07, 0.5, 4, 8), brown, 0, 0.75, 0.68); tail.rotation.x = 0.7;
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.46, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

// polvo y chispas: un solo grupo de puntos
const NP = 60, pp = new Float32Array(NP * 3), pv = [], pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pp, 3)), new THREE.PointsMaterial({ size: 0.16, color: 0xffffff, transparent: true, opacity: 0.9 }));
pts.frustumCulled = false; scene.add(pts);
for (let i = 0; i < NP; i++) { pv.push({ x: 0, y: 0, z: 0, life: 0 }); pp[i * 3 + 1] = -99; }
let pi = 0;
function burst(n, color, y) {
  pts.material.color.set(color);
  for (let i = 0; i < n; i++) { const p = pv[pi = (pi + 1) % NP], k = pi * 3; pp[k] = (Math.random() - 0.5) * 0.5; pp[k + 1] = y; pp[k + 2] = 0.2; p.x = (Math.random() - 0.5) * 5; p.y = Math.random() * 4; p.z = 3 + Math.random() * 5; p.life = 0.5; }
}

const dummy = new THREE.Object3D(), col = new THREE.Color();
function place(obj, side, k, lift) {
  const a = -Math.PI / 2 - side * STEP, r = RT - lift;
  obj.position.set(Math.cos(a) * r, Math.sin(a) * r, -(k + 0.5) * RING);
  obj.rotation.set(0, 0, a + Math.PI / 2); obj.scale.set(1, 1, 1); obj.updateMatrix();
}
let baseK = -999;
function buildWindow(k0) {
  baseK = k0;
  const L = S.L, B = L.biome; let nt = 0, nb = 0, nf = 0, np = 0;
  const c1 = new THREE.Color(B.tile), c2 = new THREE.Color(B.tile2);
  for (let k = k0 - BEHIND; k <= k0 + AHEAD; k++) {
    const inLevel = k >= 0 && k < L.length, ring = inLevel ? L.rings[k] : null;
    if (k >= L.length + 8) break;
    for (let i = 0; i < M; i++) {
      const t = ring ? ring[i] : 1;
      if (t === GAP) continue;
      place(dummy, i, k, 0); tiles.setMatrixAt(nt, dummy.matrix); tiles.setColorAt(nt, (i + k) % 2 ? c1 : c2); nt++;
      if (t === BOX && nb < boxes.instanceMatrix.count) { place(dummy, i, k, 0.68); boxes.setMatrixAt(nb++, dummy.matrix); }
      else if (t === FISH && !S.got.has(k) && nf < fishes.instanceMatrix.count) { place(dummy, i, k, 0.75); fishes.setMatrixAt(nf++, dummy.matrix); }
      else if (t === BOOST && np < 40) { place(dummy, i, k, 0.16); pads.setMatrixAt(np++, dummy.matrix); }
    }
  }
  tiles.count = nt; boxes.count = nb; fishes.count = nf; pads.count = np;
  tiles.instanceMatrix.needsUpdate = true; if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  boxes.instanceMatrix.needsUpdate = fishes.instanceMatrix.needsUpdate = pads.instanceMatrix.needsUpdate = true;
}
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 78 : 62; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------ partida
let S = null, state = 'menu', wantJump = false, keyL = false, keyR = false, shake = 0, lastT = 0, deadT = 0, spin = 0;
function setBiome(B) {
  scene.background = SPACE; scene.fog.color = SPACE;
  boxes.material.color.set(B.box); $('#hudLvl').textContent = 'Nivel ' + S.L.n;
}
function startLevel(n) {
  S = T.newRun(T.make(n)); baseK = -999; state = 'play'; deadT = 0; shake = 0;
  TurboMusic.start(n); $('#hudMusic').textContent = TurboMusic.on ? '🎵' : '🔇';
  setBiome(S.L.biome); gate.position.set(0, 0, -S.L.length * RING); buildWindow(0);
  cat.rotation.set(0, 0, 0); cat.scale.setScalar(CAT);
  show('hud'); $('#hudFish').textContent = '0/' + S.L.fish; $('#hudBar').style.width = '0';
  $('#tip').hidden = n > 2;
}
function show(id) { for (const k of ['menu', 'hud', 'end']) $('#' + k).hidden = k !== id && !(id === 'end' && k === 'hud'); }
function finish(win) {
  state = 'end';
  const n = S.L.n, st = win ? T.starsFor(S) : 0;
  if (win) { P.stars[n] = Math.max(P.stars[n] || 0, st); P.open = Math.max(P.open, Math.min(LEVELS, n + 1)); store(P); }
  $('#endT').textContent = win ? (n === LEVELS ? '¡Terminaste Giorgio Turbo!' : '¡Nivel ' + n + ' superado!') : S.dead === 'fall' ? '¡Giorgio cayó!' : '¡Choque!';
  $('#endS').innerHTML = win ? [1, 2, 3].map(i => '<i class="' + (i <= st ? 'on' : '') + '">★</i>').join('') : '<small>' + Math.round(Math.min(1, S.dist / (S.L.length * RING)) * 100) + ' % del nivel</small>';
  $('#endF').textContent = '🐟 ' + S.fish + ' de ' + S.L.fish;
  $('#endGo').textContent = win ? (n < LEVELS ? 'Siguiente nivel' : 'Ver niveles') : 'Reintentar';
  $('#endGo').onclick = () => { if (!win) startLevel(n); else if (n < LEVELS) startLevel(n + 1); else menu(); };
  $('#endAgain').hidden = !win; $('#tip').hidden = true; show('end');
}
function menu() {
  state = 'menu'; S = null; show('menu'); TurboMusic.stop();
  const total = Object.values(P.stars).reduce((a, b) => a + b, 0);
  $('#stars').textContent = '★ ' + total + ' / ' + LEVELS * 3;
  $('#grid').innerHTML = Array.from({ length: LEVELS }, (_, i) => {
    const n = i + 1, lock = n > P.open, st = P.stars[n] || 0, B = T.biome(n);
    return '<button data-n="' + n + '"' + (lock ? ' disabled' : '') + ' style="--c:#' + B.tile.toString(16).padStart(6, '0') + '"><b>' + (lock ? '🔒' : n) + '</b><span>' + '★'.repeat(st) + '<u>' + '★'.repeat(3 - st) + '</u></span></button>';
  }).join('');
  scene.background = new THREE.Color(0x1d2a5b);
}
$('#grid').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) startLevel(+b.dataset.n); };
$('#hudBack').onclick = () => menu();
$('#hudMusic').onclick = () => { $('#hudMusic').textContent = TurboMusic.toggle(S && S.L.n) ? '🎵' : '🔇'; };
$('#endMenu').onclick = () => menu();
$('#endAgain').onclick = () => startLevel(S.L.n);
$('#exit').onclick = () => window.parent.postMessage({ gg: 'exit' }, location.origin);

// ------------------------------------------------------------ controles: arrastrar gira, tocar salta
const SENS = 0.0135; let ptr = null;
const stage = $('#c');
stage.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  if (ptr) { wantJump = true; return; }                                    // segundo dedo: salta sin soltar el giro
  ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false, jumped: false };
  $('#tip').hidden = true;
});
stage.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id || state !== 'play') return;
  S.theta -= (e.clientX - ptr.x) * SENS; ptr.x = e.clientX;
  if (Math.abs(e.clientX - ptr.sx) > 8) ptr.moved = true;
  if (!ptr.jumped && ptr.sy - e.clientY > 34) { wantJump = true; ptr.jumped = true; ptr.moved = true; }   // deslizar arriba también salta
});
const up = e => { if (!ptr || e.pointerId !== ptr.id) return; if (!ptr.moved && performance.now() - ptr.t < 260) wantJump = true; ptr = null; };
stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', () => { ptr = null; });
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keyL = true; else if (e.key === 'ArrowRight' || e.key === 'd') keyR = true;
  else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { wantJump = true; e.preventDefault(); }
});
addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'a') keyL = false; else if (e.key === 'ArrowRight' || e.key === 'd') keyR = false; });

// ------------------------------------------------------------ sonido
let ac = null;
const beep = (f, d, type, v) => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) { /* sin audio */ } };
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };

// ------------------------------------------------------------ bucle
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.04, (now - lastT) / 1000 || 0); lastT = now; spin += dt;
  if (S) tick(dt);
  for (let i = 0; i < NP; i++) { const p = pv[i]; if (p.life <= 0) continue; p.life -= dt; const k = i * 3; pp[k] += p.x * dt; pp[k + 1] += p.y * dt; pp[k + 2] += p.z * dt; if (p.life <= 0) pp[k + 1] = -99; }
  pts.geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}
function tick(dt) {
  const floorY = -RT + 0.13;
  if (state === 'play') {
    if (keyL) S.theta += 4.6 * dt; if (keyR) S.theta -= 4.6 * dt;
    let ev = null;
    for (let i = 0; i < 2; i++) { const e = T.step(S, dt / 2, wantJump); wantJump = false; if (e) ev = e; }
    if (ev === 'jump') { beep(520, 0.1); burst(6, 0xffffff, floorY + 0.1); }
    else if (ev === 'land') { burst(5, 0xffffff, floorY + 0.1); cat.scale.set(CAT * 1.14, CAT * 0.84, CAT * 1.14); }
    else if (ev === 'fish') { beep(980, 0.09, 'sine', 0.05); burst(7, 0xffc629, floorY + 0.8); baseK = -999; $('#hudFish').textContent = S.fish + '/' + S.L.fish; }
    else if (ev === 'boost') { beep(300, 0.25, 'sawtooth', 0.04); buzz(15); }
    else if (ev === 'win') { beep(660, 0.15); setTimeout(() => beep(880, 0.25), 130); buzz([20, 40, 20]); finish(true); }
    else if (ev === 'box' || ev === 'fall') { beep(140, 0.3, 'square', 0.07); buzz(60); shake = ev === 'box' ? 0.5 : 0; if (ev === 'box') burst(16, 0xff5a5f, floorY + 0.6); state = 'dying'; deadT = 0; }
    $('#hudBar').style.width = Math.min(100, S.dist / (S.L.length * RING) * 100) + '%';
  } else if (state === 'dying') {
    deadT += dt; if (S.dead === 'fall') { S.h -= 14 * dt; }
    if (deadT > 0.55) finish(false);
  }
  const k = T.ringOf(S); if (k !== baseK) buildWindow(k);
  tube.position.z = S.dist; tube.rotation.z = S.theta; stars.rotation.z = S.theta * 0.25;
  fishes.rotation.z = 0;
  // el gato: siempre abajo; solo cambia la altura, el trote y una leve inclinación al girar
  const run = S.dist * 2.1, inAir = !S.ground;
  cat.position.set(0, floorY + Math.max(S.h, -3) + (inAir ? 0 : Math.abs(Math.sin(run)) * 0.07), 0);
  legs.forEach((l, i) => { l.rotation.x = inAir ? (i < 2 ? -0.9 : 0.9) : Math.sin(run + (i % 3 ? Math.PI : 0)) * 0.95; });
  tail.rotation.z = Math.sin(run * 0.5) * 0.3;
  cat.rotation.x = inAir ? -S.vy * 0.022 : 0;
  cat.scale.lerp(new THREE.Vector3(CAT, CAT, CAT), Math.min(1, dt * 12));
  shadow.position.set(0, floorY + 0.02, 0.1); shadow.visible = T.tile(S, k, T.sideOf(S)) !== GAP; shadow.scale.setScalar(Math.max(0.45, 1 - S.h * 0.22));
  gate.rotation.z = spin;
  const boostFov = S.boost > 0 ? 8 : 0, base = innerWidth < innerHeight ? 78 : 62;
  camera.fov += (base + boostFov - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix();
  shake = Math.max(0, shake - dt * 1.6);
  camera.position.set((Math.random() - 0.5) * shake, -RT + 3 + S.h * 0.3 + (Math.random() - 0.5) * shake, 6.2);
  camera.lookAt(0, -RT + 0.9 + S.h * 0.2, -10);
}
menu(); requestAnimationFrame(frame);
window.TurboDebug = { get S() { return S; }, get state() { return state; }, startLevel, tick, render: () => renderer.render(scene, camera) };
