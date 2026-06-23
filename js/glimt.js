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

  // ---- Flowing aurora: waving "curtains" drawn additively into a LOW-RES buffer (cheap blur),
  //      upscaled by CSS for softness. Reads like real northern lights, stays cold/on-brand. ----
  function initAurora() {
    var canvas = document.querySelector('.aurora-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var canBlur = typeof ctx.filter !== 'undefined';

    // Glacier blue + a hint of cold teal-green for aurora believability. Top-anchored curtains.
    var CURTAINS = [
      { hue: '140,203,255', x: 0.26, w: 0.20, amp: 0.10, freq: 3.1, speed: 0.00010, phase: 0.0, a: 0.34 },
      { hue: '120,228,202', x: 0.50, w: 0.24, amp: 0.13, freq: 2.4, speed: 0.00014, phase: 1.7, a: 0.26 },
      { hue: '160,210,255', x: 0.72, w: 0.18, amp: 0.09, freq: 3.6, speed: 0.00008, phase: 3.2, a: 0.30 },
      { hue: '110,180,240', x: 0.40, w: 0.30, amp: 0.16, freq: 1.9, speed: 0.00006, phase: 4.6, a: 0.18 },
    ];
    var W, H, vw, vh, SCALE = 0.32; // low-res backing buffer

    function size() {
      vw = window.innerWidth; vh = window.innerHeight;
      W = canvas.width = Math.max(2, Math.round(vw * SCALE));
      H = canvas.height = Math.max(2, Math.round(vh * SCALE));
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      if (canBlur) ctx.filter = 'blur(' + Math.round(W * 0.03) + 'px)';
      for (var c = 0; c < CURTAINS.length; c++) {
        var cur = CURTAINS[c];
        var bx = cur.x * W + Math.sin(t * cur.speed * 0.6 + cur.phase) * W * 0.06; // slow horizontal drift
        var bw = cur.w * W;
        var pulse = 0.7 + 0.3 * Math.sin(t * cur.speed * 1.7 + cur.phase * 2); // brightness breathing
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0.0, 'rgba(' + cur.hue + ',0)');
        grad.addColorStop(0.18, 'rgba(' + cur.hue + ',' + (cur.a * pulse).toFixed(3) + ')');
        grad.addColorStop(0.62, 'rgba(' + cur.hue + ',' + (cur.a * 0.35 * pulse).toFixed(3) + ')');
        grad.addColorStop(1.0, 'rgba(' + cur.hue + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        var steps = 14, i, y, x;
        for (i = 0; i <= steps; i++) {
          y = (H * i) / steps;
          x = bx + Math.sin(y / H * cur.freq * Math.PI + t * cur.speed + cur.phase) * W * cur.amp;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        for (i = steps; i >= 0; i--) {
          y = (H * i) / steps;
          x = bx + bw + Math.sin(y / H * cur.freq * Math.PI + t * cur.speed + cur.phase) * W * cur.amp;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }

    size();
    if (reduce) { frame(3000); return; } // one static frame, no loop

    var last = 0, running = false, raf = 0;
    function loop(t) {
      if (!running) return;
      if (t - last >= 33) { frame(t); last = t; } // ~30fps
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
    initReveals();
    initMagnetic();
    var hero = document.querySelector('.hero-dawn');
    if (hero) requestAnimationFrame(function () { hero.classList.add('lit'); });
  });
})();
