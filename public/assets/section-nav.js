(function () {
  const viewport = globalThis;

  const localeLabels = {
    de: {
      up: 'Vorheriger Abschnitt',
      down: 'Nächster Abschnitt',
    },
    en: {
      up: 'Previous section',
      down: 'Next section',
    },
    fr: {
      up: 'Section précédente',
      down: 'Section suivante',
    },
    es: {
      up: 'Sección anterior',
      down: 'Siguiente sección',
    },
    ru: {
      up: 'Предыдущий раздел',
      down: 'Следующий раздел',
    },
  };

  const sectionSelectors = ['#top', 'header[id]', 'section[id]', 'footer[id]'];

  const lang = document.documentElement.lang || 'en';
  const labels = localeLabels[lang] || localeLabels.en;
  const sections = Array.from(document.querySelectorAll(sectionSelectors.join(','))).filter(
    el => el instanceof HTMLElement && el.offsetHeight > 0
  );

  if (sections.length < 2) {
    return;
  }

  const nav = document.createElement('nav');
  nav.className = 'floating-section-nav';
  nav.setAttribute('aria-label', 'Section navigation');
  nav.innerHTML = [
    '<button class="floating-section-nav__button floating-section-nav__button--up" type="button">',
    '  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '    <path d="M6 14L12 8L18 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    '  </svg>',
    '</button>',
    '<button class="floating-section-nav__button floating-section-nav__button--down" type="button">',
    '  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '    <path d="M6 10L12 16L18 10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    '  </svg>',
    '</button>',
  ].join('\n');

  const upButton = nav.querySelector('.floating-section-nav__button--up');
  const downButton = nav.querySelector('.floating-section-nav__button--down');

  if (!(upButton instanceof HTMLButtonElement) || !(downButton instanceof HTMLButtonElement)) {
    return;
  }

  upButton.setAttribute('aria-label', labels.up);
  downButton.setAttribute('aria-label', labels.down);

  let currentIndex = 0;
  let lastScrollY = viewport.scrollY;
  let ticking = false;
  const reducedMotion = viewport.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getScrollOffset() {
    return viewport.innerWidth >= 1024 ? 20 : 14;
  }

  function scrollToSection(index) {
    const target = sections[index];
    if (!target) {
      return;
    }

    const top = Math.max(0, target.offsetTop - getScrollOffset());
    viewport.scrollTo({
      top,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }

  function updateState() {
    const anchorLine = viewport.scrollY + Math.min(viewport.innerHeight * 0.28, 220);
    let nextIndex = 0;

    sections.forEach((section, index) => {
      if (section.offsetTop - getScrollOffset() <= anchorLine) {
        nextIndex = index;
      }
    });

    currentIndex = nextIndex;
    upButton.disabled = currentIndex === 0;
    downButton.disabled = currentIndex === sections.length - 1;
    nav.dataset.direction = viewport.scrollY < lastScrollY ? 'up' : 'down';
    lastScrollY = viewport.scrollY;
  }

  function requestUpdate() {
    if (ticking) {
      return;
    }
    ticking = true;
    requestAnimationFrame(() => {
      updateState();
      ticking = false;
    });
  }

  upButton.addEventListener('click', () => {
    if (currentIndex > 0) {
      scrollToSection(currentIndex - 1);
    }
  });

  downButton.addEventListener('click', () => {
    if (currentIndex < sections.length - 1) {
      scrollToSection(currentIndex + 1);
    }
  });

  document.body.appendChild(nav);
  updateState();
  viewport.addEventListener('scroll', requestUpdate, { passive: true });
  viewport.addEventListener('resize', requestUpdate);
})();
