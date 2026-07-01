// Glimt landing — "Isbre" motion. Pure vanilla, no libs. Degrades to static under
// prefers-reduced-motion, and the heavy bits pause when off-screen / tab hidden.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Grain: 128px static noise -> dataURL onto .grain-layer (decorative) ----
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

  // ---- WebGL aurora: real-time fbm-noise curtains. The "video-like" look, generated on the GPU.
  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res; uniform float u_time; uniform float u_scroll;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }',
    'float noise(vec2 p){',
    '  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);',
    '  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));',
    '  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);',
    '}',
    'float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res.xy;',
    '  float t = u_time * 0.055;',
    '  float flow = fbm(vec2(uv.x*3.0 + t, uv.y*2.0 - t*0.3));',
    '  float curtains = fbm(vec2(uv.x*6.0 - t*0.6 + flow*1.7, uv.y*1.4 + t*0.12));',
    '  float topMask = smoothstep(-0.1, 0.7, uv.y);',
    '  float intensity = pow(curtains, 1.35) * topMask;',
    '  intensity *= (0.9 + 0.24*sin(u_time*0.55)) * (1.0 + u_scroll*0.5);',
    '  intensity = clamp(intensity, 0.0, 1.0);',
    '  vec3 blue = vec3(0.55, 0.80, 1.0);',
    '  vec3 teal = vec3(0.47, 0.90, 0.80);',
    '  vec3 col = mix(blue, teal, smoothstep(0.3, 0.85, curtains));',
    '  gl_FragColor = vec4(col * intensity, intensity);',
    '}',
  ].join('\n');
  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  function initAuroraGL(canvas) {
    var gl;
    try { gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true }); } catch (e) { return false; }
    if (!gl) return false;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'u_res'), uTime = gl.getUniformLocation(prog, 'u_time'), uScroll = gl.getUniformLocation(prog, 'u_scroll');
    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 768 ? 1 : 1.5);

    function size() {
      var w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
      canvas.width = w; canvas.height = h;
      canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h);
    }
    function frame(ms) {
      gl.uniform1f(uTime, ms / 1000);
      // Aurora swells a little as you scroll into the page, like it breathes with you.
      gl.uniform1f(uScroll, Math.min(1, (window.scrollY || 0) / (window.innerHeight || 1)));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    size();
    if (reduce) { frame(3200); return true; }

    var last = 0, running = false, raf = 0;
    function loop(t) { if (!running) return; if (t - last >= 33) { frame(t); last = t; } raf = requestAnimationFrame(loop); }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }
    new IntersectionObserver(function (es) { es[0].isIntersecting && !document.hidden ? start() : stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 200); }, { passive: true });
    return true;
  }

  // ---- Canvas2D fallback: waving curtains into a low-res buffer (cheap blur), upscaled by CSS ----
  function initAurora2D(canvas) {
    var ctx = canvas.getContext('2d');
    var canBlur = typeof ctx.filter !== 'undefined';
    var CURTAINS = [
      { hue: '140,203,255', x: 0.26, w: 0.20, amp: 0.10, freq: 3.1, speed: 0.00010, phase: 0.0, a: 0.34 },
      { hue: '120,228,202', x: 0.50, w: 0.24, amp: 0.13, freq: 2.4, speed: 0.00014, phase: 1.7, a: 0.26 },
      { hue: '160,210,255', x: 0.72, w: 0.18, amp: 0.09, freq: 3.6, speed: 0.00008, phase: 3.2, a: 0.30 },
    ];
    var W, H, SCALE = 0.32;
    function size() {
      W = canvas.width = Math.max(2, Math.round(window.innerWidth * SCALE));
      H = canvas.height = Math.max(2, Math.round(window.innerHeight * SCALE));
      canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
    }
    function frame(t) {
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      if (canBlur) ctx.filter = 'blur(' + Math.round(W * 0.03) + 'px)';
      for (var c = 0; c < CURTAINS.length; c++) {
        var cur = CURTAINS[c];
        var bx = cur.x * W + Math.sin(t * cur.speed * 0.6 + cur.phase) * W * 0.06, bw = cur.w * W;
        var pulse = 0.7 + 0.3 * Math.sin(t * cur.speed * 1.7 + cur.phase * 2);
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(' + cur.hue + ',0)');
        g.addColorStop(0.18, 'rgba(' + cur.hue + ',' + (cur.a * pulse).toFixed(3) + ')');
        g.addColorStop(0.62, 'rgba(' + cur.hue + ',' + (cur.a * 0.35 * pulse).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + cur.hue + ',0)');
        ctx.fillStyle = g; ctx.beginPath();
        var steps = 14, i, y, x;
        for (i = 0; i <= steps; i++) { y = (H * i) / steps; x = bx + Math.sin(y / H * cur.freq * Math.PI + t * cur.speed + cur.phase) * W * cur.amp; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        for (i = steps; i >= 0; i--) { y = (H * i) / steps; x = bx + bw + Math.sin(y / H * cur.freq * Math.PI + t * cur.speed + cur.phase) * W * cur.amp; ctx.lineTo(x, y); }
        ctx.closePath(); ctx.fill();
      }
      ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
    }
    size();
    if (reduce) { frame(3000); return; }
    var last = 0, running = false, raf = 0;
    function loop(t) { if (!running) return; if (t - last >= 33) { frame(t); last = t; } raf = requestAnimationFrame(loop); }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }
    new IntersectionObserver(function (es) { es[0].isIntersecting && !document.hidden ? start() : stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 200); }, { passive: true });
  }

  function initAurora() {
    var canvas = document.querySelector('.aurora-canvas');
    if (!canvas) return;
    try { if (initAuroraGL(canvas)) return; } catch (e) { /* fall through */ }
    // WebGL unavailable/failed -> 2D curtains. (Need a fresh canvas: a failed getContext('webgl')
    // can leave the element uncontextable for 2D, so swap in a clone.)
    var twin = canvas.cloneNode(false); canvas.parentNode.replaceChild(twin, canvas);
    initAurora2D(twin);
  }

  // ---- One-shot reveals: add .show then unobserve ----
  function initReveals() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('show'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---- Magnetic CTA: fine-pointer + motion-ok only, tiny offset ----
  function initMagnetic() {
    if (reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.waitlist button').forEach(function (btn) {
      btn.addEventListener('pointermove', function (ev) {
        var r = btn.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) / r.width, dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = 'translate(' + (dx * 6).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  // ---- Hero phone tilts gently toward the pointer (responds to you = crafted, not a loop) ----
  function initPhoneTilt() {
    if (reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var hero = document.querySelector('.glimt-hero');
    var phone = document.querySelector('.glimt-hero-phone');
    if (!hero || !phone) return;
    hero.addEventListener('pointermove', function (ev) {
      var r = hero.getBoundingClientRect();
      var dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
      phone.style.transform = 'rotateY(' + (dx * 7).toFixed(2) + 'deg) rotateX(' + (-dy * 7).toFixed(2) + 'deg)';
    });
    hero.addEventListener('pointerleave', function () { phone.style.transform = ''; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initGrain();
    initAurora();
    initReveals();
    initMagnetic();
    // Hero phone stays STATIC on purpose, the mouse-tracking tilt felt laggy and pulled focus from
    // the look. initPhoneTilt() left in place but not called, so it's easy to bring back if wanted.
    // initPhoneTilt();
    var hero = document.querySelector('.hero-dawn');
    if (hero) requestAnimationFrame(function () { hero.classList.add('lit'); });
  });
})();
