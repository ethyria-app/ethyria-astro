(function () {
  'use strict';

  var CONSENT_VERSION = '1.0';
  var CONSENT_KEY = 'ethyria_consent';
  var CONSENT_ENDPOINT = 'https://ethyria-api.omcstolz.workers.dev/consent';

  var STRINGS = {
    de: {
      title: 'Einwilligung zur Datenverarbeitung',
      body: 'Für die KI-Traumanalyse überträgt Ethyria deinen Traumtext an unsere API zur Verarbeitung durch KI-Modelle. Dein Text wird für die Analyse verwendet und danach nicht gespeichert. Kein Konto, keine Weitergabe an Dritte.',
      checkHtml:
        "Ich habe die <a href='/datenschutz.html' target='_blank' rel='noopener' class='consent-link'>Datenschutzerklärung</a> gelesen und stimme der Verarbeitung meiner Traumdaten zu.",
      accept: 'EinverstandenAnalyse starten',
      cancel: 'Abbrechen',
      revoke: 'Einwilligung widerrufen',
    },
    en: {
      title: 'Data Processing Consent',
      body: 'For the AI dream analysis, Ethyria transmits your dream text to our API for processing by AI models. Your text is used for analysis and not stored afterwards. No account required, no sharing with third parties.',
      checkHtml:
        "I have read the <a href='/datenschutz.en.html' target='_blank' rel='noopener' class='consent-link'>Privacy Policy</a> and consent to the processing of my dream data.",
      accept: 'I AgreeStart Analysis',
      cancel: 'Cancel',
      revoke: 'Revoke consent',
    },
    fr: {
      title: 'Consentement au traitement des données',
      body: "Pour l'analyse IA des rêves, Ethyria transmet votre texte de rêve à notre API pour traitement par des modèles IA. Votre texte est utilisé pour l'analyse et n'est pas stocké ensuite. Aucun compte requis, aucun partage avec des tiers.",
      checkHtml:
        "J'ai lu la <a href='/datenschutz.fr.html' target='_blank' rel='noopener' class='consent-link'>Politique de confidentialité</a> et je consens au traitement de mes données de rêve.",
      accept: "J'accepteCommencer l'analyse",
      cancel: 'Annuler',
      revoke: 'Révoquer le consentement',
    },
    es: {
      title: 'Consentimiento para el tratamiento de datos',
      body: 'Para el análisis IA de los sueños, Ethyria transmite el texto de tu sueño a nuestra API para su procesamiento por modelos de IA. Tu texto se usa para el análisis y no se almacena después. Sin cuenta requerida, sin compartir con terceros.',
      checkHtml:
        "He leído la <a href='/datenschutz.es.html' target='_blank' rel='noopener' class='consent-link'>Política de privacidad</a> y doy mi consentimiento al tratamiento de mis datos de sueños.",
      accept: 'De acuerdoIniciar análisis',
      cancel: 'Cancelar',
      revoke: 'Revocar consentimiento',
    },
    ru: {
      title: 'Согласие на обработку данных',
      body: 'Для ИИ-анализа снов Ethyria передаёт текст вашего сна в наш API для обработки моделями ИИ. Текст используется для анализа и не сохраняется после этого. Без аккаунта, без передачи данных третьим лицам.',
      checkHtml:
        "Я прочитал(а) <a href='/datenschutz.ru.html' target='_blank' rel='noopener' class='consent-link'>Политику конфиденциальности</a> и даю согласие на обработку моих данных о снах.",
      accept: 'СогласенНачать анализ',
      cancel: 'Отмена',
      revoke: 'Отозвать согласие',
    },
  };

  function getLang() {
    var l = (document.documentElement.lang || 'de').slice(0, 2).toLowerCase();
    return STRINGS[l] ? l : 'de';
  }

  function s() {
    return STRINGS[getLang()];
  }

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // ── Public API ───────────────────────────────────────────────

  window.ethyriaHasConsent = function () {
    try {
      var d = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      return !!(d && d.version === CONSENT_VERSION && d.id);
    } catch (e) {
      return false;
    }
  };

  window.ethyriaRecordConsent = function () {
    var lang = getLang();
    var id = uuid();
    var data = { id: id, ts: new Date().toISOString(), version: CONSENT_VERSION, lang: lang };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    } catch (e) {}
    fetch(CONSENT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(function () {});
    return id;
  };

  window.ethyriaRevokeConsent = function () {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch (e) {}
  };

  // ── Popup ────────────────────────────────────────────────────

  function fillPopup() {
    var str = s();
    var popup = document.getElementById('ethyria-consent-popup');
    if (!popup) return;
    var t = popup.querySelector('.consent-title');
    var b = popup.querySelector('.consent-body');
    var ct = popup.querySelector('.consent-check-text');
    var ab = popup.querySelector('.consent-accept-btn');
    var cb = popup.querySelector('.consent-close-btn');
    if (t) t.textContent = str.title;
    if (b) b.textContent = str.body;
    if (ct) ct.innerHTML = str.checkHtml;
    if (ab) ab.textContent = str.accept;
    if (cb) cb.textContent = str.cancel;
  }

  window.ethyriaShowConsentPopup = function () {
    return new Promise(function (resolve) {
      var popup = document.getElementById('ethyria-consent-popup');
      if (!popup) {
        resolve(false);
        return;
      }

      fillPopup();

      var checkbox = popup.querySelector('.consent-checkbox');
      var acceptBtn = popup.querySelector('.consent-accept-btn');
      var closeBtn = popup.querySelector('.consent-close-btn');

      if (checkbox) checkbox.checked = false;
      if (acceptBtn) acceptBtn.disabled = true;

      popup.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(function () {
        if (closeBtn) closeBtn.focus();
      }, 50);

      function cleanup() {
        popup.hidden = true;
        document.body.style.overflow = '';
        if (checkbox) checkbox.removeEventListener('change', onCheck);
        if (acceptBtn) acceptBtn.removeEventListener('click', onAccept);
        if (closeBtn) closeBtn.removeEventListener('click', onClose);
        document.removeEventListener('keydown', onKey);
      }
      function onCheck() {
        if (acceptBtn) acceptBtn.disabled = !checkbox.checked;
      }
      function onAccept() {
        if (checkbox && !checkbox.checked) return;
        window.ethyriaRecordConsent();
        cleanup();
        resolve(true);
      }
      function onClose() {
        cleanup();
        resolve(false);
      }
      function onKey(e) {
        if (e.key === 'Escape') onClose();
      }

      if (checkbox) checkbox.addEventListener('change', onCheck);
      if (acceptBtn) acceptBtn.addEventListener('click', onAccept);
      if (closeBtn) closeBtn.addEventListener('click', onClose);
      document.addEventListener('keydown', onKey);
    });
  };

  // ── Proactive scroll-trigger ─────────────────────────────────
  // Show popup when live-analyse section enters viewport (if no consent yet).

  function setupScrollTrigger() {
    var section = document.getElementById('live-analyse');
    if (!section || !('IntersectionObserver' in window)) return;
    var fired = false;
    var obs = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting && !fired && !window.ethyriaHasConsent()) {
          fired = true;
          obs.disconnect();
          window.ethyriaShowConsentPopup();
        }
      },
      { rootMargin: '0px 0px -80px 0px' }
    );
    obs.observe(section);
  }

  // ── Init ─────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    // Fill revoke button text
    var revokeBtn = document.getElementById('consent-revoke-btn');
    if (revokeBtn) {
      revokeBtn.textContent = s().revoke;
      revokeBtn.addEventListener('click', function () {
        window.ethyriaRevokeConsent();
        revokeBtn.textContent = '✓';
        setTimeout(function () {
          revokeBtn.textContent = s().revoke;
        }, 2500);
      });
    }
    setupScrollTrigger();
  });
})();
