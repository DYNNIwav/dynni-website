console.log('scripts.js loaded');

class TypewriterEffect {
    constructor(element, texts, options = {}) {
      // Validation
      if (!element) {
        console.error('TypewriterEffect: Element not found');
        return;
      }
      
      if (!texts || texts.length === 0) {
        console.error('TypewriterEffect: No texts provided');
        return;
      }
  
      // Configuration
      this.element = element;
      this.texts = texts;
      this.options = {
        typeSpeed: 100,        // Speed of typing (ms per character)
        deleteSpeed: 50,       // Speed of deleting (ms per character)
        pauseDelay: 2000,      // Pause between phrases (ms)
        deleteDelay: 1000,     // Pause before deleting (ms)
        loop: true,            // Whether to loop through texts
        cursor: true,          // Show cursor
        humanize: true,        // Add random delays for realism
        autoStart: true,       // Start immediately
        startDelay: 0,         // Delay before starting (ms)
        ...options
      };
      
      // State variables
      this.textIndex = 0;      // Current text in array
      this.charIndex = 0;      // Current character in text
      this.isDeleting = false; // Are we deleting or typing?
      this.isPaused = false;   // Are we in a pause state?
      this.timeoutId = null;   // Store timeout ID for cleanup
      
      // Get the text container
      this.textElement = element.querySelector('.typed-text');
      this.cursorElement = element.querySelector('.cursor');
      
      // Validate elements exist
      if (!this.textElement) {
        console.error('TypewriterEffect: .typed-text element not found in', element);
        return;
      }
      
      
      // Start the animation
      if (this.options.autoStart) {
        if (this.options.startDelay > 0) {
          setTimeout(() => this.init(), this.options.startDelay);
        } else {
          this.init();
        }
      }
    }
    
    init() {
      // Hide cursor if disabled
      if (!this.options.cursor && this.cursorElement) {
        this.cursorElement.style.display = 'none';
      }
      
      // Start typing
      this.type();
    }
    
    type() {
      // Check if element still exists (in case of dynamic content)
      if (!this.textElement || !document.contains(this.textElement)) {
        return;
      }
      
      // Skip if paused
      if (this.isPaused) {
        return;
      }
      
      // Get current text
      const currentText = this.texts[this.textIndex];
      
      // Determine what to display
      let displayText;
      
      if (this.isDeleting) {
        // Remove characters
        displayText = currentText.substring(0, this.charIndex - 1);
        this.charIndex--;
      } else {
        // Add characters
        displayText = currentText.substring(0, this.charIndex + 1);
        this.charIndex++;
      }
      
      // Update the display
      this.textElement.textContent = displayText;
      
      // Calculate typing speed
      let speed = this.isDeleting ? this.options.deleteSpeed : this.options.typeSpeed;
      
      // Add slight randomness to make it feel more human
      if (this.options.humanize) {
        speed += Math.random() * 50;
      }
      
      // Logic for what to do next
      if (!this.isDeleting && this.charIndex === currentText.length) {
        // Finished typing current text
        if (this.texts.length > 1) {
          // Multiple texts: pause then start deleting
          speed = this.options.deleteDelay;
          this.isDeleting = true;
        } else {
          // Single text: stop here
          return;
        }
      } else if (this.isDeleting && this.charIndex === 0) {
        // Finished deleting
        this.isDeleting = false;
        this.textIndex++;
        
        // Check if we should loop
        if (this.textIndex >= this.texts.length) {
          if (this.options.loop) {
            this.textIndex = 0;
          } else {
            return; // Stop animation
          }
        }
        
        speed = this.options.pauseDelay;
      }
      
      // Continue the animation
      this.timeoutId = setTimeout(() => this.type(), speed);
    }
    
    // Public methods for control
    pause() {
      this.isPaused = true;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
    }
    
    resume() {
      if (this.isPaused) {
        this.isPaused = false;
        this.type();
      }
    }
    
    stop() {
      this.isPaused = true;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
    }
    
    reset() {
      this.stop();
      this.textIndex = 0;
      this.charIndex = 0;
      this.isDeleting = false;
      this.textElement.textContent = '';
    }
    
    destroy() {
      this.stop();
      if (this.textElement) {
        this.textElement.textContent = '';
      }
    }
    
    // Change texts dynamically
    updateTexts(newTexts) {
      this.texts = newTexts;
      this.reset();
      this.init();
    }
  }
  
  // Intersection Observer for starting animation on scroll
  function createScrollTriggeredTypewriter(selector, texts, options = {}) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          new TypewriterEffect(entry.target, texts, options);
          observer.unobserve(entry.target); // Only animate once
        }
      });
    }, {
      threshold: 0.5 // Trigger when 50% visible
    });
  
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => observer.observe(el));
  }
  
// Hamburger Menu Functionality
function initHamburgerMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  const body = document.body;

  if (menuToggle) {
    // Populate mobile menu with existing desktop navigation
    const desktopMainNav = document.querySelector(".main-nav");
    const desktopSocialNav = document.querySelector(".social-nav");
    const desktopCopyright = document.querySelector(".sidebar-text");
    
    const mobileNavLinks = document.querySelector(".mobile-nav-links");
    const mobileSocial = document.querySelector(".mobile-social");
    const mobileCopyright = document.querySelector(".mobile-copyright");

    // Clone main navigation links
    if (desktopMainNav && mobileNavLinks) {
      const mainLinks = desktopMainNav.querySelectorAll("li");
      mainLinks.forEach((link) => {
        const clonedLink = link.cloneNode(true);
        mobileNavLinks.appendChild(clonedLink);
      });
    }

    // Clone social links
    if (desktopSocialNav && mobileSocial) {
      const socialLinks = desktopSocialNav.querySelectorAll("li a");
      socialLinks.forEach((link) => {
        const clonedLink = link.cloneNode(true);
        mobileSocial.appendChild(clonedLink);
      });
    }

    // Clone copyright text
    if (desktopCopyright && mobileCopyright) {
      mobileCopyright.textContent = desktopCopyright.textContent;
    }

    menuToggle.addEventListener("change", function () {
      if (this.checked) {
        // Menu is open - prevent body scroll
        body.style.overflow = "hidden";
      } else {
        // Menu is closed - restore body scroll
        body.style.overflow = "";
      }
    });

    // Close menu when clicking on overlay
    const overlay = document.querySelector(".mobile-nav-overlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === this) {
          menuToggle.checked = false;
          body.style.overflow = "";
        }
      });
    }
  }
}

// Button Spotlight Effect
function initButtonSpotlight() {
  const buttons = document.querySelectorAll(".btn");

  buttons.forEach((button) => {
    button.addEventListener("mousemove", (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      button.style.setProperty("--x", x + "px");
      button.style.setProperty("--y", y + "px");
    });

    button.addEventListener("mouseleave", () => {
      button.style.setProperty("--x", "0");
      button.style.setProperty("--y", "0");
    });
  });
}

// Initialize all typewriters
document.addEventListener('DOMContentLoaded', function() {
  // Multiple typewriter instances
  const configs = [
    {
      selector: '.typewriter',
      texts: ['Hei!', 'Eg heiter Pål.', 'Eg er ein webutviklar og -designer frå Vinje, basert i Oslo.'],
      options: { typeSpeed: 100, deleteSpeed: 50, humanize: true, loop: true }
    },
    {
      selector: '.typewriter-2',
      texts: ['Ta kontakt.', 'book 30 min uforpliktande sparring','Håpar eg høyrer frå deg!'],
      options: { typeSpeed: 150, deleteSpeed: 75, humanize: true, loop: true }
    },
    {
      selector: '.typewriter-3',
      texts: ['Kven?', 'Kva?', 'Korleis?'],
      options: { typeSpeed: 200, deleteSpeed: 100, humanize: true, loop: true }
    }
  ];
  
  configs.forEach(config => {
    const element = document.querySelector(config.selector);
    if (element) {
      new TypewriterEffect(element, config.texts, config.options);
    }
  });
  
  // Initialize hamburger menu
  initHamburgerMenu();
  
  // Initialize button spotlight effect
  initButtonSpotlight();
  
  // Scroll-triggered typewriter (uncomment to use)
  // createScrollTriggeredTypewriter('.scroll-typewriter', [
  //   'Animasjon på scroll',
  //   'Perfekt for lang side'
  // ]);
});
  
  // Respect user motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Disable animations for users who prefer reduced motion
    document.addEventListener('DOMContentLoaded', function() {
      const typewriters = document.querySelectorAll('.typewriter .typed-text');
      typewriters.forEach(el => {
        const parent = el.closest('.typewriter');
        if (parent) {
          el.textContent = parent.dataset.staticText || 'Webdesigner frå Vinje';
          const cursor = parent.querySelector('.cursor');
          if (cursor) cursor.style.display = 'none';
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        console.log('Element intersecting:', entry.target);
        entry.target.classList.add('show');
      }
      else {
        entry.target.classList.remove('show');
      }
    });
  });

  // Observe all .steps li elements
  const stepsElements = document.querySelectorAll('.steps li, .quotes, .case a, .about-image, .about-content');
  stepsElements.forEach(el => {
    observer.observe(el);
  });
});
