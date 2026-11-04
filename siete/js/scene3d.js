// Siete Vidas: mesa de juego en 3D (Three.js) con la pistola de agua al centro. Solo dibuja: reglas y botones están en core.js y game.js.
import * as THREE from '../../vendor/three-0.160.0.module.min.js';
const canvas = document.querySelector('#c3d');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
if (renderer) {
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07040e); scene.fog = new THREE.Fog(0x07040e, 10, 24);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o));
  const mesh = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; (p || scene).add(o); return o; };

  // sala y lámpara colgante sobre la mesa
  scene.add(new THREE.AmbientLight(0x3a2c5c, 0.95));
  const floor = mesh(new THREE.CircleGeometry(16, 40), mat(0x1c1120)); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6; floor.castShadow = false;
  const wall = mesh(new THREE.CylinderGeometry(13, 13, 11, 32, 1, true), mat(0x170e22, { side: THREE.BackSide })); wall.position.y = 3.4; wall.castShadow = false;
  const lamp = new THREE.SpotLight(0xffd9a0, 150, 16, 0.78, 0.5, 1.5); lamp.position.set(0, 6.4, 0); lamp.target.position.set(0, 0, 0); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0015; scene.add(lamp, lamp.target);
  const shade = mesh(new THREE.ConeGeometry(1.15, 0.7, 28, 1, true), mat(0x1f6b3d, { side: THREE.DoubleSide }), 0, 6.5, 0); shade.castShadow = false;
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 4, 6), mat(0x222222), 0, 8.8, 0).castShadow = false;
  const blue = new THREE.PointLight(0x35a8ff, 0, 15, 1.6); blue.position.set(0, 2.4, 0.6); scene.add(blue);

  // mesa de póker: paño verde, borde acolchado y fichas (óvalo = cilindro aplastado)
  const table = new THREE.Group(); table.scale.set(1.12, 1, 0.94); scene.add(table);
  mesh(new THREE.CylinderGeometry(3.45, 3.3, 0.28, 56), mat(0x4a2a1c, { roughness: 0.4 }), 0, -0.15, 0, table);
  const rail = mesh(new THREE.TorusGeometry(3.3, 0.2, 14, 64), mat(0x24130f, { roughness: 0.32 }), 0, 0.03, 0, table); rail.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(3.14, 3.14, 0.03, 56), mat(0x146b43, { roughness: 0.92 }), 0, 0.01, 0, table);
  const line = mesh(new THREE.TorusGeometry(2.25, 0.016, 6, 64), new THREE.MeshBasicMaterial({ color: 0xd9c98a }), 0, 0.035, 0, table); line.rotation.x = Math.PI / 2; line.castShadow = false;
  mesh(new THREE.CylinderGeometry(0.5, 0.85, 1.5, 16), mat(0x2b1812), 0, -1, 0);
  const CHIP = [0xe5383b, 0x2f6fe4, 0xf1e6cf, 0x111111], chipG = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 18);
  [[-1.55, 1.25], [1.55, 1.25], [-2.2, -0.35], [2.2, -0.35], [-1.1, -1.75], [1.1, -1.75]].forEach(([x, z], s) => { const n = 3 + s % 4; for (let i = 0; i < n; i++) mesh(chipG, mat(CHIP[(s + (i > 2 ? 1 : 0)) % 4], { roughness: 0.4 }), x + (i % 2) * 0.01, 0.06 + i * 0.052, z); });

  // gatos (diseño propio)
  const FUR = [[0xf3e6d2, 0x5a4032], [0x8d93a3, 0x4d5263], [0xff9f43, 0xc96a12], [0x3a3a46, 0x1c1c24]];
  function makeCat(i) {
    const [a, b] = FUR[i % 4], fur = mat(a), dark = mat(b), g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(0.62, 20, 16), fur, 0, 0.1, 0, g); body.scale.set(1, 1.15, 0.85);
    const head = new THREE.Group(); head.position.set(0, 1.02, 0.1); g.add(head);
    mesh(new THREE.SphereGeometry(0.5, 22, 18), fur, 0, 0, 0, head).scale.set(1.06, 0.94, 0.96);
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.19, 0.42, 4), dark, s * 0.33, 0.48, 0, head); ear.rotation.z = -s * 0.28;
      mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffe27d, emissive: 0xffc629, emissiveIntensity: 1.1 }), s * 0.2, 0.05, 0.42, head).castShadow = false;
      const pu = mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0x0b0710 }), s * 0.2, 0.05, 0.515, head); pu.scale.set(0.6, 1.5, 0.5); pu.castShadow = false;
      mesh(new THREE.SphereGeometry(0.13, 12, 10), dark, s * 0.32, -0.32, 0.72, g).scale.set(1, 0.6, 1.2);
    }
    mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xe5788f), 0, -0.1, 0.48, head);
    const tail = mesh(new THREE.CapsuleGeometry(0.08, 0.9, 4, 8), dark, 0.62, 0.4, -0.25, g); tail.rotation.z = -0.5;
    const ring = mesh(new THREE.TorusGeometry(0.82, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffc629 }), 0, -0.3, 0, g); ring.rotation.x = Math.PI / 2; ring.castShadow = false; ring.visible = false;
    g.userData = { head, tail, ring, phase: i * 1.7, wet: 0 };
    return g;
  }
  const cats = []; let V = null, wide = true;

  // pistola de agua de plástico: apunta con la boca hacia +x dentro del grupo
  const gun = new THREE.Group(); gun.position.set(0, 0.34, 0.15); scene.add(gun);
  const orange = mat(0xff7a1a, { roughness: 0.35 }), blueP = mat(0x2f8fe4, { roughness: 0.3 }), yellow = mat(0xffc629, { roughness: 0.35 });
  mesh(new THREE.BoxGeometry(1.15, 0.26, 0.24), orange, 0.05, 0, 0, gun);
  const barrel = mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.72, 16), yellow, 0.92, 0.04, 0, gun); barrel.rotation.z = Math.PI / 2;
  const tip = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.09, 16), blueP, 1.28, 0.04, 0, gun); tip.rotation.z = Math.PI / 2;
  const grip = mesh(new THREE.BoxGeometry(0.26, 0.56, 0.21), blueP, -0.32, -0.32, 0, gun); grip.rotation.z = 0.24;
  const tank = mesh(new THREE.SphereGeometry(0.29, 20, 16), new THREE.MeshPhysicalMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.62, roughness: 0.12 }), -0.08, 0.32, 0, gun); tank.scale.set(1.35, 0.9, 0.85);
  mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 18, Math.PI), blueP, 0.05, -0.14, 0, gun).rotation.z = Math.PI;
  const trigger = mesh(new THREE.BoxGeometry(0.05, 0.16, 0.08), yellow, 0.02, -0.2, 0, gun);

  // cargas: cápsulas a la vista, sin decir cuál trae agua (salvo las que ya conoces)
  const shells = new THREE.Group(); scene.add(shells);
  const capG = new THREE.CapsuleGeometry(0.1, 0.24, 6, 12), capM = mat(0xd9dde6, { roughness: 0.3 });
  const glowM = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9 });

  // chorro de agua: un grupo de gotas
  const NP = 150, pos = new Float32Array(NP * 3), drops = Array.from({ length: NP }, () => ({ v: new THREE.Vector3(), life: 0 }));
  const water = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ size: 0.22, color: 0xa8e4ff, transparent: true, opacity: 0.92 }));
  water.frustumCulled = false; scene.add(water); for (let i = 0; i < NP; i++) pos[i * 3 + 1] = -99;
  let di = 0;
  function drop(p, v) { const d = drops[di = (di + 1) % NP], k = di * 3; pos[k] = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z; d.v.copy(v); d.life = 1.2; }

  const seatXZ = (pos, w) => (pos === 'top' ? [0, -3.55] : pos === 'left' ? [-w, -1.7] : pos === 'right' ? [w, -1.7] : [0, 4]);
  function fit() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; wide = w > h;
    camera.fov = wide ? 44 : 66; camera.updateProjectionMatrix();
    camera.position.set(0, wide ? 4.5 : 6, wide ? 6.9 : 7.3); camera.lookAt(0, 0.4, wide ? -0.7 : -0.5);
  }
  addEventListener('resize', fit); fit();

  const target = new THREE.Vector3(), tmp = new THREE.Vector3(), myPos = new THREE.Vector3(0, 2.1, 5);
  let yaw = 0, pitch = 0, want = { yaw: 0, pitch: 0 }, anim = null, shake = 0, flash = 0;
  function headOf(i) { if (!V || i === V.me) return tmp.copy(myPos); const c = cats[i]; return tmp.set(c.position.x, c.position.y + 1, c.position.z); }
  function aimAt(p) { const dx = p.x - gun.position.x, dz = p.z - gun.position.z, dy = p.y - gun.position.y; want.yaw = Math.atan2(-dz, dx); want.pitch = Math.atan2(dy, Math.hypot(dx, dz)); }

  function update(v, posOf) {
    V = v; canvas.hidden = false;
    while (cats.length < v.players.length) { const c = makeCat(cats.length); scene.add(c); cats.push(c); }
    const actor = v.phase === 'respond' && v.offer ? v.offer.to : v.turn;
    cats.forEach((c, i) => {
      const p = v.players[i]; if (!p || i === v.me) { c.visible = false; return; }
      const [x, z] = seatXZ(posOf(i), wide ? 3.5 : 2.15); c.visible = true; c.position.set(x, 0.42, z); c.lookAt(0, 0.42, 0.2);
      c.userData.ring.visible = i === actor && !p.out; c.userData.out = p.out; c.rotation.z = p.out ? 1.2 : 0; if (p.out) c.position.y = 0.05;
    });
    shells.clear();
    const n = v.left, span = Math.min(2.5, n * 0.36);
    for (let i = 0; i < n; i++) {
      const x = n > 1 ? -span / 2 + span * i / (n - 1) : 0, s = v.seen.find(q => q.i === i);
      const c = mesh(capG, s ? glowM(s.bad ? 0x2f9dff : 0x8f96a8) : capM, x, 0.13, 1.5, shells); c.rotation.x = Math.PI / 2;
      if (i === 0) { const r = mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffc629 }), x, 0.05, 1.5, shells); r.rotation.x = Math.PI / 2; r.castShadow = false; }
    }
    if (!anim) aimAt(headOf(actor));
  }
  function reveal(bad, who) { anim = { t: 0, bad, who, fired: false }; aimAt(headOf(who)); }
  function hide() { canvas.hidden = true; V = null; anim = null; }

  const v3 = new THREE.Vector3(), muzzle = new THREE.Vector3(), dir = new THREE.Vector3();
  let last = 0;
  const frame = now => { requestAnimationFrame(frame); tick(now); };
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0), t = now / 1000; last = now;
    if (!V) return;
    lamp.intensity = 150 + Math.sin(t * 7) * 5;
    yaw += (want.yaw - yaw) * Math.min(1, dt * 7); pitch += (want.pitch - pitch) * Math.min(1, dt * 7);
    gun.rotation.set(0, yaw, pitch, 'YXZ'); gun.position.y = 0.42 + Math.sin(t * 1.6) * 0.02 + (anim ? 0.5 : 0);
    cats.forEach(c => { if (!c.visible || c.userData.out) return; const u = c.userData, b = Math.sin(t * 1.4 + u.phase); u.head.rotation.y = Math.sin(t * 0.6 + u.phase) * 0.28; u.head.position.y = 1.02 + b * 0.012; u.tail.rotation.z = -0.5 + Math.sin(t * 1.1 + u.phase) * 0.24; if (u.wet > 0) { u.wet -= dt; c.position.x += Math.sin(t * 60) * 0.008; } });
    if (anim) {
      anim.t += dt; const k = anim.t;
      trigger.position.x = k > 0.72 && k < 0.82 ? -0.04 : 0.02;
      if (k > 0.75 && anim.bad && k < 1.55) {
        muzzle.set(1.32, 0.04, 0); gun.localToWorld(muzzle); const aim = headOf(anim.who); dir.copy(aim).sub(muzzle).normalize();
        for (let i = 0; i < 4; i++) { const v = dir.clone().multiplyScalar(10 + Math.random() * 2); v.x += (Math.random() - 0.5) * 0.9; v.y += (Math.random() - 0.5) * 0.9 + 1; v.z += (Math.random() - 0.5) * 0.9; drop(muzzle, v); }
      }
      if (k > 0.75 && !anim.fired) { anim.fired = true; if (anim.bad) { shake = 0.3; flash = 1; if (anim.who !== V.me && cats[anim.who]) cats[anim.who].userData.wet = 1.2; if (anim.who === V.me) document.body.classList.add('wet'), setTimeout(() => document.body.classList.remove('wet'), 1300); } }
      if (k > 2.15) anim = null;
    }
    for (let i = 0; i < NP; i++) { const d = drops[i]; if (d.life <= 0) continue; d.life -= dt; const k = i * 3; d.v.y -= 11 * dt; pos[k] += d.v.x * dt; pos[k + 1] += d.v.y * dt; pos[k + 2] += d.v.z * dt; if (d.life <= 0 || pos[k + 1] < 0.05) { d.life = 0; pos[k + 1] = -99; } }
    water.geometry.attributes.position.needsUpdate = true;
    flash = Math.max(0, flash - dt * 1.6); blue.intensity = flash * 70;
    shake = Math.max(0, shake - dt * 0.8); camera.position.x = (Math.random() - 0.5) * shake;
    renderer.render(scene, camera);
    cats.forEach((c, i) => {
      const el = document.querySelector('.seat[data-p="' + i + '"]'); if (!el || !c.visible) return;
      v3.set(c.position.x, c.position.y + 0.15, c.position.z).project(camera);
      el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
    });
  }
  requestAnimationFrame(frame);
  window.Siete3D = { update, reveal, hide, tick, drops: () => drops.filter(d => d.life > 0).length };
}
