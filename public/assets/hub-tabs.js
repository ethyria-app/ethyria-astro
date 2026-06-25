(function () {
  var tabs = document.querySelectorAll('[data-hub-tab]');
  var panels = document.querySelectorAll('[data-hub-panel]');
  var shell = document.querySelector('.traum-hub-shell');
  if (!tabs.length) return;

  /* Startzustand: Hub ausgeklappt, Research als aktiver Tab */
  if (shell) {
    shell.dataset.activeTab = 'research';
    /* Hub startet expanded — kein hub-collapsed */
  }

  function switchToTab(target) {
    tabs.forEach(function (t) {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    var activeBtn = document.querySelector('[data-hub-tab="' + target + '"]');
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
    }

    if (shell) shell.dataset.activeTab = target;

    panels.forEach(function (panel) {
      if (panel.dataset.hubPanel === target) {
        panel.removeAttribute('hidden');
        panel.classList.add('hub-entering');
        panel.addEventListener(
          'animationend',
          function () {
            panel.classList.remove('hub-entering');
          },
          { once: true }
        );
      } else {
        panel.setAttribute('hidden', '');
      }
    });

    document.dispatchEvent(new CustomEvent('hubTabChange'));
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.dataset.hubTab;
      var collapsed = shell && shell.classList.contains('hub-collapsed');
      var isActive = tab.classList.contains('active');

      if (collapsed) {
        shell.classList.remove('hub-collapsed');
        switchToTab(target);
      } else if (isActive) {
        shell.classList.add('hub-collapsed');
        document.dispatchEvent(new CustomEvent('hubTabChange'));
      } else {
        switchToTab(target);
      }
    });
  });

  /* ── Collapse-Button rechts in der Tab-Leiste ──────────── */
  /* Nur sichtbar im aufgeklappten Zustand (CSS: display:none wenn hub-collapsed) */
  var collapseBtn = document.createElement('button');
  collapseBtn.className = 'hub-collapse-btn';
  collapseBtn.setAttribute('aria-label', 'Hub schliessen');
  collapseBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 22 22" fill="none" aria-hidden="true">' +
    '<polyline points="6,14 11,9 16,14" stroke="currentColor" stroke-width="2.5" ' +
    'fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  collapseBtn.addEventListener('click', function () {
    if (shell) {
      shell.classList.add('hub-collapsed');
      document.dispatchEvent(new CustomEvent('hubTabChange'));
    }
  });

  if (shell) {
    var tabBar = shell.querySelector('.hub-tab-bar');
    if (tabBar) tabBar.appendChild(collapseBtn);
  }
})();
