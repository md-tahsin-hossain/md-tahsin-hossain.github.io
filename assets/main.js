/* ==========================================================================
   Md. Tahsin Hossain — Portfolio
   Vanilla JS: navigation, scroll effects, animations, certificate viewer
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme switcher ---------- */
  (function () {
    var root = document.documentElement;
    var btns = [].slice.call(document.querySelectorAll("[data-theme-btn]"));
    if (!btns.length) return;

    function apply(name) {
      root.dataset.theme = name;
      btns.forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-theme-btn") === name);
      });
      try { localStorage.setItem("theme", name); } catch (e) {}
      if (typeof window.__bgTheme === "function") window.__bgTheme(name);
      if (typeof window.__cursorMode === "function") window.__cursorMode(name);
    }

    btns.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-theme-btn")); });
    });

    // reflect the theme already applied by the inline head script
    apply(root.dataset.theme || "dark");
  })();

  /* ---------- Header background on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 20);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Pause background videos when off-screen ---------- */
  var videos = document.querySelectorAll(".bg-video video");
  if (reduceMotion) {
    videos.forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
  } else if ("IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    });
    videos.forEach(function (v) { vio.observe(v); });
  }

  /* ---------- Certificate viewer ---------- */
  var box = document.getElementById("lightbox");
  if (box && typeof box.showModal === "function") {
    var boxImg = box.querySelector("img");
    var boxCaption = box.querySelector("p");

    document.querySelectorAll("[data-full]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var thumb = btn.querySelector("img");
        boxImg.src = btn.getAttribute("href");
        boxImg.alt = thumb ? thumb.alt : "";
        boxCaption.textContent = btn.querySelector("figcaption").textContent;
        box.showModal();
      });
    });

    box.querySelector(".lightbox-close").addEventListener("click", function () { box.close(); });
    box.addEventListener("click", function (e) { if (e.target === box) box.close(); });
    box.addEventListener("close", function () { boxImg.removeAttribute("src"); });
  }

  /* ---------- "TAHSIN" letters: fly in, keep drifting, and react to the cursor ---------- */
  (function () {
    var wrap = document.querySelector(".letters");
    if (!wrap) return;
    var spans = [].slice.call(wrap.querySelectorAll("span"));
    var fine = window.matchMedia("(pointer: fine)").matches;

    spans.forEach(function (s, i) {
      s._m = {
        from: parseFloat(s.style.getPropertyValue("--from")) || -120,
        delay: parseFloat(s.style.getPropertyValue("--delay")) || 0,
        dur: parseFloat(s.style.getPropertyValue("--dur")) || 2,   // loop period (varied per letter)
      };
    });

    if (reduceMotion) {
      spans.forEach(function (s) { s.style.opacity = "1"; s.style.transform = "none"; });
      return;
    }

    var mx = -9999, my = -9999, active = false, R = 110;
    if (fine) {
      window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; active = true; }, { passive: true });
      window.addEventListener("mouseout", function () { active = false; });
    }

    var t0 = performance.now();
    function frame(now) {
      var t = (now - t0) / 1000;
      for (var i = 0; i < spans.length; i++) {
        var s = spans[i], m = s._m;
        // continuous rightward run: each letter slides in from the left, fades through, loops
        var period = m.dur;
        var p = (((t - m.delay) / period) % 1 + 1) % 1;   // 0..1
        var ease = 1 - Math.pow(1 - p, 3);
        var runX = m.from * (1 - ease);      // from (negative = left) -> 0, moving right
        var op = Math.sin(p * Math.PI);      // fade in then out, seamless loop
        // cursor repel on top
        var rx = 0, ry = 0;
        if (fine && active) {
          var r = s.getBoundingClientRect();
          var dx = (r.left + r.width / 2) - mx, dy = (r.top + r.height / 2) - my;
          var d = Math.hypot(dx, dy);
          if (d < R && d > 0.1) { var push = (1 - d / R) * 28; rx = dx / d * push; ry = dy / d * push; }
        }
        s.style.opacity = (0.25 + 0.75 * op).toFixed(3);
        s.style.transform = "translate(" + (runX + rx).toFixed(1) + "px," + ry.toFixed(1) + "px)";
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- Custom cursor: rotating arrow + animal creatures (mouse only) ---------- */
  (function () {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    var root = document.documentElement;
    root.classList.add("has-arrow");

    // the arrow DOM element (used for all non-animal themes)
    var arrow = document.createElement("div");
    arrow.className = "arrow-cursor";
    arrow.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 48">' +
      '<path d="M26.46 16.04 L33.54 31.96 Q38 42 32.64 39.32 L27.36 36.68 Q22 34 16.64 36.68 ' +
      'L11.36 39.32 Q6 42 10.46 31.96 L17.54 16.04 Q22 6 26.46 16.04 Z" ' +
      'stroke-linejoin="round" stroke-linecap="round"/></svg>';
    document.body.appendChild(arrow);

    // a top canvas for the animal creatures + fire (sits above all content)
    var cfx = document.createElement("canvas");
    cfx.className = "cursor-fx";
    document.body.appendChild(cfx);
    var cx = cfx.getContext("2d");
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    function sizeFx() { cfx.width = window.innerWidth * DPR; cfx.height = window.innerHeight * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    sizeFx(); window.addEventListener("resize", sizeFx);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var ax = mx, ay = my, lastX = mx, lastY = my, vx = 0, vy = 0, heading = 0, present = false;
    window.addEventListener("mousemove", function (e) {
      var jump = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      vx += ((e.clientX - lastX) - vx) * 0.4; vy += ((e.clientY - lastY) - vy) * 0.4;
      lastX = e.clientX; lastY = e.clientY; mx = e.clientX; my = e.clientY;
      // big teleport (re-entering the window, or jumping after a click) → collapse the
      // body onto the cursor so no long straight "line" stretches back to the old spot
      if (jump > 200 || !present) { for (var i = 0; i < pts.length; i++) { pts[i].x = mx; pts[i].y = my; } }
      present = true;
    }, { passive: true });
    window.addEventListener("mouseout", function (e) { if (!e.relatedTarget) present = false; });
    window.addEventListener("mouseover", function () { present = true; });

    // chain of points trailing the cursor (snake/dragon/koi bodies)
    var MAXN = 34, pts = [];
    for (var pi = 0; pi < MAXN; pi++) pts.push({ x: mx, y: my });
    function chain(spacing, n) {
      pts[0].x += (mx - pts[0].x) * 0.5; pts[0].y += (my - pts[0].y) * 0.5;
      for (var i = 1; i < n; i++) { var a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; b.x = a.x + dx / d * spacing; b.y = a.y + dy / d * spacing; }
    }

    var mode = "arrow", ACC = "151,167,243", STAR = "255,235,200", atrail = [];
    window.__cursorMode = function (name) {
      mode = (typeof window.__bgCursor === "function" && window.__bgCursor(name)) || "arrow";
      var cs = getComputedStyle(root);
      ACC = cs.getPropertyValue("--accent-rgb").trim() || ACC;
      root.classList.toggle("animal-cursor", mode !== "arrow");
      if (mode !== "arrow") { arrow.style.opacity = "0"; for (var i = 0; i < pts.length; i++) { pts[i].x = mx; pts[i].y = my; } }
      else arrow.style.opacity = present ? "1" : "0";
    };

    /* fire + burn (dragon) */
    var fire = [], burnFrame = 0, fireCharge = 0;
    function textAt(px, py) {
      if (px < 0 || py < 0 || px > window.innerWidth || py > window.innerHeight) return null;
      var el = document.elementFromPoint(px, py); if (!el || !el.closest) return null;
      return el.closest("h1,h2,h3,h4,p,a,li,figcaption,blockquote,.hero-role,.eyebrow,.logo,span");
    }
    function burnAt(px, py) {
      var tgt = textAt(px, py);
      if (!tgt || tgt.classList.contains("is-burning")) return;
      tgt.classList.add("is-burning");
      setTimeout(function () { tgt.classList.remove("is-burning"); }, 1300);
    }

    function dot(x, y, r, col, a) { cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.fillStyle = "rgba(" + col + "," + a + ")"; cx.fill(); }

    // fill a smooth tapered body along a centreline; widthAt(i, n) gives half-width
    function bodyRibbon(cl, widthAt, fillStyle, outline) {
      var n = cl.length, left = [], right = [], i;
      for (i = 0; i < n; i++) {
        var a = cl[Math.max(0, i - 1)], b = cl[Math.min(n - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, hw = widthAt(i, n);
        left.push({ x: cl[i].x + nx * hw, y: cl[i].y + ny * hw }); right.push({ x: cl[i].x - nx * hw, y: cl[i].y - ny * hw });
      }
      cx.beginPath(); cx.moveTo(right[0].x, right[0].y);
      for (i = 1; i < n; i++) cx.lineTo(right[i].x, right[i].y);
      for (i = n - 1; i >= 0; i--) cx.lineTo(left[i].x, left[i].y);
      cx.closePath();
      if (fillStyle) { cx.fillStyle = fillStyle; cx.fill(); }
      if (outline) { cx.strokeStyle = outline; cx.lineWidth = 1.2; cx.stroke(); }
      return { left: left, right: right };
    }
    // build a centreline from the chain with a swimming/slither lateral wave
    function slither(n, amp, freq, t, taper) {
      var cl = [];
      for (var i = 0; i < n; i++) { var a = pts[Math.max(0, i - 1)], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, env = taper ? (i / n) : Math.min(1, i / 4), off = Math.sin(i * freq - t * 5) * amp * env; cl.push({ x: b.x + nx * off, y: b.y + ny * off }); }
      return cl;
    }

    function drawSnake(t) {
      chain(8, 30); var n = 30, i, cl = slither(n, 5, 0.45, t, false);
      function wd(i2) { var u = i2 / n; return 1.2 + 6.8 * Math.sin(Math.min(1, u * 1.3) * Math.PI * 0.9) * (1 - u * 0.2); }
      var grad = cx.createLinearGradient(cl[0].x, cl[0].y, cl[n - 1].x, cl[n - 1].y);
      grad.addColorStop(0, "rgba(" + ACC + ",1)"); grad.addColorStop(1, "rgba(" + ACC + ",0.55)");
      bodyRibbon(cl, wd, grad, "rgba(10,24,14,0.55)");
      // scale bands + belly sheen
      cx.strokeStyle = "rgba(10,30,16,0.3)"; cx.lineWidth = 1;
      for (i = 3; i < n - 1; i += 2) { var a = cl[i - 1], b = cl[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, hw = wd(i); cx.beginPath(); cx.moveTo(b.x + nx * hw, b.y + ny * hw); cx.lineTo(b.x - nx * hw, b.y - ny * hw); cx.stroke(); }
      var hx = cl[0].x, hy = cl[0].y, ex = Math.cos(heading), ey = Math.sin(heading), px = -ey, py = ex;
      cx.save(); cx.translate(hx, hy); cx.rotate(heading);
      cx.fillStyle = "rgba(" + ACC + ",1)"; cx.strokeStyle = "rgba(10,24,14,0.6)"; cx.lineWidth = 1.2;
      cx.beginPath(); cx.moveTo(11, 0); cx.quadraticCurveTo(7, 6.5, -4, 5.5); cx.quadraticCurveTo(-8, 0, -4, -5.5); cx.quadraticCurveTo(7, -6.5, 11, 0); cx.closePath(); cx.fill(); cx.stroke();
      cx.fillStyle = "rgba(255,220,80,0.95)"; dot(1.5, -3.6, 2.1, "255,220,80", 0.95); dot(1.5, 3.6, 2.1, "255,220,80", 0.95);
      cx.strokeStyle = "#0a0a08"; cx.lineWidth = 1.1; cx.beginPath(); cx.moveTo(1.5, -4.7); cx.lineTo(1.5, -2.5); cx.moveTo(1.5, 2.5); cx.lineTo(1.5, 4.7); cx.stroke();
      dot(8.5, -1.5, 0.7, "10,24,14", 0.8); dot(8.5, 1.5, 0.7, "10,24,14", 0.8);
      cx.restore();
      // flick the forked tongue only when the head is near some text/element
      if (textAt(hx + ex * 14, hy + ey * 14)) { var tl = 10 + Math.sin(t * 22) * 4, bx = hx + ex * 11, by = hy + ey * 11, tx = bx + ex * tl, ty = by + ey * tl; cx.strokeStyle = "rgba(230,40,70,0.95)"; cx.lineWidth = 1.4; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(bx, by); cx.lineTo(tx, ty); cx.moveTo(tx, ty); cx.lineTo(tx + ex * 4 + px * 3, ty + ey * 4 + py * 3); cx.moveTo(tx, ty); cx.lineTo(tx + ex * 4 - px * 3, ty + ey * 4 - py * 3); cx.stroke(); }
    }

    // top-view serpentine dragon with a FIXED body length (does not grow/shrink with speed).
    function drawDragon(t) {
      var n = 16;
      chain(11, n);
      var i, cl = pts.slice(0, n), ex = Math.cos(heading), ey = Math.sin(heading), px = -ey, py = ex;
      function wd(i2) { var u = i2 / n; return 4 + 13 * (1 - u) * (0.55 + 0.45 * Math.sin(u * Math.PI)); }
      var grad = cx.createLinearGradient(cl[0].x, cl[0].y, cl[n - 1].x, cl[n - 1].y);
      grad.addColorStop(0, "rgba(" + ACC + ",1)"); grad.addColorStop(1, "rgba(" + ACC + ",0.5)");
      bodyRibbon(cl, wd, grad, "rgba(70,18,0,0.6)");
      // dorsal spike ridge
      cx.fillStyle = "rgba(" + STAR + ",0.85)";
      for (i = 2; i < n - 1; i++) { var a = cl[i - 1], b = cl[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, ux = dx / d, uy = dy / d, hw = wd(i), s = 4 * (1 - i / n) + 2.5; cx.beginPath(); cx.moveTo(b.x + nx * hw, b.y + ny * hw); cx.lineTo(b.x + nx * (hw + s) - ux * 3, b.y + ny * (hw + s) - uy * 3); cx.lineTo(b.x + nx * hw - ux * 5, b.y + ny * hw - uy * 5); cx.closePath(); cx.fill(); }
      // tail: fin membranes along the last segments, then a barbed spade tip
      cx.fillStyle = "rgba(" + ACC + ",0.42)";
      for (i = Math.max(1, n - 6); i < n - 1; i++) { var a2 = cl[i - 1], b2 = cl[i], dx2 = b2.x - a2.x, dy2 = b2.y - a2.y, d2 = Math.hypot(dx2, dy2) || 1, nx2 = -dy2 / d2, ny2 = dx2 / d2, ux2 = dx2 / d2, uy2 = dy2 / d2, fin = (n - 1 - i) * 2.2 + 4; cx.beginPath(); cx.moveTo(b2.x + nx2 * 2, b2.y + ny2 * 2); cx.quadraticCurveTo(b2.x + nx2 * fin - ux2 * 2, b2.y + ny2 * fin - uy2 * 2, b2.x + nx2 * 2 - ux2 * 7, b2.y + ny2 * 2 - uy2 * 7); cx.closePath(); cx.fill(); cx.beginPath(); cx.moveTo(b2.x - nx2 * 2, b2.y - ny2 * 2); cx.quadraticCurveTo(b2.x - nx2 * fin - ux2 * 2, b2.y - ny2 * fin - uy2 * 2, b2.x - nx2 * 2 - ux2 * 7, b2.y - ny2 * 2 - uy2 * 7); cx.closePath(); cx.fill(); }
      var te = cl[n - 1], tp = cl[n - 2], tdx = te.x - tp.x, tdy = te.y - tp.y, td = Math.hypot(tdx, tdy) || 1, tux = tdx / td, tuy = tdy / td, tnx = -tuy, tny = tux;
      cx.fillStyle = "rgba(" + STAR + ",0.92)"; cx.strokeStyle = "rgba(70,18,0,0.5)"; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(te.x + tux * 22, te.y + tuy * 22); cx.lineTo(te.x + tux * 4 + tnx * 11, te.y + tuy * 4 + tny * 11); cx.lineTo(te.x + tux * 10, te.y + tuy * 10); cx.lineTo(te.x + tux * 4 - tnx * 11, te.y + tuy * 4 - tny * 11); cx.closePath(); cx.fill(); cx.stroke();
      // one pair of membrane wings (no legs)
      function dragonWing(sh, span, flap) {
        var fl = 0.35 + 0.65 * Math.abs(Math.sin(flap)), dep = span * 0.5;
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var tipx = sh.x - ex * 10 + px * sgn * (span * fl), tipy = sh.y - ey * 10 + py * sgn * (span * fl);
          cx.fillStyle = "rgba(" + ACC + ",0.4)"; cx.strokeStyle = "rgba(" + STAR + ",0.55)"; cx.lineWidth = 1.2;
          cx.beginPath(); cx.moveTo(sh.x, sh.y); cx.quadraticCurveTo(sh.x + px * sgn * dep - ex * 2, sh.y + py * sgn * dep - ey * 2, tipx, tipy); cx.quadraticCurveTo(sh.x - ex * dep + px * sgn * (dep * 0.73) * fl, sh.y - ey * dep + py * sgn * (dep * 0.73) * fl, sh.x - ex * dep, sh.y - ey * dep); cx.closePath(); cx.fill(); cx.stroke();
          cx.strokeStyle = "rgba(" + STAR + ",0.5)"; cx.beginPath(); cx.moveTo(sh.x, sh.y); cx.lineTo(tipx, tipy); cx.stroke();
        }
      }
      dragonWing(cl[3] || cl[0], 44, t * 6);
      // head: elongated snout, horns, whiskers, glowing eyes
      var hx = cl[0].x, hy = cl[0].y;
      cx.save(); cx.translate(hx, hy); cx.rotate(heading);
      cx.fillStyle = "rgba(" + ACC + ",1)"; cx.strokeStyle = "rgba(70,18,0,0.6)"; cx.lineWidth = 1.4;
      cx.beginPath(); cx.moveTo(20, 0); cx.quadraticCurveTo(12, 10, -6, 9); cx.quadraticCurveTo(-13, 0, -6, -9); cx.quadraticCurveTo(12, -10, 20, 0); cx.closePath(); cx.fill(); cx.stroke();
      cx.strokeStyle = "rgba(70,18,0,0.4)"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(18, 0); cx.lineTo(4, 3); cx.stroke();
      cx.strokeStyle = "rgba(" + STAR + ",0.9)"; cx.lineWidth = 3.2; cx.lineCap = "round";
      cx.beginPath(); cx.moveTo(-4, -6); cx.quadraticCurveTo(-16, -11, -25, -7); cx.moveTo(-4, 6); cx.quadraticCurveTo(-16, 11, -25, 7); cx.stroke();
      cx.strokeStyle = "rgba(" + STAR + ",0.55)"; cx.lineWidth = 1.2;
      cx.beginPath(); cx.moveTo(18, -3); cx.quadraticCurveTo(34, -13, 46, -7 + Math.sin(t * 4) * 3); cx.moveTo(18, 3); cx.quadraticCurveTo(34, 13, 46, 7 + Math.sin(t * 4 + 1) * 3); cx.stroke();
      dot(6, -4, 2.3, "255,240,150", 1); dot(6, 4, 2.3, "255,240,150", 1);
      cx.restore();
      // fire breath — ONLY when the mouth is near some text/element
      var mouthX = hx + ex * 20, mouthY = hy + ey * 20;
      if (!present) { fire.length = 0; fireCharge = 0; }
      else {
        var nearText = textAt(mouthX + ex * 10, mouthY + ey * 10) || textAt(mouthX + ex * 34, mouthY + ey * 34);
        if (nearText) fireCharge = 1; else fireCharge = Math.max(0, fireCharge - 0.04);
        if (fireCharge > 0.12) { var pn = 1 + Math.round(2 * fireCharge); for (var f = 0; f < pn; f++) { var spd = 2 + Math.random() * 4, spr = (Math.random() - 0.5) * 0.5, ca = heading + spr; fire.push({ x: mouthX, y: mouthY, vx: Math.cos(ca) * spd + vx * 0.2, vy: Math.sin(ca) * spd + vy * 0.2, life: 1, r: 3 + Math.random() * 5 }); } }
        if (fire.length > 90) fire.splice(0, fire.length - 90);
        if (nearText && (burnFrame++ % 4) === 0) { burnAt(mouthX + ex * 10, mouthY + ey * 10); burnAt(mouthX + ex * 34, mouthY + ey * 34); }
      }
      cx.globalCompositeOperation = "lighter";
      for (var fi2 = fire.length - 1; fi2 >= 0; fi2--) { var p = fire[fi2]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= 0.04; if (p.life <= 0) { fire.splice(fi2, 1); continue; } var k = p.life; cx.beginPath(); cx.arc(p.x, p.y, p.r * (1.2 - k * 0.5), 0, 6.2832); var col = k > 0.6 ? "255,240,150" : (k > 0.3 ? "255,150,40" : "200,50,20"); cx.fillStyle = "rgba(" + col + "," + (k * 0.5).toFixed(3) + ")"; cx.fill(); }
      cx.globalCompositeOperation = "source-over";
    }

    function drawKoi(t) {
      chain(9, 7); var n = 7, i, cl = slither(n, 4, 0.7, t, true);
      var ex = Math.cos(heading), ey = Math.sin(heading), px = -ey, py = ex;
      var WHITE = "245,246,250", ORANGE = "255,120,40", DARK = "25,22,28";
      // caudal (tail) fin, wagging
      var te = cl[n - 1], tb = cl[n - 2], tdx = te.x - tb.x, tdy = te.y - tb.y, td = Math.hypot(tdx, tdy) || 1, tux = tdx / td, tuy = tdy / td, tnx = -tuy, tny = tux, wag = Math.sin(t * 7) * 7;
      cx.fillStyle = "rgba(" + ORANGE + ",0.5)";
      cx.beginPath(); cx.moveTo(tb.x, tb.y); cx.quadraticCurveTo(te.x + tux * 6, te.y + tuy * 6, te.x + tux * 20 + tnx * (14 + wag), te.y + tuy * 20 + tny * (14 + wag)); cx.lineTo(te.x + tux * 22, te.y + tuy * 22); cx.quadraticCurveTo(te.x + tux * 6, te.y + tuy * 6, te.x + tux * 20 - tnx * (14 - wag), te.y + tuy * 20 - tny * (14 - wag)); cx.closePath(); cx.fill();
      // dorsal fin
      var ffl = Math.sin(t * 5) * 3; cx.fillStyle = "rgba(" + ORANGE + ",0.4)";
      cx.beginPath(); cx.moveTo(cl[1].x + px * 4, cl[1].y + py * 4); cx.quadraticCurveTo(cl[1].x + px * (14 + ffl) - ex * 4, cl[1].y + py * (14 + ffl) - ey * 4, cl[2].x + px * 4, cl[2].y + py * 4); cx.closePath(); cx.fill();
      // pectoral fins (both sides)
      var pf = Math.sin(t * 8) * 5; cx.fillStyle = "rgba(" + WHITE + ",0.5)";
      for (var sgn = -1; sgn <= 1; sgn += 2) { var b = cl[1]; cx.beginPath(); cx.moveTo(b.x, b.y); cx.quadraticCurveTo(b.x + px * sgn * 11 - ex * 2, b.y + py * sgn * 11 - ey * 2, b.x - ex * 9 + px * sgn * (9 + pf), b.y - ey * 9 + py * sgn * (9 + pf)); cx.closePath(); cx.fill(); }
      // white body
      var body = cl.slice(0, n - 1);
      bodyRibbon(body, function (i2, m) { var u = i2 / (m - 1); return 2 + 12 * Math.pow(1 - u, 0.65) * (0.5 + 0.5 * Math.sin((1 - u) * Math.PI * 0.9)); }, "rgba(" + WHITE + ",0.96)", "rgba(80,90,110,0.4)");
      // kohaku orange patches + a black spot
      dot(cl[1].x, cl[1].y, 8, ORANGE, 0.9); dot(cl[2].x + px * 2, cl[2].y + py * 2, 6, ORANGE, 0.85); dot(cl[2].x - px * 4, cl[2].y - py * 4, 2.6, DARK, 0.75);
      // rounded head (so the front isn't a point), with an orange crown patch, eyes + mouth
      var hx = cl[0].x, hy = cl[0].y;
      cx.save(); cx.translate(hx, hy); cx.rotate(heading);
      cx.fillStyle = "rgba(" + WHITE + ",0.97)"; cx.strokeStyle = "rgba(80,90,110,0.4)"; cx.lineWidth = 1;
      cx.beginPath(); cx.ellipse(2, 0, 11, 9, 0, 0, 6.2832); cx.fill(); cx.stroke();
      cx.fillStyle = "rgba(" + ORANGE + ",0.9)"; cx.beginPath(); cx.ellipse(-1, 0, 6, 7, 0, 0, 6.2832); cx.fill();   // tancho/crown patch
      dot(4, -5, 1.9, DARK, 0.95); dot(4, 5, 1.9, DARK, 0.95);                                                        // eyes
      cx.strokeStyle = "rgba(110,70,55,0.7)"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(12, -2.5); cx.quadraticCurveTo(14, 0, 12, 2.5); cx.stroke();  // mouth
      // barbels (whisker-like, koi have them)
      cx.strokeStyle = "rgba(" + WHITE + ",0.6)"; cx.lineWidth = 0.8; cx.beginPath(); cx.moveTo(12, -2); cx.lineTo(17, -4); cx.moveTo(12, 2); cx.lineTo(17, 4); cx.stroke();
      cx.restore();
    }

    function sprite(hx, hy, rot, fn) { cx.save(); cx.translate(hx, hy); cx.rotate(rot); fn(); cx.restore(); }

    function drawButterfly(t) {
      ax += (mx - ax) * 0.35; ay += (my - ay) * 0.35;
      var flap = Math.abs(Math.sin(t * 7)), rot = heading + Math.PI / 2;
      sprite(ax, ay, rot, function () {
        cx.strokeStyle = "rgba(30,24,16,0.9)"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, -8); cx.lineTo(0, 9); cx.stroke();
        // antennae
        cx.lineWidth = 1; cx.beginPath(); cx.moveTo(0, -8); cx.lineTo(-4, -14); cx.moveTo(0, -8); cx.lineTo(4, -14); cx.stroke();
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var sx = (0.35 + 0.65 * flap) * sgn;
          cx.save(); cx.scale(sx, 1);
          cx.fillStyle = "rgba(" + ACC + ",0.85)"; cx.beginPath(); cx.ellipse(10, -4, 10, 7, -0.3, 0, 6.2832); cx.fill();
          cx.fillStyle = "rgba(" + STAR + ",0.8)"; cx.beginPath(); cx.ellipse(8, 8, 7, 6, 0.4, 0, 6.2832); cx.fill();
          cx.restore();
        }
      });
    }

    /* ---- detailed belly-view gecko, pre-rendered once to an offscreen sprite ---- */
    var geckoSprite = null;
    function buildGeckoSprite() {
      var SW = 200, SH = 330, cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
      var g = cv.getContext("2d");
      var CX = 100, BCY = 164;   // body centre
      var SKIN = "206,202,184", LIGHT = "234,232,214", EDGE = "142,144,116", WARM = "224,146,96", TOE = "220,216,196", LINE = "118,116,92";
      // slim, elongated house-lizard silhouette (narrow torso, long neck + hips)
      function sil() { g.beginPath(); g.ellipse(CX, 38, 11, 14, 0, 0, 6.2832); g.ellipse(CX, 82, 9, 24, 0, 0, 6.2832); g.ellipse(CX, BCY, 24, 66, 0, 0, 6.2832); g.ellipse(CX, 224, 14, 26, 0, 0, 6.2832); }
      // --- long thin tapering tail ---
      (function () {
        var n = 12, L = [], R = [], i;
        for (i = 0; i <= n; i++) { var pr = i / n, yy = 244 + pr * 78, xx = CX + Math.sin(pr * 2.4) * 8 * pr, hw = 9 * (1 - pr) + 0.6; L.push({ x: xx - hw, y: yy }); R.push({ x: xx + hw, y: yy }); }
        g.beginPath(); g.moveTo(R[0].x, R[0].y); for (i = 1; i <= n; i++) g.lineTo(R[i].x, R[i].y); for (i = n; i >= 0; i--) g.lineTo(L[i].x, L[i].y); g.closePath();
        var tg = g.createLinearGradient(0, 244, 0, 322); tg.addColorStop(0, "rgba(" + SKIN + ",1)"); tg.addColorStop(1, "rgba(" + EDGE + ",0.9)"); g.fillStyle = tg; g.fill();
        g.strokeStyle = "rgba(" + EDGE + ",0.6)"; g.lineWidth = 1; g.stroke();
        g.strokeStyle = "rgba(" + LINE + ",0.4)"; g.lineWidth = 0.7;
        for (i = 1; i < n; i++) { g.beginPath(); g.moveTo(L[i].x, L[i].y); g.lineTo(R[i].x, R[i].y); g.stroke(); }
      })();
      // --- legs + feet ---
      function toe(x, y, ang, len, sc) {
        g.save(); g.translate(x, y); g.rotate(ang);
        g.fillStyle = "rgba(" + TOE + ",0.97)";
        g.beginPath(); g.moveTo(0, -1.7 * sc); g.lineTo(len, -1.3 * sc); g.quadraticCurveTo(len + 3 * sc, 0, len, 1.3 * sc); g.lineTo(0, 1.7 * sc); g.closePath(); g.fill();
        g.strokeStyle = "rgba(" + LINE + ",0.45)"; g.lineWidth = 0.5; g.stroke();
        g.strokeStyle = "rgba(" + LINE + ",0.5)"; g.lineWidth = 0.5;
        for (var l = 1; l <= 5; l++) { var px = len * 0.35 + l * 1.6 * sc; if (px > len + 2 * sc) break; g.beginPath(); g.moveTo(px, -1.4 * sc); g.lineTo(px, 1.4 * sc); g.stroke(); }
        g.restore();
      }
      function foot(fx, fy, baseAng, sc) {
        g.fillStyle = "rgba(" + TOE + ",0.95)"; g.beginPath(); g.ellipse(fx, fy, 3.4 * sc, 2.9 * sc, baseAng, 0, 6.2832); g.fill();
        for (var k = 0; k < 5; k++) { var a = baseAng + (k - 2) * 0.42; toe(fx, fy, a, (8 + (k === 2 ? 2 : 0)) * sc, sc); }
      }
      function leg(sx, sy, ex, ey, sc) {
        g.strokeStyle = "rgba(" + SKIN + ",0.95)"; g.lineCap = "round"; g.lineWidth = 5 * sc;
        var midx = (sx + ex) / 2 + (ex - sx) * 0.12, midy = (sy + ey) / 2 - 7 * sc;
        g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(midx, midy, ex, ey); g.stroke();
        g.strokeStyle = "rgba(" + EDGE + ",0.4)"; g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(midx, midy, ex, ey); g.stroke();
        foot(ex, ey, Math.atan2(ey - sy, ex - sx), sc);
      }
      leg(86, 116, 28, 130, 0.95);   // front-left (near → slightly larger)
      leg(114, 116, 172, 130, 0.95); // front-right
      leg(86, 206, 30, 226, 0.82);   // hind-left (farther → smaller)
      leg(114, 206, 170, 226, 0.82); // hind-right
      // --- body fill + clipped scale texture ---
      g.save(); sil(); g.clip();
      var bg = g.createRadialGradient(CX, BCY, 5, CX, BCY, 72); bg.addColorStop(0, "rgba(" + LIGHT + ",1)"); bg.addColorStop(0.7, "rgba(" + SKIN + ",1)"); bg.addColorStop(1, "rgba(" + EDGE + ",1)");
      g.fillStyle = bg; g.fillRect(0, 0, SW, SH);
      function blush(x, y, r) { var rg = g.createRadialGradient(x, y, 1, x, y, r); rg.addColorStop(0, "rgba(" + WARM + ",0.5)"); rg.addColorStop(1, "rgba(" + WARM + ",0)"); g.fillStyle = rg; g.fillRect(0, 0, SW, SH); }
      blush(CX - 7, BCY, 22); blush(CX + 8, BCY + 18, 18); blush(CX, BCY - 34, 14);
      for (var yy = 10; yy < 258; yy += 4.4) {
        var row = Math.round(yy / 4.4), ox = (row % 2) * 2.2;
        var vs = Math.max(0.5, 1 - Math.abs(yy - BCY) / 180);
        for (var xx = ox; xx < SW; xx += 4.4) {
          var lv = 0.5 + 0.5 * Math.sin(xx * 0.7 + yy * 0.3);
          g.beginPath(); g.ellipse(xx, yy, 2.1 * vs, 1.8 * vs, 0, 0, 6.2832);
          g.fillStyle = "rgba(" + (lv > 0.6 ? LIGHT : SKIN) + ",0.5)"; g.fill();
          g.strokeStyle = "rgba(" + LINE + ",0.18)"; g.lineWidth = 0.4; g.stroke();
        }
      }
      var vg = g.createRadialGradient(CX, BCY, 36, CX, BCY, 80); vg.addColorStop(0, "rgba(" + EDGE + ",0)"); vg.addColorStop(1, "rgba(76,76,58,0.5)"); g.fillStyle = vg; g.fillRect(0, 0, SW, SH);
      g.restore();
      g.save(); sil(); g.strokeStyle = "rgba(" + EDGE + ",0.55)"; g.lineWidth = 1.3; g.stroke(); g.restore();
      // --- head detail ---
      g.fillStyle = "rgba(40,38,34,0.95)"; g.beginPath(); g.arc(CX - 5, 34, 2.1, 0, 6.2832); g.arc(CX + 5, 34, 2.1, 0, 6.2832); g.fill();
      g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(CX - 5.7, 33, 0.7, 0, 6.2832); g.arc(CX + 4.3, 33, 0.7, 0, 6.2832); g.fill();
      g.strokeStyle = "rgba(" + LINE + ",0.5)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(CX - 6, 46); g.quadraticCurveTo(CX, 50, CX + 6, 46); g.stroke();
      g.strokeStyle = "rgba(" + LINE + ",0.25)"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(CX, 24); g.lineTo(CX, 48); g.stroke();
      return cv;
    }
    function drawGecko(t) {
      if (!geckoSprite) geckoSprite = buildGeckoSprite();
      ax += (mx - ax) * 0.4; ay += (my - ay) * 0.4;
      var sc = 0.44, bob = sc * (1 + Math.sin(t * 3) * 0.015);
      cx.save(); cx.translate(ax, ay); cx.rotate(heading + Math.PI / 2); cx.scale(bob, bob);
      cx.drawImage(geckoSprite, -100, -164);   // pivot at the body centre
      cx.restore();
    }
    var DARK_EYE = "20,20,28";

    function loop(t2) {
      var t = t2 / 1000;
      cx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var speed = Math.hypot(vx, vy);
      if (speed > 0.6) { var raw = Math.atan2(vy, vx); var diff = ((raw - heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI; heading += diff * 0.25; }
      vx *= 0.9; vy *= 0.9;

      if (mode === "arrow") {
        ax += (mx - ax) * 0.5; ay += (my - ay) * 0.5;
        arrow.style.opacity = present ? "1" : "0";
        arrow.style.transform = "translate(" + ax.toFixed(1) + "px," + ay.toFixed(1) + "px) translate(-50%,-50%) rotate(" + (heading * 180 / Math.PI + 90).toFixed(1) + "deg)";
        // glowing comet trail on the DARK theme — emitted right from the back-middle of the arrow
        if (present && root.dataset.theme === "dark") {
          var bx = ax - Math.cos(heading) * 7, by = ay - Math.sin(heading) * 7;
          atrail.push({ x: bx, y: by, life: 1 }); if (atrail.length > 55) atrail.shift();
          cx.globalCompositeOperation = "lighter";
          for (var ti = atrail.length - 1; ti >= 0; ti--) { var tp = atrail[ti]; tp.life -= 0.03; if (tp.life <= 0) { atrail.splice(ti, 1); continue; } cx.beginPath(); cx.arc(tp.x, tp.y, 1 + tp.life * 3.6, 0, 6.2832); cx.shadowBlur = 12 * tp.life; cx.shadowColor = "rgba(" + ACC + ",0.9)"; cx.fillStyle = "rgba(225,232,255," + (tp.life * 0.8).toFixed(3) + ")"; cx.fill(); }
          cx.shadowBlur = 0; cx.globalCompositeOperation = "source-over";
        } else if (atrail.length) { atrail.length = 0; }
      } else if (present) {
        if (mode === "snake") drawSnake(t);
        else if (mode === "dragon") drawDragon(t);
        else if (mode === "koi") drawKoi(t);
        else if (mode === "butterfly") drawButterfly(t);
        else if (mode === "gecko") drawGecko(t);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();
})();
