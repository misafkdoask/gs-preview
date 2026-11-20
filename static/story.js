// The first part of the homepage as one pinned screen.
// Scrolling does not move the page here: it turns chapters. On each chapter change the text
// is swapped and the four tiles move to a new arrangement in a short timed animation, so
// nothing is ever left half-way. Tiles can be clicked: a small one opens its chapter,
// the large one turns over.
import { THREE, svgImage, tileCanvas, bumpCanvas, studio } from './scene3d.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const root = document.documentElement;
const st = document.querySelector('.st');
const track = st.querySelector('.st__track');
const stage = st.querySelector('.st__stage');
const panel = st.querySelector('.st__panel');
const canvas = st.querySelector('.st__canvas');
const chaps = Array.from(st.querySelectorAll('.chap'));
const dots = Array.from(st.querySelectorAll('.st__dots button'));
const N = chaps.length;
const header = document.querySelector('.header');
const EN = document.documentElement.lang !== 'ru';   // tile labels follow the page language
const L = (ru, en) => (EN ? en : ru);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const backOut = (u) => { const c = 1.4; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
// The scene is the layout of the first screen, so it runs for everyone with WebGL. With reduced motion
// (or animations turned off in the system) it stays still: tiles jump to their places, nothing sways.
const RM = !root.classList.contains('motion');
// Lab variant "band": the carpets in a wide band above the text on every screen (site/lab/band.html)
const BAND = root.classList.contains('band');
// Preview: the back of the chapter tile. felt = thick felt with a woven border (first version);
// emboss = cream cotton card, the ornament blind-embossed tone on tone; foil = graphite card with gold foil;
// mat = cream card with the small original diamond on top, like a museum label
const FLIP = ((location.search.match(/[?&]flip=(felt|emboss|foil|mat)/) || [])[1]) || 'emboss';
const CARD = FLIP !== 'felt';
if (webglOK()) start().catch((e) => { root.classList.remove('gl'); st.classList.remove('st--live'); console.error(e); });
else root.classList.remove('gl');

async function start() {
  // ---------- 3D ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  const PR_MAX = Math.min(devicePixelRatio || 1, 2);
  let pr = PR_MAX;
  renderer.setPixelRatio(pr);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.03).texture;
  scene.environmentIntensity = 0.8;
  const key = new THREE.DirectionalLight(0xfff6ea, 1.6);
  key.position.set(-4, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.7);
  rim.position.set(5, 3, -6);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 100);
  camera.position.set(0, 0, 12);

  // The four identity elements from the brandbook cover, in the cover's order. They come from
  // Kazakh felt carpets, so they are made of felt here: matte, with a soft sheen and fibres.
  const NAMES = ['cov1', 'cov2', 'cov3', 'cov4'];
  const EDGE = [0xcb3131, 0xffab48, 0xff6948, 0xffd337];  // each felt is dyed through: the edge is its frame colour
  // The backs carry the key point of each chapter, so the fonts must be ready before drawing them
  try { await Promise.all([document.fonts.load('700 100px Montserrat', 'USDАкции'), document.fonts.load('600 30px Montserrat', 'ВАЛЮТА')]); } catch (e) {}
  const geo = CARD ? new RoundedBoxGeometry(1, 1, 0.035, 2, 0.006) : new RoundedBoxGeometry(1, 1, 0.13, 6, 0.05);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const fibres = feltCanvas(512);
  const fibreMap = new THREE.CanvasTexture(fibres);
  const felt = (o) => new THREE.MeshPhysicalMaterial({ roughness: 0.92, metalness: 0, sheen: 1, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xfff4e6), bumpMap: fibreMap, bumpScale: 1.2, ...o });
  // Plain felt back without text: shown while the tiles rise, so no half-read key points flash by
  const plainMap = new THREE.CanvasTexture(backCanvas(0, 1024, true));
  plainMap.colorSpace = THREE.SRGBColorSpace;
  plainMap.anisotropy = aniso;
  const imgs = await Promise.all(NAMES.map(svgImage));
  const tiles = imgs.map((im, i) => {
    const c = tileCanvas(im, 1024);
    feltize(c, fibres);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = aniso;
    const face = felt({ map });
    const backMap = new THREE.CanvasTexture(backCanvas(i, 1024, false, im));
    backMap.colorSpace = THREE.SRGBColorSpace;
    backMap.anisotropy = aniso;
    const side = felt({ color: EDGE[i] });
    const mesh = new THREE.Mesh(geo, [side, side, side, side, face, CARD ? new THREE.MeshStandardMaterial({ map: backMap, roughness: FLIP === 'foil' ? 0.55 : 0.85, bumpMap: FLIP === 'emboss' ? backMap : null, bumpScale: 2.2 }) : felt({ map: backMap })]);
    mesh.userData.i = i;
    scene.add(mesh);
    return { mesh, i, mats: { face, back: mesh.material[5] }, backMap, cur: null, from: null, to: null, t0: 0, dur: 1100, entry: false, hov: 0, flip: 0, flipT: 0, broken: false, dragging: false };
  });

  // ---------- arrangements (world units; the panel is 6.43 units tall) ----------
  const VIS_H = 2 * 12 * Math.tan((15 * Math.PI) / 180);
  let g = 1;
  // First screen: the brandbook cover, a row of four diamonds laid over one another,
  // each next one a little closer, like felts stacked on a chest.
  const HERO = [
    { dy: 0.0, z: 0.0, rx: 0.05, ry: 0.16 },
    { dy: 0.03, z: 0.22, rx: -0.03, ry: 0.07 },
    { dy: -0.02, z: 0.44, rx: 0.04, ry: -0.05 },
    { dy: 0.02, z: 0.66, rx: -0.03, ry: -0.14 },
  ];
  const STEP = 0.467;                                  // centre spacing as a share of a diamond's width, as on the cover
  const QUAD = [[-0.5, 0], [0, 0.5], [0, -0.5], [0.5, 0]];
  // turn: 0 shows the glazed pattern, PI shows the back with the chapter's key point
  function arrangement(k) {
    return arrangement0(k);
  }
  function arrangement0(k) {
    const wideShort = BAND || innerWidth < 768;             // phones: a low, wide panel above the text (CSS switches at 768 too); wide desktops keep the side layout
    const visW = VIS_H * camera.aspect;
    if (BAND && innerWidth >= 768) {                  // lab variant: a wide band above the text
      if (k === 0) {
        const dg = Math.min(VIS_H * 0.62, (visW - 2) / (1 + 3 * STEP)), s = dg / Math.SQRT2;
        return HERO.map((c, j) => ({ x: (j - 1.5) * STEP * dg, y: c.dy * s, z: c.z, s, rx: c.rx * 0.6, ry: c.ry * 0.6, turn: 0, sq: 0, focus: false }));
      }
      if (k >= 1 && k <= 4) {
        const f = k - 1, S = VIS_H * 0.7;
        let n = 0;
        return [0, 1, 2, 3].map((j) => {
          const shift = (1.6 + 2 * 2.0 + 0.7) / 2;           // centre the card with the three small tiles beside it
          if (j === f) return { x: -shift, y: 0, z: 0.4, s: S, rx: 0.02, ry: -0.04, turn: Math.PI, sq: 1, focus: true };
          const o = n++;
          return { x: S / 2 + 1.6 + o * 2.0 - shift, y: 0.1, z: 0, s: 0.95, rx: 0, ry: 0, turn: 0, sq: 0, focus: false };
        });
      }
      const s = VIS_H * 0.27, D = s * Math.SQRT2 * 1.004;
      return QUAD.map((q) => ({ x: q[0] * D, y: q[1] * D, z: 0.2, s, rx: 0, ry: 0, turn: 0, sq: 0, focus: false }));
    }
    if (k === 0) {
      const span = 1 + 3 * STEP;                       // row width in diamond widths
      const dg = Math.min(VIS_H * (wideShort ? 0.34 : 0.21), (visW - (wideShort ? 1.4 : 0.9)) / span);
      const s = dg / Math.SQRT2;
      return HERO.map((c, j) => ({ x: (j - 1.5) * STEP * dg, y: (wideShort ? 0 : 0.1) + c.dy * s, z: c.z, s, rx: c.rx, ry: c.ry, turn: 0, sq: 0, focus: false }));
    }
    if (k >= 1 && k <= 4) {
      const f = k - 1;
      let n = 0;
      return [0, 1, 2, 3].map((j) => {
        // the chapter's tile turns over and squares up (the geometry of the mark's frame), so the key point
        // on its back reads level and at full width
        if (j === f) {
          return wideShort
            ? { x: -visW * 0.1, y: 0, z: 0.3, s: VIS_H * 0.5, rx: 0.03, ry: -0.06, turn: Math.PI, sq: 1, focus: true }
            : { x: 0, y: 0.28 * g, z: 0.5, s: 1.7 * g, rx: 0.03, ry: -0.06, turn: Math.PI, sq: 1, focus: true };
        }
        const o = n++;
        return wideShort
          ? { x: visW / 2 - 1.0, y: 1.25 - o * 1.25, z: 0, s: 0.55, rx: 0, ry: 0, turn: 0, sq: 0, focus: false }
          : { x: (j - 1.5) * 0.95 * g, y: -2.45 * g, z: 0, s: 0.5 * g, rx: 0, ry: 0, turn: 0, sq: 0, focus: false };
      });
    }
    const s = (wideShort ? 1.3 : 1.12 * g), D = s * Math.SQRT2 * 1.004;   // four diamonds close into one: only the seams between them show
    return QUAD.map((q) => ({ x: q[0] * D, y: 0.15 * g + q[1] * D, z: 0.2, s, rx: 0, ry: 0, turn: 0, sq: 0, focus: false }));
  }

  // ---------- chapters and scroll ----------
  let L = 1, hdr = 64, cur = -1, W = 1, H = 1, arrived = -1;
  const snaps = [];
  track.style.position = 'relative';
  for (let k = 0; k < N; k++) {
    const s = document.createElement('div');
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;left:0;width:1px;height:1px;scroll-snap-align:start;pointer-events:none';
    track.appendChild(s);
    snaps.push(s);
  }
  st.classList.add('st--live');
  root.style.scrollSnapType = 'y proximity';

  // ---------- finale: the four felts close into one and are stitched round with a cord,
  // then signed with a woven tag carrying the mark (as a label sewn onto a syrmak) ----------
  const SVGNS = 'http://www.w3.org/2000/svg';
  const seam = document.createElementNS(SVGNS, 'svg');
  seam.setAttribute('class', 'st__seam');
  seam.setAttribute('aria-hidden', 'true');
  seam.innerHTML = '<path class="st__cord"/><path class="st__cord st__cord--in"/><g class="st__tag"><rect/><use href="#mark"/></g>';
  panel.appendChild(seam);
  const cords = seam.querySelectorAll('.st__cord'), tagG = seam.querySelector('.st__tag');
  const tagRect = tagG.querySelector('rect'), tagUse = tagG.querySelector('use');
  let seamAt = 0;
  const sv = new THREE.Vector3();
  const toPx = (x, y, z) => { sv.set(x, y, z).project(camera); return [((sv.x + 1) / 2) * W, ((1 - sv.y) / 2) * H]; };
  function placeSeam() {
    const a = arrangement(5), s = a[0].s, z = a[0].z + 0.07;
    const cy = a.reduce((m, t) => m + t.y, 0) / 4;
    const R = Math.max(...a.map((t) => Math.hypot(t.x, t.y - cy))) + s * Math.SQRT1_2;
    const path = (r) => {
      const p = [toPx(0, cy + r, z), toPx(r, cy, z), toPx(0, cy - r, z), toPx(-r, cy, z)];
      return 'M' + p.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') + ' Z';
    };
    seam.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    cords[0].setAttribute('d', path(R + 0.05));
    cords[1].setAttribute('d', path(R - 0.11));
    cords.forEach((c) => c.style.setProperty('--len', c.getTotalLength().toFixed(1)));
    const c = toPx(0, cy, z), k = Math.max(34, Math.min(52, W * 0.07));
    tagRect.setAttribute('x', (c[0] - k / 2).toFixed(1)); tagRect.setAttribute('y', (c[1] - k / 2).toFixed(1));
    tagRect.setAttribute('width', k.toFixed(1)); tagRect.setAttribute('height', k.toFixed(1));
    const m = k * 0.64;
    tagUse.setAttribute('x', (c[0] - m / 2).toFixed(1)); tagUse.setAttribute('y', (c[1] - m / 2).toFixed(1));
    tagUse.setAttribute('width', m.toFixed(1)); tagUse.setAttribute('height', m.toFixed(1));
    tagG.style.transformOrigin = c[0].toFixed(1) + 'px ' + c[1].toFixed(1) + 'px';
  }
  function hideSeam() { seam.classList.remove('is-on'); seamAt = 0; }

  function layout() {
    hdr = header.getBoundingClientRect().height;
    L = Math.round(innerHeight * 0.85);
    track.style.height = ((N - 1) * L + stage.offsetHeight) + 'px';
    // html has scroll-padding-top: header + 16px, so each snap point sits 16px lower.
    // The first one snaps to the very top of the page, so the topbar with the risk line stays in view.
    const lead = track.getBoundingClientRect().top + scrollY - hdr;
    snaps.forEach((s, k) => { s.style.top = (k * L + 16 - (k ? 0 : lead + 4)) + 'px'; });   // a few px above 0, the browser clamps
    W = panel.clientWidth; H = panel.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / Math.max(1, H);
    camera.updateProjectionMatrix();
    g = Math.min(1, (VIS_H * camera.aspect) / 6.2);
    if (cur === 5 && seam.classList.contains('is-on')) placeSeam();
    if (cur >= 0) {                                    // a tile still on its way keeps moving, toward the new place
      const a = arrangement(cur), now = performance.now();
      tiles.forEach((t, i) => { t.to = a[i]; if (now > t.t0 + t.dur) t.cur = t.from = a[i]; });
    }
  }
  addEventListener('resize', layout);
  if (document.fonts) document.fonts.ready.then(layout);
  layout();

  const trackTop = () => track.getBoundingClientRect().top + scrollY;
  function goTo(k, behavior = 'smooth') { scrollTo({ top: k ? trackTop() - hdr + k * L : 0, behavior }); }
  // One wheel gesture turns one chapter, so a fast flick cannot skip a tile. Momentum keeps the lock on until the
  // gesture stops. Leaving the finale waits until the cord has run round the stitched diamond.
  let wheelLock = 0, leaveAt = 0;
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || cur < 0) return;
    const r = track.getBoundingClientRect();
    if (r.top > hdr + 60 || r.bottom < innerHeight) return;          // the scene is not on screen
    const dir = Math.sign(e.deltaY);
    if (!dir || (dir < 0 && cur === 0)) return;
    const now = performance.now();
    if (dir > 0 && cur === N - 1 && now >= leaveAt) return;            // after the finale the page scrolls on
    e.preventDefault();
    if (now < wheelLock) { wheelLock = Math.max(wheelLock, now + 220); return; }
    wheelLock = now + (RM ? 450 : 1000);
    const k = clamp(cur + dir, 0, N - 1);
    if (k !== cur) goTo(k);
  }, { passive: false });
  [...dots, ...st.querySelectorAll('.st__next')].forEach((d) => d.addEventListener('click', () => goTo(+d.dataset.go)));
  st.addEventListener('focusin', (e) => {           // keyboard: focusing a link in another chapter opens that chapter
    const c = e.target.closest('.chap');
    if (c && +c.dataset.chap !== cur) goTo(+c.dataset.chap, 'instant');
  });

  function setChapter(k, now) {
    if (k === cur) return;
    const prev = cur;
    cur = k;
    st.dataset.chap = k;
    if (k === 5) seamAt = now + TW + 300; else hideSeam();
    if (k === N - 1) leaveAt = now + TW + 300 + 1400;
    chaps.forEach((c, i) => { c.classList.toggle('is-on', i === k); c.toggleAttribute('inert', i !== k); });
    dots.forEach((d, i) => { if (i === k) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
    const a = arrangement(k);
    tiles.forEach((t, i) => {
      t.flipT = 0;
      if (!t.cur || prev < 0) {
        // Arrival: the tiles rise from below the panel one after another, clay back first,
        // and turn their glaze to the reader as they settle
        const to = a[i];
        t.from = { x: to.x * 0.85, y: to.y - VIS_H * 1.15, z: to.z - 1.5, s: to.s * 0.9, rx: to.rx + 0.5, ry: to.ry - 0.3, turn: to.turn + Math.PI, sq: to.sq, focus: false };
        t.cur = { ...t.from };
        t.to = to;
        t.t0 = now + 250 + i * 190;
        t.dur = 1900;
        t.entry = true;
        if (RM) { t.from = { ...to }; t.cur = { ...to }; t.t0 = now - 10; t.dur = 1; }
        arrived = now;
        return;
      }
      t.from = { ...t.cur };
      t.to = a[i];
      t.entry = false; t.spring = false;
      t.dur = TW;
      // the tile that comes forward goes last, then turns over to show its key point
      t.t0 = now + (a[i].focus ? 140 : i * 60);
    });
  }
  let pinned = -1;                                   // debug: a chapter shown without scrolling (screenshots)
  function chapterFromScroll(now) {
    if (pinned >= 0) return;
    const p = (hdr - track.getBoundingClientRect().top) / L;
    const k = clamp(Math.round(p), 0, N - 1);
    if (cur < 0 || Math.abs(p - cur) > 0.55) setChapter(k, now);
  }

  // ---------- pointer: hover, click, drag. A dragged tile that touches the panel edge breaks;
  // clicking the pieces puts it back together. ----------
  let mx = 0, my = 0, smx = 0, smy = 0, hovered = -1, overShard = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  const fine = matchMedia('(pointer: fine)').matches;   // mouse or pen: dragging on; phones keep scrolling
  if (fine) canvas.style.touchAction = 'none';
  const DRAG_Z = 1.2, TAN = Math.tan((15 * Math.PI) / 180);
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -DRAG_Z), hitP = new THREE.Vector3();
  let drag = null;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function setNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  canvas.addEventListener('pointerleave', () => { if (!drag) ndc.set(-9, -9); });
  function pick() {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(tiles.filter((t) => !t.broken).map((t) => t.mesh), false)[0];
    return hit ? hit.object.userData.i : -1;
  }
  function pickShard() {
    if (!shards.length) return false;
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(shards, true).length > 0;
  }
  function planePoint() {
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(dragPlane, hitP) ? hitP : null;
  }
  canvas.addEventListener('pointerdown', (e) => {
    setNdc(e);
    if (pickShard()) { restore(performance.now()); return; }
    const i = pick();
    if (i < 0) return;
    const t = tiles[i], p = planePoint();
    if (!p) return;
    const m = t.mesh.position;
    drag = { i, id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, ox: p.x - m.x, oy: p.y - m.y, x: m.x, y: m.y, tx: m.x, ty: m.y, vx: 0, vy: 0, rx: 0, ry: 0, s: t.cur.s, touch: e.pointerType === 'touch' };
    if (fine) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    setNdc(e);
    if (!drag || drag.touch) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    if (!drag.moved) { drag.moved = true; tiles[drag.i].dragging = true; hint(''); hintState.dragged = true; hideSeam(); }
    const p = planePoint();
    if (p) { drag.tx = p.x - drag.ox; drag.ty = p.y - drag.oy; }
  });
  function endDrag(cancelled) {
    if (!drag) return;
    const d = drag, t = tiles[d.i];
    drag = null;
    t.dragging = false;
    if (t.broken) return;
    if (!d.moved) {
      if (cancelled) return;
      if (cur === d.i + 1) { t.flipT = t.flipT ? 0 : 1; }   // the large tile turns over
      else goTo(d.i + 1);                                // any other tile opens its chapter
      return;
    }
    t.from = { ...t.cur };                               // let go: it floats back to its place
    t.to = arrangement(cur)[d.i];
    t.t0 = performance.now();
    t.dur = TW; t.entry = false; t.spring = true;   // springs back with a little overshoot
    if (cur === 5) seamAt = performance.now() + TW + 200;
  }
  canvas.addEventListener('pointerup', () => endDrag(false));
  canvas.addEventListener('pointercancel', () => endDrag(true));

  // ---------- breaking and mending ----------
  const shards = [];
  let mending = false;
  const shardSide = new THREE.MeshStandardMaterial({ color: 0xe3cfb6, roughness: 0.95 });   // broken edge: bare clay
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const SH_D = 0.16;
  function centroid(p) { let x = 0, y = 0; p.forEach((v) => { x += v[0]; y += v[1]; }); return [x / p.length, y / p.length]; }
  function area(p) { let a = 0; for (let k = 0; k < p.length; k++) { const q = p[k], r = p[(k + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return Math.abs(a) / 2; }
  function cut(p, o, n) {
    const A = [], B = [];
    for (let k = 0; k < p.length; k++) {
      const a = p[k], b = p[(k + 1) % p.length];
      const da = (a[0] - o[0]) * n[0] + (a[1] - o[1]) * n[1], db = (b[0] - o[0]) * n[0] + (b[1] - o[1]) * n[1];
      (da >= 0 ? A : B).push(a);
      if (da * db < 0) { const s = da / (da - db), q = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]; A.push(q); B.push(q); }
    }
    return [A, B];
  }
  function pieces() {                                    // four rounds of random cuts: up to 16 pieces
    let polys = [[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]];
    for (let level = 0; level < 4; level++) {
      const next = [];
      polys.forEach((p) => {
        const c = centroid(p), a = Math.random() * Math.PI;
        const [A, B] = cut(p, [c[0] + (Math.random() - 0.5) * 0.12, c[1] + (Math.random() - 0.5) * 0.12], [Math.cos(a), Math.sin(a)]);
        if (A.length > 2 && B.length > 2 && area(A) > 0.012 && area(B) > 0.012) next.push(A, B); else next.push(p);
      });
      polys = next;
    }
    return polys;
  }
  function shardGroup(poly, c, t) {
    const shape = new THREE.Shape(poly.map((v) => new THREE.Vector2(v[0] - c[0], v[1] - c[1])));
    const sideGeo = new THREE.ExtrudeGeometry(shape, { depth: SH_D, bevelEnabled: false });
    sideGeo.translate(0, 0, -SH_D / 2);
    const front = new THREE.ShapeGeometry(shape);
    const fp = front.attributes.position, fu = front.attributes.uv;
    for (let k = 0; k < fp.count; k++) { const x = fp.getX(k), y = fp.getY(k); fp.setZ(k, SH_D / 2 + 0.001); fu.setXY(k, x + c[0] + 0.5, y + c[1] + 0.5); }
    const back = front.clone();
    const bp = back.attributes.position, bu = back.attributes.uv, bn = back.attributes.normal;
    for (let k = 0; k < bp.count; k++) { const x = bp.getX(k), y = bp.getY(k); bp.setZ(k, -SH_D / 2 - 0.001); bu.setXY(k, 0.5 - (x + c[0]), y + c[1] + 0.5); bn.setXYZ(k, 0, 0, -1); }
    const idx = back.index.array;
    for (let k = 0; k < idx.length; k += 3) { const tmp = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = tmp; }
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(sideGeo, [hidden, shardSide]));
    grp.add(new THREE.Mesh(front, t.mats.face));
    grp.add(new THREE.Mesh(back, t.mats.back));
    return grp;
  }
  const tmpM = new THREE.Matrix4(), tmpT = new THREE.Matrix4(), tmpV = new THREE.Vector3();
  function shatter(i, nx, ny) {
    const t = tiles[i];
    t.broken = true; t.dragging = false;
    if (drag && drag.i === i) { try { canvas.releasePointerCapture(drag.id); } catch (e) {} drag = null; }
    t.mesh.updateMatrixWorld();
    const vx = t.vx || 0, vy = t.vy || 0;
    pieces().forEach((poly) => {
      const c = centroid(poly), grp = shardGroup(poly, c, t);
      tmpM.copy(t.mesh.matrixWorld).multiply(tmpT.makeTranslation(c[0], c[1], 0));
      tmpM.decompose(grp.position, grp.quaternion, grp.scale);
      tmpV.set(c[0], c[1], 0).applyQuaternion(t.mesh.quaternion);   // pieces fly apart from the centre
      grp.userData = {
        tile: i, c,
        v: new THREE.Vector3(vx * 0.25 + tmpV.x * 5 + nx * 2.5 + (Math.random() - 0.5), vy * 0.25 + tmpV.y * 5 + ny * 2.5 + 2 + Math.random() * 2, (Math.random() - 0.3) * 3),
        w: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8),
      };
      scene.add(grp);
      shards.push(grp);
    });
    t.mesh.visible = false;
    hintState.broken = true;
    hint(L('Нажмите на осколки, чтобы собрать плитку', 'Click the pieces to put the tile back together'));
  }
  const homeObj = new THREE.Object3D();
  function restore(now) {
    if (!shards.length || mending) return;
    mending = true;
    const a = arrangement(cur);
    shards.forEach((sh) => {
      const p = a[sh.userData.tile];
      homeObj.position.set(p.x, p.y, p.z);
      homeObj.scale.setScalar(p.s);
      qa.setFromEuler(eu.set(p.rx, p.ry, Math.PI / 4));
      qy.setFromAxisAngle(Y, p.turn);
      homeObj.quaternion.copy(qy).multiply(qa);
      homeObj.updateMatrix();
      tmpM.copy(homeObj.matrix).multiply(tmpT.makeTranslation(sh.userData.c[0], sh.userData.c[1], 0));
      const to = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() };
      tmpM.decompose(to.p, to.q, to.s);
      sh.userData.mend = { t0: now + Math.random() * 200, p: sh.position.clone(), q: sh.quaternion.clone(), to };
    });
    hint('');
  }
  function stepShards(dt, now) {
    if (!shards.length) return;
    const halfH = 12 * TAN, halfW = halfH * camera.aspect, floor = -halfH + 0.12;
    let done = 0;
    shards.forEach((sh) => {
      const d = sh.userData;
      if (d.mend) {                                      // flying back into one tile
        const u = clamp((now - d.mend.t0) / 900, 0, 1), e = ease(u);
        sh.position.lerpVectors(d.mend.p, d.mend.to.p, e);
        sh.position.z += Math.sin(Math.PI * e) * 1.2;
        sh.quaternion.slerpQuaternions(d.mend.q, d.mend.to.q, e);
        if (u >= 1) done++;
        return;
      }
      d.v.y -= 14 * dt;
      sh.position.addScaledVector(d.v, dt);
      d.v.z *= 0.97;
      sh.position.z = clamp(sh.position.z, -1.5, 2);
      if (sh.position.y < floor) {                       // land on the bottom of the panel and settle
        sh.position.y = floor;
        d.v.y = Math.abs(d.v.y) > 0.6 ? -d.v.y * 0.3 : 0;
        d.v.x *= 0.7;
        d.w.multiplyScalar(0.7);
      }
      if (Math.abs(sh.position.x) > halfW - 0.15) { sh.position.x = Math.sign(sh.position.x) * (halfW - 0.15); d.v.x *= -0.4; }
      const wl = d.w.length();
      if (wl > 0.01) { qy.setFromAxisAngle(tmpV.copy(d.w).divideScalar(wl), wl * dt); sh.quaternion.premultiply(qy); }
    });
    if (mending && done === shards.length) {           // whole again
      shards.forEach((sh) => { scene.remove(sh); sh.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); });
      shards.length = 0;
      mending = false;
      const a = arrangement(cur);
      tiles.forEach((t, i) => {
        if (!t.broken) return;
        t.broken = false; t.mesh.visible = true; t.flip = t.flipT = 0;
        t.cur = t.from = t.to = a[i]; t.t0 = 0; t.entry = false;
      });
      hintState.broken = false;
    }
  }

  // Small hint in the panel (mouse only)
  const hintEl = document.createElement('p');
  hintEl.className = 'st__hint';
  panel.appendChild(hintEl);
  const hintState = { dragged: false, broken: false };
  function hint(s) { hintEl.textContent = s; hintEl.classList.toggle('is-on', !!s); }

  // Names under the small tiles: the other chapters, so a small tile reads as a way there
  const NAMES_RU = EN ? ['Structure', 'Deals', 'Contact', 'Result'] : ['Структура', 'Сделки', 'Связь', 'Результат'];
  const tl = NAMES_RU.map((s) => { const p = document.createElement('p'); p.className = 'st__tl'; p.setAttribute('aria-hidden', 'true'); p.textContent = s; panel.appendChild(p); return p; });
  const pv = new THREE.Vector3();
  function placeNames(now) {
    tiles.forEach((t, i) => {
      const on = cur >= 1 && cur <= 4 && !t.to.focus && !t.broken && !t.dragging && now > t.t0 + t.dur * 0.8;
      tl[i].classList.toggle('is-on', on);
      tl[i].classList.toggle('is-hot', on && hovered === i);
      if (!on) return;
      const m = t.mesh;
      pv.set(m.position.x, m.position.y - m.scale.x * Math.SQRT1_2 - 0.1, m.position.z).project(camera);
      tl[i].style.transform = 'translate(' + ((pv.x + 1) / 2 * W).toFixed(1) + 'px,' + ((1 - pv.y) / 2 * H + 6).toFixed(1) + 'px) translateX(-50%)';
    });
  }

  // ---------- frame ----------
  const TW = RM ? 1 : 1100;
  const qa = new THREE.Quaternion(), qy = new THREE.Quaternion(), eu = new THREE.Euler(), Y = new THREE.Vector3(0, 1, 0);
  let last = performance.now(), time = 0, slow = 0, fast = 0, navLift = -1;
  const nav = st.querySelector('.st__nav');
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now; time += dt;
    chapterFromScroll(now);
    const sr = stage.getBoundingClientRect();
    if (sr.bottom < 0 || sr.top > innerHeight) return;     // story scrolled away: no GPU work
    // at the very top the topbar pushes the stage down a little: lift the nav so it stays on screen
    const lift = Math.max(0, Math.round(sr.bottom - innerHeight));
    if (lift !== navLift) { navLift = lift; nav.style.transform = lift ? `translateY(${-lift}px)` : ''; }
    smx += (mx - smx) * (1 - Math.exp(-dt * 3));
    smy += (my - smy) * (1 - Math.exp(-dt * 3));
    hovered = drag ? drag.i : pick();
    overShard = !drag && pickShard();
    canvas.classList.toggle('is-hover', hovered >= 0 && !drag);
    canvas.classList.toggle('is-drag', !!(drag && drag.moved));
    canvas.classList.toggle('is-shard', overShard);
    if (fine && !hintState.dragged && !hintState.broken) hint('');
    stepShards(dt, now);

    tiles.forEach((t, i) => {
      if (t.broken) return;
      if (t.dragging && drag && drag.i === i) {          // follows the pointer, leaning into the movement
        const k = 1 - Math.exp(-dt * 16);
        const nx = drag.x + (drag.tx - drag.x) * k, ny = drag.y + (drag.ty - drag.y) * k;
        t.vx = dt > 0 ? (nx - drag.x) / dt : 0; t.vy = dt > 0 ? (ny - drag.y) / dt : 0;
        drag.x = nx; drag.y = ny;
        drag.rx += (clamp(-t.vy * 0.06, -0.7, 0.7) - drag.rx) * (1 - Math.exp(-dt * 10));
        drag.ry += (clamp(t.vx * 0.06, -0.7, 0.7) - drag.ry) * (1 - Math.exp(-dt * 10));
        const b = t.cur;
        t.cur = { x: nx, y: ny, z: DRAG_Z, s: drag.s, rx: drag.rx, ry: drag.ry, turn: b.turn, sq: b.sq || 0, focus: b.focus };
        const m = t.mesh;
        m.position.set(nx, ny, DRAG_Z);
        m.scale.setScalar(drag.s * 1.04);
        qa.setFromEuler(eu.set(drag.rx, drag.ry, (Math.PI / 4) * (1 - (b.sq || 0))));
        qy.setFromAxisAngle(Y, b.turn + t.flip * Math.PI);
        m.quaternion.copy(qy).multiply(qa);
        // the panel edge holds it: the tile stops there instead of leaving or breaking
        const halfH = (12 - DRAG_Z) * TAN, halfW = halfH * camera.aspect, hd = drag.s * (b.sq ? 0.5 : Math.SQRT1_2);
        drag.x = clamp(drag.x, -halfW + hd, halfW - hd); drag.y = clamp(drag.y, -halfH + hd, halfH - hd);
        drag.tx = clamp(drag.tx, -halfW + hd, halfW - hd); drag.ty = clamp(drag.ty, -halfH + hd, halfH - hd);
        m.position.set(drag.x, drag.y, DRAG_Z);
        return;
      }
      const u = clamp((now - t.t0) / t.dur, 0, 1);
      // while rising with its back to the reader, a tile that will settle glaze up shows plain clay;
      // the key point is swapped in once the back has turned away
      const backTex = t.entry && u < 1 && t.to.turn < 1 ? plainMap : t.backMap;
      if (t.mats.back.map !== backTex) t.mats.back.map = backTex;
      const e = t.entry ? 1 - Math.pow(1 - u, 3) : t.spring ? backOut(u) : ease(u);   // arrival lands softly, chapter moves ease both ways
      const f = t.from, to = t.to, b = {};
      for (const k of ['x', 'y', 'z', 's', 'rx', 'ry']) b[k] = f[k] + (to[k] - f[k]) * e;
      // the turn starts once the tile has lifted, and finishes as it settles
      const et = t.entry ? ease(clamp((u - 0.1) / 0.75, 0, 1)) : ease(clamp((u - 0.2) / 0.8, 0, 1));
      b.turn = f.turn + (to.turn - f.turn) * et;
      b.sq = (f.sq || 0) + ((to.sq || 0) - (f.sq || 0)) * et;
      b.focus = to.focus && u > 0.5;
      t.cur = b;
      const arc = t.entry ? 0 : Math.sin(Math.PI * e) * 0.9;   // rises toward the reader while it moves
      t.hov += ((hovered === i ? 1 : 0) - t.hov) * (1 - Math.exp(-dt * 8));
      t.flip = RM ? t.flipT : t.flip + (t.flipT - t.flip) * (1 - Math.exp(-dt * 5));
      const sway = RM || cur === 5 ? 0 : 1;                    // stitched together in the finale: they lie still
      const bob = Math.sin(time * 0.9 + i * 1.7) * 0.05 * sway;
      const look = (to.focus ? 1 : cur === 0 ? 0.6 : 0.25) * sway;  // large tiles follow the pointer more
      const rx = b.rx + smy * 0.35 * look + Math.sin(time * 0.6 + i) * 0.03 * sway;
      const ry = b.ry + smx * 0.5 * look + Math.cos(time * 0.5 + i * 1.3) * 0.04 * sway;
      const m = t.mesh;
      m.position.set(b.x, b.y + bob * 0.4, b.z + arc + bob + t.hov * 0.35);
      m.scale.setScalar(b.s * (1 + t.hov * 0.05));
      qa.setFromEuler(eu.set(rx, ry, (Math.PI / 4) * (1 - b.sq)));
      qy.setFromAxisAngle(Y, b.turn + t.flip * Math.PI);
      m.quaternion.copy(qy).multiply(qa);
    });

    placeNames(now);
    if (seamAt && now > seamAt) { placeSeam(); seam.classList.add('is-on'); seamAt = 0; }

    // Felt has no glint: only a very slow drift of the light across the wool.
    // The studio around the tiles turns; the lights stay put, so nothing flickers.
    const gl = arrived < 0 ? 0 : clamp((now - arrived - 900) / 2600, 0, 1);
    scene.environmentRotation.y = RM ? 0 : Math.sin(time * 0.12) * 0.12;

    const ms = dt * 1000;
    if (ms > 40) { slow++; fast = 0; } else if (ms < 18) { fast++; slow = 0; }
    if (slow > 20 && pr > 0.75) { pr = Math.max(0.75, pr * 0.85); renderer.setPixelRatio(pr); renderer.setSize(W, H, false); slow = 0; }
    if (fast > 120 && pr < PR_MAX) { pr = Math.min(PR_MAX, pr * 1.15); renderer.setPixelRatio(pr); renderer.setSize(W, H, false); fast = 0; }
    renderer.render(scene, camera);
  }
  function loop(now) { frame(now); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  // Debug hooks for checking frames in a hidden preview pane
  window.__story = {
    pin(k) { pinned = k; setChapter(k, performance.now()); },
    go(k) { goTo(k, 'instant'); },
    settle() { const t = performance.now() + 5000; tiles.forEach((x) => { x.t0 = t - 5000 - TW; }); frame(t); },
    frame() { frame(performance.now()); },
    back(i) { return tiles[i].backMap.image.toDataURL('image/png'); },
    chapter: () => cur,
    shatter(i) { shatter(i, 1, 0); },
    restore() { restore(performance.now()); },
    shards: () => shards.length,
  };
}

// Felt fibres: thousands of short curly strokes, used as a bump map and blended into the colours.
function feltCanvas(N) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, N, N);
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.lineCap = 'round';
  for (let k = 0; k < 9000; k++) {
    let x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI * 2;
    const v = Math.round(60 + rnd() * 140);
    g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.25 + rnd() * 0.35).toFixed(2) + ')';
    g.lineWidth = 0.6 + rnd() * 0.9;
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 4; s++) { a += (rnd() - 0.5) * 1.6; x += Math.cos(a) * N * 0.008; y += Math.sin(a) * N * 0.008; g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}
// Blend the fibres into a printed pattern so the colour itself looks pressed into wool, not printed on glass.
function feltize(c, fibres) {
  const g = c.getContext('2d');
  g.save();
  g.globalCompositeOperation = 'soft-light';
  g.globalAlpha = 0.55;
  for (let y = 0; y < c.height; y += fibres.height) for (let x = 0; x < c.width; x += fibres.width) g.drawImage(fibres, x, y);
  g.restore();
  return c;
}

// Back of a tile: light undyed felt with a border in the tile's colour and the chapter's key point.
// When a tile turns over it also squares up, so the back is drawn level and uses the full width.
const BACK_EDGE = ['#cb3131', '#e8962f', '#ff6948', '#d9a91c'];
function backCanvas(i, N, plain = false, img = null) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const u = N / 1024;
  const DARK = FLIP === 'foil', GOLD = '#C9A45C';
  const INK = DARK ? '#F2EEE4' : '#25282D', MUTED = DARK ? 'rgba(242, 238, 228, .66)' : 'rgba(37, 40, 45, .62)', ACC = DARK ? GOLD : '#B83F27', LINE = DARK ? 'rgba(245, 244, 237, .3)' : 'rgba(37, 40, 45, .3)';
  g.fillStyle = DARK ? '#26292e' : CARD ? '#f3efe6' : '#ece5d8';
  g.fillRect(0, 0, N, N);
  if (CARD) {
    const orn = img ? tileCanvas(img, N) : null;
    if (orn && FLIP !== 'mat') {                 // the tile's own ornament pressed into the card, tone on tone
      g.save();
      g.globalAlpha = DARK ? 0.06 : 0.07;
      g.filter = DARK ? 'grayscale(1) brightness(2.2)' : 'grayscale(1) contrast(1.6)';
      g.globalCompositeOperation = DARK ? 'screen' : 'multiply';
      g.drawImage(orn, 0, 0, N, N);
      g.restore();
    }
    if (orn && FLIP === 'mat') {                 // the original diamond in colour, small, as on a museum label
      const s = 150 * u;
      g.save(); g.translate(N / 2, 205 * u); g.rotate(Math.PI / 4); g.drawImage(orn, -s / 2, -s / 2, s, s); g.restore();
    }
    g.strokeStyle = DARK ? GOLD : 'rgba(37, 40, 45, .32)'; g.lineWidth = (DARK ? 3 : 2.5) * u;
    g.strokeRect(64 * u, 64 * u, N - 128 * u, N - 128 * u);
    if (DARK) { g.lineWidth = 1.5 * u; g.strokeRect(80 * u, 80 * u, N - 160 * u, N - 160 * u); }
  } else {
  // a woven border, as on a syrmak: a band in the tile's colour with small diamonds along it
  const edge = BACK_EDGE[i] || BACK_EDGE[0];
  const b = 34 * u, m = 58 * u;
  g.fillStyle = edge;
  g.fillRect(m, m, N - 2 * m, b); g.fillRect(m, N - m - b, N - 2 * m, b);
  g.fillRect(m, m, b, N - 2 * m); g.fillRect(N - m - b, m, b, N - 2 * m);
  g.fillStyle = '#ece5d8';
  const step = 56 * u;
  const dia = (x, y, r) => { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill(); };
  for (let t = m + step / 2; t < N - m; t += step) {
    dia(t, m + b / 2, 8 * u); dia(t, N - m - b / 2, 8 * u); dia(m + b / 2, t, 8 * u); dia(N - m - b / 2, t, 8 * u);
  }
  }
  if (plain) return c;

  g.save();
  g.translate(N / 2, N / 2);
  g.scale(1.22, 1.22);                                 // larger type: the square has room for it
  if (FLIP === 'mat') { g.translate(0, 96 * u); g.scale(0.84, 0.84); }   // text below the small diamond
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const text = (s, y, size, weight, color, ls = 0, x = 0) => {
    g.font = weight + ' ' + Math.round(size * u) + 'px Montserrat, Arial, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = Math.round(ls * u) + 'px';
    const maxW = 620 * u;                              // long lines shrink to fit inside the border
    const w = g.measureText(s).width;
    if (w > maxW) g.font = weight + ' ' + Math.floor(size * u * maxW / w) + 'px Montserrat, Arial, sans-serif';
    g.fillStyle = color;
    g.fillText(s, x * u, y * u);
  };
  const label = (s, y) => text(s, y, 40, 600, DARK ? GOLD : MUTED, 7);
  const mark = (x, y, r, fill, stroke) => {           // small diamond
    g.save(); g.translate(x * u, y * u); g.rotate(Math.PI / 4);
    if (fill) { g.fillStyle = fill; g.fillRect(-r * u, -r * u, 2 * r * u, 2 * r * u); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 5 * u; g.strokeRect(-r * u, -r * u, 2 * r * u, 2 * r * u); }
    g.restore();
  };

  // Few, large elements: the tile is read in a glance, the full sentence stays on the left.
  if (i === 0) {            // structure first
    label(L('СТРУКТУРА', 'STRUCTURE'), -250);
    text(L('Портфель', 'A portfolio'), -120, 104, 700, INK);
    text(L('под вашу структуру', 'built on your structure'), -6, 72, 700, INK);
    text(L('Учитываем, на кого и где', 'We take into account whose'), 130, 50, 500, MUTED);
    text(L('оформлены активы', 'name the assets are in, and where'), 184, 50, 500, MUTED);
  } else if (i === 1) {     // private deals that are not on an exchange
    label(L('СДЕЛКИ', 'DEALS'), -250);
    text(L('Частные', 'Private'), -150, 90, 700, INK);
    text(L('сделки', 'deals'), -54, 90, 700, ACC);
    (EN ? ['at your request', 'term and risks up front', 'settled by a bank or broker'] : ['по вашему запросу', 'срок и риски заранее', 'расчёты: банк или брокер']).forEach((w, k) => {
      const y = 70 + k * 64, x = -250;
      mark(x, y, 12, k === 1 ? ACC : null, k === 1 ? null : INK);
      g.save(); g.textAlign = 'left';
      g.font = '500 ' + Math.round(38 * u) + 'px Montserrat, Arial, sans-serif';
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      g.fillStyle = MUTED; g.fillText(w, (x + 40) * u, y * u);
      g.restore();
    });
  } else if (i === 2) {     // we call first
    label(L('СВЯЗЬ', 'CONTACT'), -250);
    text(L('Выходим на связь', 'We get in touch'), -110, 80, 700, INK);
    text(L('первыми', 'first'), -10, 80, 700, ACC);
    text(L('если меняется рынок или', 'when markets shift or'), 124, 50, 500, MUTED);
    text(L('в портфеле важное событие', 'your portfolio needs it'), 178, 50, 500, MUTED);
  } else if (i === 3) {     // part of our income depends on the result: success fee only on growth above the previous high
    label(L('РЕЗУЛЬТАТ', 'RESULT'), -250);
    text(L('Часть нашего дохода', 'Part of our income'), -160, 70, 700, INK);
    text(L('зависит от вашего результата', 'depends on your result'), -88, 50, 500, MUTED);
    const peak = 70;                                      // the previous high
    g.setLineDash([12 * u, 12 * u]); g.lineWidth = 4 * u; g.strokeStyle = LINE;
    g.beginPath(); g.moveTo(-330 * u, peak * u); g.lineTo(330 * u, peak * u); g.stroke();
    g.setLineDash([]);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const seg = (pts, color, w) => {
      g.lineWidth = w * u; g.strokeStyle = color; g.beginPath();
      pts.forEach((p, k) => (k ? g.lineTo(p[0] * u, p[1] * u) : g.moveTo(p[0] * u, p[1] * u)));
      g.stroke();
    };
    seg([[-170, peak], [-60, 160], [60, peak]], INK, 11);  // the fall and the recovery: no success fee
    seg([[-310, 150], [-170, peak]], ACC, 13);             // first growth: fee
    seg([[60, peak], [300, -10]], ACC, 13);                // growth above the previous high: fee
    g.save(); g.textAlign = 'left';                        // legend: accent = fee, ink = no fee
    g.font = '500 ' + Math.round(38 * u) + 'px Montserrat, Arial, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    const items = [[L('комиссия', 'fee'), ACC], [L('без комиссии', 'no fee'), INK]];
    const ws = items.map((it) => g.measureText(it[0]).width / u);
    const total = ws[0] + ws[1] + 2 * (22 + 26) + 56;
    let x = -total / 2;
    items.forEach((it, k) => {
      mark(x + 11, 236, 11, it[1], null);
      g.fillStyle = MUTED; g.fillText(it[0], (x + 22 + 26) * u, 236 * u);
      x += 22 + 26 + ws[k] + 56;
    });
    g.restore();
  }
  g.restore();
  return c;
}
