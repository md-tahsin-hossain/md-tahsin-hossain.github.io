/* ==========================================================================
   Md. Tahsin Hossain — Portfolio
   Vanilla JS: navigation, scroll effects, animations, certificate viewer
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* ---------- Cyber crosshair cursor (mouse only) ---------- */
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.documentElement.classList.add("cursor-on");

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, raf;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
      if (!raf) raf = requestAnimationFrame(follow);
    });

    function follow() {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      raf = (Math.abs(mx - rx) > 0.5 || Math.abs(my - ry) > 0.5) ? requestAnimationFrame(follow) : null;
    }

    document.addEventListener("mouseover", function (e) {
      var hot = e.target.closest("a, button, [data-full], .skill-card, .cert, input, textarea");
      document.body.classList.toggle("cursor-hot", !!hot);
    });

    document.addEventListener("mouseleave", function () {
      dot.style.opacity = ring.style.opacity = "0";
    });
    document.addEventListener("mouseenter", function () {
      dot.style.opacity = ring.style.opacity = "1";
    });
  }
})();
