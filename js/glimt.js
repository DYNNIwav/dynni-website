// Glimt landing, "Isbre" motion. Pure vanilla, no libs. Degrades to static under
// prefers-reduced-motion, and the heavy bits pause when off-screen / tab hidden.
//
// Loaded with `defer`, so the DOM is parsed before anything here runs. That matters: the invite
// banner below reads elements at call time, and while this file sat in <head> without defer it
// always found null and the banner never appeared for anyone.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Invite personalisation: the app's "gather your campfire" share links here with ?ref=<username>,
  // so an invited person sees a warm "X invited you" line above the hero. Sanitised, best-effort. ----
  function initInvite() {
    try {
      var ref = new URLSearchParams(window.location.search).get('ref');
      if (!ref) return;
      var name = ref.replace(/[<>"'&]/g, '').trim().slice(0, 40);
      var banner = document.getElementById('invite-banner');
      var nameEl = document.getElementById('invite-name');
      if (name && banner && nameEl) {
        nameEl.textContent = name;
        banner.hidden = false;
      }
    } catch (e) {}
  }

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

  // ---- When the aurora is allowed to run ----
  // The canvas is position:fixed and fills the viewport, so it always intersects it: the observer here
  // could never once report a non-intersecting entry while the tab was visible, and a five-octave fbm
  // shader ran at 30fps for the entire visit. Under a fixed grain layer with mix-blend-mode:screen and
  // ten backdrop-filter panels, that is a full-viewport recomposite every frame, on a page that is
  // twenty screens of scrolling. So: nothing animates while a finger is moving, and past the hero the
  // last frame just stays on screen (it is a slow, soft thing, frozen reads as painted).
  // Both renderers share this, so they cannot drift apart.
  function drive(canvas, frame) {
    var last = 0, running = false, raf = 0, idle = 0;
    function loop(t) { if (!running) return; if (t - last >= 33) { frame(t); last = t; } raf = requestAnimationFrame(loop); }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }
    function wanted() {
      return !document.hidden && (window.scrollY || 0) < (window.innerHeight || 0) * 1.2;
    }
    function settle() { clearTimeout(idle); idle = setTimeout(function () { wanted() ? start() : stop(); }, 220); }
    new IntersectionObserver(function (es) { es[0].isIntersecting && wanted() ? start() : stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : settle(); });
    window.addEventListener('scroll', function () { stop(); settle(); }, { passive: true });
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
      // Measured off the element, never off the window. CSS lays the canvas out at 100lvh so it
      // reaches behind Safari's toolbars, and window.innerHeight is the small viewport while those
      // toolbars are showing: sizing from it, or writing a pixel height back onto the element, is what
      // left dead bands at the top and bottom. The buffer is a little taller as a result, which is one
      // more reason the pause policy above matters.
      var cw = canvas.clientWidth || window.innerWidth;
      var ch = canvas.clientHeight || window.innerHeight;
      var w = Math.round(cw * dpr), h = Math.round(ch * dpr);
      canvas.width = w; canvas.height = h;
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

    drive(canvas, frame);
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
      // Same as the WebGL path: the element's own size, so the low-res buffer covers the large
      // viewport and the fallback does not letterbox where the shader does not.
      var cw = canvas.clientWidth || window.innerWidth;
      var ch = canvas.clientHeight || window.innerHeight;
      W = canvas.width = Math.max(2, Math.round(cw * SCALE));
      H = canvas.height = Math.max(2, Math.round(ch * SCALE));
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
    drive(canvas, frame);
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

  // ---- Which action is the primary one ----
  // The beta is iOS-only, so on Android the filled blue button was a dead end and the only way onto the
  // waitlist was a hairline text link. Android is most of the phones in Norway, so the weight was
  // exactly inverted. On anything that is not iOS the waitlist becomes the primary action, with the
  // field itself right here (the anchor pointed thirteen thousand pixels down the page), and the
  // TestFlight link stays, demoted.
  function isIOS() {
    var ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS 13+ reports itself as a Mac; the touch count is the classic way to tell them apart.
    return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  }

  // Phones and tablets that are not iOS. Desktop is left exactly as it is: someone on a laptop who
  // owns an iPhone still wants the TestFlight link to be the obvious thing.
  function isMobileNonIOS() {
    if (isIOS()) return false;
    if (/Android/i.test(navigator.userAgent || '')) return true;
    return (navigator.maxTouchPoints || 0) > 0 && window.matchMedia('(pointer: coarse)').matches;
  }

  function initPlatform() {
    if (!isMobileNonIOS()) return;
    var actions = document.querySelector('.hero-actions');
    var slot = document.getElementById('hero-waitlist-slot');
    var src = document.getElementById('waitlist-form');
    if (!actions || !slot || !src) return;

    // Cloned, not written twice: every string (placeholder, button, the three data-msg-*) has exactly
    // one home in each language's markup.
    var clone = src.cloneNode(true);
    clone.id = 'hero-waitlist-form';
    clone.classList.add('waitlist--hero');
    var input = clone.querySelector('input[type="email"]');
    var label = clone.querySelector('label[for]');
    if (input) {
      input.id = 'hero-waitlist-email';
      if (label) label.setAttribute('for', input.id);
    }
    var status = clone.querySelector('.waitlist-status');
    if (status) status.textContent = '';
    slot.appendChild(clone);
    // Moved in the DOM rather than reordered with CSS, so the tab order matches what the eye sees.
    actions.insertBefore(slot, actions.firstChild);

    var ios = actions.querySelector('.hero-cta-ios');
    if (ios) { ios.classList.remove('btn-primary'); ios.classList.add('btn-ghost'); }
    // The link said "or just curious? Join the list". The list is now a field two lines up.
    var list = actions.querySelector('.hero-cta-list');
    if (list) list.hidden = true;
  }

  // ---- In-page jumps land instantly ----
  // html { scroll-behavior: smooth } over a ~13,500px page turned one tap into a multi-second animated
  // flight through twenty screens, which reads as a hang. Jump, then put the caret in the field the
  // person was going to. The skip link is left alone: its native behaviour also moves focus.
  function initJumps() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || a.classList.contains('skip-link')) return;
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      // Overriding scroll-behavior on the element itself beats the stylesheet, and works in browsers
      // that never shipped scrollIntoView({ behavior: 'instant' }).
      var root = document.documentElement;
      var prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      target.scrollIntoView({ block: 'start' });
      root.style.scrollBehavior = prev;
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      var field = target.querySelector('input[type="email"]');
      if (field) { try { field.focus({ preventScroll: true }); } catch (err) { field.focus(); } }
    });
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

  // ---- Film before/after slider ----
  // Lives here rather than inline in both pages, so nn and en cannot drift apart. The only
  // language-specific bit is the alt text, which comes from data-alt-template on the slider
  // (the alt genuinely changes with the look, so a screen reader is told which look is showing).
  function initFilmSlider() {
    var s = document.querySelector('.film-slider');
    if (!s) return;
    var range = s.querySelector('.film-range'), before = s.querySelector('.film-before'),
        line = s.querySelector('.film-line'), after = s.querySelector('.film-after'),
        tagR = s.querySelector('.film-tag--r'), pills = s.querySelectorAll('.film-pill');
    if (!range || !before || !line || !after) return;
    var tpl = s.dataset.altTemplate || '{look}';
    function setPos(v) { before.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)'; line.style.left = v + '%'; }
    range.addEventListener('input', function () { setPos(+range.value); });
    setPos(+range.value);
    function file(look) { return '/assets/img/film-loen-' + look + '.jpg'; }
    pills.forEach(function (p) {
      p.addEventListener('click', function () {
        pills.forEach(function (q) { q.classList.remove('is-active'); q.setAttribute('aria-pressed', 'false'); });
        p.classList.add('is-active');
        p.setAttribute('aria-pressed', 'true');
        after.src = file(p.dataset.look);
        after.alt = tpl.replace('{look}', p.dataset.name);
        if (tagR) tagR.textContent = p.dataset.name;
      });
    });

    // Glør and Kol are ~150KB each and were fetched on the tap itself, so the first tap on either
    // showed nothing for as long as the network took. Warm them once the page is done loading, so they
    // never compete with anything above the fold. Kept in an array so they are not collected early.
    var warm = [];
    function warmLooks() {
      pills.forEach(function (p) {
        if (p.classList.contains('is-active')) return;
        var img = new Image();
        img.src = file(p.dataset.look);
        warm.push(img);
      });
    }
    if (document.readyState === 'complete') setTimeout(warmLooks, 400);
    else window.addEventListener('load', function () { setTimeout(warmLooks, 400); });
  }

  // ---- Waitlist ----
  // Also shared by both pages; the copy comes from data-msg-* on the form so nn and en stay in sync
  // without two copies of the logic. The anon key is the public, row-level-secured one.
  var SUPABASE_URL = 'https://khhjqjtmhybwfrkhttoa.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoaGpxanRtaHlid2Zya2h0dG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDA4NjYsImV4cCI6MjA5NzUxNjg2Nn0.Xu1UKzzJzg2dO-4BdENCpVNQ4jJFUw9Iz4qOLb1NMCQ';

  // Every .waitlist form on the page, because on Android there are two: this one and the clone in the
  // hero. Both talk to the same table and read their copy from their own data-msg-* attributes.
  function initWaitlist() {
    var forms = document.querySelectorAll('form.waitlist');
    for (var i = 0; i < forms.length; i++) setupWaitlist(forms[i]);
  }

  function setupWaitlist(form) {
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    // Replies go in the form's own live region. They used to be written into #waitlist-note, which is
    // the paragraph that promises "one e-mail and nothing else, I promise", so the moment somebody
    // signed up, the promise they had just been given was deleted in front of them.
    var status = form.querySelector('.waitlist-status');

    function say(msg) { if (status) status.textContent = msg || ''; }
    function busy(on) {
      form.classList.toggle('busy', on);
      form.setAttribute('aria-busy', on ? 'true' : 'false');
      // Really disabled, not just pointer-events:none, which Enter walks straight past.
      if (button) button.disabled = on;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.classList.contains('busy') || form.classList.contains('done')) return;
      // Lowercased: Pal@Dynni.no and pal@dynni.no are one person, and the table has a unique index.
      var email = ((input && input.value) || '').trim().toLowerCase();
      if (!email) return;
      say('');
      busy(true);

      // No timeout meant a hung request left the form spinning for as long as the person waited.
      var ctl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);

      fetch(SUPABASE_URL + '/rest/v1/waitlist', {
        method: 'POST',
        signal: ctl ? ctl.signal : undefined,
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': 'Bearer ' + SUPABASE_ANON,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ email: email })
      }).then(function (res) {
        clearTimeout(timer);
        busy(false);
        if (res.ok) {
          form.classList.add('done');
          if (button) button.disabled = true;
          say(form.dataset.msgOk);
          if (input) { input.value = ''; input.readOnly = true; }
        } else if (res.status === 409) {
          say(form.dataset.msgDupe);
        } else {
          say(form.dataset.msgError);
        }
      }).catch(function () {
        clearTimeout(timer);
        busy(false);
        say(form.dataset.msgError);
      });
    });
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
    initInvite();
    initGrain();
    initAurora();
    initReveals();
    initFilmSlider();
    // Before initWaitlist: on Android this puts a second form on the page, and it needs wiring too.
    initPlatform();
    initWaitlist();
    initJumps();
    // initMagnetic() removed on purpose: the cursor-following "magnetic" translate felt gimmicky, and buttons
    // sliding toward the pointer reads cheap, not premium. They now lift gently straight up on hover via CSS
    // (.waitlist button:hover), which feels crafted and calm. Function left defined above in case it's wanted.
    // Hero phone stays STATIC on purpose, the mouse-tracking tilt felt laggy and pulled focus from
    // the look. initPhoneTilt() left defined but not called, so it's easy to bring back if wanted.
    // initPhoneTilt();
    var hero = document.querySelector('.hero-dawn');
    if (hero) requestAnimationFrame(function () { hero.classList.add('lit'); });
  });
})();
