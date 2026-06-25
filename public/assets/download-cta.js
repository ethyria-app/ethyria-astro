(function () {
  'use strict';

  var APK_URL = 'assets/Ethyria_v1.0_def.apk';

  var floatingBtn = document.getElementById('floating-download-cta');
  var sectionTexts = [
    { id: 'app-screens', text: 'DOWNLOAD' },
    { id: 'live-analyse', text: 'DOWNLOAD' },
    { id: 'testimonials', text: 'DOWNLOAD' },
    { id: 'pricing', text: 'DOWNLOAD' },
    { id: 'faq', text: 'DOWNLOAD' },
    { id: 'download', text: 'DOWNLOAD' },
  ];
  var defaultText = 'DOWNLOAD';

  if (floatingBtn && 'IntersectionObserver' in window) {
    var current = defaultText;
    sectionTexts.forEach(function (s) {
      var el = document.getElementById(s.id);
      if (!el) return;
      new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            current = s.text;
            floatingBtn.textContent = current;
          }
        },
        { threshold: 0.3 }
      ).observe(el);
    });
  }

  function handleDownloadClick(btn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (window.ethyriaTrack) {
        window.ethyriaTrack('Download Clicked', { button: btn.id || 'unknown' });
      }
      var originalText = btn.textContent;
      btn.innerHTML = '✓ Download gestartet';
      btn.style.background = 'linear-gradient(90deg,#22c55e,#16a34a)';
      if (floatingBtn) {
        floatingBtn.textContent = '✓ Download gestartet';
        floatingBtn.style.background = 'linear-gradient(90deg,#22c55e,#16a34a)';
      }
      setTimeout(function () {
        var toast = document.getElementById('installToast');
        if (toast) {
          toast.hidden = false;
          setTimeout(function () {
            toast.hidden = true;
          }, 8000);
        }
      }, 4000);
      setTimeout(function () {
        if (floatingBtn) {
          floatingBtn.textContent = defaultText;
          floatingBtn.style.background = '';
        }
      }, 5000);
    });
  }

  [
    'hero-download-btn',
    'pricing-download-btn',
    'final-download-btn',
    'floating-download-cta',
    'exit-download-btn',
  ].forEach(function (id) {
    handleDownloadClick(document.getElementById(id));
  });

  window.openQRModal = function () {
    var modal = document.getElementById('qrModal');
    if (!modal) return;
    modal.hidden = false;
    var canvas = document.getElementById('qrCanvas');
    if (canvas) {
      var url = window.location.origin + '/' + APK_URL;
      var img = new Image();
      img.onload = function () {
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 180, 180);
      };
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(url);
    }
  };
  window.closeQRModal = function () {
    var modal = document.getElementById('qrModal');
    if (modal) modal.hidden = true;
  };

  window.handlePlayStoreNotify = function (e) {
    e.preventDefault();
    var form = e.target;
    var email = (form.querySelector('[type=email]') || {}).value || '';
    var statusEl = document.getElementById('playstoreStatus');
    var btn = form.querySelector('button[type=submit]');
    if (!email || !statusEl) return;
    if (btn) btn.disabled = true;
    var config = window.ethyriaBetaConfig || {};
    var endpoint = String(config.endpoint || '').trim();
    if (!endpoint) {
      statusEl.textContent = '✓ Gespeichertwir benachrichtigen dich!';
      return;
    }
    var payload = new URLSearchParams();
    payload.set('email', email);
    payload.set('source', 'playstore-notify');
    payload.set('locale', 'de');
    payload.set('honey', '');
    fetch(endpoint, { method: 'POST', body: payload })
      .then(function () {
        statusEl.textContent = '✓ Gespeichertwir benachrichtigen dich beim Play Store Launch!';
        form.reset();
      })
      .catch(function () {
        statusEl.textContent = '✓ Gespeichert.';
      });
  };
})();
