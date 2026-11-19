// Shared 3D helpers for the homepage scene (felt tiles).
// World units: a brand tile is 0.9 wide; the bridge runs along x, the deck top is y = 0.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
export { THREE };

// Russian typography: a short word never ends a line
export function nb(s) {
  const re = /(^|[\s(«])(а|в|во|и|к|ко|о|об|с|со|у|я|на|по|за|из|от|до|не|ни|но|же|для|без|при|про|над|под|что|как|или|их|её|его|это|раз)\s/gi;
  return s.replace(re, '$1$2 ').replace(re, '$1$2 ');
}

export const SUPPORTS = [
  { tile: 'blue', num: '01', title: 'Лицензия',
    text: 'Мы работаем по лицензии и под надзором AFSA, Комитета по регулированию финансовых услуг МФЦА.',
    link: { href: 'https://publicreg.myafsa.com/licence_details/AFSA-A-LA-2024-0007/', label: 'Реестр AFSA', ext: true },
    back: ['ЛИЦЕНЗИЯ AFSA', 'AFSA-A-LA-2024-0007', 'действует', 'с 18.04.2024'] },
  { tile: 'red', num: '02', title: 'Право',
    text: 'Договоры с клиентами заключаем по праву МФЦА: оно основано на принципах английского общего права. Споры рассматривает Суд МФЦА.',
    link: { href: '/ru/legal/', label: 'Правовая информация' },
    back: ['ПРАВО МФЦА', 'на принципах', 'английского права', 'споры: Суд МФЦА'] },
  { tile: 'apricot', num: '03', title: 'Активы',
    text: 'Их хранят кастодианы, банки и брокеры обособленно от собственных средств компании: на вашем именном счёте или на общем клиентском счёте (omnibus) на имя компании.',
    link: { href: '/ru/assets/', label: 'Где хранятся активы и как их забрать' },
    back: ['АКТИВЫ', 'у банков и брокеров,', 'отдельно от средств', 'компании'] },
  { tile: 'yellow', num: '04', title: 'Отчёты',
    text: 'Раз в квартал присылаем отчёт: состав портфеля, изменения и результат.',
    back: ['ОТЧЁТ', 'раз в квартал:', 'состав, изменения', 'и результат'] },
];

export const PX = [-4.5, -1.5, 1.5, 4.5];       // pier centres
export const BANK = 7.4;                         // bank faces at x = ±BANK
export const FLOOR = -3.4;
export const DECK_H = 0.38, DECK_D = 1.3;
const PL_H = 0.3, SHAFT_W = 0.62, SHAFT_D = 1.1, CAP_W = 0.8;
const PY_H = 0.75, PY_W = 0.46, TOP_H = 0.08, TOP_W = 0.6;
export const TILE = 0.9, TILE_T = 0.14;
export const SEAT_Y = PY_H + TOP_H - 0.05 + TILE * Math.SQRT1_2;   // tile centre when it stands on its pylon

export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const lerp = (a, b, t) => a + (b - a) * t;

// ---------- textures ----------
export async function svgImage(name) {
  let s = await (await fetch(new URL('tile-' + name + '.svg', import.meta.url))).text();
  const vb = s.match(/viewBox="([^"]+)"/)[1].trim().split(/\s+/).map(Number);
  s = s.replace('<svg ', '<svg width="' + vb[2] + '" height="' + vb[3] + '" ');
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
  await img.decode();
  return { img, vb };
}
// The SVG tile is a diamond; draw it as a square (the mesh turns it back into a diamond).
export function tileCanvas({ img, vb }, N) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const k = N / (vb[2] / Math.SQRT2);
  g.translate(N / 2, N / 2); g.rotate(Math.PI / 4); g.scale(k, k);
  g.drawImage(img, -vb[2] / 2, -vb[3] / 2, vb[2], vb[3]);
  return c;
}
export function bumpCanvas(src, N, crackle) {
  const b = document.createElement('canvas');
  b.width = b.height = N;
  const g = b.getContext('2d');
  g.filter = 'grayscale(1) blur(' + (N / 900).toFixed(2) + 'px)';
  g.drawImage(src, 0, 0, N, N);
  g.filter = 'none';
  if (crackle) {            // fine glaze crazing, visible only up close
    g.strokeStyle = 'rgba(0,0,0,.18)';
    g.lineWidth = N / 1400;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 110; i++) {
      let x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI * 2;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 7; s++) { a += (rnd() - 0.5) * 1.2; x += Math.cos(a) * N * 0.03; y += Math.sin(a) * N * 0.03; g.lineTo(x, y); }
      g.stroke();
    }
  }
  return b;
}
function noiseTexture() {
  const N = 256, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d'), d = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const v = 118 + Math.random() * 40; d.data.set([v, v, v, 255], i * 4); }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Back of a tile: unglazed clay with the proof "engraved" in it.
export function proofCanvas(lines, N) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#E3CFB6'; g.fillRect(0, 0, N, N);
  g.save();
  g.translate(N / 2, N / 2); g.rotate(-Math.PI / 4);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(37,40,45,.9)';
  const lh = N * 0.075, y0 = -lh * (lines.length - 1) / 2;
  lines.forEach((l, i) => {
    g.font = (i === 0 ? '600 ' : '500 ') + Math.round(N * (i === 0 ? 0.052 : 0.046)) + 'px Montserrat, Arial, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = i === 0 ? Math.round(N * 0.006) + 'px' : '0px';
    g.fillText(l, 0, y0 + i * lh + (i === 0 ? -N * 0.02 : 0));
  });
  g.fillStyle = '#EA5C3D';
  g.translate(0, y0 - N * 0.11); g.rotate(Math.PI / 4); g.fillRect(-N * 0.014, -N * 0.014, N * 0.028, N * 0.028);
  g.restore();
  return c;
}

// A warm white photo studio: cream walls and softboxes, so glaze reflects light, not a grey room.
export function studio() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0xcfc9bb, side: THREE.BackSide })));
  const box = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 0.97), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  box(14, 5, -6, 9, 8, 6);
  box(4, 14, 12, 2, -2, 3);
  box(30, 30, 0, -12, 0, 0.9);
  box(10, 3, 0, 4, -12, 2.2);
  box(1.2, 14, 0, 1, 16, 5);   // tall strip in front: a band of light on glaze that faces the camera
  return s;
}

// ---------- world ----------
export async function createWorld(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const maxPR = Math.min(window.devicePixelRatio || 1, 2);
  let pr = maxPR;
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf5f4ed, 30, 80);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.03).texture;
  scene.environmentIntensity = 0.75;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.25, 160);

  const key = new THREE.DirectionalLight(0xfff4e6, 1.8);
  key.position.set(-6, 12, 14);
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xd9d2c3, 0.55));
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 60 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.55);
  rim.position.set(8, 5, -10);
  scene.add(rim);

  // the river bed below receives the shadows itself; a second plane here made them flicker
  const floor = new THREE.Object3D();

  // materials
  const noise = noiseTexture();
  noise.repeat.set(3, 3);
  const stone = new THREE.MeshStandardMaterial({ color: 0xe9e3d5, roughness: 0.92, bumpMap: noise, bumpScale: 0.5 });
  const bankMat = new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.95 });
  const keyMat = new THREE.MeshPhysicalMaterial({ color: 0xea5c3d, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glazeSide = new THREE.MeshPhysicalMaterial({ color: 0xf4f0e6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const boxes = new Map();
  const rbox = (w, h, d, r = 0.035) => {
    const k = [w, h, d, r].join();
    if (!boxes.has(k)) boxes.set(k, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));
    return boxes.get(k);
  };
  const home = (o) => { o.userData.home = { p: o.position.clone(), q: o.quaternion.clone() }; return o; };
  const mesh = (geo, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return home(m);
  };

  // banks: like an architectural model, the ground is one block with a river channel cut through it;
  // its far reaches fade into the background
  const BW = 70, BD = 120;
  const banks = [-1, 1].map((s) => mesh(rbox(BW, -FLOOR, BD, 0.05), bankMat, s * (BANK + BW / 2), FLOOR / 2, -BD / 2 + 30));
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(BANK * 2, BD), new THREE.MeshStandardMaterial({ color: 0xe8e3d8, roughness: 0.5 }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, FLOOR + 0.001, -BD / 2 + 30);
  bed.receiveShadow = true;
  scene.add(bed);

  // stone blocks differ a little in tone, like real masonry
  const tones = [0xe9e3d5, 0xe6dfd0, 0xebe6d9, 0xe4ddcd, 0xe8e1d2].map((c) => { const m = stone.clone(); m.color.set(c); return m; });
  let toneI = 0;
  const st = () => tones[(toneI = (toneI * 7 + 3) % tones.length)];
  // cutwater: a pointed nose on the upstream and downstream faces of a shaft block
  const noseGeo = (h) => {
    const s = new THREE.Shape([new THREE.Vector2(-SHAFT_W / 2, 0), new THREE.Vector2(SHAFT_W / 2, 0), new THREE.Vector2(0, 0.36)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, steps: 1, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1 });
    g.rotateX(Math.PI / 2); g.translate(0, h / 2, 0);   // shape lies in xz, extrude along y
    return g;
  };

  // piers: plinth, four shaft blocks with cutwaters, cap at deck level, pylon, top slab
  const shaftH = (-DECK_H - (FLOOR + PL_H)) / 4;
  const piers = PX.map((x) => {
    const parts = [mesh(rbox(0.94, PL_H, 1.44), st(), x, FLOOR + PL_H / 2, 0)];
    for (let j = 0; j < 4; j++) {
      const mat = st(), b = mesh(rbox(SHAFT_W, shaftH - 0.014, SHAFT_D), mat, x, FLOOR + PL_H + shaftH * (j + 0.5), 0);
      if (j < 3) {
        const ng = noseGeo(shaftH - 0.014);
        const f = new THREE.Mesh(ng, mat); f.position.set(0, 0, SHAFT_D / 2 - 0.01); f.castShadow = f.receiveShadow = true; b.add(f);
        const r = new THREE.Mesh(ng, mat); r.position.set(0, 0, -SHAFT_D / 2 + 0.01); r.rotation.y = Math.PI; r.castShadow = r.receiveShadow = true; b.add(r);
      }
      parts.push(b);
    }
    parts.push(mesh(rbox(CAP_W, DECK_H - 0.012, DECK_D + 0.06), st(), x, -DECK_H / 2, 0));
    parts.push(mesh(rbox(PY_W, PY_H, PY_W), st(), x, PY_H / 2, 0));
    parts.push(mesh(rbox(TOP_W, TOP_H, TOP_W, 0.02), st(), x, PY_H + TOP_H / 2, 0));
    return parts;
  });

  // deck segments between pier caps, each with two low parapets
  const edges = [-BANK, ...PX.flatMap((x) => [x - CAP_W / 2, x + CAP_W / 2]), BANK];
  const deck = [];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i], b = edges[i + 1], len = b - a - 0.012, g = new THREE.Group();
    g.position.set((a + b) / 2, 0, 0);
    scene.add(g);
    mesh(rbox(len, DECK_H, DECK_D), stone, 0, -DECK_H / 2, 0, g);
    mesh(rbox(len, 0.13, 0.08, 0.02), stone, 0, 0.065, DECK_D / 2 - 0.04, g);
    mesh(rbox(len, 0.13, 0.08, 0.02), stone, 0, 0.065, -DECK_D / 2 + 0.04, g);
    deck.push(home(g));
  }

  // arches: semi-elliptic, nine wedge voussoirs each; the middle arch has a glazed pomegranate keystone
  const spans = [[-BANK, PX[0] - SHAFT_W / 2], [PX[0] + SHAFT_W / 2, PX[1] - SHAFT_W / 2], [PX[1] + SHAFT_W / 2, PX[2] - SHAFT_W / 2], [PX[2] + SHAFT_W / 2, PX[3] - SHAFT_W / 2], [PX[3] + SHAFT_W / 2, BANK]];
  const N = 9, T = 0.28, RISE = 1.19, ys = -DECK_H - T - RISE;
  let keystone = null;
  const arches = spans.map(([xa, xb], ai) => {
    const a = (xb - xa) / 2, xm = (xa + xb) / 2, list = [];
    const P = (th, off) => {
      const nx = Math.cos(th) / a, ny = Math.sin(th) / RISE, l = Math.hypot(nx, ny);
      return new THREE.Vector2(xm + a * Math.cos(th) + nx / l * off, ys + RISE * Math.sin(th) + ny / l * off);
    };
    for (let j = 0; j < N; j++) {
      const t0 = Math.PI - j * Math.PI / N - 0.006, t1 = Math.PI - (j + 1) * Math.PI / N + 0.006;
      const pts = [P(t0, 0), P(t1, 0), P(t1, T), P(t0, T)];
      const c = pts.reduce((s, p) => s.add(p), new THREE.Vector2()).multiplyScalar(0.25);
      const shape = new THREE.Shape(pts.map((p) => p.clone().sub(c)));
      const isKey = ai === 2 && j === (N - 1) / 2;
      const depth = isKey ? 1.12 : 1.0;
      const geo = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.01, bevelSegments: 1 });
      geo.translate(0, 0, -depth / 2);
      const m = mesh(geo, isKey ? keyMat : st(), c.x, c.y, 0);
      m.userData.out = new THREE.Vector3(c.x - xm, c.y - ys, 0).normalize();
      m.userData.order = Math.abs(j - (N - 1) / 2);   // springers first, crown last
      if (isKey) keystone = m;
      list.push(m);
    }
    return list;
  });

  // brand tiles
  const tileImgs = await Promise.all(SUPPORTS.map((s) => svgImage(s.tile)));
  const tileGeo = new RoundedBoxGeometry(TILE, TILE, TILE_T, 5, 0.04);
  if (document.fonts) await document.fonts.load('600 48px Montserrat').catch(() => {});
  const tiles = SUPPORTS.map((s, k) => {
    const big = opts.macro === k;
    const c = tileCanvas(tileImgs[k], big ? 2048 : 1024);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = maxAniso;
    const bump = new THREE.CanvasTexture(bumpCanvas(c, big ? 2048 : 512, big));
    const face = new THREE.MeshPhysicalMaterial({ map, bumpMap: bump, bumpScale: big ? 1.6 : 2.2, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.06 });
    const pc = proofCanvas(s.back, 1024);
    const backMap = new THREE.CanvasTexture(pc);
    backMap.colorSpace = THREE.SRGBColorSpace;
    backMap.anisotropy = maxAniso;
    const back = new THREE.MeshStandardMaterial({ map: backMap, bumpMap: new THREE.CanvasTexture(bumpCanvas(pc, 512)), bumpScale: -2.5, roughness: 0.9 });
    const m = new THREE.Mesh(tileGeo, [glazeSide, glazeSide, glazeSide, glazeSide, face, back]);
    m.position.set(PX[k], SEAT_Y, 0);
    m.rotation.z = Math.PI / 4;
    m.castShadow = m.receiveShadow = true;
    m.userData.k = k;
    scene.add(m);
    return home(m);
  });

  // frieze: small glazed tiles along the front of the deck
  const fr = { names: ['blue', 'red', 'apricot', 'yellow', 'graphite'], items: [] };
  const small = new RoundedBoxGeometry(0.2, 0.2, 0.03, 2, 0.012);
  const smallImgs = await Promise.all(fr.names.map((n) => (SUPPORTS.find((s) => s.tile === n) ? tileImgs[SUPPORTS.findIndex((s) => s.tile === n)] : svgImage(n))));
  const pos = [];
  for (let x = -BANK + 0.22; x <= BANK - 0.2; x += 0.31) if (PX.every((p) => Math.abs(x - p) > CAP_W / 2 + 0.12)) pos.push(x);
  const counts = fr.names.map((_, i) => pos.filter((_, n) => n % 5 === i).length);
  fr.meshes = fr.names.map((n, i) => {
    const t = new THREE.CanvasTexture(tileCanvas(smallImgs[i], 256));
    t.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
    const im = new THREE.InstancedMesh(small, [glazeSide, glazeSide, glazeSide, glazeSide, face, glazeSide], counts[i]);
    im.castShadow = true;
    scene.add(im);
    return im;
  });
  const used = fr.names.map(() => 0);
  pos.forEach((x, n) => { const i = n % 5; fr.items.push({ mesh: fr.meshes[i], idx: used[i]++, x, u: n / (pos.length - 1) }); });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  fr.set = (it, u) => {          // u: 0 hidden, 1 in place; tiles flip up into the deck face like cards
    const k = easeOut(u);
    _p.set(it.x, -DECK_H / 2 + (1 - k) * 0.25, DECK_D / 2 + 0.015 + (1 - k) * 0.4);
    _q.setFromEuler(_e.set((1 - k) * -Math.PI / 2, 0, Math.PI / 4));
    _s.setScalar(u <= 0 ? 1e-4 : 0.3 + 0.7 * k);
    it.mesh.setMatrixAt(it.idx, _m.compose(_p, _q, _s));
  };
  fr.update = (fn) => { fr.items.forEach((it) => fr.set(it, fn(it))); fr.meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true)); };
  fr.update(() => 1);

  // ---------- sizing, dynamic resolution, rendering ----------
  let w = 1, h = 1;
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  let acc = 0, n = 0;
  function adapt(dt) {           // keeps the frame rate on weak GPUs by lowering the resolution
    acc += dt; n++;
    if (n < 24) return;
    const avg = acc / n; acc = 0; n = 0;
    if (avg > 0.045 && pr > 0.6) { pr = Math.max(0.6, pr * 0.85); resize(); }
    else if (avg < 0.016 && pr < maxPR) { pr = Math.min(maxPR, pr * 1.1); resize(); }
  }

  const _v = new THREE.Vector3();
  function project(x, y, z) {
    _v.set(x, y, z).project(camera);
    return { x: (_v.x + 1) / 2 * w, y: (1 - _v.y) / 2 * h, on: _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2 };
  }

  function setFogFor(dist) { scene.fog.near = dist * 0.95 + 4; scene.fog.far = dist * 1.9 + 10; }

  return { THREE, renderer, scene, camera, key, floor, banks, piers, deck, arches, keystone, tiles, frieze: fr, project, setFogFor, adapt, resize, size: () => ({ w, h }) };
}

// Scroll progress of a tall track, eased with inertia so a flick plays out as a smooth camera move.
export function scrollDriver(track, rate = 4) {
  const q = new URLSearchParams(location.search);
  const fixed = q.has('p') ? parseFloat(q.get('p')) : null;
  let target = fixed ?? 0, cur = target;
  const read = () => {
    if (fixed !== null) return;
    const r = track.getBoundingClientRect();
    target = clamp01(-r.top / Math.max(1, r.height - innerHeight));
  };
  addEventListener('scroll', read, { passive: true });
  read(); cur = target;
  return {
    step(dt) { cur += (target - cur) * (1 - Math.exp(-dt * rate)); if (Math.abs(target - cur) < 1e-5) cur = target; return cur; },
    get target() { return target; },
    set(v) { target = cur = v; },
  };
}

// Camera path through keyframes {t, p:[x,y,z], l:[x,y,z]}; each leg eases in and out.
export function cameraPath(keys) {
  const P = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.p)), false, 'centripetal');
  const L = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.l)), false, 'centripetal');
  const n = keys.length - 1;
  const look = new THREE.Vector3();
  return (camera, t) => {
    let i = 0;
    while (i < n - 1 && t > keys[i + 1].t) i++;
    const u = ss(keys[i].t, keys[i + 1].t, t);
    const s = (i + u) / n;
    L.getPoint(s, look);
    camera.position.copy(P.getPoint(s));
    // narrow screens: step back so the same shot still fits
    const m = Math.min(2.4, Math.max(1, 1.6 / camera.aspect));
    if (m > 1) camera.position.sub(look).multiplyScalar(m).add(look);
    camera.lookAt(look);
    return camera.position.distanceTo(look);
  };
}

// Overlay: chapter card and bank labels, shared by both prototypes
export function overlay(root) {
  const cards = SUPPORTS.map((s) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = '<p class="num">' + s.num + ' / 04</p><h3>' + s.title + '</h3><p>' + nb(s.text) + '</p>' +
      (s.link ? '<a class="link" href="' + s.link.href + '"' + (s.link.ext ? ' target="_blank" rel="noopener"' : '') + '>' + nb(s.link.label) + (s.link.ext ? ' ↗' : ' →') + '</a>' : '');
    root.appendChild(el);
    return el;
  });
  const banks = ['Ваш капитал', 'Мировые рынки'].map((t) => {
    const el = document.createElement('div');
    el.className = 'bank';
    el.textContent = t;
    root.appendChild(el);
    return el;
  });
  return { cards, banks };
}
