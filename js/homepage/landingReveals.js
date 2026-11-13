export function setupLandingReveals() {
  if (document.body.dataset.page !== 'homepage' || !window.IntersectionObserver) {
    return;
  }

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (preference.matches) {
    return;
  }

  const pending = new Map();
  const running = new Map();
  let observer;

  function reveal(element, immediate = false) {
    if (!pending.has(element)) {
      if (immediate) {
        running.get(element)?.cancel();
        running.delete(element);
      }
      return;
    }

    const { index, columns, breakpoint } = pending.get(element);
    const delay = window.innerWidth >= breakpoint ? (index % columns) * 120 : 0;
    pending.delete(element);
    observer.unobserve(element);
    element.classList.remove('landing-reveal-pending');

    if (immediate) {
      return;
    }

    const animation = element.animate([
      { opacity: 0, translate: `0 ${window.innerWidth < 640 ? 12 : 16}px` },
      { opacity: window.getComputedStyle(element).opacity, translate: '0 0' },
    ], {
      duration: 900,
      delay,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'backwards',
    });

    running.set(element, animation);
    animation.onfinish = () => {
      animation.cancel();
      running.delete(element);
    };
  }

  function revealWithin(target) {
    for (const element of [...pending.keys(), ...running.keys()]) {
      if (element.contains(target) || target.contains(element)) {
        reveal(element, true);
      }
    }
  }

  function revealHashTarget() {
    try {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(id);

      if (target) {
        revealWithin(target);
      }
    } catch {
      // A malformed fragment must not interrupt page navigation.
    }
  }

  function revealAll() {
    for (const element of pending.keys()) {
      element.classList.remove('landing-reveal-pending');
    }
    pending.clear();
    for (const animation of running.values()) {
      animation.cancel();
    }
    running.clear();
    observer?.disconnect();
  }

  try {
    observer = new window.IntersectionObserver((entries) => {
      try {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
          }
        }
      } catch {
        revealAll();
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

    const groups = [
      { selector: '#how-it-works > :first-child' },
      { selector: '.landing-flow-card', columns: 3, breakpoint: 1024 },
      { selector: '.landing-flow-arrow', columns: 2, breakpoint: 1024 },
      { selector: '.landing-comparison-intro' },
      { selector: '.landing-comparison-card', columns: 2, breakpoint: 768 },
      {
        selector: '#about .mobile-showcase-copy, #about .mobile-showcase-media',
        columns: 2,
        breakpoint: 1024,
      },
      {
        selector: '#mobile-board .mobile-showcase-copy, #mobile-board .mobile-showcase-media',
        columns: 2,
        breakpoint: 1024,
      },
      { selector: '#features > :first-child' },
      { selector: '.landing-feature-card', columns: 2, breakpoint: 640 },
      { selector: '#faq > :first-child' },
      { selector: '.faq-item' },
      { selector: '.landing-final-cta' },
      { selector: '.footer-inner' },
    ];

    for (const { selector, columns = 1, breakpoint = 0 } of groups) {
      document.querySelectorAll(selector).forEach((element, index) => {
        const bounds = element.getBoundingClientRect();

        // Preserve content above restored scroll positions; reveal the visible section again.
        if (bounds.bottom <= 0) {
          return;
        }

        pending.set(element, { index, columns, breakpoint });
        element.classList.add('landing-reveal-pending');
        observer.observe(element);
      });
    }

    document.addEventListener('focusin', (event) => revealWithin(event.target));
    window.addEventListener('hashchange', revealHashTarget);
    preference.addEventListener('change', () => {
      if (preference.matches) {
        revealAll();
      }
    });
    revealHashTarget();
  } catch {
    revealAll();
  }
}
