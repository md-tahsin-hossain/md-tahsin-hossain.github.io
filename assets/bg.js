/* ==========================================================================
   Animated network background — drifting nodes linked by lines, mouse-reactive.
   Replaces the old background videos. ~2KB, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0, nodes = [], raf = null;
  var mouse = { x: -9999, y: -9999, active: false };

  var ACCENT = "151, 167, 243";     // --accent
  var LINK_DIST = 155;              // px: nodes closer than this get a line
  var MOUSE_DIST = 180;             // px: cursor links/pushes within this

  function count() {
    // density scaled to screen area, capped for performance
    var n = Math.round((w * h) / 10000);
    return Math.max(50, Math.min(n, 190));
  }

  function makeNode() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      ph: Math.random() * Math.PI * 2,   // twinkle phase
      tw: 0.6 + Math.random() * 1.4,     // twinkle speed
      star: Math.random() < 0.22,        // ~1 in 5 is a bright glowing star
    };
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    nodes = [];
    for (var i = 0; i < count(); i++) nodes.push(makeNode());
    if (reduce) draw(); // static single frame
  }

  function draw() {
    var t = performance.now() / 1000;
    // whole field gently fades up and down (like the video's constellation appearing/leaving)
    var breathe = reduce ? 0.9 : (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.22)));

    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];

      if (!reduce) {
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;

        // gentle pull toward the cursor
        if (mouse.active) {
          var mdx = mouse.x - a.x, mdy = mouse.y - a.y;
          var md = Math.hypot(mdx, mdy);
          if (md < MOUSE_DIST && md > 0.5) {
            a.x += (mdx / md) * 0.35;
            a.y += (mdy / md) * 0.35;
          }
        }
      }

      // each node twinkles on its own phase
      var tw = reduce ? 1 : (0.6 + 0.4 * Math.sin(t * a.tw + a.ph));

      if (a.star) {
        // bright glowing star point
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(" + ACCENT + ", 0.9)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(210, 222, 255," + (0.95 * breathe * tw).toFixed(3) + ")";
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(a.x, a.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + ACCENT + "," + (0.9 * breathe * tw).toFixed(3) + ")";
        ctx.fill();
      }

      // links between nearby nodes (form triangles/polygons)
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = "rgba(" + ACCENT + "," + (0.3 * (1 - d / LINK_DIST) * breathe).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // links from the cursor (not affected by breathe, so it stays responsive)
      if (mouse.active) {
        var cx = a.x - mouse.x, cy = a.y - mouse.y;
        var cd = Math.hypot(cx, cy);
        if (cd < MOUSE_DIST) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = "rgba(" + ACCENT + "," + (0.35 * (1 - cd / MOUSE_DIST)).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    if (!reduce) raf = requestAnimationFrame(draw);
  }

  function start() { if (!raf && !reduce) raf = requestAnimationFrame(draw); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  window.addEventListener("resize", resize);

  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });
  window.addEventListener("mouseout", function () { mouse.active = false; });
  // touch: let the cursor react to a finger too, but never block scrolling
  window.addEventListener("touchmove", function (e) {
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true; }
  }, { passive: true });
  window.addEventListener("touchend", function () { mouse.active = false; });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  resize();
  start();
})();
