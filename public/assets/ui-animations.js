(function () {
  var OPT = { threshold: 0.12, rootMargin: '0px 0px -60px 0px' };
  var IO = 'IntersectionObserver' in window;

  /* ════════════════════════════════════════════════════════════════════
     DATA-REVEAL SYSTEM — Unified animation controller
     Types: hero | (default fade) | stagger | seq | typewriter | chart
     ════════════════════════════════════════════════════════════════════ */

  /* ── Hero: immediate (above the fold) ──────────────────────────────── */
  var heroEls = document.querySelectorAll('[data-reveal="hero"]');
  heroEls.forEach(function (el) {
    el.classList.add('is-revealed');
  });

  /* ── Main Observer: fade + stagger + seq ────────────────────────────── */
  var mainReveals = document.querySelectorAll(
    '[data-reveal]:not([data-reveal="hero"]):not([data-reveal="typewriter"]):not([data-reveal="chart"])'
  );
  if (mainReveals.length && IO) {
    var mainObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        mainObs.unobserve(entry.target);
      });
    }, OPT);
    mainReveals.forEach(function (el) {
      mainObs.observe(el);
    });
  }

  /* ── Sequence: set --seq-i from data-delay ─────────────────────────── */
  document.querySelectorAll('[data-reveal="seq"]').forEach(function (el) {
    el.style.setProperty('--seq-i', el.dataset.delay || '0');
  });

  /* ── Typewriter: separate observer, threshold 0.3 ──────────────────── */
  var twEl = document.querySelector('[data-reveal="typewriter"]');
  if (twEl && IO) {
    var dreamText =
      twEl.dataset.text ||
      'Ein riesiges Gebäude, halb Museum, halb Bahnhof. Ich suche einen Raum, finde ihn nicht. Überall dunkle Türen, leises Gemurmel. Plötzlich bin ich barfuß. Ich öffne eine Tür und stehe in dichtem, blauem Nebel. Ein leerer Schreibtisch vor mir. Ich fühle eine seltsame Erleichterung.';
    var twI = 0;
    var twDisplayed = '';
    new IntersectionObserver(
      function (entries, obs) {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        setTimeout(typeNext, 600);
      },
      { threshold: 0.3 }
    ).observe(twEl);
    function typeNext() {
      if (twI >= dreamText.length) return;
      var ch = dreamText[twI];
      twDisplayed += ch === '\n' ? '<br>' : ch;
      twEl.innerHTML = twDisplayed;
      twI++;
      var delay = /[.!?,\n]/.test(ch) ? 80 : ch === ' ' ? 25 : 28;
      setTimeout(typeNext, delay);
    }
  }

  /* ── Chart: separate observer, threshold 0.5 ───────────────────────── */
  var chartEl = document.querySelector('[data-reveal="chart"]');
  if (chartEl && IO) {
    new IntersectionObserver(
      function (entries, obs) {
        if (entries[0].isIntersecting) {
          obs.disconnect();
          chartEl.classList.add('is-revealed');
        }
      },
      { threshold: 0.5, rootMargin: '0px 0px -5% 0px' }
    ).observe(chartEl);
  }

  /* ════════════════════════════════════════════════════════════════════
     LEGACY: .reveal + .stagger-grid (backward compat, remove after migration)
     ════════════════════════════════════════════════════════════════════ */

  /* ── Observer A: .reveal elements ────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal:not([data-reveal])');
  if (reveals.length && IO) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObs.unobserve(entry.target);
      });
    }, OPT);
    reveals.forEach(function (el) {
      revealObs.observe(el);
    });
  }

  /* ── Observer B: .stagger-grid (per-child, with delay) ───────────── */
  var grids = document.querySelectorAll('.stagger-grid:not([data-reveal])');
  if (grids.length && IO) {
    var staggerObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        staggerObs.unobserve(entry.target);
      });
    }, OPT);
    grids.forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (child, i) {
        child.style.transitionDelay = i * 0.09 + 's';
        staggerObs.observe(child);
      });
    });
  }

  /* ── Legacy: Echo Chart (.echo-chart class) ─────────────────────── */
  var legacyChart = document.querySelector('.echo-chart:not([data-reveal])');
  if (legacyChart && IO) {
    new IntersectionObserver(
      function (entries, obs) {
        if (entries[0].isIntersecting) {
          legacyChart.classList.add('is-animated');
          obs.disconnect();
        }
      },
      { threshold: 0.5, rootMargin: '0px 0px -5% 0px' }
    ).observe(legacyChart);
  }

  /* ── Legacy: Dream Typewriter (#dreamTypewriter without data-reveal) */
  var legacyTw = document.getElementById('dreamTypewriter');
  if (legacyTw && !legacyTw.hasAttribute('data-reveal') && IO) {
    var legacyText =
      legacyTw.dataset.text ||
      'Ein riesiges Gebäude, halb Museum, halb Bahnhof. Ich suche einen Raum, finde ihn nicht. Überall dunkle Türen, leises Gemurmel. Plötzlich bin ich barfuß. Ich öffne eine Tür und stehe in dichtem, blauem Nebel. Ein leerer Schreibtisch vor mir. Ich fühle eine seltsame Erleichterung.';
    var lI = 0;
    var lDisplayed = '';
    new IntersectionObserver(
      function (entries, obs) {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        setTimeout(typeNextLegacy, 600);
      },
      { threshold: 0.3 }
    ).observe(legacyTw);
    function typeNextLegacy() {
      if (lI >= legacyText.length) return;
      var ch = legacyText[lI];
      lDisplayed += ch === '\n' ? '<br>' : ch;
      legacyTw.innerHTML = lDisplayed;
      lI++;
      var delay = /[.!?,\n]/.test(ch) ? 80 : ch === ' ' ? 25 : 28;
      setTimeout(typeNextLegacy, delay);
    }
  }

  /* ── Scroll-hint (horizontal scroll indicator) ───────────────────── */
  document.querySelectorAll('.scroll-hint-wrapper').forEach(function (w) {
    w.addEventListener(
      'scroll',
      function () {
        var atEnd = w.scrollLeft + w.clientWidth >= w.scrollWidth - 8;
        w.classList.toggle('scrolled-end', atEnd);
      },
      { passive: true }
    );
  });

  /* ── Auto-reveal fallback: sub-pages ohne .reveal oder data-reveal ── */
  var hasAnyReveal = document.querySelector('.reveal, [data-reveal]');
  if (!hasAnyReveal && IO) {
    var autoEls = document.querySelectorAll('main .grid-7 > *');
    if (autoEls.length) {
      var autoObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          autoObs.unobserve(entry.target);
        });
      }, OPT);
      autoEls.forEach(function (el) {
        el.classList.add('reveal');
        autoObs.observe(el);
      });
    }
  }
})();
