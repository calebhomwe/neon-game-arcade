/* bridge3d.js: the 3D course for Bridge Race (three.js r180, vendored in ../vendor/three).
 *
 * The game keeps its rules in bridge-race-classic.html (a side-on board in px: the runner at x, ground at
 * y = 420); this module draws that course in 3D. The track runs away from the camera (world -z), floating
 * over a lake: Kenney Nature Kit cliff blocks, plank bundles to pick up, a wooden bridge laid plank by plank
 * across each gap, and a Quaternius builder who carries the stack of planks on his back.
 *
 *   const B = await createBridge(canvas, { quality: 'high' | 'low' | 'auto' });
 *   B.setLevel(G);                 after the game generates a level (gaps, planks, trees, length)
 *   B.frame(dt, now, view);        view = { x, y, planks, state: 'title'|'run'|'fall'|'win'|'over', air }
 *   B.pickup(i); B.burst(xpx, ypx, colour, n); B.lay(gap);   effects
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { toon, dequantize, softwareGL, REDUCED } from '../kit3d/hole3d.js';

const SX = 0.05, SY = 0.025, TILE = 1.2, LANES = 3, GROUND = 420;
const wz = (px) => -px * SX, wy = (py) => (GROUND - py) * SY;

export async function createBridge(canvas, opts = {}) {
  let quality = opts.quality === 'low' ? 'low' : opts.quality === 'high' ? 'high' : (softwareGL() ? 'low' : 'high');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high' && (devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.3, 400);
  const skyTop = new THREE.Color('#3f8fe8'), skyLow = new THREE.Color('#cfeaff');
  scene.fog = new THREE.Fog(skyLow.clone(), 40, 130);
  scene.add(new THREE.HemisphereLight('#e6f2ff', '#5b7d4a', 1.35));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.5); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
  scene.add(sun, sun.target);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: skyTop }, low: { value: skyLow } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 low; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.12,0.0,1.0); gl_FragColor = vec4(mix(low, top, pow(h,0.75)),1.0); }',
  }));
  sky.frustumCulled = false; scene.add(sky);
  // the lake below the course
  const wc = document.createElement('canvas'); wc.width = wc.height = 256; const wg = wc.getContext('2d');
  wg.fillStyle = '#39a9d8'; wg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) { wg.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.2})`; wg.lineWidth = 2 + Math.random() * 2; const x = Math.random() * 256, y = Math.random() * 256, w = 10 + Math.random() * 26; wg.beginPath(); wg.moveTo(x, y); wg.quadraticCurveTo(x + w / 2, y - 4, x + w, y); wg.stroke(); }
  const wtex = new THREE.CanvasTexture(wc); wtex.colorSpace = THREE.SRGBColorSpace; wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping; wtex.repeat.set(40, 40);
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: wtex }));
  lake.position.y = -4.5; lake.receiveShadow = true; scene.add(lake);

  // ---- models ----
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const base = opts.base || 'bridge-race-classic/models/';
  const [pack, runG] = await Promise.all([loader.loadAsync(base + 'world.glb'), loader.loadAsync(base + 'runner.glb')]);
  pack.scene.updateMatrixWorld(true);
  const kinds = {}, mats = new Map();
  for (const node of pack.scene.children) {
    const parts = [], box = new THREE.Box3();
    node.traverse(o => {
      if (!o.isMesh) return;
      const g = dequantize(o.geometry.clone()); g.applyMatrix4(o.matrixWorld); g.computeBoundingBox(); box.union(g.boundingBox);
      let m = mats.get(o.material);
      if (!m) {
        m = toon(o.material, 0.3); mats.set(o.material, m);
        // Kenney's nature palette is mint and teal; give the course a warmer, saturated grass and foliage
        const n = o.material.name || '';
        if (/^grass/.test(n)) m.color.set('#7ccf4e'); else if (/leafsGreen/.test(n)) m.color.set('#5cc24a'); else if (/leafsDark/.test(n)) m.color.set('#3c9a3f');
        else if (/^dirt/.test(n)) m.color.set('#c9794a'); else if (/^stone/.test(n)) m.color.set('#b9c3c9');
      }
      parts.push({ g, m });
    });
    kinds[node.name] = { parts, box };
  }
  const batches = [];
  function batch(id, cap) {
    const k = kinds[id]; if (!k) return null;
    const meshes = k.parts.map(p => { const im = new THREE.InstancedMesh(p.g, p.m, cap); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; scene.add(im); return im; });
    const b = { id, k, cap, n: 0, meshes }; batches.push(b); return b;
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
  function add(b, x, y, z, yaw, s, sy, rx) {
    if (!b || b.n >= b.cap) return;
    _e.set(rx || 0, yaw || 0, 0); _q.setFromEuler(_e); _s.set(s, s * (sy || 1), s); _p.set(x, y, z); _m.compose(_p, _q, _s);
    for (const m of b.meshes) m.setMatrixAt(b.n, _m); b.n++;
  }
  function flush(b) { if (!b) return; for (const m of b.meshes) { m.count = b.n; m.instanceMatrix.needsUpdate = true; } }
  const sizeOf = (id) => kinds[id] ? kinds[id].box.getSize(new THREE.Vector3()) : new THREE.Vector3(1, 1, 1);

  // static course batches (rebuilt per level) and dynamic ones (every frame)
  const B = {
    block: batch('block', 900), fence: batch('fenceB', 500), trees: {}, deco: {},
    planks: batch('planks', 80), bridge: batch('bridgeW', 120), stack: batch('planks', 44), clouds: batch('cloud', 40), flag: batch('flag', 4),
  };
  for (const id of ['pineA', 'pineB', 'oakB', 'treeD']) B.trees[id] = batch(id, 60);
  for (const id of ['rockL', 'rockS', 'bushB', 'flowerP', 'flowerYb', 'grassB', 'stump', 'lily']) B.deco[id] = batch(id, 120);
  const plankS = 0.55 / Math.max(0.01, sizeOf('planks').x), plankH = sizeOf('planks').y * plankS;
  const bridgeS = TILE / Math.max(0.01, sizeOf('bridgeW').x);

  // ---- the builder ----
  const runner = runG.scene, RS = 1.75 / 3.13; runner.scale.setScalar(RS);
  const outlineMat = new THREE.MeshBasicMaterial({ color: '#1d1a2a', side: THREE.BackSide });
  outlineMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * 0.04;'); };
  const outl = [];
  runner.traverse(o => {
    if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false;
    const src = o.material, m = toon(src, 0.45);
    if (/skin/i.test(src.name)) m.color.set('#d9a07a');
    if (/hat/i.test(src.name)) m.color.set('#ffc21a');
    if (/vest/i.test(src.name)) m.color.set('#ff7a1a');
    if (/shirt/i.test(src.name)) m.color.set('#f4f4ee');
    if (/pants/i.test(src.name)) m.color.set('#2e5aa8');
    o.material = m;
    if (o.isSkinnedMesh) { const c = o.clone(); c.material = outlineMat; c.castShadow = false; c.bind(o.skeleton, o.bindMatrix); outl.push([o.parent, c]); }
  });
  for (const [p, c] of outl) p.add(c);
  const hero = new THREE.Group(); hero.add(runner); scene.add(hero);
  const mixer = new THREE.AnimationMixer(runner), clips = {};
  for (const c of runG.animations) clips[c.name] = mixer.clipAction(c);
  for (const n of ['Jump', 'Victory', 'Death']) if (clips[n]) { clips[n].setLoop(n === 'Victory' ? THREE.LoopRepeat : THREE.LoopOnce); clips[n].clampWhenFinished = true; }
  let cur = null, curName = '';
  function play(n, fade = 0.2) { if (n === curName || !clips[n]) return; const a = clips[n]; a.reset(); a.play(); if (cur) a.crossFadeFrom(cur, fade, false); cur = a; curName = n; }
  play('Idle', 0);

  // ---- particles: little cubes and wood chips ----
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#fff' }), 400);
  pm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(1200).fill(1), 3); pm.frustumCulled = false; pm.count = 0; scene.add(pm);
  const parts = []; const _c = new THREE.Color();
  function burst(x, y, z, col, n, sp = 4, size = 0.14) {
    const c = new THREE.Color(col); if (REDUCED) n = Math.min(n, 5);
    for (let i = 0; i < n && parts.length < (quality === 'high' ? 400 : 140); i++) {
      const a = Math.random() * Math.PI * 2, s = sp * (0.4 + Math.random() * 0.8);
      parts.push({ x, y, z, vx: Math.cos(a) * s, vy: sp * (0.5 + Math.random()), vz: Math.sin(a) * s, t: 0, life: 0.5 + Math.random() * 0.6, s: size * (0.6 + Math.random() * 0.8), c, r: Math.random() * 6 });
    }
  }
  const flying = [];   // plank bundles flying up onto the builder's back

  // ---- level ----
  let L = null;
  function setLevel(G) {
    L = G;
    for (const b of [B.block, B.fence, B.clouds, B.flag, ...Object.values(B.trees), ...Object.values(B.deco)]) if (b) b.n = 0;
    const end = G.levelLength + 700, inGap = (px) => G.gaps.some(g => px > g.start && px < g.end);
    const bs = TILE / Math.max(0.01, sizeOf('block').x);
    for (let px = -300; px < end; px += TILE / SX) {
      const z = wz(px);
      if (inGap(px + TILE / SX / 2) || inGap(px + 2)) continue;
      for (let l = 0; l < LANES; l++) add(B.block, (l - 1) * TILE, -TILE, z - TILE / 2, 0, bs);
    }
    // fences along both edges, with a gap where each bridge starts
    const fs = TILE / Math.max(0.01, sizeOf('fenceB').x);
    for (let px = 0; px < end; px += TILE / SX) { if (inGap(px + 8) || inGap(px + TILE / SX - 8)) continue; const z = wz(px) - TILE / 2; add(B.fence, -1.5 * TILE - 0.02, 0, z, Math.PI / 2, fs); add(B.fence, 1.5 * TILE + 0.02, 0, z, Math.PI / 2, fs); }
    // islands with trees beside the course (from the game's tree list)
    const ids = Object.keys(B.trees), dec = ['rockL', 'rockS', 'bushB', 'flowerP', 'flowerYb', 'grassB', 'stump'];
    G.trees.forEach((t, i) => {
      const side = i % 2 ? 1 : -1, z = wz(t.x), x = side * (1.5 * TILE + 2.2 + (i % 3) * 0.9);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (Math.abs(a) + Math.abs(b) < 2 || (i + a + b) % 3) add(B.block, x + a * TILE, -TILE - 0.35, z + b * TILE, 0, bs);
      const id = ids[i % ids.length], k = sizeOf(id); add(B.trees[id], x, -0.35, z, i, (1.8 + t.size / 25) / Math.max(0.1, k.y));
      add(B.deco[dec[i % dec.length]], x + 0.8, -0.35, z + 0.7, i * 1.3, 0.9 / Math.max(0.1, sizeOf(dec[i % dec.length]).x));
      add(B.deco[dec[(i + 3) % dec.length]], x - 0.7, -0.35, z - 0.8, i * 0.7, 0.7 / Math.max(0.1, sizeOf(dec[(i + 3) % dec.length]).x));
    });
    for (let i = 0; i < 60; i++) { const z = -Math.random() * end * SX, x = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 40); add(B.deco.lily, x, -4.45, z, Math.random() * 6, 1.2 / Math.max(0.1, sizeOf('lily').x)); }
    for (const c of G.clouds.concat(G.clouds)) { const z = -Math.random() * end * SX, x = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 40); add(B.clouds, x * 1.4, 14 + Math.random() * 14, z, Math.random() * 6, 1.6 + c.w / 60); }
    // the finish: flags either side
    const fz = wz(G.levelLength), fls = 3.2 / Math.max(0.1, sizeOf('flag').y);
    add(B.flag, -1.5 * TILE, 0, fz, Math.PI / 2, fls); add(B.flag, 1.5 * TILE, 0, fz, -Math.PI / 2, fls);
    for (const b of [B.block, B.fence, B.clouds, B.flag, ...Object.values(B.trees), ...Object.values(B.deco)]) flush(b);
    for (const g of G.gaps) g.laid = g.start;
    flying.length = 0; parts.length = 0;
    finish.position.set(0, 0, fz);
  }
  // a chequered banner over the finish
  const fc = document.createElement('canvas'); fc.width = 256; fc.height = 64; const fg = fc.getContext('2d');
  for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) { fg.fillStyle = (r + k) % 2 ? '#1a1a1a' : '#ffffff'; fg.fillRect(k * 32, r * 32, 32, 32); }
  const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
  const finish = new THREE.Mesh(new THREE.PlaneGeometry(3 * TILE + 0.4, 0.7), new THREE.MeshBasicMaterial({ map: ft, side: THREE.DoubleSide, toneMapped: false }));
  finish.geometry.translate(0, 3.1, 0); scene.add(finish);

  // ---- camera ----
  let W = 1, H = 1, camY = 5, camZ = 9, lookA = 7, shake = 0;
  const camPos = new THREE.Vector3(3, 6, 10), look = new THREE.Vector3();
  let dyn = 1, ema = 16, lastT = 0, slowFor = 0, fastFor = 0;
  function adapt() {
    // a device that cannot keep up renders at a lower resolution (down to half), and climbs back when it can
    const t = performance.now(), d = lastT ? t - lastT : 16; lastT = t; if (d > 500) return;
    ema += (d - ema) * 0.1;
    if (ema > 45) { slowFor += d; fastFor = 0; } else if (ema < 22) { fastFor += d; slowFor = 0; } else slowFor = fastFor = 0;
    let w = dyn; if (slowFor > 1500 && dyn > 0.5) w = Math.max(0.5, dyn * 0.8); if (fastFor > 4000 && dyn < 1) w = Math.min(1, dyn * 1.2);
    if (w !== dyn) { dyn = w; slowFor = fastFor = 0; resize(); }
  }
  function resize() {
    W = canvas.clientWidth || 800; H = canvas.clientHeight || 500;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : 1) * dyn); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.fov = W < H ? 62 : 48; camera.updateProjectionMatrix();
    camY = W < H ? 6.2 : 4.8; camZ = W < H ? 9.5 : 8.2; lookA = W < H ? 9 : 8;
  }
  function setQuality(q) {
    quality = q === 'low' ? 'low' : 'high'; const hi = quality === 'high';
    renderer.shadowMap.enabled = hi; sun.castShadow = hi;
    const ms = hi ? 2048 : 512; if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    for (const id of ['flowerP', 'flowerYb', 'grassB', 'lily']) if (B.deco[id]) B.deco[id].meshes.forEach(m => m.visible = hi);
    B.fence.meshes.forEach(m => m.visible = hi);
    scene.traverse(o => { if (o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; });
    resize();
  }
  setQuality(quality);

  // ---- per frame ----
  let lastPlanks = 0, lastLaidTile = new Map(), sq = 0, bob = 0;
  function frame(dt, now, v) {
    if (!L) return;
    const z = wz(v.x), y = wy(v.y);
    // what the builder is doing
    let clip = 'Idle';
    if (v.state === 'run') clip = v.air ? 'Jump' : v.planks > 0 ? 'Run_Carry' : 'Run';
    else if (v.state === 'fall') clip = 'Jump';
    else if (v.state === 'win') clip = 'Victory';
    else if (v.state === 'over') clip = 'Defeat';
    play(clip);
    if (cur) cur.setEffectiveTimeScale(clip.startsWith('Run') ? Math.min(1.8, 0.75 + v.speed * 0.12) : 1);
    mixer.update(dt);
    if (v.planks > lastPlanks) sq = 1;
    lastPlanks = v.planks; sq = Math.max(0, sq - dt * 5);
    hero.position.set(0, y, z); hero.rotation.y = Math.PI;
    runner.scale.set(RS * (1 + sq * 0.06), RS * (1 - sq * 0.08), RS * (1 + sq * 0.06));

    // the stack of planks on his back (one bundle per plank, up to 40)
    B.stack.n = 0; bob += dt * (v.state === 'run' ? 11 : 2);
    const n = Math.min(40, v.planks);
    for (let i = 0; i < n; i++) { const sway = REDUCED ? 0 : Math.sin(bob - i * 0.25) * 0.012 * i; add(B.stack, sway, y + 0.95 + i * plankH * 0.62, z + 0.32, Math.PI / 2, plankS * 0.9); }
    flush(B.stack);

    // plank bundles on the course, bobbing; collected ones fly to the back of the stack
    B.planks.n = 0;
    L.planksOnGround.forEach((p, i) => { if (p.collected) return; const pz = wz(p.x); if (pz > z + 12 || pz < z - 90) return; add(B.planks, ((i * 37) % 7 - 3) * 0.12, 0.05 + (REDUCED ? 0 : Math.abs(Math.sin(now / 300 + p.bob)) * 0.12), pz, now / 700 + i, plankS); });
    for (let i = flying.length - 1; i >= 0; i--) { const f = flying[i]; f.t += dt * 3.2; if (f.t >= 1) { flying.splice(i, 1); continue; } const e = f.t; add(B.planks, f.x * (1 - e), f.y + (y + 1.2 + n * plankH * 0.62 - f.y) * e + Math.sin(e * Math.PI) * 1.2, f.z + (z + 0.32 - f.z) * e, e * 6, plankS * (1 - e * 0.2)); }
    flush(B.planks);

    // bridges: planks laid up to where the builder has walked (and all the way once crossed)
    B.bridge.n = 0;
    for (const g of L.gaps) {
      if (g.crossed) g.laid = g.end;
      else if (v.state === 'run' && v.x + 28 > g.start && !v.sinking) g.laid = Math.max(g.laid, Math.min(g.end, v.x + 40));
      const tiles = Math.ceil((g.laid - g.start) * SX / TILE - 0.01);
      const prev = lastLaidTile.get(g) || 0;
      if (tiles > prev) { lastLaidTile.set(g, tiles); if (!g.crossed || prev === 0) { const tz = wz(g.start) - (tiles - 0.5) * TILE; burst(0, 0.1, tz, '#d4a373', 6, 3, 0.12); if (opts.onLay) opts.onLay(); } }
      for (let t = 0; t < tiles; t++) {
        const tz = wz(g.start) - (t + 0.5) * TILE, age = t === tiles - 1 && !g.crossed ? Math.min(1, ((v.x + 40 - g.start) * SX - t * TILE) / TILE) : 1;
        add(B.bridge, 0, -0.18 - (1 - age) * 0.5, tz, 0, bridgeS * 1.02, 1);
        add(B.bridge, -TILE, -0.18, tz, 0, g.crossed || age >= 1 ? bridgeS * 1.02 : 0.0001);
        add(B.bridge, TILE, -0.18, tz, 0, g.crossed || age >= 1 ? bridgeS * 1.02 : 0.0001);
      }
    }
    flush(B.bridge);

    // particles
    let pc = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; if (p.t > p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.vy -= 16 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.r += dt * 8;
      const k = p.s * (1 - Math.pow(p.t / p.life, 3)); _e.set(p.r, p.r * 0.7, 0); _q.setFromEuler(_e); _s.setScalar(Math.max(0.001, k)); _p.set(p.x, p.y, p.z);
      _m.compose(_p, _q, _s); pm.setMatrixAt(pc, _m); pm.setColorAt(pc, p.c); pc++;
    }
    pm.count = pc; pm.instanceMatrix.needsUpdate = true; if (pm.instanceColor) pm.instanceColor.needsUpdate = true;

    // camera: behind and above, easing after the builder; the title card slowly orbits
    const t = v.state === 'title' && !REDUCED ? now / 4000 : 0;
    const want = _p.set(v.state === 'title' ? Math.sin(t) * 5 : 2.2, Math.max(y, -1.5) + camY, z + camZ + (v.state === 'win' ? -2 : 0));
    camPos.lerp(want, Math.min(1, dt * 4));
    shake = Math.max(0, (v.shake || 0));
    camera.position.copy(camPos);
    if (shake && !REDUCED) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; }
    look.set(0, Math.max(y, -1.5) + 0.6, z - lookA); camera.lookAt(look);
    sky.position.copy(camera.position);
    sun.target.position.set(0, 0, z - 6); sun.position.set(-8, 16, z + 4);
    adapt(); renderer.render(scene, camera);
  }
  function pickup(i) { const p = L.planksOnGround[i]; if (!p) return; flying.push({ x: 0, y: 0.1, z: wz(p.x), t: 0 }); burst(0, 0.3, wz(p.x), '#e0b27a', 6, 3, 0.1); }
  function burstAt(xpx, ypx, col, n) { burst(0, wy(ypx) + 0.8, wz(xpx), col, n, 5, 0.16); }
  return { setLevel, frame, pickup, burst: burstAt, resize, setQuality, get quality() { return quality; } };
}
