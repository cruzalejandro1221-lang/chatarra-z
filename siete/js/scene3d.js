// Siete Vidas: comedor embrujado en 3D (Three.js). Solo dibuja: las reglas y los botones siguen en core.js y game.js.
import * as THREE from '../../vendor/three-0.160.0.module.min.js';
const canvas = document.querySelector('#c3d');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
if (renderer) {
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07040e); scene.fog = new THREE.Fog(0x07040e, 9, 24);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o));
  const mesh = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; (p || scene).add(o); return o; };

  // sala y mesa
  scene.add(new THREE.AmbientLight(0x3a2c5c, 0.9));
  const moon = new THREE.DirectionalLight(0x6f8cff, 0.7); moon.position.set(-6, 8, -5); scene.add(moon);
  const floor = mesh(new THREE.CircleGeometry(16, 40), mat(0x1c1120)); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6; floor.castShadow = false;
  const wall = mesh(new THREE.CylinderGeometry(13, 13, 10, 32, 1, true), mat(0x1a1026, { side: THREE.BackSide })); wall.position.y = 3; wall.castShadow = false;
  const win = mesh(new THREE.PlaneGeometry(2.4, 3.6), new THREE.MeshBasicMaterial({ color: 0x31407f }), 0, 3.6, -12.4); win.castShadow = false;
  mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ color: 0xffefb0 }), 0.4, 4.2, -12.3).castShadow = false;
  const top = mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.2, 48), mat(0x4a2a1c, { roughness: 0.45 }), 0, -0.1, 0);
  mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.02, 48), mat(0x5c1626), 0, 0.01, 0);
  mesh(new THREE.CylinderGeometry(0.4, 0.75, 1.5, 16), mat(0x2b1812), 0, -0.95, 0);
  // vela
  const candle = new THREE.Group(); candle.position.set(0, 0, -0.95); scene.add(candle);
  mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.08, 20), mat(0xb98a3a, { metalness: 0.7, roughness: 0.3 }), 0, 0.05, 0, candle);
  mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.85, 14), mat(0xf1e6cf), 0, 0.5, 0, candle);
  const flame = mesh(new THREE.ConeGeometry(0.08, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0xffc35a }), 0, 1.08, 0, candle); flame.castShadow = false;
  const light = new THREE.PointLight(0xffa24d, 42, 15, 1.8); light.position.set(0, 1.5, -0.95); light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.002; scene.add(light);
  const danger = new THREE.PointLight(0xff1a2e, 0, 14, 1.6); danger.position.set(0, 2.2, 0.6); scene.add(danger);

  // gatos (diseño propio): cuerpo, cabeza, orejas, ojos brillantes y cola
  const FUR = [[0xf3e6d2, 0x5a4032], [0x8d93a3, 0x4d5263], [0xff9f43, 0xc96a12], [0x3a3a46, 0x1c1c24]];
  function makeCat(i) {
    const [a, b] = FUR[i % 4], fur = mat(a), dark = mat(b), g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(0.62, 20, 16), fur, 0, 0.1, 0, g); body.scale.set(1, 1.15, 0.85);
    const head = new THREE.Group(); head.position.set(0, 1.02, 0.1); g.add(head);
    mesh(new THREE.SphereGeometry(0.5, 22, 18), fur, 0, 0, 0, head).scale.set(1.06, 0.94, 0.96);
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.19, 0.42, 4), dark, s * 0.33, 0.48, 0, head); ear.rotation.z = -s * 0.28;
      mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffe27d, emissive: 0xffc629, emissiveIntensity: 1.3 }), s * 0.2, 0.05, 0.42, head).castShadow = false;
      const pu = mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0x0b0710 }), s * 0.2, 0.05, 0.515, head); pu.scale.set(0.6, 1.5, 0.5); pu.castShadow = false;
      mesh(new THREE.SphereGeometry(0.13, 12, 10), dark, s * 0.32, -0.32, 0.72, g).scale.set(1, 0.6, 1.2);                       // patas sobre la mesa
    }
    mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xe5788f), 0, -0.1, 0.48, head);
    const tail = mesh(new THREE.CapsuleGeometry(0.08, 0.9, 4, 8), dark, 0.62, 0.4, -0.25, g); tail.rotation.z = -0.5;
    const ring = mesh(new THREE.TorusGeometry(0.82, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffc629 }), 0, -0.3, 0, g); ring.rotation.x = Math.PI / 2; ring.castShadow = false; ring.visible = false;
    g.userData = { head, tail, ring, phase: i * 1.7 };
    return g;
  }
  const cats = []; let V = null, slots = {}, wide = true;
  // plato con marca: verde bueno, rojo maldito (solo si lo sabes)
  const plates = new THREE.Group(); scene.add(plates);
  const plateG = new THREE.CylinderGeometry(0.3, 0.2, 0.05, 24), plateM = mat(0xefe6d6, { roughness: 0.35 });
  const cloche = new THREE.Group(); scene.add(cloche);
  const domeM = mat(0xdfe3ec, { metalness: 0.35, roughness: 0.28, emissive: 0x2c2f3a });
  mesh(new THREE.SphereGeometry(0.56, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeM, 0, 0, 0, cloche);
  mesh(new THREE.SphereGeometry(0.09, 12, 10), domeM, 0, 0.62, 0, cloche);
  const food = new THREE.Group(); scene.add(food); food.visible = false;
  const fish = new THREE.Group(); food.add(fish);
  mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffc629, emissive: 0x8a5a00, emissiveIntensity: 0.6 }), 0, 0.15, 0, fish).scale.set(1.5, 0.75, 0.6);
  mesh(new THREE.ConeGeometry(0.14, 0.24, 4), new THREE.MeshStandardMaterial({ color: 0xff9f43 }), 0.36, 0.15, 0, fish).rotation.z = Math.PI / 2;
  const curse = new THREE.Group(); food.add(curse);
  const goo = new THREE.MeshStandardMaterial({ color: 0x8a2be2, emissive: 0x6a0dad, emissiveIntensity: 1.4, roughness: 0.3 });
  mesh(new THREE.SphereGeometry(0.24, 16, 12), goo, 0, 0.2, 0, curse);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2030 }), s * 0.1, 0.25, 0.21, curse);
  mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x14060f }), 0, 0.15, 0.22, curse).rotation.z = Math.PI;

  const seatXZ = (pos, w) => (pos === 'top' ? [0, -3.05] : pos === 'left' ? [-w, -1.5] : pos === 'right' ? [w, -1.5] : [0, 3.6]);
  function fit() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; wide = w > h;
    camera.fov = wide ? 44 : 64; camera.updateProjectionMatrix();
    camera.position.set(0, wide ? 4.2 : 5.6, wide ? 6.6 : 7.2); camera.lookAt(0, 0.45, wide ? -0.7 : -0.45);
  }
  addEventListener('resize', fit); fit();

  function update(v, posOf) {
    V = v; canvas.hidden = false;
    while (cats.length < v.players.length) { const c = makeCat(cats.length); scene.add(c); cats.push(c); }
    cats.forEach((c, i) => {
      const p = v.players[i]; if (!p || i === v.me) { c.visible = false; return; }
      const [x, z] = seatXZ(posOf(i), wide ? 3.05 : 1.95); c.visible = true; c.position.set(x, 0.42, z); c.lookAt(0, 0.42, 0.2);
      const actor = v.phase === 'respond' && v.offer ? v.offer.to : v.turn;
      c.userData.ring.visible = i === actor && !p.out; c.userData.out = p.out;
      c.rotation.z = p.out ? 1.2 : 0; if (p.out) c.position.y = 0.05;
    });
    plates.clear();
    const n = v.left, rest = n - 1, span = Math.min(3, rest * 0.68);
    for (let i = 0; i < n; i++) {
      // el plato en juego va al frente y al centro; los demás esperan en fila detrás
      const x = i === 0 || rest < 2 ? (i === 0 ? 0 : 0) : -span / 2 + span * (i - 1) / (rest - 1), z = i === 0 ? 1.55 : 0.25 + Math.abs(x) * 0.12, pl = mesh(plateG, plateM, x, 0.07, z, plates);
      const s = v.seen.find(q => q.i === i);
      if (s) { const m = mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 24), new THREE.MeshBasicMaterial({ color: s.bad ? 0xff2030 : 0x35e07a }), x, 0.12, z, plates); m.rotation.x = Math.PI / 2; m.castShadow = false; }
      if (i === 0) { cloche.position.set(x, 0.1, z); cloche.userData.y = 0.1; food.position.set(x, 0.1, z); pl.scale.setScalar(1.45); }
    }
    cloche.visible = n > 0; danger.intensity = v.bonus ? 16 : 0;
    if (!anim) { cloche.position.y = 0.1; food.visible = false; }
  }
  let anim = null, shake = 0, redFlash = 0;
  function reveal(bad) { fish.visible = !bad; curse.visible = !!bad; anim = { t: 0, bad, hit: false }; }
  function hide() { canvas.hidden = true; V = null; }

  const v3 = new THREE.Vector3();
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0), t = now / 1000; last = now;
    if (!V) return;
    light.intensity = 40 + Math.sin(t * 11) * 3 + Math.sin(t * 23) * 2.4; flame.scale.y = 1 + Math.sin(t * 17) * 0.14;
    cats.forEach(c => { if (!c.visible || c.userData.out) return; const u = c.userData, b = Math.sin(t * 1.4 + u.phase); u.head.rotation.y = Math.sin(t * 0.6 + u.phase) * 0.28; u.head.position.y = 1.02 + b * 0.012; u.tail.rotation.z = -0.5 + Math.sin(t * 1.1 + u.phase) * 0.24; });
    if (anim) {
      anim.t += dt; const k = anim.t;
      if (k < 0.7) cloche.rotation.z = Math.sin(k * 44) * 0.035 * (k / 0.7);
      else { cloche.rotation.z = 0; const u = Math.min(1, (k - 0.7) / 0.35); cloche.position.y = 0.1 + u * u * 2.4; food.visible = true; food.scale.setScalar(Math.min(1, 0.3 + u)); food.rotation.y += dt * 1.6;
        if (!anim.hit) { anim.hit = true; if (anim.bad) { shake = 0.32; redFlash = 1; } } }
      if (k > 2.15) { anim = null; cloche.position.y = cloche.userData.y || 0.1; food.visible = false; }
    }
    redFlash = Math.max(0, redFlash - dt * 1.7); danger.intensity = (V.bonus ? 16 : 0) + redFlash * 70;
    shake = Math.max(0, shake - dt * 0.8);
    camera.position.x = (Math.random() - 0.5) * shake;
    renderer.render(scene, camera);
    // las etiquetas HTML siguen a la cabeza de cada gato
    cats.forEach((c, i) => {
      const el = document.querySelector('.seat[data-p="' + i + '"]'); if (!el || !c.visible) return;
      v3.set(c.position.x, c.position.y + 0.15, c.position.z).project(camera);
      el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
    });
  }
  requestAnimationFrame(frame);
  window.Siete3D = { update, reveal, hide };
}
