/* Skywalker playables: the glue between these small canvas games and Caleb's Arcade SDK.
 * Each game still owns its rules, its own title screen and its own codes and hints; this file only
 * holds what they all do the same way:
 *   SKY.fit(C, X, w, h)     crisp canvas: backing store = CSS size x min(devicePixelRatio, 2)
 *   SKY.shake(v)            screen shake / flash amount, 0 when the player prefers reduced motion
 *   SKY.best() / SKY.saveBest(v)   best score in localStorage (never saved while codes are on)
 *   SKY.diff / SKY.pick(e, n, h)   Easy / Normal / Hard, chosen on the title screen and remembered
 *   SKY.tut / SKY.drawTut(...)     the first-run "how to" card, drawn inside the game's own title
 *   SKY.tick(state, score)  reports title / play / over scenes and shows the difficulty chips
 *   SKY.setup({...})        ArcadeSDK.init with restart, exit, tutorial, hint and codes
 */
(function () {
  'use strict';
  var W = window, D = document;
  var mq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function ls(k, v) { try { if (v === undefined) return W.localStorage.getItem(k); W.localStorage.setItem(k, String(v)); } catch (e) {} return null; }
  function sdk() { return W.ArcadeSDK || null; }
  var cfg = { id: 'sky', color: '#fff' }, lastScene = '', chips = null, label = null, canvas = null;

  var SKY = {
    get rm() { return !!(mq && mq.matches); },
    shake: function (v) { return mq && mq.matches ? 0 : v; },
    dpr: function () { return Math.min(W.devicePixelRatio || 1, 2); },
    fit: function (C, X, w, h) {
      var d = SKY.dpr(); canvas = C;
      C.width = Math.round(w * d); C.height = Math.round(h * d);
      C.style.width = w + 'px'; C.style.height = h + 'px';
      X.setTransform(d, 0, 0, d, 0, 0);
      placeChips(); placeLabel(); placeBar();
    },
    get cheated() { var s = sdk(); return !!(s && s.cheated); },
    sfx: function (n, o) { var s = sdk(); if (s && s.sfx) try { s.sfx(n, o); } catch (e) {} },
    best: function () { return parseInt(ls(cfg.bestKey), 10) || 0; },
    // Saves only a real improvement from a run with no codes on. lower=true for "fewer is better".
    saveBest: function (v, lower) {
      if (SKY.cheated || !cfg.bestKey) return false;
      var b = SKY.best(), better = lower ? (b === 0 || v < b) : v > b;
      if (better) ls(cfg.bestKey, v);
      return better;
    },
    diff: 'normal',
    pick: function (e, n, h) { return SKY.diff === 'easy' ? e : SKY.diff === 'hard' ? h : n; },
    tut: false,
    tutDone: function () { if (SKY.tut) { SKY.tut = false; ls('sky-' + cfg.id + '-tut', '1'); SKY.event('tutorial-done'); } },
    event: function (n) { var s = sdk(); if (s) try { s.event(n); } catch (e) {} },
    tick: function (state, score) {
      var scene = cfg.scenes[state] || 'play';
      if (scene !== lastScene) {
        lastScene = scene;
        var s = sdk(); if (s) try { s.state(scene === 'over' ? { scene: 'over', score: score || 0 } : { scene: scene }); } catch (e) {}
        if (chips) chips.style.display = scene === 'title' ? 'flex' : 'none';
        if (bar) { bar.style.display = scene === 'play' ? 'flex' : 'none'; placeBar(); }
        if (scene === 'play') { SKY.tutDone(); if (cfg.goSound !== false) SKY.sfx('go', { volume: 0.45 }); }
      }
    },
    // The first-run card, drawn inside the game's own title screen (one title, never two).
    drawTut: function (X, w, h, o) {
      var t = (W.performance ? W.performance.now() : Date.now()) / 1000, col = o.color || cfg.color;
      X.save();
      X.fillStyle = 'rgba(0,0,0,.72)'; X.fillRect(0, 0, w, h);
      X.textAlign = 'center'; X.textBaseline = 'alphabetic';
      X.fillStyle = col; X.font = 'bold 26px "Segoe UI",sans-serif'; X.fillText(o.title, w / 2, h * 0.16);
      X.fillStyle = 'rgba(255,255,255,.55)'; X.font = 'bold 13px "Segoe UI",sans-serif'; X.fillText('HOW TO PLAY', w / 2, h * 0.16 + 24);
      gesture(X, w / 2, h * 0.36, o.gesture || 'tap', SKY.rm ? 0.35 : t, col);
      var y = h * 0.52; X.textAlign = 'left'; X.font = '16px "Segoe UI",sans-serif';
      o.steps.forEach(function (s, i) {
        X.fillStyle = col; X.font = 'bold 16px "Segoe UI",sans-serif'; X.fillText((i + 1) + '', 26, y);
        X.fillStyle = '#fff'; X.font = '16px "Segoe UI",sans-serif';
        y += 21 * wrap(X, s, 48, y, w - 72, 21).length + 12;
      });
      X.textAlign = 'center'; X.globalAlpha = 0.6 + 0.4 * Math.sin(SKY.rm ? 1.6 : t * 4);
      X.fillStyle = '#fff'; X.font = 'bold 17px "Segoe UI",sans-serif'; X.fillText(o.go || '▶ Tap to start', w / 2, Math.min(h - 88, y + 20));
      X.restore();
    },
    setup: function (o) {
      for (var k in o) cfg[k] = o[k];
      cfg.scenes = cfg.scenes || { ready: 'title', play: 'play', over: 'over', win: 'over' };
      cfg.bestKey = cfg.bestKey || ('sky-' + cfg.id + '-best');
      SKY.diff = ls('sky-' + cfg.id + '-diff') || 'normal';
      SKY.tut = ls('sky-' + cfg.id + '-tut') !== '1';
      if (cfg.difficulty !== false) makeChips();
      if (cfg.buttons) makeBar(cfg.buttons);
      var codes = cfg.cheats || {}, on = {};
      var s = sdk(); if (!s) return;
      s.init({
        pauseButton: cfg.pauseButton || 'tr',
        onRestart: function () { cfg.onRestart(); },
        onExit: function () { cfg.onExit(); },
        onTutorial: function () { SKY.tut = true; cfg.onExit(); },
        onHint: cfg.onHint ? function () { return cfg.onHint(); } : undefined,
        onCheat: function (code) {
          var c = codes[code]; if (!c) return { ok: false };
          var msg = c[1](); on[code] = 1; showLabel(Object.keys(on));
          SKY.sfx('unlock');
          return { ok: true, message: msg || c[0] };
        },
      });
    },
  };

  /* ---------- the animated gesture on the tutorial card ---------- */
  function gesture(X, x, y, kind, t, col) {
    var p = (t % 1.6) / 1.6, hx = x, hy = y, press = false;
    X.save(); X.lineWidth = 3; X.strokeStyle = col; X.fillStyle = col;
    if (kind === 'tap' || kind === 'hold') {
      press = kind === 'tap' ? p < 0.25 : p < 0.7;
      if (kind === 'hold') { X.globalAlpha = 0.35; X.beginPath(); X.arc(x, y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p / 0.7)); X.stroke(); X.globalAlpha = 1; }
      else { X.globalAlpha = 1 - p; X.beginPath(); X.arc(x, y, 10 + p * 34, 0, Math.PI * 2); X.stroke(); X.globalAlpha = 1; }
    } else if (kind === 'swipe') {
      var s = Math.sin(t * Math.PI * 1.25); hx = x + s * 60; press = true;
      X.globalAlpha = 0.3; X.beginPath(); X.moveTo(x - 60, y); X.lineTo(x + 60, y); X.stroke(); X.globalAlpha = 1;
    } else if (kind === 'swipe4') {
      var q = Math.floor(t / 0.8) % 4, f = (t % 0.8) / 0.8, dx = [1, 0, -1, 0][q], dy = [0, 1, 0, -1][q];
      hx = x + dx * f * 50; hy = y + dy * f * 50; press = f < 0.8;
      X.globalAlpha = 0.3; X.beginPath(); X.moveTo(x - 50, y); X.lineTo(x + 50, y); X.moveTo(x, y - 50); X.lineTo(x, y + 50); X.stroke(); X.globalAlpha = 1;
    } else if (kind === 'drag') {
      hx = x + Math.cos(t * 2) * 55; hy = y + Math.sin(t * 4) * 18; press = true;
    } else if (kind === 'pull') {
      var k = Math.min(1, p / 0.7); hx = x - k * 50; hy = y + k * 35; press = p < 0.7;
      X.globalAlpha = 0.4; X.beginPath(); X.moveTo(x - 18, y - 10); X.lineTo(hx, hy); X.lineTo(x + 18, y - 10); X.stroke(); X.globalAlpha = 1;
      if (!press) { X.beginPath(); X.arc(x + (p - 0.7) * 300, y - 10 - (p - 0.7) * 120, 6, 0, Math.PI * 2); X.fill(); }
    }
    // the finger
    X.globalAlpha = press ? 1 : 0.55; X.fillStyle = '#fff';
    X.beginPath(); X.arc(hx, hy, press ? 11 : 13, 0, Math.PI * 2); X.fill();
    X.strokeStyle = col; X.lineWidth = 3; X.stroke();
    X.restore();
  }
  function words(X, s, maxW) {
    var out = [], line = '';
    String(s).split(' ').forEach(function (wd) { var tst = line ? line + ' ' + wd : wd; if (X.measureText(tst).width > maxW && line) { out.push(line); line = wd; } else line = tst; });
    if (line) out.push(line); return out;
  }
  function wrap(X, s, x, y, maxW, lh) { var l = words(X, s, maxW); l.forEach(function (t, i) { X.fillText(t, x, y + i * lh); }); return l; }

  /* ---------- Easy / Normal / Hard chips under the title ---------- */
  function css() {
    if (D.getElementById('sky-css')) return;
    var st = D.createElement('style'); st.id = 'sky-css';
    st.textContent = '.sky-chips{position:fixed;display:none;gap:8px;z-index:5;transform:translateX(-50%)}' +
      '.sky-chips button{min-width:74px;min-height:40px;padding:0 12px;border-radius:20px;border:2px solid rgba(255,255,255,.25);background:rgba(10,10,46,.85);color:#fff;font:600 14px "Segoe UI",sans-serif;cursor:pointer}' +
      '.sky-chips button[aria-pressed=true]{border-color:var(--sky);color:var(--sky);box-shadow:0 0 14px var(--sky)}' +
      '.sky-chips button:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
      '.sky-codes{position:fixed;z-index:5;padding:3px 9px;border-radius:10px;background:rgba(255,215,0,.16);border:1px solid #ffd700;color:#ffd700;font:700 12px "Segoe UI",sans-serif;letter-spacing:.5px;pointer-events:none;display:none}';
    D.head.appendChild(st);
  }
  function makeChips() {
    css();
    chips = D.createElement('div'); chips.className = 'sky-chips'; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Difficulty');
    chips.style.setProperty('--sky', cfg.color);
    ['easy', 'normal', 'hard'].forEach(function (d) {
      var b = D.createElement('button'); b.type = 'button'; b.textContent = d[0].toUpperCase() + d.slice(1); b.dataset.d = d;
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      b.addEventListener('click', function (e) {
        e.stopPropagation(); SKY.diff = d; ls('sky-' + cfg.id + '-diff', d); paintChips(); SKY.sfx('tap');
        if (cfg.onDiff) cfg.onDiff(d);
        b.blur();
      });
      chips.appendChild(b);
    });
    D.body.appendChild(chips); paintChips(); placeChips();
    W.addEventListener('resize', function () { placeChips(); placeLabel(); });
  }
  /* ---------- in-play buttons under the board (Undo, Hint...) ---------- */
  var bar = null;
  function makeBar(list) {
    css();
    bar = D.createElement('div'); bar.className = 'sky-chips sky-bar'; bar.style.setProperty('--sky', cfg.color);
    list.forEach(function (o) {
      var b = D.createElement('button'); b.type = 'button'; b.textContent = o.label; b.setAttribute('aria-label', o.aria || o.label);
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      b.addEventListener('click', function (e) { e.stopPropagation(); o.fn(); b.blur(); });
      bar.appendChild(b);
    });
    D.body.appendChild(bar); W.addEventListener('resize', placeBar);
  }
  function placeBar() {
    if (!bar || !canvas) return; var r = canvas.getBoundingClientRect();
    bar.style.left = (r.left + r.width / 2) + 'px'; bar.style.top = (r.bottom - (cfg.barBottom || 52)) + 'px';
  }
  SKY.bar = function (i, text) { if (bar && bar.children[i]) bar.children[i].textContent = text; };
  function paintChips() { if (chips) [].forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.d === SKY.diff)); }); }
  function placeChips() {
    if (!chips || !canvas) return; var r = canvas.getBoundingClientRect();
    chips.style.left = (r.left + r.width / 2) + 'px'; chips.style.top = (r.bottom - 70) + 'px';
  }
  function showLabel(list) {
    css();
    if (!label) { label = D.createElement('div'); label.className = 'sky-codes'; label.setAttribute('aria-live', 'polite'); D.body.appendChild(label); }
    label.textContent = 'CODES ON: ' + list.join(' '); label.style.display = 'block'; placeLabel();
  }
  function placeLabel() {
    if (!label || !canvas) return; var r = canvas.getBoundingClientRect();
    var at = cfg.labelAt || 'bl', lw = label.offsetWidth || 160;
    label.style.left = (at[1] === 'r' ? r.right - 8 - lw : r.left + 8) + 'px';
    label.style.top = (at[0] === 't' ? r.top + (cfg.labelTop || 60) : r.bottom - 24) + 'px';
  }
  W.SKY = SKY;
})();
