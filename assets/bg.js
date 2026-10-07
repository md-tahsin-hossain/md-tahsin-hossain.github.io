/* ==========================================================================
   Animated background — one canvas, several "skins" selected by theme.
   Read from <html data-theme>; switched live via window.__bgTheme(name).
   Every skin reacts to the cursor. Some themes also set an animal cursor
   (handled in main.js) via the `cursor` field — ignored here.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0, raf = null;
  var mouse = { x: -9999, y: -9999, active: false };
  var MOUSE_DIST = 180;

  var THEMES = {
    dark:    { mode: "network", net: "151,167,243", star: "210,222,255", link: 155, stars: 0.22, speed: 1.0, dens: 1.0, labels: true, trail: true },
    light:   { mode: "network", net: "70,95,200",   star: "40,60,150",   link: 150, stars: 0.14, speed: 0.8, dens: 0.55, labels: false },
    orbit:   { mode: "orbit",   net: "184,155,255", star: "235,225,255", speed: 1.0 },
    circuit: { mode: "circuit", net: "70,230,160",  star: "190,255,225", speed: 1.0, cursor: "snake" },
    // --- themes carrying an animal cursor ---
    dragon:  { mode: "network", net: "255,120,60",  star: "255,205,120", link: 150, stars: 0.26, speed: 1.0, dens: 0.8, labels: false, cursor: "dragon" },
    koi:     { mode: "ribbon",  net: "90,180,255",  star: "205,232,255", speed: 1.0, cursor: "koi" },
    monarch: { mode: "petals",  net: "255,150,190", star: "255,224,180", speed: 1.0, cursor: "butterfly" },
    glyph:   { mode: "matrix",  net: "90,200,255",  star: "215,240,255", speed: 1.1 }
  };
  var T = THEMES.dark;

  var nodes = [], labels = [], cols = [], petals = [], oparts = [], trail = [];
  var cnodes = [], cedges = [], electrons = [];
  var trailPX = -9999, trailPY = -9999, trailDX = 0, trailDY = 1;
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------- builders ---------- */
  function netCount() { var n = Math.round((w * h) / 12000 * (T.dens || 1)); return Math.max(30, Math.min(n, 170)); }
  function labelText() { var r = Math.random(); if (r < 0.5) return (Math.random() * 900 + 100).toFixed(1); if (r < 0.78) return "0x" + Math.floor(Math.random() * 255).toString(16).toUpperCase(); return Math.floor(Math.random() * 9999).toString(); }
  function buildNetwork() {
    nodes = []; trail = []; trailPX = -9999; trailPY = -9999;
    var c = netCount();
    for (var i = 0; i < c; i++) nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, ph: Math.random() * 6.28, tw: 0.6 + Math.random() * 1.4, star: Math.random() < T.stars });
    labels = [];
    if (T.labels) { var lc = Math.min(18, Math.max(6, Math.round(c / 7))); for (var k = 0; k < lc; k++) labels.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, text: labelText(), size: 9 + Math.random() * 5, ph: Math.random() * 6.28, tw: 0.3 + Math.random() * 0.6 }); }
  }
  var SIZE = 16, GLYPH = "アイウエオカキクケコサシスセソタチツ0123456789ABCDEF<>/\\*+";
  function buildMatrix() { cols = []; var n = Math.ceil(w / SIZE); for (var i = 0; i < n; i++) cols.push({ x: i * SIZE, y: rnd(-h, 0), sp: rnd(2.5, 7), len: Math.round(rnd(6, 20)) }); }
  function makePetal() { return { x: Math.random() * w, y: -20 - Math.random() * h, vy: rnd(0.5, 1.4), sway: rnd(0.4, 1.1), amp: rnd(12, 36), rot: Math.random() * 6.28, vr: rnd(-0.03, 0.03), size: rnd(5, 10), ph: Math.random() * 6.28, al: rnd(0.4, 0.8) }; }
  function buildPetals() { petals = []; var n = Math.min(90, Math.round(w * h / 16000)); for (var i = 0; i < n; i++) { var p = makePetal(); p.y = Math.random() * h; petals.push(p); } }
  function buildOrbit() { oparts = []; var n = Math.min(200, Math.round(w * h / 8500)); for (var i = 0; i < n; i++) { var a = Math.random() * 6.2832, r = rnd(40, Math.min(w, h) * 0.45); oparts.push({ x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, vx: 0, vy: 0, px: 0, py: 0 }); } }
  function buildCircuit() {
    cnodes = []; cedges = []; electrons = [];
    var g = 70, x, y, r, c, grid = [], ox = (w % g) / 2 + g / 2, oy = (h % g) / 2 + g / 2;
    for (r = 0, y = oy; y < h; y += g, r++) { grid[r] = []; for (c = 0, x = ox; x < w; x += g, c++) { grid[r][c] = cnodes.length; cnodes.push({ x: x, y: y }); } }
    for (r = 0; r < grid.length; r++) for (c = 0; c < grid[r].length; c++) { var a = grid[r][c]; if (c + 1 < grid[r].length && Math.random() < 0.82) cedges.push({ a: a, b: grid[r][c + 1] }); if (r + 1 < grid.length && Math.random() < 0.82) cedges.push({ a: a, b: grid[r + 1][c] }); }
    var en = Math.min(80, Math.round(cedges.length * 0.28));
    for (var e = 0; e < en; e++) electrons.push({ edge: (Math.random() * cedges.length) | 0, p: Math.random(), sp: rnd(0.004, 0.011) });
  }
  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * DPR; canvas.height = h * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var m = T.mode;
    if (m === "matrix") buildMatrix();
    else if (m === "petals") buildPetals();
    else if (m === "orbit") buildOrbit();
    else if (m === "circuit") buildCircuit();
    else if (m === "ribbon") { /* procedural */ }
    else buildNetwork();
    if (reduce) draw();
  }

  /* ---------- network ---------- */
  function drawNetwork(t) {
    var breathe = reduce ? 0.9 : (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.22)));
    ctx.clearRect(0, 0, w, h);
    if (labels.length) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (var L = 0; L < labels.length; L++) {
        var lb = labels[L];
        if (!reduce) { lb.x += lb.vx; lb.y += lb.vy; if (lb.x < -40) lb.x = w + 40; if (lb.x > w + 40) lb.x = -40; if (lb.y < -20) lb.y = h + 20; if (lb.y > h + 20) lb.y = -20; }
        var ltw = reduce ? 1 : (0.5 + 0.5 * Math.sin(t * lb.tw + lb.ph));
        ctx.font = lb.size.toFixed(0) + "px 'Courier New', monospace";
        ctx.fillStyle = "rgba(" + T.net + "," + (0.16 * breathe * ltw).toFixed(3) + ")"; ctx.fillText(lb.text, lb.x, lb.y);
      }
    }
    var i, a, LINK = T.link, LINK2 = LINK * LINK, SP = T.speed;
    if (!reduce) for (i = 0; i < nodes.length; i++) { a = nodes[i]; a.x += a.vx * SP; a.y += a.vy * SP; if (a.x < 0 || a.x > w) a.vx *= -1; if (a.y < 0 || a.y > h) a.vy *= -1; if (mouse.active) { var mdx = mouse.x - a.x, mdy = mouse.y - a.y, md2 = mdx * mdx + mdy * mdy; if (md2 < MOUSE_DIST * MOUSE_DIST && md2 > 0.25) { var md = Math.sqrt(md2); a.x += (mdx / md) * 0.6; a.y += (mdy / md) * 0.6; } } }
    var cell = LINK, cc = Math.max(1, Math.ceil(w / cell)), rr = Math.max(1, Math.ceil(h / cell)), grid = {};
    for (i = 0; i < nodes.length; i++) { a = nodes[i]; var cix = Math.min(cc - 1, Math.max(0, (a.x / cell) | 0)), cjx = Math.min(rr - 1, Math.max(0, (a.y / cell) | 0)); a._ci = cix; a._cj = cjx; var key = cjx * cc + cix; (grid[key] || (grid[key] = [])).push(i); }
    ctx.lineWidth = 1;
    for (i = 0; i < nodes.length; i++) { a = nodes[i]; for (var oj = a._cj - 1; oj <= a._cj + 1; oj++) { if (oj < 0 || oj >= rr) continue; for (var oi = a._ci - 1; oi <= a._ci + 1; oi++) { if (oi < 0 || oi >= cc) continue; var bk = grid[oj * cc + oi]; if (!bk) continue; for (var bi = 0; bi < bk.length; bi++) { var j = bk[bi]; if (j <= i) continue; var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy; if (d2 < LINK2) { var d = Math.sqrt(d2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = "rgba(" + T.net + "," + (0.3 * (1 - d / LINK) * breathe).toFixed(3) + ")"; ctx.stroke(); } } } } }
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i]; var tw = reduce ? 1 : (0.6 + 0.4 * Math.sin(t * a.tw + a.ph));
      if (a.star) { ctx.save(); ctx.shadowBlur = 9; ctx.shadowColor = "rgba(" + T.net + ",0.9)"; ctx.beginPath(); ctx.arc(a.x, a.y, 2.4, 0, 6.2832); ctx.fillStyle = "rgba(" + T.star + "," + (0.95 * breathe * tw).toFixed(3) + ")"; ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(a.x, a.y, 1.5, 0, 6.2832); ctx.fillStyle = "rgba(" + T.net + "," + (0.9 * breathe * tw).toFixed(3) + ")"; ctx.fill(); }
      if (mouse.active) { var cxx = a.x - mouse.x, cyy = a.y - mouse.y, cd2 = cxx * cxx + cyy * cyy; if (cd2 < MOUSE_DIST * MOUSE_DIST) { var cd = Math.sqrt(cd2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.strokeStyle = "rgba(" + T.net + "," + (0.4 * (1 - cd / MOUSE_DIST)).toFixed(3) + ")"; ctx.stroke(); } }
    }
    // (dark-theme cursor trail is drawn on the top cursor canvas in main.js so it
    //  emits right from the pointer instead of being hidden behind the content)
  }

  /* ---------- matrix ---------- */
  function drawMatrix(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.font = SIZE + "px 'Share Tech Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i]; if (!reduce) c.y += c.sp * T.speed;
      for (var k = 0; k < c.len; k++) {
        var yy = c.y - k * SIZE; if (yy < -SIZE || yy > h + SIZE) continue;
        var ch = GLYPH.charAt((Math.random() * GLYPH.length) | 0), lit = 0;
        if (mouse.active) { var dx = (c.x + SIZE / 2) - mouse.x, dy = yy - mouse.y, d2 = dx * dx + dy * dy; if (d2 < 22000) lit = 1 - Math.sqrt(d2) / 148; }
        if (k === 0 || lit > 0.4) { ctx.fillStyle = "rgba(" + T.star + "," + (k === 0 ? 0.95 : (0.6 + 0.4 * lit)).toFixed(2) + ")"; ctx.shadowBlur = 8; ctx.shadowColor = "rgba(" + T.net + ",0.9)"; }
        else if (lit > 0) { ctx.fillStyle = "rgba(" + T.net + "," + (0.55 * (1 - k / c.len) + 0.45 * lit).toFixed(3) + ")"; ctx.shadowBlur = 0; }
        else { ctx.fillStyle = "rgba(" + T.net + "," + (0.55 * (1 - k / c.len)).toFixed(3) + ")"; ctx.shadowBlur = 0; }
        ctx.fillText(ch, c.x + SIZE / 2, yy);
      }
      ctx.shadowBlur = 0;
      if (c.y - c.len * SIZE > h) { c.y = rnd(-h * 0.5, 0); c.sp = rnd(2.5, 7); c.len = Math.round(rnd(6, 20)); }
    }
  }

  /* ---------- sakura / petals ---------- */
  function drawPetals(t) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];
      if (!reduce) { p.y += p.vy * T.speed; p.x += Math.sin(t * p.sway + p.ph) * 0.6; p.rot += p.vr; if (mouse.active) { var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy; if (d2 < 16000 && d2 > 1) { var d = Math.sqrt(d2), f = (1 - d / 126); p.x += (dx / d) * f * 3.4; p.y += (dy / d) * f * 3.4; } } if (p.y > h + 20) { petals[i] = makePetal(); continue; } }
      var sx = Math.sin(t * p.sway + p.ph) * p.amp;
      ctx.save(); ctx.translate(p.x + sx, p.y); ctx.rotate(p.rot + sx * 0.02); ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, 0, 6.2832); ctx.fillStyle = "rgba(" + T.net + "," + p.al.toFixed(2) + ")"; ctx.fill(); ctx.restore();
    }
  }

  /* ---------- orbit ---------- */
  function drawOrbit(t) {
    ctx.clearRect(0, 0, w, h);
    var ax = mouse.active ? mouse.x : w / 2, ay = mouse.active ? mouse.y : h / 2;
    for (var i = 0; i < oparts.length; i++) {
      var p = oparts[i]; var dx = ax - p.x, dy = ay - p.y, d = Math.hypot(dx, dy) || 1; var g = Math.min(0.5, 400 / (d * d));
      p.vx += (dx / d) * g + (-dy / d) * g * 0.9; p.vy += (dy / d) * g + (dx / d) * g * 0.9; p.vx *= 0.96; p.vy *= 0.96;
      p.px = p.x; p.py = p.y; p.x += p.vx * T.speed; p.y += p.vy * T.speed;
      var sp = Math.min(1, Math.hypot(p.vx, p.vy) / 4);
      ctx.strokeStyle = "rgba(" + T.net + "," + (0.2 + 0.5 * sp).toFixed(3) + ")"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 6.2832); ctx.fillStyle = "rgba(" + T.star + ",0.85)"; ctx.fill();
    }
  }

  /* ---------- circuit ---------- */
  function drawCircuit(t) {
    ctx.clearRect(0, 0, w, h);
    var i, e, na, nb; ctx.lineWidth = 1;
    for (i = 0; i < cedges.length; i++) { e = cedges[i]; na = cnodes[e.a]; nb = cnodes[e.b]; var al = 0.08; if (mouse.active) { var mxm = (na.x + nb.x) / 2 - mouse.x, mym = (na.y + nb.y) / 2 - mouse.y, md = Math.hypot(mxm, mym); if (md < 200) al += 0.5 * (1 - md / 200); } ctx.strokeStyle = "rgba(" + T.net + "," + al.toFixed(3) + ")"; ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); ctx.stroke(); }
    for (i = 0; i < cnodes.length; i++) { var n = cnodes[i], lit = 0; if (mouse.active) { var dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy); if (d < 160) lit = 1 - d / 160; } var p = 0.2 + 0.15 * Math.sin(t * 2 + (n.x + n.y) * 0.01) + lit * 0.8; ctx.fillStyle = "rgba(" + T.net + "," + Math.min(1, p).toFixed(3) + ")"; if (lit > 0.4) { ctx.shadowBlur = 10; ctx.shadowColor = "rgba(" + T.star + ",0.9)"; } ctx.fillRect(n.x - 1.6, n.y - 1.6, 3.2, 3.2); ctx.shadowBlur = 0; }
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < electrons.length; i++) { var el = electrons[i]; e = cedges[el.edge]; if (!e) continue; na = cnodes[e.a]; nb = cnodes[e.b]; if (!reduce) { el.p += el.sp * T.speed; if (el.p > 1) { el.p = 0; el.edge = (Math.random() * cedges.length) | 0; } } var x = na.x + (nb.x - na.x) * el.p, y = na.y + (nb.y - na.y) * el.p; ctx.shadowBlur = 8; ctx.shadowColor = "rgba(" + T.star + ",0.9)"; ctx.fillStyle = "rgba(" + T.star + ",0.95)"; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.2832); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over";
  }

  /* ---------- ribbon ---------- */
  function drawRibbon(t) {
    ctx.clearRect(0, 0, w, h); var N = 6;
    for (var L = 0; L < N; L++) {
      var baseY = h * (0.22 + 0.56 * (L / (N - 1))), amp = 26 + L * 6, fq = 0.004 + L * 0.0012, sp = (0.5 + L * 0.18) * T.speed, col = (L % 2 === 0) ? T.net : T.star;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 8) { var mb = 0; if (mouse.active) { var dxm = x - mouse.x; mb = Math.exp(-(dxm * dxm) / 30000) * (mouse.y - baseY) * 0.6; } var y = baseY + Math.sin(x * fq + t * sp + L) * amp + Math.sin(x * fq * 1.8 - t * sp * 0.7) * amp * 0.4 + mb; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = "rgba(" + col + "," + (0.16 + 0.07 * L).toFixed(3) + ")"; ctx.lineWidth = 1.4; ctx.shadowBlur = 10; ctx.shadowColor = "rgba(" + col + ",0.5)"; ctx.lineCap = "round"; ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function draw() {
    var t = performance.now() / 1000; var m = T.mode;
    if (m === "matrix") drawMatrix(t);
    else if (m === "petals") drawPetals(t);
    else if (m === "orbit") drawOrbit(t);
    else if (m === "circuit") drawCircuit(t);
    else if (m === "ribbon") drawRibbon(t);
    else drawNetwork(t);
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  function start() { if (!raf && !reduce) raf = requestAnimationFrame(draw); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
  window.addEventListener("mouseout", function () { mouse.active = false; });
  window.addEventListener("touchmove", function (e) { if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true; } }, { passive: true });
  window.addEventListener("touchend", function () { mouse.active = false; });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  // expose the active theme's animal cursor (or null) for main.js
  window.__bgCursor = function (name) { var th = THEMES[name]; return (th && th.cursor) || null; };
  window.__bgTheme = function (name) { stop(); T = THEMES[name] || THEMES.dark; resize(); if (reduce) draw(); else start(); };

  __bgTheme(document.documentElement.dataset.theme || "dark");
})();
