// always start at top of page
// Every page here opens with a typewriter intro that has to begin at the top, so this stays as it was.
// The two Glimt landing pages are the exception: they are twenty screens of document, where "manual"
// means Back from the privacy policy dumps you at the top again, and the scrollTo also swallows an
// incoming #fragment, so a shared /glimt#bli-med link never landed on the form. Nothing else changes:
// the test matches those two URLs only, not /glimt/privacy and not any other page.
if (!/^\/(en\/)?glimt(\/|\/index\.html)?$/.test(window.location.pathname)) {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
}

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
      "/blogg": "/en/blog",
      "/blogg.html": "/en/blog.html",
      // The Glimt landing pages were missing, so someone with English stored who was sent /glimt
      // silently stayed on the nynorsk page. Both spellings: the live site serves /glimt (cleanUrls),
      // a directory index serves /glimt/.
      "/glimt": "/en/glimt",
      "/glimt/": "/en/glimt/",
      // The four Glimt policy pages. These are the URLs the App Store and Play listings link to, so a reviewer
      // with English stored who lands on a nynorsk privacy policy is a bad first impression of a page whose
      // whole job is being clear. See the click handler below: the entries and the handler fix have to ship
      // together, or these pages trap you in one language.
      "/glimt/privacy": "/en/glimt/privacy",
      "/glimt/privacy.html": "/en/glimt/privacy.html",
      "/glimt/terms": "/en/glimt/terms",
      "/glimt/terms.html": "/en/glimt/terms.html",
      "/glimt/child-safety": "/en/glimt/child-safety",
      "/glimt/child-safety.html": "/en/glimt/child-safety.html",
      "/glimt/delete-account": "/en/glimt/delete-account",
      "/glimt/delete-account.html": "/en/glimt/delete-account.html",
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
      "/en/blog": "/blogg",
      "/en/blog.html": "/blogg.html",
      "/en/glimt": "/glimt",
      "/en/glimt/": "/glimt/",
      "/en/glimt/privacy": "/glimt/privacy",
      "/en/glimt/privacy.html": "/glimt/privacy.html",
      "/en/glimt/terms": "/glimt/terms",
      "/en/glimt/terms.html": "/glimt/terms.html",
      "/en/glimt/child-safety": "/glimt/child-safety",
      "/en/glimt/child-safety.html": "/glimt/child-safety.html",
      "/en/glimt/delete-account": "/glimt/delete-account",
      "/en/glimt/delete-account.html": "/glimt/delete-account.html",
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

  // Save the choice when switching. Keyed off the HREF, and matching the Glimt policy pages' .lang-toggle as
  // well as the site-wide .lang-switch.
  //
  // Both of those were bugs sitting quietly until the langMap gained the Glimt policy pages below. The old rule
  // asked whether the link's own text said "EN", which is true of the sidebar pill and false of every prose
  // link: the policy pages say "English version" and "Norsk versjon", so a click there either stored nothing at
  // all (wrong class) or stored nn for a link going to English (wrong test).
  //
  // Add the langMap entries without fixing this and those pages become inescapable. A reader with en stored
  // clicks «Norsk versjon», lands on the nynorsk page, and the redirect above sends them straight back, every
  // time. Those are also the exact URLs the App Store and Play listings point at, so it would be a language
  // trap on the four pages a reviewer is most likely to open.
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".lang-switch a, .lang-toggle a");
    if (link) {
      const href = link.getAttribute("href") || "";
      localStorage.setItem("lang", href.startsWith("/en/") || href === "/en" ? "en" : "nn");
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
        if (!entry.isIntersecting) return;
        // AVSLØR ÉIN GONG, OG SLUTT Å SJÅ ETTER.
        //
        // Denne fjerna `show` igjen når kortet gjekk ut av synsfeltet, så `.js .app-card { opacity: 0 }` slo
        // inn på nytt og korta blinka tilbake til usynlege medan ein scrolla. På eit høgt kort, som Paneless
        // etter at skildringa blei fyldigare, betyr det at toppen kan vere avslørt medan botnen er på veg ut,
        // og då står kortet att med ramme og ikon og utan tekst.
        //
        // Ein avsløring er ei hending og ikkje ein tilstand: har du fyrst sett kortet, skal det bli ståande.
        // `unobserve` gjer det billegare òg, sidan observaren sluttar å følgje det som er ferdig.
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
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
            const section = document.querySelector(".services-section");
            if (section) {
              section.classList.add("reveal");
              // `block: "start"` og ikkje "center", og det same over heile nettstaden.
              //
              // Desse to sidene sentrerte det avslørte innhaldet medan om-meg, lyd og apps la det på
              // toppen, så `~ $ cat ...` landa ulik høgd frå side til side etter animasjonen. «start» er
              // den naturlege rørsla (helsinga er lesen, innhaldet byrjar øvst) og det fleirtalet alt
              // gjorde, så det er færrast sider som må endre seg.
              section.scrollIntoView({
                behavior: isMobile ? "instant" : "smooth",
                block: "start",
              });
            }
          }, 400);
        },
      },
    },
    {
      selector: ".typewriter-7",
      texts: isEn ? ["ls blog/"] : ["ls blogg/"],
      options: {
        typeSpeed: 80,
        startDelay: 1000,
        humanize: true,
        loop: false,
        sound: true,
        onComplete: function () {
          setTimeout(() => {
            const isMobile = window.innerWidth <= 768;
            const section = document.querySelector(".blog-section");
            if (section) {
              section.classList.add("reveal");
              // `block: "start"` og ikkje "center", og det same over heile nettstaden.
              //
              // Desse to sidene sentrerte det avslørte innhaldet medan om-meg, lyd og apps la det på
              // toppen, så `~ $ cat ...` landa ulik høgd frå side til side etter animasjonen. «start» er
              // den naturlege rørsla (helsinga er lesen, innhaldet byrjar øvst) og det fleirtalet alt
              // gjorde, så det er færrast sider som må endre seg.
              section.scrollIntoView({
                behavior: isMobile ? "instant" : "smooth",
                block: "start",
              });
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
  initBlogFilters();
  initReadingProgress();
});


// blog category filter
function initBlogFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll(".post-card");
  if (!buttons.length || !cards.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      cards.forEach((card) => {
        if (category === "all" || card.dataset.category === category) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

// reading progress bar for articles
function initReadingProgress() {
  const bar = document.querySelector(".reading-progress");
  if (!bar) return;

  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = Math.min(progress, 100) + "%";
  };

  window.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
}

// skip typewriter if user has reduced motion on
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[class*='typewriter'] .typed-text").forEach((el) => {
      const parent = el.closest("[class*='typewriter']");
      if (parent) el.textContent = parent.dataset.staticText || "";
    });
  });
}
