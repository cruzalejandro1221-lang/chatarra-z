// Siete Vidas: mesa en 3D (Three.js). La cámara sigue a cada jugador; los gatos agarran la pistola, abren la caja y sus objetos quedan a la vista.
// Solo dibuja: reglas y botones están en core.js y game.js.
import * as THREE from '../../vendor/three-0.160.0.module.min.js';
const canvas = document.querySelector('#c3d');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
if (renderer) {
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07040e); scene.fog = new THREE.Fog(0x07040e, 11, 26);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o));
  const mesh = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; (p || scene).add(o); return o; };
  const flat = o => { o.castShadow = false; return o; };

  // sala, lámpara y mesa de madera vieja
  scene.add(new THREE.AmbientLight(0x3a2c5c, 1));
  const floor = flat(mesh(new THREE.CircleGeometry(16, 40), mat(0x1c1120), 0, -1.6, 0)); floor.rotation.x = -Math.PI / 2;
  flat(mesh(new THREE.CylinderGeometry(13, 13, 11, 32, 1, true), mat(0x170e22, { side: THREE.BackSide }), 0, 3.4, 0));
  const lamp = new THREE.SpotLight(0xffd9a0, 165, 16, 0.8, 0.5, 1.5); lamp.position.set(0, 6.4, 0); lamp.target.position.set(0, 0, 0); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0015; scene.add(lamp, lamp.target);
  flat(mesh(new THREE.ConeGeometry(1.15, 0.7, 28, 1, true), mat(0x7a3a1c, { side: THREE.DoubleSide }), 0, 6.5, 0));
  const blue = new THREE.PointLight(0x35a8ff, 0, 15, 1.6); blue.position.set(0, 2.4, 0.6); scene.add(blue);
  const table = new THREE.Group(); table.scale.set(1.14, 1, 1); scene.add(table);
  mesh(new THREE.CylinderGeometry(3.5, 3.3, 0.3, 56), mat(0x3f2416, { roughness: 0.55 }), 0, -0.15, 0, table);
  for (let i = -3; i <= 3; i++) flat(mesh(new THREE.BoxGeometry(0.02, 0.005, 6.6 - Math.abs(i) * 0.5), mat(0x241208), i * 0.92, 0.002, 0, table));
  mesh(new THREE.CylinderGeometry(0.5, 0.85, 1.5, 16), mat(0x2b1812), 0, -1, 0);

  const FUR = [[0xf3e6d2, 0x5a4032], [0x8d93a3, 0x4d5263], [0xff9f43, 0xc96a12], [0x3a3a46, 0x1c1c24]];
  function makeCat(i) {
    const [a, b] = FUR[i % 4], fur = mat(a), dark = mat(b), g = new THREE.Group();
    mesh(new THREE.SphereGeometry(0.62, 20, 16), fur, 0, 0.1, 0, g).scale.set(1, 1.15, 0.85);
    const head = new THREE.Group(); head.position.set(0, 1.02, 0.1); g.add(head);
    mesh(new THREE.SphereGeometry(0.5, 22, 18), fur, 0, 0, 0, head).scale.set(1.06, 0.94, 0.96);
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.19, 0.42, 4), dark, s * 0.33, 0.48, 0, head); ear.rotation.z = -s * 0.28;
      flat(mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffe27d, emissive: 0xffc629, emissiveIntensity: 1.1 }), s * 0.2, 0.05, 0.42, head));
      const pu = flat(mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0x0b0710 }), s * 0.2, 0.05, 0.515, head)); pu.scale.set(0.6, 1.5, 0.5);
      mesh(new THREE.SphereGeometry(0.13, 12, 10), dark, s * 0.32, -0.32, 0.72, g).scale.set(1, 0.6, 1.2);
    }
    mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xe5788f), 0, -0.1, 0.48, head);
    const tail = mesh(new THREE.CapsuleGeometry(0.08, 0.9, 4, 8), dark, 0.62, 0.4, -0.25, g); tail.rotation.z = -0.5;
    const arm = mesh(new THREE.CapsuleGeometry(0.1, 0.72, 4, 8), fur, 0.42, 0.62, 0.58, g); arm.rotation.x = Math.PI / 2 - 0.15; arm.visible = false;
    const ring = flat(mesh(new THREE.TorusGeometry(0.82, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffc629 }), 0, -0.3, 0, g)); ring.rotation.x = Math.PI / 2; ring.visible = false;
    g.userData = { head, tail, ring, arm, phase: i * 1.7, wet: 0 };
    return g;
  }
  const cats = []; let V = null, wide = true;

  // pistola de agua: la boca apunta a +x dentro del grupo
  const gun = new THREE.Group(); gun.position.set(0, 0.42, 0.15); scene.add(gun);
  const orange = mat(0xff7a1a, { roughness: 0.35 }), blueP = mat(0x2f8fe4, { roughness: 0.3 }), yellow = mat(0xffc629, { roughness: 0.35 });
  mesh(new THREE.BoxGeometry(1.15, 0.26, 0.24), orange, 0.05, 0, 0, gun);
  mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.72, 16), yellow, 0.92, 0.04, 0, gun).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.09, 16), blueP, 1.28, 0.04, 0, gun).rotation.z = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.26, 0.56, 0.21), blueP, -0.32, -0.32, 0, gun).rotation.z = 0.24;
  mesh(new THREE.SphereGeometry(0.29, 20, 16), new THREE.MeshPhysicalMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.62, roughness: 0.12 }), -0.08, 0.32, 0, gun).scale.set(1.35, 0.9, 0.85);
  const trigger = mesh(new THREE.BoxGeometry(0.05, 0.16, 0.08), yellow, 0.02, -0.2, 0, gun);
  // cargas
  const shells = new THREE.Group(); scene.add(shells);
  const capG = new THREE.CapsuleGeometry(0.09, 0.22, 6, 12), capM = mat(0xd9dde6, { roughness: 0.3 }), glowM = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9 });
  // objetos sobre la mesa, a la vista de todos
  const items = new THREE.Group(); scene.add(items);
  const mats = new THREE.Group(); scene.add(mats);
  const texCache = {};
  function tex(icon) { if (texCache[icon]) return texCache[icon]; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '96px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(icon, 64, 72); return (texCache[icon] = new THREE.CanvasTexture(c)); }
  const sprite = (icon, s) => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(icon), transparent: true, depthWrite: false })); o.scale.setScalar(s); return o; };
  // caja sorpresa
  const box = new THREE.Group(); scene.add(box); box.visible = false;
  const purple = mat(0x7b3fe4, { roughness: 0.45 }), ribbon = mat(0xffc629, { roughness: 0.4 });
  mesh(new THREE.BoxGeometry(0.72, 0.5, 0.72), purple, 0, 0.25, 0, box); mesh(new THREE.BoxGeometry(0.16, 0.51, 0.73), ribbon, 0, 0.25, 0, box);
  const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.36); box.add(lid);
  mesh(new THREE.BoxGeometry(0.8, 0.14, 0.8), purple, 0, 0.07, 0.36, lid); mesh(new THREE.BoxGeometry(0.18, 0.15, 0.81), ribbon, 0, 0.07, 0.36, lid);
  // agua
  const NP = 170, pos = new Float32Array(NP * 3), drops = Array.from({ length: NP }, () => ({ v: new THREE.Vector3(), life: 0 }));
  const water = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ size: 0.2, color: 0xa8e4ff, transparent: true, opacity: 0.92 }));
  water.frustumCulled = false; scene.add(water); for (let i = 0; i < NP; i++) pos[i * 3 + 1] = -99;
  let di = 0; const drop = (p, v) => { const d = drops[di = (di + 1) % NP], k = di * 3; pos[k] = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z; d.v.copy(v); d.life = 1.3; };

  let seats = [], hidden = {};
  const C = () => window.SIETE;
  const seatXZ = (p, w) => (p === 'top' ? [0, -3.7] : p === 'left' ? [-w, -1.5] : p === 'right' ? [w, -1.5] : [0, 4.2]);
  const toC = i => { const s = seats[i], L = Math.hypot(s.x, s.z) || 1; return { x: -s.x / L, z: -s.z / L }; };
  function slot(i, k) { const s = seats[i], d = toC(i), r = 1.55; return new THREE.Vector3(s.x + d.x * r - d.z * (k - 1) * 0.74, 0.3, s.z + d.z * r + d.x * (k - 1) * 0.74); }
  function drawItems() {
    items.clear(); if (!V) return;
    V.players.forEach((p, i) => { if (p.out) return; const n = p.tools.length - (hidden[i] || 0); for (let k = 0; k < n; k++) { const s = sprite(C().TOOLS[p.tools[k]].icon, 0.62); s.position.copy(slot(i, k)); items.add(s); } });
  }
  function drawMats() {
    mats.clear();
    seats.forEach((s, i) => { for (let k = 0; k < 3; k++) { const p = slot(i, k); flat(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.012, 24), mat(0x5c1626, { roughness: 0.9 }), p.x, 0.012, p.z, mats)); } });
  }

  const defaults = () => ({ pos: new THREE.Vector3(0, wide ? 4.7 : 6.2, wide ? 7 : 7.5), look: new THREE.Vector3(0, 0.4, wide ? -0.6 : -0.45) });
  function fit() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; wide = w > h; camera.fov = wide ? 44 : 66; camera.updateProjectionMatrix(); }
  addEventListener('resize', fit); fit();
  const camPos = defaults().pos, camLook = defaults().look; camera.position.copy(camPos); camera.lookAt(camLook);
  function camOn(i) {
    if (i === null || !V || i === V.me) return defaults();
    const c = seats[i], d = toC(i), far = wide ? 3.3 : 4.2;
    return { pos: new THREE.Vector3(c.x + d.x * far, 2.35, c.z + d.z * far), look: new THREE.Vector3(c.x, 1.05, c.z) };
  }
  const headOf = i => (i === V.me ? new THREE.Vector3(0, 2.1, 5.6) : new THREE.Vector3(seats[i].x, 1.45, seats[i].z));
  const hold = i => { if (i === V.me) return new THREE.Vector3(0.1, 2.5, 3.4); const c = seats[i], d = toC(i); return new THREE.Vector3(c.x + d.x * 1.15, 1.25, c.z + d.z * 1.15); };

  let anim = null, holder = null, aim = new THREE.Vector3(0, 1, 5), shake = 0, flash = 0;
  function update(v, posOf, hide) {
    V = v; canvas.hidden = false; hidden = hide || hidden;
    while (cats.length < v.players.length) { const c = makeCat(cats.length); scene.add(c); cats.push(c); }
    seats = v.players.map((p, i) => { const [x, z] = seatXZ(posOf(i), wide ? 3.7 : 2.25); return { x, z }; });
    cats.forEach((c, i) => {
      const p = v.players[i]; if (!p || i === v.me) { c.visible = false; return; }
      c.visible = true; c.position.set(seats[i].x, 0.42, seats[i].z); c.lookAt(0, 0.42, 0.2);
      c.userData.ring.visible = i === v.turn && !p.out; c.userData.out = p.out; c.rotation.z = p.out ? 1.2 : 0; if (p.out) c.position.y = 0.05;
    });
    shells.clear();
    const n = v.left, span = Math.min(2.2, n * 0.32);
    for (let i = 0; i < n; i++) {
      const x = n > 1 ? -span / 2 + span * i / (n - 1) : 0, s = v.seen.find(q => q.i === i), c = mesh(capG, s ? glowM(s.bad ? 0x2f9dff : 0x8f96a8) : capM, x, 0.11, 0.95, shells); c.rotation.x = Math.PI / 2;
      if (i === 0) { const r = flat(mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffc629 }), x, 0.04, 0.95, shells)); r.rotation.x = Math.PI / 2; }
    }
    drawMats(); drawItems();
  }
  // Disparo: agarra la pistola, apunta, aprieta. Con agua moja al elegido; vacía, le revienta al que disparó.
  function shot(L) { anim = { k: 'shot', t: 0, L, fired: false }; holder = L.who; aim = headOf(L.to).clone(); }
  function boxFor(i, icon) {
    const d = toC(i), s = seats[i]; box.position.set(s.x + d.x * 1.5, 0.02, s.z + d.z * 1.5); box.rotation.y = Math.atan2(d.x, d.z); box.visible = true; lid.rotation.x = 0;
    const it = sprite(icon, 0.3); it.position.copy(box.position); it.position.y = 0.4; it.visible = false; scene.add(it);
    anim = { k: 'box', t: 0, i, it, from: it.position.clone(), to: slot(i, Math.max(0, V.players[i].tools.length - (hidden[i] || 0))) };
  }
  function zoom(i, icon) { const it = sprite(icon, 0.62); it.position.copy(slot(i, 0)); it.position.y = 0.9; scene.add(it); anim = { k: 'zoom', t: 0, i, it }; }
  function hide() { canvas.hidden = true; V = null; anim = null; holder = null; }
  function wetScreen() { document.body.classList.add('wet'); setTimeout(() => document.body.classList.remove('wet'), 1300); }

  const v3 = new THREE.Vector3(), muzzle = new THREE.Vector3(), dir = new THREE.Vector3(), rest = new THREE.Vector3(0, 0.42, 0.15);
  let yaw = 0, pitch = 0, last = 0;
  const frame = now => { requestAnimationFrame(frame); tick(now); };
  function tick(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0)), t = now / 1000; last = now;
    if (!V) return;
    lamp.intensity = 165 + Math.sin(t * 7) * 5;
    let focus = V.turn, close = null;
    if (anim) {
      anim.t += dt; const k = anim.t;
      if (anim.k === 'shot') {
        const L = anim.L; focus = k > 2.25 && L.bad ? L.to : L.who;
        trigger.position.x = k > 2.1 && k < 2.22 ? -0.04 : 0.02;
        if (!anim.fired && k > 2.2) { anim.fired = true; if (L.bad) { shake = 0.3; flash = 1; const c = cats[L.hit]; if (c && L.hit !== V.me) c.userData.wet = 1.4; if (L.hit === V.me) wetScreen(); } }
        if (L.bad && k > 2.2 && k < 3.1) { muzzle.set(1.32, 0.04, 0); gun.localToWorld(muzzle); dir.copy(aim).sub(muzzle).normalize(); for (let i = 0; i < 4; i++) { const v = dir.clone().multiplyScalar(10 + Math.random() * 2); v.x += (Math.random() - 0.5) * 0.9; v.y += (Math.random() - 0.5) * 0.9 + 1; v.z += (Math.random() - 0.5) * 0.9; drop(muzzle, v); } }
        if (!L.bad && k > 2.6 && k < 3.2) {                                     // contragolpe: el tanque revienta sobre quien disparó
          if (!anim.back) { anim.back = true; shake = 0.34; flash = 1; const c = cats[L.hit]; if (c && L.hit !== V.me) c.userData.wet = 1.4; if (L.hit === V.me) wetScreen(); }
          muzzle.set(-0.08, 0.34, 0); gun.localToWorld(muzzle); for (let i = 0; i < 5; i++) drop(muzzle, new THREE.Vector3((Math.random() - 0.5) * 7, 3 + Math.random() * 4, (Math.random() - 0.5) * 7));
        }
        if (k > 3.7) holder = null;
        if (k > 4.2) anim = null;
      } else if (anim.k === 'box') {
        focus = anim.i;
        if (k < 0.8) box.rotation.z = Math.sin(k * 40) * 0.05 * (k / 0.8); else { box.rotation.z = 0; lid.rotation.x = -Math.min(1.9, (k - 0.8) * 7); anim.it.visible = true; }
        if (k > 0.85 && k < 1.5) { const u = Math.min(1, (k - 0.85) / 0.4); anim.it.scale.setScalar(0.3 + u * 0.95); anim.it.position.y = 0.4 + u * 1.15; }
        if (k > 1.6) { const u = Math.min(1, (k - 1.6) / 0.45); anim.it.position.lerpVectors(new THREE.Vector3(anim.from.x, 1.55, anim.from.z), anim.to, u); anim.it.scale.setScalar(1.25 - u * 0.63); }
        if (k > 2.1) { scene.remove(anim.it); box.visible = false; if (hidden[anim.i]) hidden[anim.i]--; drawItems(); anim = null; }
      } else if (anim.k === 'zoom') {
        focus = anim.i; anim.it.scale.setScalar(0.62 + Math.min(1, k * 2.4) * 0.8); anim.it.position.y = 0.9 + Math.sin(k * 3) * 0.05;
        close = anim.it.position; if (k > 2.3) { scene.remove(anim.it); anim = null; }
      }
    }
    // pistola: al centro o en manos de quien juega
    gun.position.lerp(holder === null ? rest : hold(holder), Math.min(1, dt * 4));
    const a = holder === null ? headOf(V.turn) : aim, dx = a.x - gun.position.x, dz = a.z - gun.position.z, dy = a.y - gun.position.y;
    const wy = Math.atan2(-dz, dx), wp = Math.atan2(dy, Math.hypot(dx, dz)); let dyaw = wy - yaw; while (dyaw > Math.PI) dyaw -= Math.PI * 2; while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    yaw += dyaw * Math.min(1, dt * 4); pitch += (wp - pitch) * Math.min(1, dt * 4); gun.rotation.set(0, yaw, pitch, 'YXZ');
    cats.forEach((c, i) => {
      if (!c.visible) return; const u = c.userData; u.arm.visible = holder === i; if (u.out) return;
      const b = Math.sin(t * 1.4 + u.phase); u.head.rotation.y = Math.sin(t * 0.6 + u.phase) * 0.28; u.head.position.y = 1.02 + b * 0.012; u.tail.rotation.z = -0.5 + Math.sin(t * 1.1 + u.phase) * 0.24;
      if (u.wet > 0) { u.wet -= dt; c.position.x = seats[i].x + Math.sin(t * 60) * 0.03; }
    });
    for (let i = 0; i < NP; i++) { const d = drops[i]; if (d.life <= 0) continue; d.life -= dt; const k = i * 3; d.v.y -= 11 * dt; pos[k] += d.v.x * dt; pos[k + 1] += d.v.y * dt; pos[k + 2] += d.v.z * dt; if (d.life <= 0 || pos[k + 1] < 0.05) { d.life = 0; pos[k + 1] = -99; } }
    water.geometry.attributes.position.needsUpdate = true;
    flash = Math.max(0, flash - dt * 1.6); blue.intensity = flash * 70;
    // cámara suave hacia quien tiene el foco
    const c = camOn(focus);
    if (close) { c.look.copy(close); c.pos.set(close.x * 0.75, close.y + 1.8, close.z + (close.z > 0 ? 2.2 : 2.6)); }
    camPos.lerp(c.pos, Math.min(1, dt * 2.6)); camLook.lerp(c.look, Math.min(1, dt * 2.6));
    shake = Math.max(0, shake - dt * 0.8);
    camera.position.copy(camPos); camera.position.x += (Math.random() - 0.5) * shake; camera.lookAt(camLook);
    renderer.render(scene, camera);
    cats.forEach((cat, i) => {
      const el = document.querySelector('.seat[data-p="' + i + '"]'); if (!el || !cat.visible) return;
      v3.set(cat.position.x, cat.position.y + 0.15, cat.position.z).project(camera);
      el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px'; el.style.opacity = Math.abs(v3.x) > 1.05 ? 0 : 1;
    });
  }
  requestAnimationFrame(frame);
  window.Siete3D = { update, shot, box: boxFor, zoom, hide, tick, drops: () => drops.filter(d => d.life > 0).length };
}
