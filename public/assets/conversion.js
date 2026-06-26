(function () {
  'use strict';

  var config = window.ethyriaBetaConfig || {};
  var messages = config.messages || {};
  var endpoint = String(config.endpoint || '').trim();

  function doSignup(email, statusEl, button, idleLabel) {
    if (!endpoint || endpoint.indexOf('REPLACE_WITH_') === 0) {
      if (statusEl) {
        statusEl.textContent = messages.setup || 'Signup not ready.';
        statusEl.className = 'block text-sm mt-3 text-amber-300';
      }
      return Promise.resolve();
    }
    var payload = new URLSearchParams();
    payload.set('email', email);
    payload.set('locale', config.locale || 'de');
    payload.set('sourcePage', config.sourcePage || 'test/index.html');
    payload.set('pageUrl', window.location.href);
    payload.set('userAgent', navigator.userAgent || '');
    return fetch(endpoint, {
      method: 'POST',
      body: payload,
      redirect: 'follow',
    })
      .then(function (r) {
        return r.text();
      })
      .then(function (text) {
        var result;
        try {
          result = JSON.parse(text);
        } catch (e) {
          result = {};
        }
        var status = result.status || 'error';
        if (status === 'success') {
          if (statusEl) {
            statusEl.textContent = messages.success;
            statusEl.className = 'block text-sm mt-3 text-cyan-400 animate-pulse';
          }
          showSuccessOverlay();
        } else if (status === 'already_registered') {
          if (statusEl) {
            statusEl.textContent = messages.alreadyRegistered;
            statusEl.className = 'block text-sm mt-3 text-sky-300';
          }
        } else if (status === 'saved_no_email') {
          if (statusEl) {
            statusEl.textContent = messages.savedNoEmail || messages.success;
            statusEl.className = 'block text-sm mt-3 text-amber-300';
          }
          showSuccessOverlay();
        } else if (status === 'invalid_email') {
          if (statusEl) {
            statusEl.textContent = messages.invalidEmail;
            statusEl.className = 'block text-sm mt-3 text-rose-400';
          }
        } else {
          throw new Error('request_failed');
        }
      })
      .catch(function () {
        if (statusEl) {
          statusEl.textContent = messages.error;
          statusEl.className = 'block text-sm mt-3 text-rose-400';
        }
      })
      .finally(function () {
        if (button) {
          button.disabled = false;
          button.textContent = idleLabel;
          button.style.opacity = '1';
          button.style.cursor = '';
        }
      });
  }

  window.handleHeroSignup = function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var honeypot = form.querySelector('input[name="website"]');
    if (!input || !button) return;
    if (honeypot && honeypot.value) return;
    if (!input.checkValidity()) {
      input.reportValidity();
      return;
    }
    var email = String(input.value || '')
      .trim()
      .toLowerCase();
    var idleLabel = 'Kostenlos starten →';
    button.disabled = true;
    button.textContent = 'Speichert...';
    button.style.opacity = '0.7';
    var statusEl = document.getElementById('heroStatus');
    doSignup(email, statusEl, button, idleLabel).then(function () {
      if (statusEl && statusEl.classList.contains('text-cyan-400')) {
        input.value = '';
      }
    });
  };

  window.handleHeroBottomSignup = function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var honeypot = form.querySelector('input[name="website"]');
    if (!input || !button) return;
    if (honeypot && honeypot.value) return;
    if (!input.checkValidity()) {
      input.reportValidity();
      return;
    }
    var email = String(input.value || '')
      .trim()
      .toLowerCase();
    var idleLabel = 'Zugang sichern →';
    button.disabled = true;
    button.textContent = 'Speichert...';
    button.style.opacity = '0.7';
    var statusEl = document.getElementById('heroBottomStatus');
    doSignup(email, statusEl, button, idleLabel).then(function () {
      if (statusEl && statusEl.classList.contains('text-cyan-400')) {
        input.value = '';
      }
    });
  };

  window.handleExitSignup = function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var honeypot = form.querySelector('input[name="website"]');
    if (!input || !button) return;
    if (honeypot && honeypot.value) return;
    if (!input.checkValidity()) {
      input.reportValidity();
      return;
    }
    var email = String(input.value || '')
      .trim()
      .toLowerCase();
    var idleLabel = 'Jetzt sichern →';
    button.disabled = true;
    button.textContent = 'Speichert...';
    var statusEl = document.getElementById('exitStatus');
    doSignup(email, statusEl, button, idleLabel).then(function () {
      if (statusEl && statusEl.classList.contains('text-cyan-400')) {
        input.value = '';
        setTimeout(function () {
          document.getElementById('exitPopup').hidden = true;
        }, 800);
      }
    });
  };

  var betaStatusEl = document.getElementById('betaStatus');
  if (betaStatusEl) {
    new MutationObserver(function () {
      if (betaStatusEl.textContent && betaStatusEl.classList.contains('text-cyan-400')) {
        showSuccessOverlay();
      }
    }).observe(betaStatusEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  window.showSuccessOverlay = function () {
    var overlay = document.getElementById('successOverlay');
    if (!overlay || !overlay.hidden) return;
    overlay.hidden = false;
    spawnConfetti();
  };
  window.closeSuccessOverlay = function () {
    document.getElementById('successOverlay').hidden = true;
  };

  function spawnConfetti() {
    /* Disabled — minimalist design */
  }

  var shareUrl = 'https://ethyria.at/';
  var shareText = 'Ethyria verwandelt deine Träume in tiefe Erkenntnisse. Jetzt kostenlos herunterladen!';

  window.shareToTwitter = function () {
    window.open(
      'https://x.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(shareUrl),
      '_blank',
      'noopener'
    );
  };
  window.shareToWhatsApp = function () {
    window.open('https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + shareUrl), '_blank', 'noopener');
  };
  window.copyShareLink = function () {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(function () {
        var btn = document.getElementById('copyBtn');
        if (btn) {
          btn.textContent = 'Kopiert ✓';
          setTimeout(function () {
            btn.textContent = 'Link kopieren';
          }, 2000);
        }
      });
    }
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.getElementById('successOverlay').hidden = true;
      window.closeLegalPopup && window.closeLegalPopup();
    }
  });
})();

/* ---- Legal Popup (global) ---- */
var _legalPopupReturn = null;

function _legalTrapFocus(el) {
  var sel = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var nodes = el.querySelectorAll(sel);
  var first = nodes[0];
  var last = nodes[nodes.length - 1];
  if (first) first.focus();
  function h(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last && last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first && first.focus();
      }
    }
  }
  el._lftH = h;
  el.addEventListener('keydown', h);
}

window.openLegalPopup = function (page) {
  var popup = document.getElementById('legalPopup');
  var content = document.getElementById('legalPopupContent');
  if (!popup || !content) return;
  _legalPopupReturn = document.activeElement;
  content.innerHTML = '<div class="legal-popup__loading">Laden\u2026</div>';
  popup.hidden = false;
  document.body.style.overflow = 'hidden';
  _legalTrapFocus(popup);
  var _lang = (document.documentElement.lang || 'de').slice(0, 2);
  var _prefix = _lang === 'de' ? '' : '/' + _lang;
  fetch(_prefix + '/' + page + '/')
    .then(function (r) {
      return r.text();
    })
    .then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var main = doc.querySelector('main');
      if (main) {
        content.innerHTML = main.innerHTML;
      }
    })
    .catch(function () {
      content.innerHTML = '<p style="color:rgba(255,255,255,0.45);padding:2rem">Fehler beim Laden.</p>';
    });
};
window.closeLegalPopup = function () {
  var popup = document.getElementById('legalPopup');
  if (popup) {
    if (popup._lftH) {
      popup.removeEventListener('keydown', popup._lftH);
      delete popup._lftH;
    }
    popup.hidden = true;
  }
  document.body.style.overflow = '';
  if (_legalPopupReturn) {
    try {
      _legalPopupReturn.focus();
    } catch (e) {}
    _legalPopupReturn = null;
  }
};

/* ---- Copy-to-clipboard for email links ---- */
document.addEventListener('click', function (e) {
  var target = e.target.closest('[data-copy-email]');
  if (!target) return;
  var email = target.getAttribute('data-copy-email');
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(email).catch(function () {});
  var orig = target.textContent;
  target.textContent = '✓ Kopiert';
  setTimeout(function () {
    target.textContent = orig;
  }, 2000);
});

/* ---- Floating CTA: reveal after scrolling past hero ---- */
(function () {
  var btn = document.getElementById('floating-download-cta');
  if (!btn) return;
  function revealIfScrolled() {
    if (window.scrollY > 300) {
      btn.classList.add('is-visible');
      return true;
    }
    return false;
  }
  if (!revealIfScrolled()) {
    window.addEventListener(
      'scroll',
      function onScroll() {
        if (revealIfScrolled()) {
          window.removeEventListener('scroll', onScroll);
        }
      },
      { passive: true }
    );
  }
})();

/* ---- CSP-safe event delegation (replaces inline onclick) ---- */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-legal-popup]').forEach(function (el) {
    el.addEventListener('click', function () {
      window.openLegalPopup(el.getAttribute('data-legal-popup'));
    });
  });
  document.querySelectorAll('[data-close-popup="legal"]').forEach(function (el) {
    el.addEventListener('click', window.closeLegalPopup);
  });
  document.querySelectorAll('[data-close-popup="symbol"]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (window.closeSymbolPopup) window.closeSymbolPopup();
    });
  });
});
