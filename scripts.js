// always start at top of page
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

// lang redirect - check before page renders
(function () {
  const lang = document.documentElement.lang || "nn";
  const saved = localStorage.getItem("lang");

  const langMap = {
    nn: {
      "/": "/en/",
      "/index.html": "/en/index.html",
      "/om-meg": "/en/about",
      "/om-meg.html": "/en/about.html",
      "/lyd": "/en/sound",
      "/lyd.html": "/en/sound.html",
      "/apps": "/en/apps",
      "/apps.html": "/en/apps.html",
      "/kontakt": "/en/contact",
      "/kontakt.html": "/en/contact.html",
      "/tjenester": "/en/services",
      "/tjenester.html": "/en/services.html",
    },
    en: {
      "/en/": "/",
      "/en/index.html": "/index.html",
      "/en/about": "/om-meg",
      "/en/about.html": "/om-meg.html",
      "/en/sound": "/lyd",
      "/en/sound.html": "/lyd.html",
      "/en/apps": "/apps",
      "/en/apps.html": "/apps.html",
      "/en/contact": "/kontakt",
      "/en/contact.html": "/kontakt.html",
      "/en/services": "/tjenester",
      "/en/services.html": "/tjenester.html",
    },
  };

  if (saved && saved !== lang) {
    const map = saved === "en" ? langMap.nn : langMap.en;
    const target = map[window.location.pathname];
    if (target) {
      window.location.replace(target);
      return;
    }
  }

  // save choice when switching
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".lang-switch a");
    if (link) {
      localStorage.setItem(
        "lang",
        link.textContent.trim() === "EN" ? "en" : "nn",
      );
    }
  });
})();

// typing sound easter egg
const TypewriterSound = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch (e) {
      // no audio support
    }
  },
  click() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;

    // 1) high click - the sharp top of a keypress
    const click = this.ctx.createBufferSource();
    const clickBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.008, this.ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickData.length; i++) {
      clickData[i] = (Math.random() * 2 - 1) * 0.5;
    }
    click.buffer = clickBuf;

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.06, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = "bandpass";
    clickFilter.frequency.value = 6000 + Math.random() * 2000;
    clickFilter.Q.value = 1.5;

    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    click.start(now);
    click.stop(now + 0.008);

    // 2) low thock - the body resonance of a mechanical switch
    const thock = this.ctx.createBufferSource();
    const thockBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
    const thockData = thockBuf.getChannelData(0);
    for (let i = 0; i < thockData.length; i++) {
      const t = i / this.ctx.sampleRate;
      thockData[i] = Math.sin(2 * Math.PI * (200 + Math.random() * 80) * t) * 0.3 * Math.exp(-t * 120);
    }
    thock.buffer = thockBuf;

    const thockGain = this.ctx.createGain();
    thockGain.gain.setValueAtTime(0.05, now);
    thockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    const thockFilter = this.ctx.createBiquadFilter();
    thockFilter.type = "lowpass";
    thockFilter.frequency.value = 800;

    thock.connect(thockFilter);
    thockFilter.connect(thockGain);
    thockGain.connect(this.ctx.destination);
    thock.start(now + 0.002);
    thock.stop(now + 0.04);
  },
};

TypewriterSound.init();

class TypewriterEffect {
  constructor(element, texts, options = {}) {
    if (!element || !texts || texts.length === 0) return;

    this.element = element;
    this.texts = texts;
    this.options = {
      typeSpeed: 100,
      deleteSpeed: 50,
      pauseDelay: 2000,
      deleteDelay: 1000,
      startDelay: 0,
      loop: true,
      humanize: true,
      sound: false,
      ...options,
    };

    this.textIndex = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.textElement = element.querySelector(".typed-text");

    if (!this.textElement) return;

    if (this.options.startDelay > 0) {
      setTimeout(() => this.type(), this.options.startDelay);
    } else {
      this.type();
    }
  }

  type() {
    if (!this.textElement || !document.contains(this.textElement)) return;

    const currentText = this.texts[this.textIndex];
    let displayText;

    if (this.isDeleting) {
      displayText = currentText.substring(0, this.charIndex - 1);
      this.charIndex--;
    } else {
      displayText = currentText.substring(0, this.charIndex + 1);
      this.charIndex++;
      if (this.options.sound) TypewriterSound.click();
    }

    this.textElement.textContent = displayText;

    let speed = this.isDeleting
      ? this.options.deleteSpeed
      : this.options.typeSpeed;

    if (this.options.humanize) {
      speed += Math.random() * 50;
    }

    if (!this.isDeleting && this.charIndex === currentText.length) {
      if (this.options.onComplete && this.textIndex === this.texts.length - 1) {
        this.options.onComplete();
      }
      if (this.texts.length > 1) {
        speed = this.options.deleteDelay;
        this.isDeleting = true;
      } else {
        return;
      }
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.textIndex++;

      if (this.textIndex >= this.texts.length) {
        if (this.options.loop) {
          this.textIndex = 0;
        } else {
          return;
        }
      }

      speed = this.options.pauseDelay;
    }

    setTimeout(() => this.type(), speed);
  }
}

// mobile menu
function initHamburgerMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  if (!menuToggle) return;

  menuToggle.addEventListener("change", function () {
    document.body.style.overflow = this.checked ? "hidden" : "";
  });

  const overlay = document.querySelector(".mobile-nav-overlay");
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === this) {
        menuToggle.checked = false;
        document.body.style.overflow = "";
      }
    });
  }
}

// random waveform bars for the DAW
function initWaveforms() {
  document.querySelectorAll(".daw-waveform").forEach((waveform) => {
    const barCount = 60 + Math.floor(Math.random() * 40);
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement("span");
      bar.style.height = 15 + Math.random() * 85 + "%";
      waveform.appendChild(bar);
    }
  });
}

// randomize clip widths for authentic DAW look
function initClipWidths() {
  document.querySelectorAll(".daw-track-timeline").forEach((timeline) => {
    const clips = timeline.querySelectorAll(".daw-clip");
    clips.forEach((clip) => {
      clip.style.width = 60 + Math.floor(Math.random() * 140) + "px";
    });
  });
}

// grain texture
function initGrain() {
  const bg = document.querySelector(".background");
  if (!bg) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const size = 128;
  canvas.width = size;
  canvas.height = size;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  bg.style.setProperty("--grain", `url(${canvas.toDataURL()})`);
}

// "// scroll" hint at the bottom
function initScrollHint() {
  const target = document.querySelector(".about-section, #prosjekt, #musikk");
  if (!target) return;

  const hint = document.createElement("div");
  hint.className = "scroll-hint hidden";
  hint.textContent = "// scroll";
  target.appendChild(hint);

  let dismissed = false;

  setTimeout(() => {
    if (!dismissed) hint.classList.remove("hidden");
  }, 5000);

  let scrollAtReveal = null;
  window.addEventListener("scroll", () => {
    if (hint.classList.contains("hidden")) {
      scrollAtReveal = null;
      return;
    }
    if (scrollAtReveal === null) scrollAtReveal = window.scrollY;
    if (Math.abs(window.scrollY - scrollAtReveal) > 30) {
      dismissed = true;
      hint.classList.add("hidden");
    }
  }, { passive: true });
}

// fade in terminal lines one by one
function initTerminals() {
  document.querySelectorAll(".terminal-window:not(.terminal-output)").forEach((terminal) => {
    const lines = terminal.querySelectorAll(".terminal-line");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            let delay = 0;
            lines.forEach((line) => {
              setTimeout(() => line.classList.add("visible"), delay);
              delay += line.classList.contains("prompt") ? 600 : 200;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px 200px 0px" },
    );

    observer.observe(terminal);
  });
}

// scroll animations
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        } else {
          entry.target.classList.remove("show");
        }
      });
    },
    { rootMargin: "0px 0px 200px 0px" },
  );

  document
    .querySelectorAll(
      ".steps li, .quotes, .case a, .app-card",
    )
    .forEach((el) => observer.observe(el));
}

// check if element fits in viewport, used for scroll behavior
function fitsInViewport(el) {
  if (!el) return false;
  return el.offsetHeight <= window.innerHeight;
}

document.addEventListener("DOMContentLoaded", function () {
  const lang = document.documentElement.lang || "nn";
  const isEn = lang === "en";

  const configs = [
    {
      selector: ".typewriter",
      texts: isEn ? ["Hi!", "I'm Pål."] : ["Hei!", "Eg heiter Pål."],
      options: { typeSpeed: 100, deleteSpeed: 50, humanize: true, loop: true },
    },
    {
      selector: ".typewriter-2",
      texts: isEn ? ["cat contact.txt"] : ["cat kontakt.txt"],
      options: {
        typeSpeed: 80,
        startDelay: 1000,
        humanize: true,
        loop: false,
        sound: true,
        onComplete: function () {
          setTimeout(() => {
            const output = document.querySelector(".contact-hero .terminal-output");
            if (output) {
              output.classList.add("reveal");
              const lines = output.querySelectorAll(".terminal-line");
              let delay = 0;
              lines.forEach((line) => {
                setTimeout(() => line.classList.add("visible"), delay);
                delay += line.classList.contains("prompt") ? 600 : 200;
              });
            }
          }, 400);
        },
      },
    },
    {
      selector: ".typewriter-3",
      texts: isEn ? ["cat about-me.txt"] : ["cat om-meg.txt"],
      options: {
        typeSpeed: 80,
        startDelay: 1000,
        humanize: true,
        loop: false,
        sound: true,
        onComplete: function () {
          setTimeout(() => {
            const isMobile = window.innerWidth <= 768;
            // show content first so browser calculates scroll position correctly
            const content = document.querySelector(".about-content");
            if (content) content.classList.add("show");
            const image = document.querySelector(".about-image");
            if (isMobile) {
              if (image) image.classList.add("show");
            }
            const section = document.querySelector(".about-section");
            if (section) {
              const fits = fitsInViewport(section);
              section.scrollIntoView({
                behavior: isMobile ? "instant" : "smooth",
                block: fits ? "center" : "start",
              });
            }
            const output = document.querySelector(".about-content .terminal-output");
            if (output) {
              output.classList.add("reveal");
              const lines = output.querySelectorAll(".terminal-line");
              let delay = 0;
              lines.forEach((line) => {
                setTimeout(() => line.classList.add("visible"), delay);
                delay += line.classList.contains("prompt") ? 600 : 200;
              });
            }
            // on desktop, stagger the photo in after terminal
            if (!isMobile) {
              setTimeout(() => {
                if (image) image.classList.add("show");
              }, 1000);
            }
          }, 400);
        },
      },
    },
    {
      selector: ".typewriter-4",
      texts: isEn ? ["open DYNNI-Productions.ptx"] : ["open DYNNI-Produksjonar.ptx"],
      options: {
        typeSpeed: 60,
        startDelay: 1000,
        humanize: true,
        loop: false,
        sound: true,
        onComplete: function () {
          setTimeout(() => {
            const daw = document.querySelector(".daw-output");
            if (daw) {
              const isMobile = window.innerWidth <= 768;
              daw.closest("#prosjekt").scrollIntoView({
                behavior: isMobile ? "instant" : "smooth",
                block: "start",
              });
              daw.classList.add("reveal");
              const tracks = daw.querySelectorAll(".daw-track");
              tracks.forEach((track, i) => {
                setTimeout(() => track.classList.add("show"), 200 + i * 80);
              });
            }
          }, 400);
        },
      },
    },
    {
      selector: ".typewriter-6",
      texts: isEn ? ["cat services.txt"] : ["cat tjenester.txt"],
      options: {
        typeSpeed: 80,
        startDelay: 1000,
        humanize: true,
        loop: false,
        sound: true,
        onComplete: function () {
          setTimeout(() => {
            const isMobile = window.innerWidth <= 768;
            const intro = document.querySelector(".services-intro");
            const section = document.querySelector(".services-section");
            if (section) {
              section.classList.add("reveal");
              // Scroll til intro-teksten er sentrert i viewport
              if (intro) {
                intro.scrollIntoView({
                  behavior: isMobile ? "instant" : "smooth",
                  block: "center",
                });
              } else {
                section.scrollIntoView({
                  behavior: isMobile ? "instant" : "smooth",
                  block: "start",
                });
              }
            }
          }, 400);
        },
      },
    },
    {
      selector: ".typewriter-5",
      texts: isEn ? ["ls apps/"] : ["ls apps/"],
      options: {
        typeSpeed: 80,
        startDelay: 1000,
        humanize: true,
        loop: false,
        sound: true,
        onComplete: function () {
          setTimeout(() => {
            const isMobile = window.innerWidth <= 768;
            const appsSection = document.querySelector("#prosjekt");
            if (appsSection) {
              const fits = fitsInViewport(appsSection);
              appsSection.scrollIntoView({
                behavior: isMobile ? "instant" : "smooth",
                block: fits ? "center" : "start",
              });
            }
          }, 400);
        },
      },
    },
  ];

  configs.forEach((config) => {
    const element = document.querySelector(config.selector);
    if (element) {
      new TypewriterEffect(element, config.texts, config.options);
    }
  });

  initHamburgerMenu();
  initTerminals();
  initWaveforms();
  initClipWidths();
  initGrain();
  initScrollHint();
  initScrollAnimations();
});


// skip typewriter if user has reduced motion on
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[class*='typewriter'] .typed-text").forEach((el) => {
      const parent = el.closest("[class*='typewriter']");
      if (parent) el.textContent = parent.dataset.staticText || "";
    });
  });
}
