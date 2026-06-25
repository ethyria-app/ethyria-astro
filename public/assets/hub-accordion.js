(function () {
  var CHEVRON =
    '<svg class="hub-acc-chevron" width="18" height="18" viewBox="0 0 22 22" aria-hidden="true"><polyline points="6,9 11,14 16,9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ITEMS_PER_PAGE = 4;

  /* ── Generic accordion builder ─────────────────────────── */
  function wrapAccordion(panel, items, getTriggerEl, getBodyEls) {
    items.forEach(function (item) {
      var triggerEl = getTriggerEl(item);
      if (!triggerEl) return;

      var bodyEls = getBodyEls(item).filter(Boolean);

      /* Create trigger button */
      var btn = document.createElement('button');
      btn.className = 'hub-acc-trigger';
      btn.setAttribute('aria-expanded', 'false');

      /* Wrap trigger element inside button */
      triggerEl.parentNode.insertBefore(btn, triggerEl);
      btn.appendChild(triggerEl);
      btn.insertAdjacentHTML('beforeend', CHEVRON);

      /* Wrap body elements */
      var body = document.createElement('div');
      body.className = 'hub-acc-content';
      btn.insertAdjacentElement('afterend', body);
      bodyEls.forEach(function (el) {
        body.appendChild(el);
      });

      /* Mark as accordion item */
      item.classList.add('hub-acc-item');

      /* Single-open: zur Laufzeit closest('.hub-panel') — robust gegen DOM-Änderungen */
      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        var scope = btn.closest('.hub-panel') || panel;
        scope.querySelectorAll('.hub-acc-trigger').forEach(function (t) {
          t.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) btn.setAttribute('aria-expanded', 'true');
      });
    });
  }

  /* ── Pagination ("Mehr anzeigen") ─────────────────────── */
  function initPagination(panel) {
    var items = Array.from(panel.querySelectorAll('.hub-acc-item'));
    if (items.length <= ITEMS_PER_PAGE) return;

    var visible = ITEMS_PER_PAGE;

    /* Re-use existing button or create one */
    var btn = panel.querySelector('.hub-panel-mehr-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'hub-panel-mehr-btn';
      btn.textContent = 'Mehr anzeigen';
      panel.appendChild(btn);
    }

    function applyVisibility() {
      items.forEach(function (item, i) {
        item.style.display = i >= visible ? 'none' : '';
      });
      btn.hidden = visible >= items.length;
    }

    btn.addEventListener('click', function () {
      visible += ITEMS_PER_PAGE;
      applyVisibility();
    });

    applyVisibility();
  }

  /* ── Research Hub (4 category cards) ──────────────────── */
  var rPanel = document.getElementById('hub-panel-research');
  if (rPanel) {
    var rCards = Array.from(rPanel.querySelectorAll('.grid > div.rounded-2xl'));
    wrapAccordion(
      rPanel,
      rCards,
      function (c) {
        return c.querySelector('.flex.items-center.gap-3');
      },
      function (c) {
        return Array.from(c.querySelectorAll('ul'));
      }
    );
    initPagination(rPanel);
  }

  /* ── Dream Taxonomy (8 category cards) ────────────────── */
  var tPanel = document.getElementById('hub-panel-taxonomy');
  if (tPanel) {
    var tCards = Array.from(tPanel.querySelectorAll('.grid > div.rounded-2xl'));
    wrapAccordion(
      tPanel,
      tCards,
      function (c) {
        return c.querySelector('.flex.items-center.gap-3');
      },
      function (c) {
        var p = c.querySelector('p');
        var tags = c.querySelector('.mt-auto');
        return [p, tags];
      }
    );
    initPagination(tPanel);
  }

  /* ── Dream Explorer (24 cards with data-card-type) ─────── */
  var ePanel = document.getElementById('hub-panel-explorer');
  if (ePanel) {
    var eCards = Array.from(ePanel.querySelectorAll('div[data-card-type]'));
    wrapAccordion(
      ePanel,
      eCards,
      function (c) {
        return c.querySelector('h3');
      },
      function (c) {
        var p = c.querySelector('p');
        var tags = c.querySelector('.flex.flex-wrap.gap-1');
        return [p, tags];
      }
    );
    initPagination(ePanel);
  }

  /* ── Research Briefs ──────────────────────────────────── */
  var bPanel = document.getElementById('hub-panel-briefs');
  if (bPanel) {
    Array.from(bPanel.querySelectorAll('.brief-card')).forEach(function (card) {
      var header = card.querySelector('.brief-card-header');
      var title = card.querySelector('.brief-card-title');
      if (!header || !title) return;

      /* Collect body elements (everything after title) */
      var bodyEls = [];
      var el = title.nextElementSibling;
      while (el) {
        bodyEls.push(el);
        el = el.nextElementSibling;
      }

      /* Create trigger button */
      var btn = document.createElement('button');
      btn.className = 'hub-acc-trigger brief-acc-trigger';
      btn.setAttribute('aria-expanded', 'false');

      /* Insert before header, then move header + title inside */
      card.insertBefore(btn, header);
      btn.appendChild(header);
      btn.appendChild(title);
      btn.insertAdjacentHTML('beforeend', CHEVRON);

      /* Wrap body */
      var body = document.createElement('div');
      body.className = 'hub-acc-content';
      btn.insertAdjacentElement('afterend', body);
      bodyEls.forEach(function (e) {
        body.appendChild(e);
      });

      card.classList.add('hub-acc-item');

      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        var scope = btn.closest('.hub-panel') || bPanel;
        scope.querySelectorAll('.hub-acc-trigger').forEach(function (t) {
          t.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) btn.setAttribute('aria-expanded', 'true');
      });
    });
    initPagination(bPanel);
  }

  /* ── Reset on tab change ──────────────────────────────── */
  document.addEventListener('hubTabChange', function () {
    document.querySelectorAll('.hub-panel').forEach(function (panel) {
      panel.querySelectorAll('.hub-acc-trigger').forEach(function (t) {
        t.setAttribute('aria-expanded', 'false');
      });
    });
  });

  /* ── Symbol Detail Page Accordion ─────────────────────── */
  if (document.querySelector('.symbol-hero-img')) {
    var main = document.querySelector('main');
    if (!main) return;

    /* Top-level interpretation sections (Freud, Jung, Spiritual, Biosync, etc.) */
    main.querySelectorAll('section.mb-10.p-6.rounded-2xl').forEach(function (section) {
      var h2 = section.querySelector('h2');
      if (!h2) return;

      var btn = document.createElement('button');
      btn.className = 'hub-acc-trigger';
      btn.setAttribute('aria-expanded', 'false');

      section.insertBefore(btn, h2);
      btn.appendChild(h2);
      btn.insertAdjacentHTML('beforeend', CHEVRON);

      var body = document.createElement('div');
      body.className = 'hub-acc-content';
      btn.insertAdjacentElement('afterend', body);
      Array.from(section.children).forEach(function (el) {
        if (el !== btn && el !== body) body.appendChild(el);
      });

      section.classList.add('hub-acc-item', 'sym-acc-section');

      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
    });

    /* Variant cards inside .space-y-4 */
    main.querySelectorAll('.space-y-4 > div.rounded-2xl').forEach(function (card) {
      var h3 = card.querySelector('h3');
      if (!h3) return;

      var btn = document.createElement('button');
      btn.className = 'hub-acc-trigger';
      btn.setAttribute('aria-expanded', 'false');

      card.insertBefore(btn, h3);
      btn.appendChild(h3);
      btn.insertAdjacentHTML('beforeend', CHEVRON);

      var body = document.createElement('div');
      body.className = 'hub-acc-content';
      btn.insertAdjacentElement('afterend', body);
      Array.from(card.children).forEach(function (el) {
        if (el !== btn && el !== body) body.appendChild(el);
      });

      card.classList.add('hub-acc-item');

      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
    });
  }
})();
