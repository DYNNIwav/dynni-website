// Glimt landing — "Isbre" motion. Pure vanilla, no libs. Everything degrades to static under
// prefers-reduced-motion, and the heavy bits pause when off-screen / tab hidden.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Grain: 128px static noise -> dataURL, painted onto .grain-layer (decorative) ----
  function initGrain() {
    var layer = document.querySelector('.grain-layer');
    if (!layer) return;
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(128, 128);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    layer.style.setProperty('--grain', 'url(' + c.toDataURL() + ')');
  }

  // ---- Living aurora: pre-rendered blurred ribbons, drift via drawImage, 30fps, pausable ----
  function initAurora() {
    var canvas = document.querySelector('.aurora-canvas');
    if (!canvas) return;
    // On phones, or where canvas filter is unsupported, skip the loop and lean on a CSS gradient.
    var probe = document.createElement('canvas').getContext('2d');
    var canBlur = typeof probe.filter !== 'undefined';
    if (window.innerWidth <= 768 || !canBlur) {
      canvas.style.background =
        'radial-gradient(60% 40% at 30% 12%, rgba(140,203,255,0.10), transparent 70%),' +
        'radial-gradient(50% 35% at 75% 8%, rgba(140,203,255,0.08), transparent 70%)';
      return;
    }
    var ctx = canvas.getContext('2d');
    var W, H, dpr, ribbons = [];
    function ribbon(hue, w, h) {
      var off = document.createElement('canvas');
      off.width = w; off.height = h;
      var o = off.getContext('2d');
      o.filter = 'blur(48px)';
      var g = o.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(140,203,255,0)');
      g.addColorStop(0.5, hue);
      g.addColorStop(1, 'rgba(140,203,255,0)');
      o.fillStyle = g;
      o.fillRect(w * 0.2, 0, w * 0.6, h);
      return off;
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = window.innerWidth * dpr;
      H = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      var bandH = H * 0.5;
      ribbons = [
        { img: ribbon('rgba(140,203,255,0.13)', W * 0.7, bandH), speed: 0.00009, span: 0.18, y: -H * 0.05 },
        { img: ribbon('rgba(120,180,240,0.10)', W * 0.8, bandH), speed: 0.00013, span: 0.22, y: H * 0.04 },
        { img: ribbon('rgba(160,210,255,0.08)', W * 0.6, bandH), speed: 0.00007, span: 0.14, y: -H * 0.1 },
      ];
    }
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ribbons.length; i++) {
        var r = ribbons[i];
        var x = Math.sin(t * r.speed + i) * W * r.span + (W - r.img.width) / 2;
        ctx.drawImage(r.img, x, r.y);
      }
    }
    size();
    if (reduce) { frame(0); return; } // one static frame, no loop

    var last = 0, running = false, raf = 0;
    function loop(t) {
      if (!running) return;
      if (t - last >= 33) { frame(t); last = t; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var io = new IntersectionObserver(function (es) {
      es[0].isIntersecting && !document.hidden ? start() : stop();
    });
    io.observe(canvas);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 200); }, { passive: true });
  }

  // ---- Melting iceberg spine: one shared rAF-coalesced scroll handler writes --melt ----
  function initMelt() {
    if (reduce) return; // CSS leaves a static half-melt
    var root = document.documentElement;
    var docH = 0, winH = 0, dirty = false;
    function measure() { winH = window.innerHeight; docH = document.documentElement.scrollHeight - winH; }
    function apply() {
      dirty = false;
      var p = docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
      root.style.setProperty('--melt', p.toFixed(3));
    }
    measure();
    window.addEventListener('scroll', function () { if (!dirty) { dirty = true; requestAnimationFrame(apply); } }, { passive: true });
    window.addEventListener('resize', function () { measure(); apply(); }, { passive: true });
    apply();
  }

  // ---- One-shot reveals: add .show then unobserve, so signatures never replay/reset ----
  function initReveals() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('show'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---- Magnetic CTA: only on fine-pointer + motion-ok, tiny offset so click never escapes ----
  function initMagnetic() {
    if (reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.waitlist button').forEach(function (btn) {
      btn.addEventListener('pointermove', function (ev) {
        var r = btn.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = 'translate(' + (dx * 6).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initGrain();
    initAurora();
    initMelt();
    initReveals();
    initMagnetic();
    // Hero dawn: settle the hero in on load (CSS does the staggering).
    var hero = document.querySelector('.hero-dawn');
    if (hero) requestAnimationFrame(function () { hero.classList.add('lit'); });
  });
})();
