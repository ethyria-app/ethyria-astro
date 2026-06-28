var _spOrig = null;
var _spLang = document.documentElement.lang || 'en';
var _spBack = { de: '← Zurück', en: '← Back', fr: '← Retour', es: '← Volver', ru: '← Назад' }[_spLang] || '← Back';
var _spClose = { de: 'Schließen', en: 'Close', fr: 'Fermer', es: 'Cerrar', ru: 'Закрыть' }[_spLang] || 'Close';

function openSymbolPopup() {
  document.getElementById('symbolPopup').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSymbolPopup() {
  var p = document.getElementById('symbolPopup');
  p.hidden = true;
  document.body.style.overflow = '';
  if (_spOrig) {
    document.querySelector('.symbol-popup__card').innerHTML = _spOrig;
    _spOrig = null;
  }
}
function openBetaPopup() {
  closeSymbolPopup();
  var dl = document.getElementById('download');
  if (dl) {
    dl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
function spBack() {
  if (_spOrig) {
    var c = document.querySelector('.symbol-popup__card');
    c.innerHTML = _spOrig;
    c.scrollTop = 0;
    _spOrig = null;
  }
}
function _spCleanUrl(h) {
  // Convert legacy .html symbol URLs to clean Astro URLs
  h = h.replace(/\/symbols\/([a-z]{2})\/([a-z-]+)\.html$/, '/$1/symbols/$2/');
  h = h.replace(/\/symbols\/([a-z][a-z-]+)\.html$/, '/symbols/$1/');
  return h;
}
function spLoadDetail(href) {
  href = _spCleanUrl(href);
  if (window.ethyriaTrack) {
    var sym = href.replace(/.*symbols\/([^/.]+).*/, '$1');
    window.ethyriaTrack('Symbol Viewed', { symbol: sym });
  }
  var c = document.querySelector('.symbol-popup__card');
  if (!_spOrig) _spOrig = c.innerHTML;
  c.innerHTML = '<div style="text-align:center;padding:3rem;color:#9ca3af">⏳</div>';
  c.scrollTop = 0;
  fetch(href)
    .then(function (r) {
      return r.text();
    })
    .then(function (t) {
      var d = new DOMParser().parseFromString(t, 'text/html');
      var m = d.querySelector('main');
      if (!m) {
        window.location.href = href;
        return;
      }
      m.querySelectorAll('section').forEach(function (s) {
        if (s.querySelector('a[href="/"]')) s.remove();
      });
      var rn = m.querySelector('#related-symbols');
      if (rn && rn.closest('nav')) rn.closest('nav').remove();
      // Remove UI elements that don't make sense inside a popup
      ['#langSw', 'nav.breadcrumb', "[aria-label='Breadcrumb']", '.breadcrumb'].forEach(function (sel) {
        m.querySelectorAll(sel).forEach(function (el) {
          el.remove();
        });
      });
      c.innerHTML =
        '<button type="button" class="exit-popup__close" aria-label="' +
        _spClose +
        '">&times;</button>' +
        '<button type="button" class="sp-back">' +
        _spBack +
        '</button>' +
        '<div class="sp-detail">' +
        m.innerHTML +
        '</div>';
      c.scrollTop = 0;
      // Re-attach FAQ listeners for dynamically loaded content
      c.querySelectorAll('.faq-accordion').forEach(function (accordion) {
        var faqBtns = accordion.querySelectorAll('.faq-question');
        faqBtns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var exp = this.getAttribute('aria-expanded') === 'true';
            faqBtns.forEach(function (b) {
              b.setAttribute('aria-expanded', 'false');
            });
            if (!exp) this.setAttribute('aria-expanded', 'true');
          });
        });
      });
    })
    .catch(function () {
      window.location.href = href;
    });
}

document.addEventListener('click', function (e) {
  var sp = document.getElementById('symbolPopup');
  if (sp && !sp.hidden) {
    var btn = e.target.closest('[onclick*="openBetaPopup"]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      openBetaPopup();
      return;
    }
    var cl = e.target.closest('.exit-popup__close');
    if (cl && cl.closest('#symbolPopup')) {
      e.preventDefault();
      closeSymbolPopup();
      return;
    }
    var bk = e.target.closest('.sp-back');
    if (bk) {
      e.preventDefault();
      spBack();
      return;
    }
    var pillarLink = e.target.closest(
      'a[href*="traumdeutung-methoden"], a[href*="traumsymbole-guide"], a[href*="luzides-traeumen"]'
    );
    if (pillarLink) {
      e.preventDefault();
      var pUrl = pillarLink
        .getAttribute('href')
        .replace(/\/(traumdeutung-methoden|traumsymbole-guide|luzides-traeumen)\.html$/, '/$1/');
      spLoadDetail(pUrl);
      return;
    }
  }
  var a = e.target.closest('a[href*="symbols/"]');
  if (!a) return;
  var h = a.getAttribute('href');
  if (a.closest('#symbolPopup') && a.classList.contains('sp-full-link')) return;
  // Inside popup: intercept clean Astro symbol detail URLs (e.g. /symbols/wasser/, /en/symbols/wasser/)
  if (a.closest('#symbolPopup') && h.match(/\/symbols\/[a-z][a-z-]+\//)) {
    e.preventDefault();
    spLoadDetail(h);
    return;
  }
  if (!sp) return;
  if (h.indexOf('index.html') > -1 && !a.closest('#symbolPopup')) {
    e.preventDefault();
    openSymbolPopup();
    return;
  }
  if (h.indexOf('index.html') === -1 && h.match(/symbols\/[a-z].*\.html/)) {
    e.preventDefault();
    if (sp.hidden) openSymbolPopup();
    spLoadDetail(h);
    return;
  }
});

document.addEventListener('keydown', function (e) {
  var sp = document.getElementById('symbolPopup');
  if (e.key === 'Escape' && sp && !sp.hidden) closeSymbolPopup();
});
