/* Gesher Finance: site behaviour. No dependencies, no cookies. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var scriptSrc = (document.currentScript && document.currentScript.src) || '';
  var STATIC = scriptSrc ? scriptSrc.replace(/[^\/]*$/, '') : 'static/';
  // Preview hosts: fake form success and the ?motion=on override are allowed only here
  var PREVIEW = /^(localhost|127\.0\.0\.1)$|\.github\.io$/.test(location.hostname);
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var forced = false;
  try { forced = PREVIEW && (/[?&]motion=on\b/.test(location.search) || sessionStorage.getItem('gf_motion') === 'on'); if (forced) sessionStorage.setItem('gf_motion', 'on'); } catch (e) {}
  function motionOK() { return forced || !mq.matches; }
  doc.classList.add('js');
  doc.classList.toggle('motion', motionOK());
  var motionListeners = [];
  if (mq.addEventListener) mq.addEventListener('change', function () { doc.classList.toggle('motion', motionOK()); motionListeners.forEach(function (f) { f(); }); });

  /* ---------- Header: border on scroll, mobile menu ---------- */
  var header = document.querySelector('.header');
  function onScrollHeader() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mnav');
  var outside = ['.topbar', 'main', '.footer'].map(function (s) { return document.querySelector(s); }).filter(Boolean);
  function setMenu(open, returnFocus) {
    if (!burger || !mnav) return;
    if (open) mnav.style.setProperty('--mnav-top', Math.max(0, header.getBoundingClientRect().bottom) + 'px');
    burger.setAttribute('aria-expanded', String(open));
    mnav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    outside.forEach(function (n) { if (open) n.setAttribute('inert', ''); else n.removeAttribute('inert'); });
    burger.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    burger.setAttribute('aria-label', open ? burger.dataset.close : burger.dataset.open);
    if (!open && returnFocus) burger.focus();
  }
  if (burger && mnav) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav.classList.contains('is-open')) setMenu(false, true); });
    var wide = window.matchMedia('(min-width: 1100px)');
    var onWide = function () { if (wide.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
  }

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Bridge story: the bridge assembles while you scroll ---------- */
  var story = document.querySelector('.story');
  if (story) initStory(story);

  function initStory(root) {
    var sticky = root.querySelector('.story__sticky');
    var stage = root.querySelector('.story__stage');
    var cards = Array.prototype.slice.call(root.querySelectorAll('.scard'));
    var NS = 'http://www.w3.org/2000/svg';
    var INK = '#25282D', CREAM = '#F5F4ED';

    // Geometry in SVG units. Inner spans are equal; end spans are 0.45 of them,
    // so in the final desktop frame the pillars stand over the card centres and the banks meet the container edges.
    var U = 600, E = 270, BANK = 300, CAP = 132, NT = 7;
    var X1 = BANK + E, R = X1 + 3 * U + E, W = R + BANK;
    var pillars = [0, 1, 2, 3].map(function (k) { return X1 + k * U; });
    var T = (U - CAP) / (NT + .3);
    var Dy = 200, deckTop = Dy - T / 2, deckBot = Dy + T / 2, Gy = 410, BATTER = Math.tan(12 * Math.PI / 180);
    var VIEW_TOP = Dy - CAP / 2 - 18, VIEW_BOT = Gy + 24;
    var capitals = ['tile-blue.svg', 'tile-red.svg', 'tile-apricot.svg', 'tile-yellow.svg'];
    var G = INK, P = '#EA5C3D', A = '#FFAB48', L = '#292C7A';
    var innerSeq = [G, P, A, L, A, P, G], leftSeq = [A, P, G], rightSeq = [G, P, A];

    function el(name, attrs, parent) {
      var n = document.createElementNS(NS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    }
    var NSS = { 'vector-effect': 'non-scaling-stroke' };
    function ns(o) { for (var k in NSS) o[k] = NSS[k]; return o; }

    var svg = el('svg', { 'class': 'story__svg', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid meet' });

    // Ground
    el('line', ns({ x1: 0, x2: W, y1: Gy, y2: Gy, stroke: INK, 'stroke-width': 1 }), svg);
    // Abutments with a 12 degree batter
    var foot = Gy + 60, bat = (foot - deckBot) * BATTER;
    el('path', { d: 'M0 ' + deckBot + 'H' + BANK + 'L' + (BANK + bat) + ' ' + foot + 'H0Z', fill: INK }, svg);
    el('path', { d: 'M' + W + ' ' + deckBot + 'H' + R + 'L' + (R - bat) + ' ' + foot + 'H' + W + 'Z', fill: INK }, svg);
    // Road on the banks
    el('line', ns({ x1: 0, x2: BANK, y1: deckTop, y2: deckTop, stroke: INK, 'stroke-width': 1.5 }), svg);
    el('line', ns({ x1: R, x2: W, y1: deckTop, y2: deckTop, stroke: INK, 'stroke-width': 1.5 }), svg);

    // Arches between supports, drawn as the build head passes
    var springL = BANK + (Gy - deckBot) * BATTER, springR = R - (Gy - deckBot) * BATTER;
    var stops = [springL].concat(pillars, [springR]);
    var arches = [];
    for (var a = 0; a < stops.length - 1; a++) {
      var xa = stops[a] + (a === 0 ? 0 : 20), xb = stops[a + 1] - (a === stops.length - 2 ? 0 : 20);
      var ctrl = 2 * (deckBot + 4) - Gy;
      var arc = el('path', ns({ d: 'M' + xa + ' ' + Gy + 'Q' + ((xa + xb) / 2) + ' ' + ctrl + ' ' + xb + ' ' + Gy, fill: 'none', stroke: INK, 'stroke-width': 1.5, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }), svg);
      arches.push({ x0: xa, x1: xb, el: arc, last: -1 });
    }

    // Pillars with a stepped foot
    var pillarEls = pillars.map(function (x) {
      var g = el('g', { opacity: 0 }, svg);
      el('rect', { x: x - 40, y: Gy - 8, width: 80, height: 8, fill: INK }, g);
      el('rect', { x: x - 30, y: Gy - 16, width: 60, height: 8, fill: INK }, g);
      var shaft = el('rect', { x: x - 20, y: Gy - 16, width: 40, height: 0, fill: INK }, svg);
      return { x: x, g: g, shaft: shaft, last: -1 };
    });

    // Deck frame (grows with the build head)
    var lineTop = el('line', ns({ x1: BANK, y1: deckTop, x2: BANK, y2: deckTop, stroke: INK, 'stroke-width': 1.5 }), svg);
    var lineBot = el('line', ns({ x1: BANK, y1: deckBot, x2: BANK, y2: deckBot, stroke: INK, 'stroke-width': 1.5 }), svg);

    // Deck tiles
    var tiles = [];
    function addTiles(from, to, seq) {
      var n = seq.length, m = (to - from - n * T) / 2;
      for (var i = 0; i < n; i++) {
        var cx = from + m + T * (i + .5), c = seq[i], h = T / 2 - 1.5, s = h * .48;
        var g = el('g', { opacity: 0 }, svg);
        el('path', ns({ d: 'M0 ' + (-h) + 'L' + h + ' 0L0 ' + h + 'L' + (-h) + ' 0Z', fill: c, stroke: INK, 'stroke-width': 1 }), g);
        el('path', { d: 'M0 ' + (-s) + 'L' + s + ' 0L0 ' + s + 'L' + (-s) + ' 0Z', fill: c === A ? INK : CREAM }, g);
        tiles.push({ x: cx, g: g, last: -1 });
      }
    }
    addTiles(BANK, X1 - CAP / 2, leftSeq);
    for (var k = 0; k < 3; k++) addTiles(pillars[k] + CAP / 2, pillars[k + 1] - CAP / 2, innerSeq);
    addTiles(pillars[3] + CAP / 2, R, rightSeq);

    // Capitals: ornament tiles from the brandbook
    var capEls = pillars.map(function (x, k) {
      var g = el('g', { opacity: 0 }, svg);
      el('image', { href: STATIC + capitals[k], x: -CAP / 2, y: -CAP / 2, width: CAP, height: CAP, preserveAspectRatio: 'xMidYMid meet' }, g);
      return { x: x, g: g, last: -1 };
    });
    stage.appendChild(svg);

    var BX0 = X1 + 300, BX1 = R + 2.2 * T; // live scene starts with the first support standing
    var BX_STATIC0 = BANK - 20;
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function setView(x, y, w, h) { svg.setAttribute('viewBox', x.toFixed(1) + ' ' + y.toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1)); }

    var lastCurrent = -2;
    function build(bx) {
      var fx = clamp(bx, BANK, R);
      lineTop.setAttribute('x2', fx.toFixed(1)); lineBot.setAttribute('x2', fx.toFixed(1));
      arches.forEach(function (ar) {
        var t = Math.round(clamp((bx - ar.x0) / (ar.x1 - ar.x0), 0, 1) * 500) / 500;
        if (t !== ar.last) { ar.last = t; ar.el.setAttribute('stroke-dashoffset', (1 - t).toFixed(3)); }
      });
      tiles.forEach(function (t) {
        var k = clamp((bx - t.x) / (T * 1.6), 0, 1);
        if (k === t.last) return;
        t.last = k;
        var e = ease(k);
        t.g.setAttribute('transform', 'translate(' + t.x.toFixed(1) + ' ' + (Dy - (1 - e) * 60).toFixed(1) + ') rotate(' + ((1 - e) * -30).toFixed(1) + ')');
        t.g.setAttribute('opacity', clamp((k - .4) / .3, 0, 1).toFixed(2));
      });
      var current = -1;
      pillarEls.forEach(function (pe, j) {
        var r = ease(clamp((bx - pe.x + 40) / 300, 0, 1));
        if (r !== pe.last) {
          pe.last = r;
          var top = lerp(Gy - 16, deckBot - 2, r);
          pe.shaft.setAttribute('y', top.toFixed(1));
          pe.shaft.setAttribute('height', (Gy - 16 - top).toFixed(1));
          pe.g.setAttribute('opacity', r > 0 ? 1 : 0);
          var c = clamp((r - .7) / .3, 0, 1), ce = ease(c), cap = capEls[j];
          cap.g.setAttribute('opacity', c.toFixed(2));
          cap.g.setAttribute('transform', 'translate(' + pe.x + ' ' + (Dy - (1 - ce) * 70).toFixed(1) + ') rotate(' + ((1 - ce) * 90).toFixed(1) + ') scale(' + (.6 + .4 * ce).toFixed(3) + ')');
        }
        if (r >= .85) current = j;
      });
      if (current !== lastCurrent) {
        lastCurrent = current;
        cards.forEach(function (cd, n) {
          cd.classList.toggle('is-active', n <= current);
          cd.classList.toggle('is-current', n === current);
        });
      }
    }

    // Frames
    var stageW = 1, stageH = 1, aligned = null;
    function measure() {
      var sr = stage.getBoundingClientRect();
      stageW = Math.max(1, sr.width); stageH = Math.max(1, sr.height);
      aligned = null;
      if (cards.length === 4) {
        var r0 = cards[0].getBoundingClientRect(), r3 = cards[3].getBoundingClientRect();
        if (Math.abs(r0.top - r3.top) < 2 && r3.left > r0.left) {
          var c0 = r0.left + r0.width / 2 - sr.left, c3 = r3.left + r3.width / 2 - sr.left;
          aligned = { s: (c3 - c0) / (3 * U), c0: c0 };
        }
      }
    }
    function finalFrame() {
      if (aligned) {
        var s = Math.min(aligned.s, stageH / (VIEW_BOT - VIEW_TOP)), vw = stageW / s, vh = stageH / s;
        if (s < aligned.s) return [(X1 + pillars[3]) / 2 - vw / 2, (VIEW_TOP + VIEW_BOT) / 2 - vh / 2, vw, vh]; // too short to align: centre the bridge
        return [X1 - aligned.c0 / s, (VIEW_TOP + VIEW_BOT) / 2 - vh / 2, vw, vh];
      }
      // Phones and tablets: fit the bridge from bank to bank (phones crop the banks)
      var narrow = stageW < 560;
      var xL = narrow ? X1 - E * .8 : BANK - 60, xR = narrow ? pillars[3] + E * .8 : R + 60;
      var vw2 = xR - xL, vh2 = vw2 * stageH / stageW;
      return [xL, (VIEW_TOP + VIEW_BOT) / 2 - vh2 / 2, vw2, vh2];
    }
    function setStageRatio() {
      if (aligned) { stage.style.aspectRatio = ''; return; }
      var narrow = stage.clientWidth < 560;
      var w = narrow ? (pillars[3] - X1 + E * 1.6) : (R - BANK + 120);
      stage.style.aspectRatio = (w / (VIEW_BOT - VIEW_TOP)).toFixed(3) + ' / 1';
    }

    // Live (pinned) mode: desktop, motion allowed, scene fits in the viewport
    var live = false, inView = false, ticking = false, lastP = -1;
    function progress() {
      var r = root.getBoundingClientRect();
      var hdr = header ? header.getBoundingClientRect().height : 0;
      return clamp((hdr - r.top) / Math.max(1, r.height - sticky.offsetHeight), 0, 1);
    }
    function renderLive(p) {
      var F = finalFrame();
      var sP = Math.min((stageW / F[2]) * 1.6, stageH / (VIEW_BOT - VIEW_TOP)), vw = stageW / sP, vh = stageH / sP;
      var bx = lerp(BX0, BX1, clamp(p / .62, 0, 1));
      var camX = clamp(bx - vw * .62, 0, W - vw), camY = (VIEW_TOP + VIEW_BOT) / 2 - vh / 2;
      var z = ease(clamp((p - .66) / .18, 0, 1));
      setView(lerp(camX, F[0], z), lerp(camY, F[1], z), lerp(vw, F[2], z), lerp(vh, F[3], z));
      build(bx);
      root.classList.toggle('is-done', p > .84);
    }
    function frame() { ticking = false; var p = progress(); if (Math.abs(p - lastP) < .0005) return; lastP = p; renderLive(p); }
    function onScroll() { if (live && inView && !ticking) { ticking = true; requestAnimationFrame(frame); } }

    // Static mode: finished bridge, built once on a timer when it comes into view (if motion is allowed)
    var builtOnce = false;
    function renderStatic(animate) {
      var F = finalFrame(); setView(F[0], F[1], F[2], F[3]);
      if (!animate || builtOnce) { build(BX1); return; }
      build(BX_STATIC0);
      var t0 = 0, DUR = 2600;
      function step(ts) { if (!t0) t0 = ts; var t = clamp((ts - t0) / DUR, 0, 1); build(lerp(BX_STATIC0, BX1, t)); if (t < 1) requestAnimationFrame(step); else builtOnce = true; }
      requestAnimationFrame(step);
    }

    function setMode() {
      root.classList.remove('story--live', 'is-done');
      live = false;
      stage.style.aspectRatio = '';
      measure();
      if (motionOK() && window.innerWidth >= 1100 && aligned) {
        root.classList.add('story--live');
        measure();
        if (sticky.scrollHeight <= sticky.clientHeight + 1 && aligned) {
          live = true; lastP = -1; renderLive(progress());
          return;
        }
        root.classList.remove('story--live');
        measure();
      }
      setStageRatio(); measure();
      cards.forEach(function (cd) { cd.classList.remove('is-active', 'is-current'); });
      lastCurrent = -2;
      renderStatic(motionOK() && !builtOnce && !stageSeen);
      if (motionOK() && !builtOnce && !stageSeen) pendingBuild = true;
    }

    var stageSeen = false, pendingBuild = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        if (inView) onScroll();
      }, { rootMargin: '100px 0px' }).observe(root);
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !stageSeen) {
          stageSeen = true;
          if (!live && pendingBuild) { pendingBuild = false; renderStatic(true); }
        }
      }, { threshold: .5 }).observe(stage);
    } else { inView = true; stageSeen = true; }

    // In static mode before the stage is seen, show nothing built yet (it builds when seen)
    var origRenderStatic = renderStatic;
    renderStatic = function (animate) {
      if (animate && !stageSeen) { var F = finalFrame(); setView(F[0], F[1], F[2], F[3]); build(BX_STATIC0); return; }
      origRenderStatic(animate);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Re-layout only when the viewport really changes (mobile URL bars change height only)
    var rt, lastW = window.innerWidth, lastH = window.innerHeight;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var w = window.innerWidth, h = window.innerHeight;
        if (w === lastW && (!live || Math.abs(h - lastH) < 80)) return;
        lastW = w; lastH = h; setMode();
      }, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setMode(); });
    motionListeners.push(setMode);
    setMode();
    root._sync = function () { lastP = -1; if (live) renderLive(progress()); }; // used by visual checks
  }

  /* ---------- Source and agent tags (?s= and ?a=), kept for the session ---------- */
  var TAGS_KEY = 'gf_tags';
  try {
    var q = new URLSearchParams(location.search);
    var tags = JSON.parse(sessionStorage.getItem(TAGS_KEY) || '{}');
    var s = q.get('s'), a = q.get('a');
    if (s && /^(card|li|mail|ig)$/.test(s)) tags.s = s;
    if (a && /^[A-Za-z0-9_-]{1,32}$/.test(a)) tags.a = a;
    if (s || a) { tags.landing = location.pathname; sessionStorage.setItem(TAGS_KEY, JSON.stringify(tags)); }
  } catch (e) { /* storage blocked: tags are optional */ }

  /* ---------- Contact form ---------- */
  var formWrap = document.querySelector('.form');
  if (formWrap) initForm(formWrap);

  function initForm(wrap) {
    var f = wrap.querySelector('form');
    var started = Date.now();
    var hint = f.querySelector('[data-hint]');
    var roles = f.querySelectorAll('input[name="role"]');
    var channels = f.querySelectorAll('input[name="channel"]');
    var summary = wrap.querySelector('.form__errors');
    var fail = wrap.querySelector('.form__fail');
    var btn = f.querySelector('button[type="submit"]');
    var btnLabel = btn.innerHTML;

    function val(name) { var r = f.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
    function setRole(v) { roles.forEach(function (r) { r.checked = r.value === v; }); updateHint(); }
    function updateHint() {
      var tpl = document.getElementById('hint-' + (val('role') || 'none'));
      if (hint) hint.innerHTML = tpl ? tpl.innerHTML : '';
    }
    function needs() {
      var ch = val('channel'), email = f.elements.email.value.trim(), phone = f.elements.phone.value.trim();
      if (ch === 'email') return { email: true, phone: false };
      if (ch) return { email: false, phone: true };
      return { email: !phone, phone: false };
    }
    function updateOptional() {
      var n = needs();
      f.querySelectorAll('[data-opt]').forEach(function (o) { o.hidden = n[o.getAttribute('data-opt')]; });
    }
    roles.forEach(function (r) { r.addEventListener('change', updateHint); });
    channels.forEach(function (r) { r.addEventListener('change', function () { updateOptional(); recheck(); }); });
    document.querySelectorAll('[data-role-set]').forEach(function (b) {
      b.addEventListener('click', function () { setRole(b.getAttribute('data-role-set')); });
    });
    try {
      var qr = new URLSearchParams(location.search).get('role');
      if (qr === 'agent' || qr === 'partner') setRole('partner');
      else if (qr === 'client') setRole('client');
    } catch (e) {}
    updateHint(); updateOptional();

    function wrapOf(input) { return input.closest('.field, .consent, .fieldset'); }
    function setErr(input, on) {
      var w = wrapOf(input); if (!w) return;
      w.classList.toggle('has-error', on);
      var err = w.querySelector('.err');
      var targets = input.type === 'radio' ? [] : [input];
      targets.forEach(function (t) {
        t.setAttribute('aria-invalid', on ? 'true' : 'false');
        if (err) { if (on) t.setAttribute('aria-describedby', err.id); else t.removeAttribute('aria-describedby'); }
      });
    }
    var validated = false;
    function validate() {
      var n = needs(), el = f.elements, bad = 0;
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.email.value.trim());
      var phoneOk = el.phone.value.replace(/[^\d]/g, '').length >= 7 || /^@?[A-Za-z0-9_]{5,}$/.test(el.phone.value.trim());
      var checks = [
        [roles[0], !!val('role')],
        [el.name, el.name.value.trim().length > 1],
        [el.email, n.email ? emailOk : (!el.email.value.trim() || emailOk)],
        [el.phone, n.phone ? phoneOk : (!el.phone.value.trim() || phoneOk)],
        [el.country, el.country.value.trim().length > 1],
        [el.consent, el.consent.checked]
      ];
      checks.forEach(function (c) { setErr(c[0], !c[1]); if (!c[1]) bad++; });
      return bad;
    }
    function recheck() { if (validated) validate(); }
    f.addEventListener('input', function () { updateOptional(); recheck(); });
    f.addEventListener('change', recheck);

    function done() {
      var role = val('role');
      wrap.querySelectorAll('[data-done]').forEach(function (n) { n.hidden = n.getAttribute('data-done') !== role; });
      wrap.classList.add('is-done');
      var h = wrap.querySelector('.form__done h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
    }
    function sending(on) { btn.disabled = on; btn.innerHTML = on ? btn.getAttribute('data-sending') : btnLabel; }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      fail.classList.remove('is-on');
      validated = true;
      if (validate()) { summary.classList.add('is-on'); summary.focus(); return; }
      summary.classList.remove('is-on');
      if (f.elements.gf_extra && f.elements.gf_extra.value) { done(); return; } // honeypot: pretend success
      var data = {};
      new FormData(f).forEach(function (v, k) { if (k !== 'gf_extra') data[k] = v; });
      try { var t = JSON.parse(sessionStorage.getItem(TAGS_KEY) || '{}'); data.source = t.s || ''; data.agent = t.a || ''; data.landing = t.landing || ''; } catch (err) {}
      data.lang = doc.lang; data.page = location.pathname;
      var roleName = { client: 'клиент', partner: 'партнёр', other: 'другое' }[data.role] || data.role || '';
      data._subject = 'Gesher Finance: заявка с сайта (' + roleName + ')';
      data._replyto = data.email || '';
      sending(true);
      var wait = Math.max(0, 3000 - (Date.now() - started)); // too-fast submits are delayed, not dropped
      setTimeout(function () {
        var endpoint = f.getAttribute('data-endpoint');
        // Preview hosts never send real requests unless ?sendform=1 is in the address: success is faked
        if (PREVIEW && !/[?&]sendform=1/.test(location.search)) { setTimeout(done, 400); return; }
        if (!endpoint) {
          sending(false); fail.classList.add('is-on'); return;
        }
        var ctrl = 'AbortController' in window ? new AbortController() : null;
        var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data), signal: ctrl ? ctrl.signal : undefined })
          .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
          .then(function (j) { if (j && String(j.success) === 'false') throw new Error('rejected'); done(); })
          .catch(function () { clearTimeout(timer); sending(false); fail.classList.add('is-on'); });
      }, wait);
    });
  }
})();
