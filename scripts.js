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
        console.error('TypewriterEffect: .typed-text element not found');
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
  
  // Usage Examples
  document.addEventListener('DOMContentLoaded', function() {
    // Basic usage
    const typewriterElement = document.querySelector('.typewriter');
    
    if (typewriterElement) {
      const texts = [
        'Hei!',
        'Eg heiter Pål',
        'Eg er ein webdesigner frå Vinje',
        'Eg elskar å lage vakre og funksjonelle nettsider'
      ];
      
      const typewriter = new TypewriterEffect(typewriterElement, texts, {
        typeSpeed: 80,
        deleteSpeed: 40,
        pauseDelay: 2000,
        deleteDelay: 1000,
        loop: true,
        humanize: true
      });
      
      // Optional: Control the typewriter
      // typewriter.pause();
      // typewriter.resume();
      // typewriter.stop();
    }
    
    // Multiple typewriter instances
    const configs = [
      {
        selector: '.hero-typewriter',
        texts: ['Hei!', 'Eg heiter Pål', 'Eg er ein webdesigner frå Vinje', 'Eg elskar å lage vakre og funksjonelle nettsider'],
        options: { typeSpeed: 100, loop: true }
      },
      {
        selector: '.subtitle-typewriter',
        texts: ['Merkevare med presisjon'],
        options: { typeSpeed: 150, loop: false }
      }
    ];
    
    configs.forEach(config => {
      const element = document.querySelector(config.selector);
      if (element) {
        new TypewriterEffect(element, config.texts, config.options);
      }
    });
    
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