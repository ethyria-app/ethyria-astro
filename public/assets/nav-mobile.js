(function () {
  'use strict';

  const hamburger = document.getElementById('navHamburger');
  const panel = document.getElementById('navMobilePanel');
  if (!hamburger || !panel) return;

  const header = document.getElementById('site-header');

  // Keep --nav-anchor-offset in sync with the real header height so
  // scroll-margin-top is correct whether the header is expanded or collapsed.
  function syncAnchorOffset() {
    if (!header) return;
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--nav-anchor-offset', h + 16 + 'px');
  }
  syncAnchorOffset();

  // Move panel to <body> so position:fixed is not trapped inside header's
  // stacking context (transform / will-change on header breaks fixed children)
  document.body.appendChild(panel);

  function openMenu() {
    // Offset dropdown below the sticky header
    if (header)
      document.documentElement.style.setProperty('--nav-panel-offset', header.getBoundingClientRect().height + 'px');
    hamburger.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nav-open');
  }

  function closeMenu() {
    hamburger.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-open');
  }

  hamburger.addEventListener('click', function () {
    if (hamburger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close button inside card
  const closeBtn = document.getElementById('navMobileClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      closeMenu();
      hamburger.focus();
    });
  }

  // Click on backdrop (panel itself, outside the card) closes menu
  panel.addEventListener('click', function (e) {
    if (e.target === panel) {
      closeMenu();
    }
  });

  // Close when any nav link is clicked
  panel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#') && hamburger.getAttribute('aria-expanded') === 'true') {
        e.preventDefault();
        closeMenu();
        // Short delay lets the panel close-animation complete before scrolling
        setTimeout(function () {
          // "#" alone means scroll to absolute top
          if (href === '#') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            history.pushState(null, '', href);
            return;
          }
          const target = document.querySelector(href);
          if (!target) {
            history.pushState(null, '', href);
            return;
          }

          // Measure the collapsed header height (the state at landing after scrolling down).
          // Temporarily adding is-scrolled is synchronous — no visual flash occurs because
          // the browser does not repaint between JS operations within the same task.
          const wasScrolled = header.classList.contains('is-scrolled');
          if (!wasScrolled) header.classList.add('is-scrolled');
          const landingHeaderH = header.getBoundingClientRect().height;
          if (!wasScrolled) header.classList.remove('is-scrolled');

          // Pixel-precise scroll: anchor (section-divider) flush below collapsed header.
          const targetScrollY = Math.max(0, window.scrollY + target.getBoundingClientRect().top - landingHeaderH);
          window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
          history.pushState(null, '', href);
        }, 200);
      } else {
        closeMenu();
      }
    });
  });

  // Close on ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && hamburger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      hamburger.focus();
    }
  });

  // Measure exact heights once so CSS can animate height (not max-height)
  const logoEl = document.querySelector('.nav-brand-logo');
  const topEl = document.getElementById('top');
  if (logoEl && !logoEl.style.height) logoEl.style.height = logoEl.offsetHeight + 'px';
  if (topEl && !topEl.style.height) topEl.style.height = topEl.offsetHeight + 'px';

  // RAF-throttled scroll handler — at most 1 DOM write per frame
  let rafPending = false;
  window.addEventListener(
    'scroll',
    function () {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () {
        header.classList.toggle('is-scrolled', window.scrollY > 80);
        syncAnchorOffset();
        rafPending = false;
      });
    },
    { passive: true }
  );
})();
