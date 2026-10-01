/* house3d.js: the 3D house for Mini Life Sim (three.js r180, vendored in ../vendor/three).
 *
 * The game keeps its own rules and saves in index.html (the house is a 960 x 600 board, 1 px = 1 cm);
 * this module only draws it: Kenney Furniture Kit rooms with cut-away walls, a Quaternius Sim with
 * walk, run, sit, sleep and idle animations, a plumbob that shows the mood, day and night lighting,
 * and small effects for every activity.
 *
 *   const H = await createHouse(canvas, { quality: 'high' | 'low' | 'auto', objects: OBJECTS });
 *   per frame:  H.frame(dt, now, view)   view = { char:{x,y}, action, moving, selected, time, mood, target }
 *   input:      H.pick(clientX, clientY) -> { obj: id } | { floor: {x, y} } | null
 *   UI anchors: H.anchor(id) -> {x, y} (CSS px) for the interaction menu
 *   effects:    H.fx('done' | 'money' | 'goal', objId)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, dequantize, softwareGL, REDUCED } from '../kit3d/hole3d.js';

const PX = 0.01;                                   // metres per board px
export const toWorld = (x, y) => [(x - 480) * PX, (y - 300) * PX];
export const toBoard = (x, z) => [x / PX + 480, z / PX + 300];

/* rooms in metres (x: west..east, z: north..south); the camera looks from the south */
export const ROOMS = [
  { id: 'kitchen', x0: -4.6, x1: -1.6, z0: -2.8, z1: -0.6, floor: 'tile' },
  { id: 'bath', x0: 1.6, x1: 4.6, z0: -2.8, z1: -0.6, floor: 'small' },
  { id: 'bed', x0: -4.6, x1: -1.6, z0: 0.6, z1: 2.8, floor: 'carpet' },
  { id: 'living', x0: 1.6, x1: 4.6, z0: 0.6, z1: 2.8, floor: 'wood' },
  { id: 'hallW', x0: -4.6, x1: -1.6, z0: -0.6, z1: 0.6, floor: 'oak' },
  { id: 'hallE', x0: 1.6, x1: 4.6, z0: -0.6, z1: 0.6, floor: 'oak' },
  { id: 'hall', x0: -1.6, x1: 1.6, z0: -2.8, z1: 2.8, floor: 'oak' },
];

/* furniture: [model, x, z, yaw, height above floor, object id (for the selection glow)] */
const FURN = [
  // kitchen: a counter along the north wall, window over the sink
  ['fridge', -4.22, -2.5, 0, 0, 'fridge'], ['stove', -3.5, -2.52, 0, 0, 'stove'], ['ksink', -2.84, -2.52, 0, 0, 'sink'],
  ['kcab', -2.2, -2.52, 0, 0], ['coffee', -2.2, -2.56, 0, 0.92], ['kupper', -3.5, -2.64, 0, 1.45], ['kupper', -2.2, -2.64, 0, 1.45],
  ['trash', -4.3, -0.92, Math.PI / 2, 0, 'trash'], ['plantS', -1.95, -2.6, 0, 0.92],
  // bathroom
  ['toilet', 2.2, -2.42, 0, 0, 'toilet'], ['bsink', 3.02, -2.62, 0, 0, 'bathSink'], ['mirror', 3.02, -2.76, 0, 1.2],
  ['shower', 4.02, -2.2, 0, 0, 'shower'], ['washer', 4.3, -1.0, -Math.PI / 2, 0], ['plantS', 1.9, -0.85, 0, 0],
  // bedroom
  ['bed', -3.62, 1.72, Math.PI / 2, 0, 'bed'], ['night', -4.32, 0.86, Math.PI / 2, 0], ['tlamp', -4.32, 0.86, 0, 0.55],
  ['bookcase', -2.3, 0.8, 0, 0], ['rug', -2.5, 1.9, Math.PI / 2, 0], ['plant', -1.95, 2.55, 0, 0],
  // living room: TV against the north wall, the sofa facing it, a desk on the east wall
  ['tvcab', 3.0, 0.8, 0, 0], ['tv', 3.0, 0.8, 0, 0.5, 'tv'], ['sofa', 3.0, 2.28, Math.PI, 0, 'sofa'], ['ctable', 3.0, 1.55, 0, 0],
  ['rugR', 3.0, 1.6, 0, 0], ['desk', 4.25, 2.2, -Math.PI / 2, 0, 'computer'], ['screen', 4.4, 2.2, -Math.PI / 2, 0.76, 'computer'],
  ['kbd', 4.18, 2.2, -Math.PI / 2, 0.76], ['dchair', 3.72, 2.2, Math.PI / 2, 0], ['flamp', 1.9, 2.55, 0, 0], ['plant', 4.35, 0.8, 0, 0],
  // hall: the phone on a side table, a reading chair, a rug
  ['stable', 0, -2.55, 0, 0, 'phone'], ['lchair', -0.95, -2.25, 0.25, 0], ['plant', 1.25, -2.5, 0, 0], ['rugR', 0, 0.4, 0, 0],
  ['books', 0.18, -2.55, 0.4, 0.72], ['bookcase', -4.3, 0, Math.PI / 2, 0], ['lchair', 4.25, 0.1, -Math.PI / 2, 0],
];
/* the yard: [model, x, z, yaw, scale] */
const YARD = [
  ['tree', -7.4, -4.6, 0.3, 1], ['treeB', 7.6, -4.2, 1, 1], ['tree', 8.2, 3.6, 2, 0.9], ['treeB', -8.0, 3.9, 0.5, 1.1],
  ['bush', -5.3, 3.3, 0, 1], ['bush', 5.3, 3.4, 1, 1], ['bushS', -2.2, 3.4, 0, 1], ['bushS', 2.3, 3.4, 2, 1], ['bush', -5.3, -3.4, 0, 0.9], ['bush', 5.4, -3.3, 1, 1],
  ['flowerR', -1.5, 3.3, 0, 1], ['flowerY', -1.1, 3.35, 0, 1], ['flowerR', 1.2, 3.3, 0, 1], ['flowerY', 1.6, 3.35, 0, 1],
  ['flowerY', -3.3, 3.35, 0, 1], ['flowerR', 3.5, 3.35, 0, 1], ['flowerR', -6.0, 0.2, 0, 1], ['flowerY', 6.1, -0.4, 0, 1],
];

/* where the Sim sits, lies or stands while doing each activity: [x, z, yaw, y, pose, clip] */
const POSES = {
  snack: [-4.22, -1.9, Math.PI, 0, 'stand', 'PickUp'], cook: [-3.5, -1.92, Math.PI, 0, 'stand', 'PickUp'],
  wash: null, toilet: [2.2, -2.3, 0, 0.05, 'sit', 'SitDown'], shower: [4.02, -2.22, 0, 0.05, 'stand', 'Idle'],
  nap: [-2.85, 1.72, Math.PI / 2, 0.42, 'lie', 'Idle'], sleep: [-2.85, 1.72, Math.PI / 2, 0.42, 'lie', 'Idle'],
  watch: [3.0, 2.2, Math.PI, 0.05, 'sit', 'SitDown'], sit: [3.0, 2.2, Math.PI, 0.05, 'sit', 'SitDown'],
  work: [3.72, 2.2, Math.PI / 2, 0.02, 'sit', 'SitDown'], browse: [3.72, 2.2, Math.PI / 2, 0.02, 'sit', 'SitDown'],
  call: [0, -2.02, Math.PI, 0, 'stand', 'Idle'], groceries: [0, -2.02, Math.PI, 0, 'stand', 'Idle'], clean: [-3.8, -0.95, -Math.PI / 2, 0, 'stand', 'PickUp'],
};
const FX = { cook: 'steam', shower: 'drop', nap: 'z', sleep: 'z', call: 'heart', watch: 'note', work: 'spark', browse: 'note', groceries: 'spark', snack: 'heart', clean: 'spark', wash: 'drop', toilet: 'drop', sit: 'heart' };

function canvasTex(w, h, paint, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function noise(g, w, h, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }
const FLOORS = {
  tile: (g, w) => { const q = w / 4; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#e9e2d0' : '#6fb7b0'; g.fillRect(i * q, j * q, q, q); } g.strokeStyle = 'rgba(60,60,50,.25)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * q, 0); g.lineTo(i * q, w); g.moveTo(0, i * q); g.lineTo(w, i * q); g.stroke(); } noise(g, w, w, 900, 0.03); },
  small: (g, w) => { const q = w / 8; g.fillStyle = '#dfeef6'; g.fillRect(0, 0, w, w); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = `hsl(200,45%,${86 + ((i * 3 + j * 5) % 4) * 2}%)`; g.fillRect(i * q + 1.5, j * q + 1.5, q - 3, q - 3); } noise(g, w, w, 600, 0.03); },
  carpet: (g, w) => { g.fillStyle = '#b9a6d8'; g.fillRect(0, 0, w, w); noise(g, w, w, 6000, 0.06); },
  wood: (g, w) => plank(g, w, ['#b87945', '#a96c3c', '#c4854f', '#9e6435']),
  oak: (g, w) => plank(g, w, ['#d8b079', '#cfa66e', '#e0ba86', '#c99e65']),
};
function plank(g, w, cols) {
  const rows = 6, rh = w / rows, n = cols.length; g.fillStyle = cols[0]; g.fillRect(0, 0, w, w);
  for (let r = 0; r < rows; r++) { let x = -((r * 37) % 100) / 100 * w * 0.5; while (x < w) { const len = w * (0.35 + ((((r * 13 + Math.floor(x)) % 7) + 7) % 7) / 20); g.fillStyle = cols[(((r + Math.floor(x / 10)) % n) + n) % n]; g.fillRect(x, r * rh, len, rh); g.fillStyle = 'rgba(60,30,10,.35)'; g.fillRect(x, r * rh, 2, rh); x += len; } g.fillStyle = 'rgba(60,30,10,.4)'; g.fillRect(0, r * rh, w, 2); }
  for (let i = 0; i < 260; i++) { g.strokeStyle = 'rgba(80,40,10,.12)'; g.lineWidth = 1; const y = Math.random() * w; g.beginPath(); g.moveTo(Math.random() * w, y); g.lineTo(Math.random() * w, y + (Math.random() - 0.5) * 3); g.stroke(); }
}
function spriteTex(kind) {
  return canvasTex(64, 64, (g) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (kind === 'z') { g.font = '900 46px sans-serif'; g.lineWidth = 6; g.strokeStyle = '#2b3a67'; g.strokeText('Z', 32, 34); g.fillStyle = '#e8f0ff'; g.fillText('Z', 32, 34); }
    else if (kind === 'heart') { g.fillStyle = '#ff5c8a'; g.beginPath(); g.moveTo(32, 52); g.bezierCurveTo(4, 32, 12, 8, 32, 22); g.bezierCurveTo(52, 8, 60, 32, 32, 52); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
    else if (kind === 'note') { g.fillStyle = '#ffd24a'; g.strokeStyle = '#6b4a00'; g.lineWidth = 3; g.beginPath(); g.ellipse(24, 46, 10, 8, -0.4, 0, 7); g.fill(); g.stroke(); g.fillRect(31, 12, 5, 34); g.strokeRect(31, 12, 5, 34); g.beginPath(); g.moveTo(36, 12); g.quadraticCurveTo(52, 18, 48, 30); g.stroke(); }
    else if (kind === 'drop') { g.fillStyle = '#7fd3ff'; g.beginPath(); g.moveTo(32, 8); g.bezierCurveTo(50, 32, 50, 54, 32, 54); g.bezierCurveTo(14, 54, 14, 32, 32, 8); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
    else if (kind === 'steam') { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
    else if (kind === 'spark') { g.fillStyle = '#fff6b0'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 10 : 28; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); g.strokeStyle = '#ffb300'; g.lineWidth = 3; g.stroke(); }
    else if (kind === 'coin') { g.fillStyle = '#ffcf33'; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.fill(); g.strokeStyle = '#b07800'; g.lineWidth = 4; g.stroke(); g.font = '900 30px sans-serif'; g.fillStyle = '#8a5a00'; g.fillText('$', 32, 34); }
  });
}

export async function createHouse(canvas, opts = {}) {
  let quality = opts.quality === 'low' ? 'low' : opts.quality === 'high' ? 'high' : (softwareGL() ? 'low' : 'high');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high' && (devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
  const skyTop = new THREE.Color('#5aa8f0'), skyLow = new THREE.Color('#dff0ff');
  scene.fog = new THREE.Fog(skyLow.clone(), 30, 70);
  const hemi = new THREE.HemisphereLight('#e8f3ff', '#7d8a5c', 1.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.3); sun.position.set(-6, 12, 7); sun.target.position.set(0, 0, 0);
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 1, far: 40 });
  scene.add(sun, sun.target);
  // indoor lamps glow at night (High only)
  const lamps = [[-3.3, -1.6], [3.1, -1.6], [-3.1, 1.6], [3.1, 1.7], [0, 0]].map(([x, z]) => { const l = new THREE.PointLight('#ffcf8a', 0, 5.5, 1.6); l.position.set(x, 2.2, z); scene.add(l); return l; });

  // sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: skyTop }, low: { value: skyLow } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 low; varying vec3 vP; void main(){ float h = clamp(vP.y*1.5+0.1,0.0,1.0); gl_FragColor = vec4(mix(low, top, pow(h,0.7)),1.0); }',
  }));
  scene.add(sky);

  // lawn, path, fence line
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({
    map: canvasTex(512, 512, (g, w) => { g.fillStyle = '#6fbf4f'; g.fillRect(0, 0, w, w); for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(30,90,20,.14)' : 'rgba(210,255,160,.10)'; g.fillRect(Math.random() * w, Math.random() * w, 2, 4); } }, [14, 14]) }));
  lawn.position.y = -0.02; lawn.receiveShadow = true; scene.add(lawn);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({
    map: canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#cdbb98'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -16 : 0; x < w; x += 32) { g.fillStyle = `hsl(38,${20 + Math.random() * 10}%,${66 + Math.random() * 8}%)`; g.fillRect(x + 2, y + 2, 28, 28); } }) }));
  path.position.set(0, 0.0, 4.8); path.receiveShadow = true; scene.add(path);
  // the house slab and the room floors
  const slab = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.16, 5.9), toon({ color: new THREE.Color('#e6ddd0'), userData: { linear: true } }));
  slab.position.y = -0.09; slab.receiveShadow = true; scene.add(slab);
  for (const r of ROOMS) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0, tile = r.floor === 'small' ? 1.2 : r.floor === 'carpet' ? 2 : 1.6;
    const m = new THREE.MeshLambertMaterial({ map: canvasTex(quality === 'high' ? 512 : 256, quality === 'high' ? 512 : 256, FLOORS[r.floor], [w / tile, d / tile]) });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m);
    f.position.set((r.x0 + r.x1) / 2, 0.001, (r.z0 + r.z1) / 2); f.receiveShadow = true; scene.add(f);
  }

  // ---- load the kits ----
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const base = opts.base || 'models/';
  const [pack, simG] = await Promise.all([loader.loadAsync(base + 'house.glb'), loader.loadAsync(base + 'sim.glb')]);
  const mats = new Map(), kinds = {};
  for (const node of pack.scene.children) {
    node.traverse(o => { if (o.isMesh) { let m = mats.get(o.material); if (!m) { m = toon(o.material, 0.3); mats.set(o.material, m); } o.material = m; o.castShadow = true; o.receiveShadow = true; } });
    kinds[node.name] = node;
  }
  const put = (id, x, z, yaw, y = 0, s = 1) => { const k = kinds[id]; if (!k) return null; const o = k.clone(); o.position.set(x, y, z); o.rotation.y = yaw; o.scale.setScalar(s); scene.add(o); return o; };
  const objNodes = {}, statics = [];
  for (const [id, x, z, yaw, y, obj] of FURN) { const o = put(id, x, z, yaw, y); if (o) statics.push(o); if (o && obj) (objNodes[obj] = objNodes[obj] || []).push(o); }
  const yardNodes = [];
  for (const [id, x, z, yaw, s] of YARD) { const o = put(id, x, z, yaw, 0, s); if (o) { o.userData.detail = id.startsWith('flower') || id === 'bushS'; yardNodes.push(o); } }
  const fenceNodes = [];
  for (let x = -9; x <= 9; x += 1.0) { if (Math.abs(x) < 0.8) continue; const o = put('fence', x, 6.4, 0); if (o) fenceNodes.push(o); }

  // ---- walls: the north and west walls stand full height with windows; the rest are cut away ----
  const wallMat = toon({ color: new THREE.Color('#f3ebe0'), userData: { linear: true } }, 0.2);
  const capMat = toon({ color: new THREE.Color('#b9a58c'), userData: { linear: true } }, 0.1);
  const stub = (x0, z0, x1, z1, h = 0.32) => {
    const len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.BoxGeometry(len, h, 0.12);
    const m = new THREE.Mesh(g, wallMat); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    m.castShadow = m.receiveShadow = true; scene.add(m); statics.push(m);
    const c = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 0.04, 0.16), capMat); c.position.copy(m.position); c.position.y = h + 0.02; c.rotation.y = m.rotation.y; scene.add(c); statics.push(c);
  };
  const H = 2.5, kh = H / 1.29;
  // north wall: windows over the sink, in the bathroom and the hall
  for (let i = 0; i < 9; i++) { const x = -4.1 + i * 1.025, win = [1, 4, 7].includes(i); const o = put(win ? 'wallWin' : 'wall', x, -2.83, 0); if (o) { o.scale.set(1.025, kh, 1.6); statics.push(o); } }
  for (let i = 0; i < 6; i++) { const z = -2.35 + i * 0.94, win = [1, 4].includes(i); const o = put(win ? 'wallWin' : 'wall', -4.63, z, Math.PI / 2); if (o) { o.scale.set(0.94, kh, 1.6); statics.push(o); } }
  const topN = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.08, 0.2), capMat); topN.position.set(0, H + 0.04, -2.83); scene.add(topN);
  const topW = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 5.8), capMat); topW.position.set(-4.63, H + 0.04, 0); scene.add(topW);
  stub(-4.63, 2.83, -0.55, 2.83); stub(0.55, 2.83, 4.63, 2.83); stub(4.63, -2.83, 4.63, 2.83);
  stub(-4.6, -0.6, -1.6, -0.6); stub(-1.6, -2.8, -1.6, -1.4); stub(1.6, -0.6, 4.6, -0.6); stub(1.6, -2.8, 1.6, -1.4);
  stub(-4.6, 0.6, -1.6, 0.6); stub(-1.6, 1.4, -1.6, 2.8); stub(1.6, 0.6, 4.6, 0.6); stub(1.6, 1.4, 1.6, 2.8);

  // ---- screens that light up (TV and computer) ----
  const screenTex = (col) => canvasTex(128, 80, (g) => { g.fillStyle = col; g.fillRect(0, 0, 128, 80); });
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.44), new THREE.MeshBasicMaterial({ color: '#1b2233', toneMapped: false }));
  tvScreen.position.set(3.0, 0.5 + 0.3, 0.87); scene.add(tvScreen);
  const pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.27), new THREE.MeshBasicMaterial({ color: '#1b2233', toneMapped: false }));
  pcScreen.position.set(4.35, 0.76 + 0.27, 2.2); pcScreen.rotation.y = -Math.PI / 2; scene.add(pcScreen);
  // the phone: a handset standing on the side table
  const phone = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.19, 0.012), toon({ color: new THREE.Color('#22252d'), userData: { linear: true } }, 0.5));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.086, 0.165), new THREE.MeshBasicMaterial({ map: canvasTex(64, 128, (g) => { const r = g.createLinearGradient(0, 0, 64, 128); r.addColorStop(0, '#5ec8ff'); r.addColorStop(1, '#a05bff'); g.fillStyle = r; g.fillRect(0, 0, 64, 128); g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(14 + i * 18, 30 + j * 22, 6, 0, 7); g.fill(); } }), toneMapped: false }));
  glass.position.z = 0.0065; body.add(glass); body.rotation.x = -0.25; body.position.set(-0.12, 0.72 + 0.1, -2.5); phone.add(body); scene.add(phone);
  (objNodes.phone = objNodes.phone || []).push(phone);

  // ---- the Sim ----
  const sim = simG.scene, SIMS = 1.7 / 3.13;
  sim.scale.setScalar(SIMS);
  const skin = new THREE.Color('#e9b48f');
  const outlineMat = new THREE.MeshBasicMaterial({ color: '#241a2e', side: THREE.BackSide });
  outlineMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * 0.035;'); };
  const outlines = [];
  sim.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const src = o.material; const m = toon(src, 0.45);
    if (/skin/i.test(src.name)) m.color.copy(skin);
    if (/hair/i.test(src.name)) m.color.set('#7a3b1d');
    if (/shirt/i.test(src.name)) m.color.set('#2f8ff0');
    if (/pants/i.test(src.name)) m.color.set('#35415c');
    o.material = m;
    if (o.isSkinnedMesh) { const ol = o.clone(); ol.material = outlineMat; ol.castShadow = false; ol.receiveShadow = false; ol.bind(o.skeleton, o.bindMatrix); outlines.push([o.parent, ol]); }
  });
  for (const [p, ol] of outlines) p.add(ol);
  const simRoot = new THREE.Group(); simRoot.add(sim); scene.add(simRoot);
  const mixer = new THREE.AnimationMixer(sim), clips = {};
  for (const c of simG.animations) clips[c.name] = mixer.clipAction(c);
  for (const n of ['SitDown', 'PickUp', 'Victory']) if (clips[n]) { clips[n].setLoop(n === 'PickUp' ? THREE.LoopPingPong : THREE.LoopOnce); clips[n].clampWhenFinished = true; }
  let cur = null, curName = '';
  function play(name, fade = 0.25) {
    if (name === curName || !clips[name]) return;
    const a = clips[name]; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.setEffectiveTimeScale(1);
    if (cur) a.crossFadeFrom(cur, fade, false); a.play(); cur = a; curName = name;
  }
  play('Idle', 0);
  // the plumbob
  const bob = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshToonMaterial({ color: '#46e05a', emissive: '#1f8a2c', emissiveIntensity: 0.6 }));
  bob.scale.set(1, 1.7, 1); scene.add(bob);
  // selection ring and move marker
  const ringGeo = new THREE.RingGeometry(0.42, 0.5, 48).rotateX(-Math.PI / 2);
  const selRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#5cf07a', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  selRing.visible = false; selRing.renderOrder = 3; scene.add(selRing);
  const mark = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  mark.visible = false; mark.renderOrder = 3; scene.add(mark);
  let markT = 0;

  // ---- sprites for activity effects ----
  const spr = {}; for (const k of ['z', 'heart', 'note', 'drop', 'steam', 'spark', 'coin']) spr[k] = new THREE.SpriteMaterial({ map: spriteTex(k), transparent: true, depthWrite: false, toneMapped: false });
  const parts = [];
  function emit(kind, x, y, z, vy = 0.5, n = 1, spread = 0.15, life = 1.4, size = 0.22) {
    for (let i = 0; i < n; i++) {
      if (parts.length > (quality === 'high' ? 90 : 36)) return;
      const s = new THREE.Sprite(spr[kind]); s.position.set(x + (Math.random() - 0.5) * spread, y, z + (Math.random() - 0.5) * spread);
      s.scale.setScalar(size); scene.add(s);
      parts.push({ s, vx: (Math.random() - 0.5) * spread, vy: vy * (0.7 + Math.random() * 0.6), vz: (Math.random() - 0.5) * spread, t: 0, life, size, g: kind === 'drop' ? -3 : 0 });
    }
  }

  // ---- hit boxes for clicking objects ----
  const hits = [];
  for (const o of opts.objects || []) {
    const nodes = objNodes[o.id] || [];
    const box = new THREE.Box3(); nodes.forEach(n => box.expandByObject(n));
    if (box.isEmpty()) continue;
    const sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.7, sz.x + 0.15), Math.max(0.6, sz.y + 0.1), Math.max(0.7, sz.z + 0.15)));
    m.position.copy(c); m.updateMatrixWorld(); m.userData.id = o.id; hits.push(m);
    o._c = c; o._top = box.max.y;
  }
  // one draw call per material for everything that never moves (furniture and walls): far cheaper on slow GPUs
  const groups = new Map();
  for (const root of statics) {
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!o.isMesh) return;
      let g = dequantize(o.geometry.clone()); g.applyMatrix4(o.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(k === 'uv' && o.material.map)) g.deleteAttribute(k);
      if (o.material.map && !g.attributes.uv) return;
      (groups.get(o.material) || groups.set(o.material, []).get(o.material)).push(g);
    });
    scene.remove(root);
  }
  for (const [m, list] of groups) { const g = mergeGeometries(list, false); if (!g) continue; const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = true; scene.add(me); }
  const byId = Object.fromEntries((opts.objects || []).map(o => [o.id, o]));
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitP = new THREE.Vector3();

  // ---- camera framing: the whole house fits in the free part of the screen ----
  let W = 1, Hh = 1, free = null, camDist = 14, pitch = 0.95, yaw = 0.28, baseYaw = 0.28;
  const target = new THREE.Vector3(0, 0, 0.2);
  function place(dist, yawA) {
    camera.position.set(target.x + Math.sin(yawA) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yawA) * Math.cos(pitch) * dist);
    camera.lookAt(target);
  }
  function fit() {
    const pts = []; for (const x of [-4.7, 4.7]) for (const z of [-2.9, 2.9]) { pts.push(new THREE.Vector3(x, 0, z)); if (x < 0 || z < 0) pts.push(new THREE.Vector3(x, 2.55, z)); }
    const fr = free || { x: 0, y: 0, w: W, h: Hh };
    camera.aspect = W / Hh; camera.clearViewOffset(); camera.updateProjectionMatrix();
    // shift the image so the house centres in the free rectangle
    const cx = fr.x + fr.w / 2 - W / 2, cy = fr.y + fr.h / 2 - Hh / 2;
    camera.setViewOffset(W, Hh, -cx, -cy, W, Hh);
    let lo = 5, hi = 60;
    for (let it = 0; it < 22; it++) {
      const d = (lo + hi) / 2; place(d, yaw); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      let ok = true;
      for (const p of pts) { const v = p.clone().project(camera); const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * Hh; if (sx < fr.x + 6 || sx > fr.x + fr.w - 6 || sy < fr.y + 6 || sy > fr.y + fr.h - 6) { ok = false; break; } }
      if (ok) hi = d; else lo = d;
    }
    camDist = hi; place(camDist, yaw);
    scene.fog.near = camDist * 1.3; scene.fog.far = camDist * 3.2;
  }
  let dyn = 1, ema = 16, lastT = 0, slowFor = 0, fastFor = 0;
  function adapt() {
    // a device that cannot keep up renders at a lower resolution (down to half), and climbs back when it can
    const t = performance.now(), d = lastT ? t - lastT : 16; lastT = t; if (d > 500) return;
    ema += (d - ema) * 0.1;
    if (ema > 45) { slowFor += d; fastFor = 0; } else if (ema < 22) { fastFor += d; slowFor = 0; } else slowFor = fastFor = 0;
    let w = dyn; if (slowFor > 1500 && dyn > 0.5) w = Math.max(0.5, dyn * 0.8); if (fastFor > 4000 && dyn < 1) w = Math.min(1, dyn * 1.2);
    if (w !== dyn) { dyn = w; slowFor = fastFor = 0; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : 1) * dyn); renderer.setSize(W, Hh, false); }
  }
  function resize(f) {
    if (f) free = f;
    W = canvas.clientWidth || innerWidth; Hh = canvas.clientHeight || innerHeight;
    baseYaw = W < Hh * 0.8 ? 1.0 : 0.28; yaw = baseYaw; pitch = W < Hh * 0.8 ? 1.0 : 0.95;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : 1) * dyn);
    renderer.setSize(W, Hh, false); fit();
  }
  function setQuality(q) {
    quality = q === 'low' ? 'low' : 'high'; const hi = quality === 'high';
    renderer.shadowMap.enabled = hi; sun.castShadow = hi;
    const ms = hi ? 2048 : 512; if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    for (const o of yardNodes) o.visible = hi || !o.userData.detail;
    for (const o of fenceNodes) o.visible = hi;
    scene.traverse(o => { if (o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; });
    resize();
  }
  setQuality(quality);

  // ---- per-frame ----
  const vis = { x: 0, z: 0, yaw: 0, init: false };
  const dayCol = new THREE.Color(), tmpC = new THREE.Color();
  let fxT = 0, screenT = 0, spin = 0, last = '';
  function frame(dt, now, v) {
    // day and night from the game clock
    const hr = ((v.time || 480) / 60) % 24, day = Math.max(0, Math.min(1, (Math.sin((hr - 6) / 12 * Math.PI) + 0.25) / 0.6));
    const dusk = Math.max(0, 1 - Math.abs(hr - 19) / 2) + Math.max(0, 1 - Math.abs(hr - 6.5) / 1.5);
    skyTop.set('#0e1a3d').lerp(tmpC.set('#5aa8f0'), day); skyLow.set('#243866').lerp(tmpC.set('#dff0ff'), day); if (dusk > 0) skyLow.lerp(tmpC.set('#ffb27a'), Math.min(0.6, dusk * 0.6));
    scene.fog.color.copy(skyLow);
    sun.intensity = 0.25 + 2.1 * day; sun.color.set('#fff1d6').lerp(tmpC.set('#ff9a5a'), Math.min(1, dusk * 0.7));
    hemi.intensity = 0.45 + 0.9 * day;
    const lampOn = quality === 'high' ? (1 - day) * 3.2 : 0; for (const l of lamps) { l.intensity = lampOn; l.visible = lampOn > 0.05; }   // an unlit lamp costs nothing
    if (quality !== 'high') hemi.intensity += (1 - day) * 0.35;

    // the Sim: walk or run while moving, the activity pose while doing
    const [tx, tz] = toWorld(v.char.x, v.char.y);
    const act = v.action, P = act && act.phase === 'doing' ? POSES[act.id] : null;
    let wantX = tx, wantZ = tz, wantYaw = vis.yaw, y = 0, pose = 'stand';
    if (!vis.init) { vis.x = tx; vis.z = tz; vis.init = true; }
    const dx = tx - vis.x, dz = tz - vis.z, moving = v.moving && Math.hypot(dx, dz) > 0.002;
    if (P) { wantX = P[0]; wantZ = P[1]; wantYaw = P[2]; y = P[3]; pose = P[4]; }
    else if (moving) wantYaw = Math.atan2(dx, dz);
    else if (act && act.phase === 'doing') { const o = byId[act.obj]; if (o && o._c) wantYaw = Math.atan2(o._c.x - vis.x, o._c.z - vis.z); }
    const k = P ? 1 - Math.exp(-dt * 10) : 1;
    vis.x += (wantX - vis.x) * k; vis.z += (wantZ - vis.z) * k;
    let dy = wantYaw - vis.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    vis.yaw += dy * (1 - Math.exp(-dt * 12));
    simRoot.position.set(vis.x, y, vis.z); simRoot.rotation.set(0, vis.yaw, 0);
    sim.rotation.set(0, 0, 0); sim.position.set(0, 0, 0);
    let clip = 'Idle';
    if (pose === 'lie') { sim.rotation.x = -Math.PI / 2; sim.position.set(0, 0.12, 0); clip = 'Idle'; }
    else if (P) clip = P[5];
    else if (moving) clip = v.fast ? 'Run' : 'Walk';
    if (v.cheer > 0) clip = 'Victory';
    play(clip);
    if (cur) cur.setEffectiveTimeScale(clip === 'Walk' || clip === 'Run' ? Math.min(2.2, v.fast ? 1.2 : 1) : clip === 'PickUp' ? 0.7 : 1);
    mixer.update(REDUCED ? dt * 0.8 : dt);

    // plumbob: colour from the mood, bobbing over the head
    const mood = v.mood == null ? 70 : v.mood;
    tmpC.set('#e8474b').lerp(dayCol.set('#f5c542'), Math.min(1, mood / 50)); if (mood > 50) tmpC.lerp(dayCol.set('#46e05a'), Math.min(1, (mood - 50) / 30));
    bob.material.color.copy(tmpC); bob.material.emissive.copy(tmpC).multiplyScalar(0.45);
    spin += dt * 1.6; bob.rotation.y = spin;
    const headY = pose === 'lie' ? y + 0.6 : pose === 'sit' ? y + 1.6 : 2.12;
    const bx = pose === 'lie' ? vis.x - Math.sin(vis.yaw) * 1.45 : vis.x, bz = pose === 'lie' ? vis.z - Math.cos(vis.yaw) * 1.45 : vis.z;
    bob.position.set(bx, headY + (REDUCED ? 0 : Math.sin(now / 400) * 0.04), bz);

    // activity effects
    fxT -= dt;
    if (P && fxT <= 0 && FX[act.id]) {
      const kind = FX[act.id]; fxT = kind === 'drop' ? 0.08 : kind === 'steam' ? 0.25 : 0.7;
      if (act.id === 'shower') emit('drop', 4.02, 2.05, -2.2, -0.2, 2, 0.5, 0.9, 0.08);
      else if (act.id === 'cook') emit('steam', -3.5, 1.0, -2.45, 0.35, 1, 0.3, 1.6, 0.35);
      else emit(kind, vis.x + 0.15, headY + 0.1, vis.z, 0.45, 1, 0.2, 1.5, kind === 'z' ? 0.26 : 0.2);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; if (p.t > p.life) { scene.remove(p.s); parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      const a = p.t / p.life; p.s.material.opacity = 1; p.s.scale.setScalar(p.size * (a < 0.2 ? a / 0.2 : 1) * (1 + a * 0.3));
      p.s.material.opacity = 1 - Math.max(0, (a - 0.6) / 0.4);
    }
    // screens flicker while someone watches or works
    screenT += dt;
    const onTV = P && act.id === 'watch', onPC = P && (act.id === 'work' || act.id === 'browse');
    if (screenT > 0.35) { screenT = 0; tvScreen.material.color.setHSL(onTV ? Math.random() : 0.62, onTV ? 0.6 : 0.25, onTV ? 0.55 : 0.12); pcScreen.material.color.setHSL(onPC ? 0.55 + Math.random() * 0.1 : 0.62, onPC ? 0.7 : 0.25, onPC ? 0.6 : 0.12); }

    // selection glow under the chosen object; a marker where the Sim is walking to
    const so = v.selected && byId[v.selected];
    if (so && so._c && !act) { selRing.visible = true; const s = 1 + (REDUCED ? 0 : Math.sin(now / 220) * 0.06); selRing.position.set(so._c.x, 0.02, so._c.z); selRing.scale.set(s * 1.3, 1, s * 1.3); }
    else selRing.visible = false;
    if (v.target && moving && !act) { mark.visible = true; const [mx, mz] = toWorld(v.target.x, v.target.y); mark.position.set(mx, 0.02, mz); markT += dt; mark.scale.setScalar(0.5 + 0.2 * Math.sin(markT * 6)); } else mark.visible = false;

    // the title card gently circles the house
    const want = v.title && !REDUCED ? baseYaw + Math.sin(now / 6000) * 0.12 : baseYaw;
    if (Math.abs(want - yaw) > 1e-4) { yaw += (want - yaw) * Math.min(1, dt * 2); place(camDist, yaw); }
    adapt(); renderer.render(scene, camera);
  }
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, false)[0];
    if (h) return { obj: h.object.userData.id };
    if (ray.ray.intersectPlane(floorPlane, hitP)) {
      if (hitP.x < -4.5 || hitP.x > 4.5 || hitP.z < -2.7 || hitP.z > 2.7) return null;
      const [x, y] = toBoard(hitP.x, hitP.z); return { floor: { x, y } };
    }
    return null;
  }
  const _v = new THREE.Vector3();
  function anchor(id) {
    const o = byId[id]; if (!o || !o._c) return null;
    _v.set(o._c.x, (o._top || 1) + 0.15, o._c.z).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (_v.x + 1) / 2 * r.width, y: r.top + (1 - _v.y) / 2 * r.height };
  }
  function simAnchor() { _v.copy(bob.position); _v.y += 0.25; _v.project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (_v.x + 1) / 2 * r.width, y: r.top + (1 - _v.y) / 2 * r.height }; }
  function fx(kind, id) {
    const o = byId[id], x = o && o._c ? o._c.x : vis.x, z = o && o._c ? o._c.z : vis.z;
    if (kind === 'money') emit('coin', vis.x, 1.9, vis.z, 0.9, REDUCED ? 2 : 6, 0.6, 1.3, 0.2);
    else if (kind === 'goal') emit('spark', vis.x, 1.8, vis.z, 0.9, REDUCED ? 3 : 10, 0.9, 1.4, 0.2);
    else emit('spark', x, (o && o._top || 1) + 0.2, z, 0.7, REDUCED ? 2 : 5, 0.5, 1.0, 0.16);
  }
  return { frame, pick, anchor, simAnchor, fx, resize, setQuality, get quality() { return quality; }, renderer };
}
