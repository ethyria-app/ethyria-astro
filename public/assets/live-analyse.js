(function () {
  "use strict";

  var FREE_USED_KEY = "ethyria_free_used";
  var PAID_CREDIT_KEY = "ethyria_paid_credit";
  var PENDING_KEY = "ethyria_pending";
  var SESSION_KEY = "ethyria_dream_session";
  var USER_NAME_KEY = "ethyria_user_name";
  var DREAM_MOOD_KEY = "ethyria_current_mood";
  var PENDING_TTL = 30 * 60 * 1000;
  var SESSION_TTL = 24 * 60 * 60 * 1000;

  var cfg = null;
  var state = "IDLE";
  var activeMode = null;
  var phaseTimer = null;
  var phaseIdx = 0;
  var abortController = null;
  var selectedMood = null;
  var lucidScore = 0;

  var dreamSession = {
    dreamText: "",
    dreamId: "",
    creditUsed: false,
    activeTab: null,
    analyses: {},
    associationContext: null,
  };

  // ── Helpers: User name & mood & lucid detection ───────────────
  function getStoredUserName() {
    try {
      var n = localStorage.getItem(USER_NAME_KEY);
      return n && n.trim().length > 0 && n.trim().length < 50 ? n.trim() : "";
    } catch (e) {
      return "";
    }
  }

  // Keyword-based lucid detection (port of DreamTagRegistry idea)
  var LUCID_KEYWORDS = {
    de: [
      "klartraum",
      "luzid",
      "luzide",
      "ich wusste, dass ich träume",
      "wurde mir bewusst",
      "im traum bewusst",
      "habe ich gemerkt, dass es ein traum",
    ],
    en: [
      "lucid dream",
      "lucid",
      "i knew i was dreaming",
      "i was aware i was dreaming",
      "became aware",
      "realized i was dreaming",
    ],
    fr: [
      "rêve lucide",
      "lucide",
      "je savais que je rêvais",
      "j'étais conscient de rêver",
    ],
    es: [
      "sueño lúcido",
      "lúcido",
      "sabía que estaba soñando",
      "consciente de que soñaba",
    ],
    ru: [
      "осознанн",
      "люцидн",
      "понял что сплю",
      "осознал что сплю",
      "знал что сплю",
    ],
  };
  function detectLucidScore(text, lang) {
    if (!text) return 0;
    var t = text.toLowerCase();
    var kws = LUCID_KEYWORDS[lang] || LUCID_KEYWORDS.de;
    var hits = 0;
    for (var i = 0; i < kws.length; i++) {
      if (t.indexOf(kws[i]) !== -1) hits++;
    }
    if (hits === 0) return 0;
    return Math.min(1, hits / 3);
  }

  function buildDreamData(dreamText, mood, lang) {
    var data = {};
    if (mood) data.mood = mood;
    var lucid = detectLucidScore(dreamText, lang || "de");
    if (lucid > 0) {
      data.is_lucid = lucid >= 0.34;
      data.lucidity_score = Number(lucid.toFixed(2));
    }
    return Object.keys(data).length ? data : null;
  }

  // ── Focus Trap Utility ───────────────────────────────────────
  var _focusTrapReturn = null;

  function trapFocus(el) {
    var sel = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    var nodes = el.querySelectorAll(sel);
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (first) first.focus();
    function handler(e) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last && last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first && first.focus(); }
      }
    }
    el._ftHandler = handler;
    el.addEventListener("keydown", handler);
  }

  function releaseFocus(el) {
    if (el && el._ftHandler) {
      el.removeEventListener("keydown", el._ftHandler);
      delete el._ftHandler;
    }
    if (_focusTrapReturn) { try { _focusTrapReturn.focus(); } catch(e) {} _focusTrapReturn = null; }
  }

  // ── init ────────────────────────────────────────────────────

  function init() {
    cfg = window.ethyriaAnalyseConfig || {
      lang: "de",
      modes: [],
      strings: {},
      endpoint: null,
      demoKey: ""
    };

    var section = document.getElementById("live-analyse");
    if (!section) return;

    // Input mode tabs
    document.querySelectorAll(".la-mode-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setActiveMode(tab.dataset.mode);
      });
    });
    if (cfg.modes && cfg.modes.length > 0) {
      setActiveMode(cfg.modes[0].id);
    } else {
      var firstTab = document.querySelector(".la-mode-tab");
      if (firstTab) setActiveMode(firstTab.dataset.mode);
    }

    // Char counter
    var textarea = document.getElementById("la-textarea");
    var charCount = document.getElementById("la-char-count");
    if (textarea && charCount) {
      textarea.addEventListener("input", function () {
        var len = textarea.value.length;
        charCount.textContent = len + " / 2000";
        charCount.classList.toggle("la-char-count--warn", len > 1800);
        updateSubmitState(textarea.value);
      });
    }

    // Voice Input
    initVoiceInput();

    // Submit / Cancel
    var submitBtn = document.getElementById("la-submit");
    if (submitBtn) submitBtn.addEventListener("click", handleSubmit);

    var cancelBtn = document.getElementById("la-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", handleCancel);

    // Dream screen
    var dreamBack = document.getElementById("la-dream-back");
    if (dreamBack) dreamBack.addEventListener("click", closeDreamScreen);

    var pdfBtn = document.getElementById("la-pdf-btn");
    if (pdfBtn) pdfBtn.addEventListener("click", downloadPdf);

    var shareBtn = document.getElementById("la-share-btn");
    if (shareBtn) shareBtn.addEventListener("click", shareAnalysis);

    var retryBtn = document.getElementById("la-retry");
    if (retryBtn)
      retryBtn.addEventListener("click", function () {
        if (!canAnalyze()) {
          showPaywall();
        } else {
          closeDreamScreen();
        }
      });

    // Paywall
    var paywallEl = document.getElementById("la-paywall");
    var paywallClose = document.getElementById("la-paywall-close");
    if (paywallClose) paywallClose.addEventListener("click", closePaywall);
    if (paywallEl)
      paywallEl.addEventListener("click", function (e) {
        if (e.target === paywallEl) closePaywall();
      });

    var paywallBuy = document.getElementById("la-paywall-buy");
    if (paywallBuy) paywallBuy.addEventListener("click", handleBuyAnalysis);

    // Keyboard: Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var paywall = document.getElementById("la-paywall");
        var screen = document.getElementById("la-dream-screen");
        if (paywall && !paywall.hidden) closePaywall();
        else if (screen && !screen.hidden) closeDreamScreen();
      }
    });

    populateStrings();
    checkPendingPayment();
    loadDreamSession();
    dreamSession.activeTab = null; // always start fresh – "Ergebnis anzeigen" only after current-session analysis
    updateSubmitState("");
    applyAnalysisUI();
  }

  // ── Voice Input ─────────────────────────────────────────────
  function initVoiceInput() {
    var btn = document.getElementById("la-voice-btn");
    if (!btn) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      btn.hidden = true;
      return;
    }
    var langMap = {
      de: "de-DE",
      en: "en-US",
      fr: "fr-FR",
      es: "es-ES",
      ru: "ru-RU",
    };
    var errorMsgs = {
      de: { denied: "Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen freigeben.", noMic: "Kein Mikrofon gefunden.", network: "Netzwerk-Fehler. Sprach-Erkennung benötigt Internet.", noSpeech: "Nichts gehört. Bitte näher zum Mikrofon sprechen.", generic: "Sprach-Erkennung fehlgeschlagen." },
      en: { denied: "Microphone access denied. Please allow it in your browser settings.", noMic: "No microphone found.", network: "Network error. Speech recognition needs internet.", noSpeech: "Nothing heard. Please speak closer to the microphone.", generic: "Speech recognition failed." },
      fr: { denied: "Accès au microphone refusé. Veuillez l'autoriser dans les paramètres du navigateur.", noMic: "Aucun microphone trouvé.", network: "Erreur réseau. La reconnaissance vocale nécessite Internet.", noSpeech: "Rien entendu. Parlez plus près du microphone.", generic: "Échec de la reconnaissance vocale." },
      es: { denied: "Acceso al micrófono denegado. Permítelo en la configuración del navegador.", noMic: "No se encontró micrófono.", network: "Error de red. El reconocimiento de voz necesita Internet.", noSpeech: "No se escuchó nada. Habla más cerca del micrófono.", generic: "Falló el reconocimiento de voz." },
      ru: { denied: "Доступ к микрофону запрещён. Разрешите его в настройках браузера.", noMic: "Микрофон не найден.", network: "Ошибка сети. Распознавание речи требует интернет.", noSpeech: "Ничего не услышано. Говорите ближе к микрофону.", generic: "Распознавание речи не удалось." },
    };
    var rec = null;
    var listening = false;
    var manualStop = false;
    var accumulatedFinal = "";
    var startText = "";
    var networkRetryCount = 0;
    var sessionId = 0;
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    function getMsgs() {
      return errorMsgs[(cfg && cfg.lang) || "de"] || errorMsgs.de;
    }

    function showVoiceError(text) {
      var hint = document.getElementById("la-limit-hint");
      if (!hint) return;
      var original = hint.dataset.original;
      if (!original) hint.dataset.original = hint.textContent;
      hint.textContent = "⚠ " + text;
      hint.style.color = "rgba(248,113,113,0.9)";
      setTimeout(function () {
        if (hint.dataset.original) {
          hint.textContent = hint.dataset.original;
          hint.style.color = "";
          delete hint.dataset.original;
        }
      }, 5000);
    }

    function stopRec() {
      listening = false;
      btn.classList.remove("la-voice-btn--active");
      try {
        if (rec) {
          rec.onstart = null;
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
        }
      } catch (e) {}
      rec = null;
    }

    function startRecognition() {
      var ta = document.getElementById("la-textarea");
      if (!ta) return;
      try {
        var mySession = ++sessionId;
        rec = new SR();
        rec.lang = langMap[(cfg && cfg.lang) || "de"] || "de-DE";
        rec.interimResults = true;
        rec.continuous = !isMobile;

        accumulatedFinal = "";
        startText = ta.value;
        if (startText.length > 0 && !/\s$/.test(startText)) startText += " ";
        manualStop = false;

        rec.onstart = function () {
          listening = true;
          btn.classList.add("la-voice-btn--active");
        };

        rec.onresult = function (ev) {
          if (mySession !== sessionId) return;
          var interim = "";
          for (var i = ev.resultIndex; i < ev.results.length; i++) {
            var transcript = ev.results[i][0].transcript;
            if (ev.results[i].isFinal) {
              if (accumulatedFinal === "" && startText.length > 0 &&
                  startText.indexOf(transcript.trim()) !== -1) {
                continue;
              }
              accumulatedFinal += transcript;
              if (!/[\s.,;:!?]$/.test(accumulatedFinal)) accumulatedFinal += " ";
            } else {
              interim += transcript;
            }
          }
          ta.value = (startText + accumulatedFinal + interim).slice(0, 2000);
          ta.dispatchEvent(new Event("input"));
        };

        rec.onerror = function (ev) {
          var msgs = getMsgs();
          var code = ev && ev.error;
          if (code === "not-allowed" || code === "service-not-allowed") showVoiceError(msgs.denied);
          else if (code === "audio-capture") showVoiceError(msgs.noMic);
          else if (code === "network") {
            // Edge/Safari: network error is often transient on first call.
            // Retry once automatically before showing the error.
            if (networkRetryCount < 1) {
              networkRetryCount++;
              rec = null;
              listening = false;
              btn.classList.remove("la-voice-btn--active");
              setTimeout(startRecognition, 800);
              return;
            }
            showVoiceError(msgs.network);
          }
          else if (code === "no-speech") {
            // ignore — Android fires this between phrases; let onend auto-restart
            return;
          }
          else if (code === "aborted") return;
          else showVoiceError(msgs.generic);
          manualStop = true;
          stopRec();
        };

        rec.onend = function () {
          // Android Chrome stops automatically after silence even with continuous=true.
          // If user didn't manually stop, restart so dictation keeps going.
          if (listening && !manualStop) {
            // Null all handlers on the stale instance BEFORE losing the reference.
            // Without this, Android fires a late onresult on the old object after
            // startRecognition() has already reset startText — causing double-text.
            var staleRec = rec;
            rec = null;
            try {
              staleRec.onstart = null;
              staleRec.onresult = null;
              staleRec.onerror = null;
              staleRec.onend = null;
            } catch (e) {}
            setTimeout(startRecognition, 350);
            return;
          }
          stopRec();
        };
        rec.start();
      } catch (e) {
        showVoiceError(getMsgs().generic);
        stopRec();
      }
    }

    btn.addEventListener("click", function () {
      if (listening) {
        manualStop = true;
        try {
          if (rec) rec.stop();
        } catch (e) {}
        stopRec();
        return;
      }
      networkRetryCount = 0;
      // Permission preflight: getUserMedia triggers the prompt reliably on
      // Windows Chrome/Edge where SpeechRecognition alone sometimes doesn't.
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
          stream.getTracks().forEach(function (t) { t.stop(); });
          startRecognition();
        }).catch(function (err) {
          var msgs = getMsgs();
          if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) showVoiceError(msgs.denied);
          else if (err && err.name === "NotFoundError") showVoiceError(msgs.noMic);
          else showVoiceError(msgs.generic);
        });
      } else {
        startRecognition();
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && listening) {
        manualStop = true;
        try { if (rec) rec.stop(); } catch (e) {}
        stopRec();
      }
    });
  }

  // ── Strings ─────────────────────────────────────────────────

  function populateStrings() {
    var s = cfg.strings || {};
    setText("la-pdf-btn", s.pdfButton);
    setText("la-share-btn", s.shareButton);
    setText("la-paywall-title", s.paywallTitle);
    setText("la-paywall-text", s.paywallText);
    setText("la-paywall-buy", s.paywallBuy);
    setText("la-paywall-loading", s.paywallLoading);
    setText("la-paywall-app-link", s.paywallAppLink);
    setText("la-paid-toast-text", s.paidToast);
    setText("la-retry", s.newAnalysisBtn || s.retryButton);
    setText("la-limit-hint", s.limitHint);
    setText("la-cta-btn", s.ctaButton || "App herunterladen ▸");
  }

  function setText(id, val) {
    if (!val) return;
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Mode (input tabs) ─────────────────────────────────────────

  function setActiveMode(modeId) {
    activeMode = modeId;
    document.querySelectorAll(".la-mode-tab").forEach(function (tab) {
      var on = tab.dataset.mode === modeId;
      tab.classList.toggle("la-mode-tab--active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      if (on) {
        var m = getModeObj(modeId);
        if (m) {
          tab.style.background = hexToRgba(m.color, 0.25);
          tab.style.borderColor = hexToRgba(m.color, 0.5);
          tab.style.color = "#fff";
        }
      } else {
        tab.style.background = "";
        tab.style.borderColor = "";
        tab.style.color = "";
      }
    });
  }

  function getModeObj(id) {
    if (!cfg || !cfg.modes) return null;
    for (var i = 0; i < cfg.modes.length; i++)
      if (cfg.modes[i].id === id) return cfg.modes[i];
    return null;
  }

  // ── Credits ──────────────────────────────────────────────────

  function canAnalyze() {
    return !isFreeUsed() || hasPaidCredit();
  }
  function isFreeUsed() {
    try {
      var raw = localStorage.getItem(FREE_USED_KEY);
      if (!raw) return false;
      if (raw === "1") return false; // migrate old permanent flag → treat as expired
      var data = JSON.parse(raw);
      if (!data || !data.ts) return false;
      return Date.now() - data.ts < 24 * 60 * 60 * 1000;
    } catch (e) {
      return false;
    }
  }
  function hasPaidCredit() {
    try {
      return localStorage.getItem(PAID_CREDIT_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function consumeCredit() {
    try {
      if (hasPaidCredit()) localStorage.removeItem(PAID_CREDIT_KEY);
      else localStorage.setItem(FREE_USED_KEY, JSON.stringify({ ts: Date.now() }));
    } catch (e) {}
  }

  function grantPaidCredit() {
    try {
      localStorage.setItem(PAID_CREDIT_KEY, "1");
    } catch (e) {}
  }

  function applyAnalysisUI() {
    var s = cfg.strings || {};
    var submitBtn = document.getElementById("la-submit");
    var limitHint = document.getElementById("la-limit-hint");
    var textarea = document.getElementById("la-textarea");

    if (!canAnalyze()) {
      if (submitBtn) {
        var ta = document.getElementById("la-textarea");
        submitBtn.disabled = !(ta && ta.value.trim().length >= 30);
      }
      if (limitHint) {
        limitHint.textContent = s.limitBuy || "Weitere Analyse kaufen 2,99 €";
        limitHint.style.cursor = "pointer";
        limitHint.style.color = "rgba(1,191,255,0.9)";
        limitHint.onclick = showPaywall;
      }
    } else {
      if (submitBtn && textarea)
        submitBtn.disabled =
          !textarea.value || textarea.value.trim().length < 30;
      if (limitHint) {
        limitHint.textContent = s.limitHint || "1 kostenlose Analyse";
        limitHint.style.cursor = "";
        limitHint.style.color = "";
        limitHint.onclick = null;
      }
    }
  }

  function updateSubmitState(text) {
    var s = (cfg && cfg.strings) || {};
    var submitBtn = document.getElementById("la-submit");
    if (!submitBtn) return;
    var hasSession = !!(
      dreamSession.activeTab && dreamSession.analyses[dreamSession.activeTab]
    );
    var hasText = !!(text && text.trim().length >= 30);

    if (hasSession && !hasText) {
      submitBtn.disabled = false;
      submitBtn.dataset.laMode = "show-results";
      submitBtn.textContent =
        s.showResultsBtn ||
        getLangDefault(
          "↩ Ergebnis anzeigen",
          "↩ Show Results",
          "↩ Ver Resultados",
          "↩ Voir Résultats",
          "↩ Показать Результат",
        );
    } else {
      submitBtn.dataset.laMode = "analyze";
      submitBtn.textContent =
        s.submitIdle ||
        getLangDefault(
          "Analyse",
          "Analyse",
          "Análisis",
          "Analyse",
          "Анализ",
        );
      submitBtn.disabled = !hasText;
    }
  }

  // ── Submit / API ─────────────────────────────────────────────

  function handleSubmit() {
    var submitBtn = document.getElementById("la-submit");
    if (submitBtn && submitBtn.dataset.laMode === "show-results") {
      reopenDreamScreen();
      return;
    }
    var textarea = document.getElementById("la-textarea");
    if (!textarea) return;
    var dreamText = textarea.value.trim();
    if (dreamText.length < 30) return;
    if (!canAnalyze()) {
      showPaywall();
      return;
    }
    if (!cfg || !cfg.endpoint) return;

    var analysisType = activeMode || (cfg.modes && cfg.modes[0] ? cfg.modes[0].id : "general");

    if (window.ethyriaHasConsent && !window.ethyriaHasConsent()) {
      window.ethyriaShowConsentPopup(cfg.lang || "de").then(function (accepted) {
        if (accepted) runPreflight(dreamText, analysisType);
      });
      return;
    }

    runPreflight(dreamText, analysisType);
  }

  function runAnalysis(dreamText, analysisType, associationContext) {
    showPhase("LOADING");
    if (window.ethyriaTrack) {
      window.ethyriaTrack("Demo Started", { mode: analysisType });
    }

    // Generate a stable dream_id for this session so all mode analyses share it
    dreamSession.dreamId = "website-" + getVisitorId() + "-" + Date.now();
    dreamSession.associationContext = associationContext || null;

    var lang = cfg.lang || "de";
    var dreamData = buildDreamData(dreamText, selectedMood, lang);
    var body = JSON.stringify({
      user_id: "website-" + getVisitorId(),
      dream_id: dreamSession.dreamId,
      dream_text: dreamText,
      analysis_type: analysisType,
      user_name: getStoredUserName(),
      lang: lang,
      bio_context: null,
      association_context: associationContext || null,
      dream_data: dreamData,
    });

    abortController =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    var opts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (cfg.demoKey || ""),
      },
      body: body,
    };
    if (abortController) opts.signal = abortController.signal;

    fetch(cfg.endpoint, opts)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || data.success === false)
          throw new Error(data && data.message ? data.message : "error");
        consumeCredit();
        if (window.ethyriaTrack) {
          var dreamLen =
            dreamText.length < 200
              ? "short"
              : dreamText.length < 600
                ? "medium"
                : "long";
          window.ethyriaTrack("Demo Completed", {
            mode: analysisType,
            dream_length: dreamLen,
          });
        }
        showPhase("IDLE");
        openDreamScreen(dreamText, analysisType, data);
        applyAnalysisUI();
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") return;
        showPhase("IDLE");
        showError(
          (cfg.strings && cfg.strings.errorGeneral) ||
            "Fehler bei der Analyse.",
        );
      });
  }

  function handleCancel() {
    if (abortController) {
      try {
        abortController.abort();
      } catch (e) {}
      abortController = null;
    }
    showPhase("IDLE");
    applyAnalysisUI();
  }

  // ── Phase 1: Preflight ───────────────────────────────────────

  function runPreflight(dreamText, analysisType) {
    showPhase("LOADING");

    var preflightUrl = cfg.endpoint
      ? cfg.endpoint.replace("/analyze-dream-specific", "/analyze-preflight")
      : null;

    if (!preflightUrl) {
      runAnalysis(dreamText, analysisType, null);
      return;
    }

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl
      ? setTimeout(function () {
          try { ctrl.abort(); } catch (e) {}
        }, 14000)
      : null;

    fetch(preflightUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (cfg.demoKey || ""),
      },
      body: JSON.stringify({
        dream_text: dreamText,
        lang: cfg.lang || "de",
        user_id: "website-" + getVisitorId(),
      }),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (pf) {
        if (!pf || !pf.success) throw new Error("preflight-empty");
        var hasQuestions =
          (pf.wake_affect_question && pf.wake_affect_question.trim()) ||
          (Array.isArray(pf.association_questions) && pf.association_questions.length > 0);
        if (!hasQuestions) {
          runAnalysis(dreamText, analysisType, null);
          return;
        }
        showPreflightPhase(dreamText, analysisType, pf);
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        runAnalysis(dreamText, analysisType, null);
      });
  }

  function showPreflightPhase(dreamText, analysisType, pf) {
    showPhase("PREFLIGHT");

    var content = document.getElementById("la-preflight-content");
    if (!content) {
      runAnalysis(dreamText, analysisType, null);
      return;
    }

    var questions = [];
    if (pf.wake_affect_question && pf.wake_affect_question.trim()) {
      questions.push({ id: "wake", symbol: "", question: pf.wake_affect_question });
    }
    if (Array.isArray(pf.association_questions)) {
      pf.association_questions.slice(0, 3).forEach(function (q, i) {
        questions.push({ id: "assoc_" + i, symbol: q.symbol || "", question: q.question || "" });
      });
    }

    var html = "";

    if (pf.ptsd_flag && pf.ptsd_note) {
      html +=
        '<div class="la-ptsd-note" role="alert"><span class="la-ptsd-note-icon" aria-hidden="true">⚠</span>' +
        escHtml(pf.ptsd_note) +
        "</div>";
    }

    html +=
      '<p class="la-preflight-intro">' +
      escHtml(
        getLangDefault(
          "Kurze Fragen helfen Ethyria, deinen Traum tiefer zu verstehen.",
          "Quick questions help Ethyria understand your dream more deeply.",
          "Preguntas breves ayudan a Ethyria a entender tu sueño más profundamente.",
          "Des questions brèves aident Ethyria à mieux comprendre ton rêve.",
          "Короткие вопросы помогут Этирии глубже понять твой сон.",
        ),
      ) +
      "</p>";

    questions.forEach(function (q) {
      html += '<div class="la-preflight-q">';
      if (q.symbol) {
        html += '<span class="la-preflight-q-symbol">' + escHtml(q.symbol) + "</span>";
      }
      html +=
        '<label class="la-preflight-q-label" for="pf-' +
        q.id +
        '">' +
        escHtml(q.question) +
        "</label>";
      html +=
        '<textarea id="pf-' +
        q.id +
        '" class="la-preflight-input" rows="2" maxlength="300" placeholder="…"></textarea>';
      html += "</div>";
    });

    html += '<div class="la-preflight-actions">';
    html +=
      '<button id="la-preflight-submit" class="glow-button la-submit">' +
      escHtml(
        getLangDefault(
          "Analyse starten",
          "Start Analysis",
          "Iniciar Análisis",
          "Lancer l’Analyse",
          "Начать Анализ",
        ),
      ) +
      "</button>";
    html +=
      '<button id="la-preflight-skip" class="la-preflight-skip">' +
      escHtml(
        getLangDefault(
          "Überspringen",
          "Skip",
          "Omitir",
          "Passer",
          "Пропустить",
        ),
      ) +
      "</button>";
    html += "</div>";

    content.innerHTML = html;

    function collectAndRun(skipAnswers) {
      var assocParts = [];
      if (!skipAnswers) {
        questions.forEach(function (q) {
          var el = document.getElementById("pf-" + q.id);
          if (el && el.value.trim()) {
            assocParts.push((q.symbol ? q.symbol + ": " : "") + el.value.trim());
          }
        });
      }
      var ctx = assocParts.length ? assocParts.join("\n") : null;
      runAnalysis(dreamText, analysisType, ctx);
    }

    var submitBtn = document.getElementById("la-preflight-submit");
    var skipBtn = document.getElementById("la-preflight-skip");
    if (submitBtn) submitBtn.addEventListener("click", function () { collectAndRun(false); });
    if (skipBtn) skipBtn.addEventListener("click", function () { collectAndRun(true); });
  }

  function showPhase(newState) {
    state = newState;
    var inputPhase = document.getElementById("la-input-phase");
    var loadingPhase = document.getElementById("la-loading-phase");
    var preflightPhase = document.getElementById("la-preflight-phase");
    var errorPhase = document.getElementById("la-error-phase");
    if (inputPhase) inputPhase.hidden = newState !== "IDLE";
    if (loadingPhase) loadingPhase.hidden = newState !== "LOADING";
    if (preflightPhase) preflightPhase.hidden = newState !== "PREFLIGHT";
    if (errorPhase) errorPhase.hidden = true;
    if (newState === "LOADING") startPhaseRotation();
    else stopPhaseRotation();
  }

  function startPhaseRotation() {
    phaseIdx = 0;
    var el = document.getElementById("la-phase-text");
    var texts = cfg && cfg.phaseTexts ? cfg.phaseTexts : [];
    if (!el || !texts.length) return;
    el.textContent = texts[0];
    phaseTimer = setInterval(function () {
      phaseIdx = (phaseIdx + 1) % texts.length;
      el.style.opacity = "0";
      setTimeout(function () {
        el.textContent = texts[phaseIdx];
        el.style.opacity = "";
      }, 300);
    }, 4000);
  }

  function stopPhaseRotation() {
    if (phaseTimer) {
      clearInterval(phaseTimer);
      phaseTimer = null;
    }
  }

  function showError(msg) {
    var errEl = document.getElementById("la-error-phase");
    if (errEl) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }
  }

  // ── Dream Detail Screen ──────────────────────────────────────

  function openDreamScreen(dreamText, firstModeId, firstData) {
    dreamSession.dreamText = dreamText;
    dreamSession.creditUsed = true;
    dreamSession.analyses = {};
    dreamSession.activeTab = firstModeId;
    dreamSession.analyses[firstModeId] = firstData;
    saveDreamSession();

    buildTabBar();

    var screen = document.getElementById("la-dream-screen");
    if (!screen) return;
    _focusTrapReturn = document.activeElement;
    screen.hidden = false;
    document.body.style.overflow = "hidden";
    trapFocus(screen);

    renderActivePanel(firstModeId);
  }

  function closeDreamScreen() {
    var screen = document.getElementById("la-dream-screen");
    if (!screen) return;
    screen.hidden = true;
    document.body.style.overflow = "";
    releaseFocus(screen);

    // Clear DOM but keep dreamSession analyses so the button can re-open
    var tabsEl = document.getElementById("la-dream-tabs");
    var panelsEl = document.getElementById("la-dream-panels");
    if (tabsEl) tabsEl.innerHTML = "";
    if (panelsEl) panelsEl.innerHTML = "";

    var textarea = document.getElementById("la-textarea");
    var charCount = document.getElementById("la-char-count");
    if (textarea) textarea.value = "";
    if (charCount) charCount.textContent = "0 / 2000";

    // Show "Ergebnis anzeigen" if session has results
    updateSubmitState("");
  }

  function reopenDreamScreen() {
    if (
      !dreamSession.activeTab ||
      !dreamSession.analyses[dreamSession.activeTab]
    )
      return;
    buildTabBar();
    var screen = document.getElementById("la-dream-screen");
    if (!screen) return;
    screen.hidden = false;
    document.body.style.overflow = "hidden";
    renderActivePanel(dreamSession.activeTab);
  }

  function buildTabBar() {
    var tabsEl = document.getElementById("la-dream-tabs");
    if (!tabsEl || !cfg.modes) return;
    tabsEl.innerHTML = "";

    cfg.modes.forEach(function (mode) {
      var btn = document.createElement("button");
      btn.className = "la-dream-tab";
      btn.dataset.mode = mode.id;
      btn.setAttribute("role", "tab");
      btn.innerHTML =
        '<span class="la-dream-tab-icon">' +
        escHtml(mode.icon) +
        "</span>" +
        '<span class="la-dream-tab-label">' +
        escHtml(mode.label) +
        "</span>";
      btn.addEventListener("click", function () {
        switchTab(mode.id);
      });
      tabsEl.appendChild(btn);
    });

    updateTabStyles(dreamSession.activeTab);
  }

  function updateTabStyles(activeModeId) {
    var tabsEl = document.getElementById("la-dream-tabs");
    if (!tabsEl) return;
    tabsEl.querySelectorAll(".la-dream-tab").forEach(function (btn) {
      var mode = getModeObj(btn.dataset.mode);
      var on = btn.dataset.mode === activeModeId;
      btn.classList.toggle("la-dream-tab--active", on);
      btn.classList.toggle(
        "la-dream-tab--done",
        !on && !!dreamSession.analyses[btn.dataset.mode],
      );
      if (on && mode) {
        btn.style.color = mode.color;
        btn.style.borderBottomColor = mode.color;
      } else {
        btn.style.color = "";
        btn.style.borderBottomColor = "";
      }
    });
  }

  function switchTab(modeId) {
    if (dreamSession.activeTab === modeId) return;
    dreamSession.activeTab = modeId;
    updateTabStyles(modeId);
    renderActivePanel(modeId);
  }

  function renderActivePanel(modeId) {
    var panelsEl = document.getElementById("la-dream-panels");
    if (!panelsEl) return;
    panelsEl.innerHTML = "";

    var panelEl = document.createElement("div");
    panelEl.className = "la-dream-panel la-panel--visible";
    panelsEl.appendChild(panelEl);

    var data = dreamSession.analyses[modeId];
    if (data) {
      renderPanelContent(panelEl, data, modeId);
    } else {
      renderPanelTrigger(panelEl, modeId);
    }
  }

  function renderPanelTrigger(panelEl, modeId) {
    var mode = getModeObj(modeId);
    if (!mode) return;
    var s = cfg.strings || {};
    var label = s.tabAnalyzeBtn
      ? s.tabAnalyzeBtn.replace("{mode}", mode.label)
      : getLangDefault(
          "Mit " + mode.label + " analysieren",
          "Analyze with " + mode.label,
          "Analizar con " + mode.label,
          "Analyser avec " + mode.label,
          "Анализ: " + mode.label,
        );

    panelEl.innerHTML =
      '<div class="la-panel-trigger">' +
      '<div class="la-panel-trigger-icon">' +
      escHtml(mode.icon) +
      "</div>" +
      '<p class="la-panel-trigger-label" style="color:' +
      mode.color +
      '">' +
      escHtml(mode.label) +
      "</p>" +
      '<button class="la-panel-analyze-btn glow-button">' +
      escHtml(mode.icon) +
      " " +
      escHtml(label) +
      "</button>" +
      "</div>";

    panelEl
      .querySelector(".la-panel-analyze-btn")
      .addEventListener("click", function () {
        analyzeTab(modeId, panelEl);
      });
  }

  function analyzeTab(modeId, panelEl) {
    var texts = (cfg && cfg.phaseTexts) || [];
    var cancelLabel = getLangDefault(
      "Abbrechen",
      "Cancel",
      "Cancelar",
      "Annuler",
      "Отменить",
    );
    var tabPhaseIdx = 0;
    var tabPhaseTimer = null;
    var tabAbort =
      typeof AbortController !== "undefined" ? new AbortController() : null;

    panelEl.innerHTML =
      '<div class="la-panel-loading">' +
      '<div class="la-waves" aria-hidden="true">' +
      '<div class="la-wave-bar"></div><div class="la-wave-bar"></div><div class="la-wave-bar"></div>' +
      '<div class="la-wave-bar"></div><div class="la-wave-bar"></div><div class="la-wave-bar"></div>' +
      '<div class="la-wave-bar"></div>' +
      "</div>" +
      '<p class="la-phase-text la-panel-phase-text la-tab-phase-text">' +
      escHtml(
        texts[0] ||
          getLangDefault(
            "Analyse läuft…",
            "Analyzing…",
            "Analizando…",
            "Analyse en cours…",
            "Анализ…",
          ),
      ) +
      "</p>" +
      '<button class="la-cancel">' +
      escHtml(cancelLabel) +
      "</button>" +
      "</div>";

    if (texts.length > 1) {
      tabPhaseTimer = setInterval(function () {
        tabPhaseIdx = (tabPhaseIdx + 1) % texts.length;
        var el = panelEl.querySelector(".la-tab-phase-text");
        if (!el) {
          clearInterval(tabPhaseTimer);
          return;
        }
        el.style.opacity = "0";
        setTimeout(function () {
          if (el.parentNode) {
            el.textContent = texts[tabPhaseIdx];
            el.style.opacity = "";
          }
        }, 300);
      }, 4000);
    }

    var cancelBtn = panelEl.querySelector(".la-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        clearInterval(tabPhaseTimer);
        if (tabAbort)
          try {
            tabAbort.abort();
          } catch (e) {}
        renderPanelTrigger(panelEl, modeId);
      });
    }

    fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (cfg.demoKey || ""),
      },
      body: JSON.stringify({
        user_id: "website-" + getVisitorId(),
        dream_id: dreamSession.dreamId || "website-" + getVisitorId(),
        dream_text: dreamSession.dreamText,
        analysis_type: modeId,
        user_name: getStoredUserName(),
        lang: cfg.lang || "de",
        bio_context: null,
        association_context: dreamSession.associationContext || null,
        dream_data: buildDreamData(
          dreamSession.dreamText,
          selectedMood,
          cfg.lang || "de",
        ),
      }),
      signal: tabAbort ? tabAbort.signal : undefined,
    })
      .then(function (res) {
        clearInterval(tabPhaseTimer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || data.success === false)
          throw new Error(data && data.message ? data.message : "error");
        dreamSession.analyses[modeId] = data;
        saveDreamSession();
        updateTabStyles(dreamSession.activeTab);
        panelEl.classList.remove("la-panel--visible");
        void panelEl.offsetWidth;
        panelEl.classList.add("la-panel--visible");
        panelEl.innerHTML = "";
        renderPanelContent(panelEl, data, modeId);
      })
      .catch(function (err) {
        clearInterval(tabPhaseTimer);
        if (err && err.name === "AbortError") return;
        panelEl.innerHTML =
          '<div class="la-panel-trigger">' +
          '<p class="la-panel-error">' +
          escHtml(
            (cfg.strings && cfg.strings.errorGeneral) ||
              "Fehler. Bitte versuche es erneut.",
          ) +
          "</p>" +
          '<button class="la-panel-analyze-btn glow-button">' +
          escHtml(
            getLangDefault(
              "Erneut versuchen",
              "Retry",
              "Reintentar",
              "Réessayer",
              "Повторить",
            ),
          ) +
          "</button>" +
          "</div>";
        panelEl
          .querySelector(".la-panel-analyze-btn")
          .addEventListener("click", function () {
            analyzeTab(modeId, panelEl);
          });
      });
  }

  function renderPanelContent(panelEl, data, modeId) {
    var modeObj = getModeObj(modeId);
    var s = cfg.strings || {};
    var modeColor = modeObj && modeObj.color ? modeObj.color : "#3184FF";

    // Title
    var titleEl = document.createElement("div");
    titleEl.className = "la-result-title";
    titleEl.textContent = data.title || "";
    titleEl.style.color = modeColor;
    panelEl.appendChild(titleEl);

    // Mood
    if (data.mood) {
      var moodEl = document.createElement("div");
      moodEl.className = "la-result-mood";
      moodEl.textContent = data.mood;
      panelEl.appendChild(moodEl);
    }

    // Core insight glass card
    var insightText = data.core_insight || data.coreInsight || "";
    if (insightText) {
      var insightCard = document.createElement("div");
      insightCard.className = "la-glass-card";
      var insightEl = document.createElement("p");
      insightEl.className = "la-core-insight-text";
      insightEl.textContent = "\u201C" + insightText + "\u201D";
      insightEl.style.color = modeColor;
      insightCard.appendChild(insightEl);
      panelEl.appendChild(insightCard);
    }

    // Analysis text
    var analysisText = data.analysis || "";
    if (analysisText) {
      var analysisEl = document.createElement("p");
      analysisEl.className = "la-analysis-text";
      analysisEl.textContent = analysisText;
      panelEl.appendChild(analysisEl);
    }

    // Dynamic sections
    var sectionsWrap = document.createElement("div");
    sectionsWrap.className = "la-sections-wrap";
    buildStructuralTypeSection(sectionsWrap, data, s);
    buildAtmosphereSection(sectionsWrap, data, s);
    buildEmotionalEchoSection(sectionsWrap, data, s);
    buildTextSection(sectionsWrap, {
      color: "#F97316",
      icon: "🔥",
      title:
        s.sectionEmotionalKern ||
        getLangDefault(
          "Emotionaler Kern",
          "Emotional Core",
          "Núcleo Emocional",
          "Noyau Émotionnel",
          "Эмоциональный Стержень",
        ),
      text: data.emotional_kern || data.emotionalKern,
    });
    buildTraumIchSection(sectionsWrap, data, s);
    buildDramaticSection(sectionsWrap, data, s);
    buildSymbolSection(sectionsWrap, data, s);
    buildSymbolAlternativesSection(sectionsWrap, data, s);
    buildEvidencedHypothesesSection(sectionsWrap, data, s);
    buildHypothesenSection(sectionsWrap, data, s);
    buildTextSection(sectionsWrap, {
      color: "#C026D3",
      icon: "⚖️",
      title:
        s.sectionKompensation ||
        getLangDefault(
          "Kompensation",
          "Compensation",
          "Compensación",
          "Compensation",
          "Компенсация",
        ),
      text: data.compensation_note || data.compensationNote,
    });
    buildIntegrationSection(sectionsWrap, data, s);
    if (data.creative_integration || data.creativeIntegration) {
      buildTextSection(sectionsWrap, {
        color: "#84CC16",
        icon: "🎨",
        title: getLangDefault(
          "Kreative Integration",
          "Creative Integration",
          "Integración Creativa",
          "Intégration Créative",
          "Творческая Интеграция",
        ),
        text: data.creative_integration || data.creativeIntegration,
      });
    }
    buildAetherTagsSection(sectionsWrap, data, s);
    if (sectionsWrap.children.length > 0) panelEl.appendChild(sectionsWrap);

    // Action step
    var actionText = data.action_step || data.actionStep || "";
    if (actionText) {
      var actionCard = document.createElement("div");
      actionCard.className = "la-section-card";
      actionCard.style.borderColor = "rgba(245,158,11,0.22)";
      var actionHeader = document.createElement("div");
      actionHeader.className = "la-section-header";
      actionHeader.style.color = "#F59E0B";
      actionHeader.textContent =
        s.actionLabel ||
        getLangDefault(
          "💡 Dein 24h Experiment",
          "💡 Your 24h Experiment",
          "💡 Tu Experimento 24h",
          "💡 Ton Expérience 24h",
          "💡 Твой Эксперимент 24ч",
        );
      var actionTextEl = document.createElement("p");
      actionTextEl.className = "la-section-text";
      actionTextEl.textContent = actionText;
      actionCard.appendChild(actionHeader);
      actionCard.appendChild(actionTextEl);
      panelEl.appendChild(actionCard);
    }

    // Confidence badge
    var conf = (
      data.methodological_confidence ||
      data.methodologicalConfidence ||
      ""
    ).toLowerCase();
    if (conf) {
      var confWrap = document.createElement("div");
      confWrap.className = "la-confidence";
      var confBadge = document.createElement("span");
      confBadge.className = "la-confidence-badge la-confidence-badge--" + conf;
      var confMap = {
        hoch: "✓ Hohe Evidenz",
        mittel: "◎ Mittlere Evidenz",
        niedrig: "◇ Niedrige Evidenz",
        high: "✓ High Evidence",
        medium: "◎ Medium Evidence",
        low: "◇ Low Evidence",
        alta: "✓ Alta Evidencia",
        moyenne: "◎ Preuve Moyenne",
        высокая: "✓ Высокая Достоверность",
      };
      confBadge.textContent = confMap[conf] || conf;
      confWrap.appendChild(confBadge);
      panelEl.appendChild(confWrap);
    }

    // Dream text glass card (bottom)
    if (dreamSession.dreamText) {
      var dreamCard = document.createElement("div");
      dreamCard.className = "la-glass-card";
      var dreamHeader = document.createElement("div");
      dreamHeader.className = "la-dream-text-header";
      dreamHeader.textContent =
        s.dreamTextLabel ||
        getLangDefault(
          "Dein Traum",
          "Your Dream",
          "Tu Sueño",
          "Ton Rêve",
          "Твой Сон",
        );
      var dreamContent = document.createElement("p");
      dreamContent.className = "la-dream-text-content";
      dreamContent.textContent = dreamSession.dreamText;
      dreamCard.appendChild(dreamHeader);
      dreamCard.appendChild(dreamContent);

      var symbols = data.symbols || [];
      if (symbols.length) {
        var symbolsWrap = document.createElement("div");
        symbolsWrap.className = "la-symbols-wrap";
        symbols.forEach(function (sym) {
          var chip = document.createElement("span");
          chip.className = "la-symbol-chip";
          chip.textContent = sym.name || sym.symbol || "";
          if (sym.meaning) chip.title = sym.meaning;
          symbolsWrap.appendChild(chip);
        });
        dreamCard.appendChild(symbolsWrap);
      }
      panelEl.appendChild(dreamCard);
    }
  }

  // ── Section Builders ─────────────────────────────────────────

  function getLangDefault(de, en, es, fr, ru) {
    var lang = cfg && cfg.lang ? cfg.lang : "de";
    if (lang === "en") return en;
    if (lang === "es") return es;
    if (lang === "fr") return fr;
    if (lang === "ru") return ru;
    return de;
  }

  function buildTextSection(wrap, opts) {
    if (!opts.text) return;
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(opts.color, 0.22);
    card.innerHTML =
      '<div class="la-section-header" style="color:' +
      opts.color +
      '">' +
      (opts.icon ? opts.icon + " " : "") +
      escHtml(opts.title) +
      "</div>" +
      '<p class="la-section-text">' +
      escHtml(opts.text) +
      "</p>";
    wrap.appendChild(card);
  }

  function buildEmotionalEchoSection(wrap, data, s) {
    var echo = data.emotional_echo || data.emotionalEcho;
    var coreEmotions = data.core_emotions || data.coreEmotions;
    var hasObject =
      echo &&
      typeof echo === "object" &&
      !Array.isArray(echo) &&
      (echo.segments ||
        echo.stress_peak ||
        echo.resilience ||
        echo.overall_arc);
    var arrayEmotions = Array.isArray(echo)
      ? echo
      : !hasObject && Array.isArray(coreEmotions)
        ? coreEmotions
        : null;
    if (!hasObject && (!arrayEmotions || !arrayEmotions.length)) return;

    var color = "#38BDF8";
    var title =
      s.sectionEmotionalEcho ||
      getLangDefault(
        "Emotionaler Nachhall",
        "Emotional Echo",
        "Eco Emocional",
        "Écho Émotionnel",
        "Эмоциональный Отклик",
      );
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">🌊 ' +
      escHtml(title) +
      "</div>";

    if (hasObject) {
      var segments = Array.isArray(echo.segments) ? echo.segments : [];
      var peak = echo.stress_peak || echo.stressPeak;
      var peakIdx =
        peak && peak.segment_index != null
          ? peak.segment_index
          : peak && peak.segmentIndex != null
            ? peak.segmentIndex
            : -1;
      var resilience = echo.resilience;
      var overallArc = echo.overall_arc || echo.overallArc;

      if (segments.length) {
        html += '<div class="la-echo-segments">';
        segments.forEach(function (seg, idx) {
          var load = Number(
            seg.emotional_load != null ? seg.emotional_load : seg.emotionalLoad,
          );
          if (isNaN(load)) load = 0;
          var pct = Math.min(100, Math.max(0, load * 10));
          var isPeak = idx === peakIdx;
          var phase = seg.phase || "";
          var emo = seg.dominant_emotion || seg.dominantEmotion || "";
          html +=
            '<div class="la-echo-segment' +
            (isPeak ? " la-echo-segment--peak" : "") +
            '">' +
            '<div class="la-echo-segment-head">' +
            '<span class="la-echo-segment-label">' +
            escHtml(seg.label || "") +
            "</span>" +
            (emo
              ? '<span class="la-echo-segment-emotion">' +
                escHtml(emo) +
                "</span>"
              : "") +
            "</div>" +
            '<div class="la-echo-bar"><div class="la-echo-bar-fill" style="width:' +
            pct +
            "%;background:" +
            color +
            '"></div></div>' +
            (phase
              ? '<span class="la-echo-segment-phase">' +
                escHtml(phase) +
                "</span>"
              : "") +
            "</div>";
        });
        html += "</div>";
      }

      var metaParts = [];
      if (peak && peak.label) {
        var peakLbl = getLangDefault(
          "Stress-Peak",
          "Stress Peak",
          "Pico de Estrés",
          "Pic de Stress",
          "Пик Стресса",
        );
        metaParts.push(
          '<span class="la-echo-meta"><strong>' +
            escHtml(peakLbl) +
            ":</strong> " +
            escHtml(peak.label) +
            "</span>",
        );
      }
      if (resilience && (resilience.type || resilience.description)) {
        var resLbl = getLangDefault(
          "Resilienz",
          "Resilience",
          "Resiliencia",
          "Résilience",
          "Устойчивость",
        );
        metaParts.push(
          '<span class="la-echo-meta"><strong>' +
            escHtml(resLbl) +
            ":</strong> " +
            escHtml(resilience.description || resilience.type) +
            "</span>",
        );
      }
      if (overallArc) {
        var arcLbl = getLangDefault("Verlauf", "Arc", "Arco", "Arc", "Дуга");
        var arcMap = {
          ascending: getLangDefault(
            "aufsteigend",
            "ascending",
            "ascendente",
            "ascendant",
            "восходящий",
          ),
          descending: getLangDefault(
            "absteigend",
            "descending",
            "descendente",
            "descendant",
            "нисходящий",
          ),
          peak_and_release: getLangDefault(
            "Peak & Entladung",
            "peak & release",
            "pico y descarga",
            "pic et libération",
            "пик и разрядка",
          ),
          plateau: getLangDefault(
            "Plateau",
            "plateau",
            "meseta",
            "plateau",
            "плато",
          ),
          volatile: getLangDefault(
            "schwankend",
            "volatile",
            "volátil",
            "volatile",
            "изменчивый",
          ),
        };
        metaParts.push(
          '<span class="la-echo-meta"><strong>' +
            escHtml(arcLbl) +
            ":</strong> " +
            escHtml(arcMap[overallArc] || overallArc) +
            "</span>",
        );
      }
      if (metaParts.length)
        html +=
          '<div class="la-echo-meta-wrap">' + metaParts.join("") + "</div>";
    } else {
      html += '<div class="la-emotion-chips">';
      arrayEmotions.forEach(function (em) {
        html +=
          '<span class="la-emotion-chip">' +
          escHtml(
            typeof em === "string" ? em : em.emotion || em.name || String(em),
          ) +
          "</span>";
      });
      html += "</div>";
    }

    card.innerHTML = html;
    wrap.appendChild(card);
  }

  function buildTraumIchSection(wrap, data, s) {
    var egoRole = data.dream_ego_role || data.dreamEgoRole;
    var agency =
      data.agency_score != null
        ? data.agency_score
        : data.agencyScore != null
          ? data.agencyScore
          : null;
    if (!egoRole && agency == null) return;
    var color = "#EAB308";
    var title =
      s.sectionTraumIch ||
      getLangDefault(
        "Traum Ich",
        "Dream Ego",
        "Yo del Sueño",
        "Moi du Rêve",
        "Сновидческое Я",
      );
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">👤 ' +
      escHtml(title) +
      "</div>";
    if (egoRole)
      html += '<p class="la-section-text">' + escHtml(egoRole) + "</p>";
    if (agency != null) {
      var agLabel =
        s.agencyScore ||
        getLangDefault(
          "Handlungsfähigkeit",
          "Agency",
          "Agencia",
          "Agentivité",
          "Активность",
        );
      var agNum = Number(agency);
      if (isNaN(agNum)) agNum = 0;
      var agPct = agNum <= 10 ? agNum * 10 : agNum;
      agPct = Math.min(100, Math.max(0, agPct));
      html +=
        '<div class="la-agency-bar-wrap">' +
        '<div class="la-agency-bar-label"><span>' +
        escHtml(agLabel) +
        '</span><span style="color:' +
        color +
        '">' +
        (agNum <= 10 ? agNum + " / 10" : agPct + " %") +
        "</span></div>" +
        '<div class="la-agency-bar"><div class="la-agency-bar-fill" style="width:' +
        agPct +
        "%;background:" +
        color +
        '"></div></div>' +
        "</div>";
    }
    card.innerHTML = html;
    wrap.appendChild(card);
  }

  function buildDramaticSection(wrap, data, s) {
    var expo = data.dramatic_exposition || data.dramaticExposition;
    var conflict =
      data.dramatic_development ||
      data.dramaticDevelopment ||
      data.dramatic_conflict ||
      data.dramaticConflict;
    var climax =
      data.dramatic_crisis ||
      data.dramaticCrisis ||
      data.dramatic_climax ||
      data.dramaticClimax ||
      data.dramatic_peaklevel ||
      data.dramaticPeaklevel;
    var resolution = data.dramatic_resolution || data.dramaticResolution;
    if (!expo && !conflict && !climax && !resolution) return;
    var color = "#D97706";
    var title =
      s.sectionDramatik ||
      getLangDefault(
        "Dramatische Struktur",
        "Dramatic Structure",
        "Estructura Dramática",
        "Structure Dramatique",
        "Драматическая Структура",
      );
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var steps = [
      {
        label:
          s.dramaticExpo ||
          getLangDefault(
            "Exposition",
            "Exposition",
            "Exposición",
            "Exposition",
            "Экспозиция",
          ),
        text: expo,
      },
      {
        label:
          s.dramaticConflict ||
          getLangDefault(
            "Konflikt",
            "Conflict",
            "Conflicto",
            "Conflit",
            "Конфликт",
          ),
        text: conflict,
      },
      {
        label:
          s.dramaticClimax ||
          getLangDefault(
            "Höhepunkt",
            "Climax",
            "Clímax",
            "Climax",
            "Кульминация",
          ),
        text: climax,
      },
      {
        label:
          s.dramaticResolution ||
          getLangDefault(
            "Auflösung",
            "Resolution",
            "Resolución",
            "Résolution",
            "Развязка",
          ),
        text: resolution,
      },
    ];
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">🎭 ' +
      escHtml(title) +
      '</div><div class="la-dramatic-steps">';
    var num = 1;
    steps.forEach(function (step) {
      if (!step.text) return;
      html +=
        '<div class="la-dramatic-step">' +
        '<span class="la-dramatic-step-num" style="background:' +
        hexToRgba(color, 0.18) +
        ";color:" +
        color +
        '">' +
        num++ +
        "</span>" +
        '<div class="la-dramatic-step-body"><div class="la-dramatic-step-label" style="color:' +
        color +
        '">' +
        escHtml(step.label) +
        "</div>" +
        '<p class="la-dramatic-step-text">' +
        escHtml(step.text) +
        "</p></div></div>";
    });
    card.innerHTML = html + "</div>";
    wrap.appendChild(card);
  }

  function buildSymbolSection(wrap, data, s) {
    var symbols = data.symbols || [];
    var hasDetail = symbols.some(function (sym) {
      return sym.meaning || sym.interpretation;
    });
    if (!symbols.length || !hasDetail) return;
    var color = "#5458FB";
    var title =
      s.symbolsLabel ||
      getLangDefault(
        "Symbol-Analyse",
        "Symbol Analysis",
        "Análisis de Símbolos",
        "Analyse des Symboles",
        "Анализ Символов",
      );
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">⬡ ' +
      escHtml(title) +
      '</div><div class="la-symbol-list">';
    symbols.forEach(function (sym) {
      var name = sym.name || sym.symbol || "";
      var meaning = sym.meaning || sym.interpretation || "";
      if (!name) return;
      html +=
        '<div class="la-symbol-item"><span class="la-symbol-chip">' +
        escHtml(name) +
        "</span>";
      if (meaning)
        html += '<p class="la-symbol-meaning">' + escHtml(meaning) + "</p>";
      html += "</div>";
    });
    card.innerHTML = html + "</div>";
    wrap.appendChild(card);
  }

  function buildHypothesenSection(wrap, data, s) {
    var evidenced = data.evidenced_hypotheses || data.evidencedHypotheses;
    if (evidenced && evidenced.length) return;
    var hypotheses = data.hypotheses || [];
    var color = "#DC2626";
    var title =
      s.sectionHypothesen ||
      getLangDefault(
        "Hypothesen",
        "Hypotheses",
        "Hipótesis",
        "Hypothèses",
        "Гипотезы",
      );
    var items = hypotheses;
    if (!items.length) return;
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">💭 ' +
      escHtml(title) +
      '</div><div class="la-hyp-list">';
    var useEvidenced = !!(evidenced && evidenced.length);
    items.forEach(function (hyp) {
      var text =
        typeof hyp === "string"
          ? hyp
          : hyp.text || hyp.hypothesis || String(hyp);
      var ev =
        useEvidenced && typeof hyp === "object" && hyp
          ? String(hyp.evidence || hyp.confidence || "")
          : "";
      html +=
        '<div class="la-hyp-item"><p class="la-hyp-text">' +
        escHtml(text) +
        "</p>";
      if (ev)
        html +=
          '<span class="la-evidence-badge la-evidence-' +
          ev.toLowerCase() +
          '">' +
          escHtml(ev) +
          "</span>";
      html += "</div>";
    });
    card.innerHTML = html + "</div>";
    wrap.appendChild(card);
  }

  function buildIntegrationSection(wrap, data, s) {
    var questions = data.integration_questions || data.integrationQuestions;
    if (!questions || !questions.length) return;
    var color = "#65A30D";
    var title =
      s.sectionIntegration ||
      getLangDefault(
        "Integration",
        "Integration",
        "Integración",
        "Intégration",
        "Интеграция",
      );
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">✨ ' +
      escHtml(title) +
      '</div><div class="la-integration-list">';
    questions.forEach(function (q) {
      html +=
        '<div class="la-integration-item"><span class="la-integration-bullet" style="color:' +
        color +
        '">›</span>' +
        "<p>" +
        escHtml(typeof q === "string" ? q : String(q)) +
        "</p></div>";
    });
    card.innerHTML = html + "</div>";
    wrap.appendChild(card);
  }

  // ── Structural Type Section ──────────────────────────────────
  function buildStructuralTypeSection(wrap, data, s) {
    var type = data.structural_type || data.structuralType;
    if (!type) return;
    var color = "#0EA5E9";
    var title =
      s.sectionStructural ||
      getLangDefault(
        "Traumstruktur",
        "Dream Structure",
        "Estructura del Sueño",
        "Structure du Rêve",
        "Структура Сна",
      );
    var typeMap = {
      Bedrohungstraum: getLangDefault(
        "Bedrohungstraum",
        "Threat Dream",
        "Sueño de Amenaza",
        "Rêve de Menace",
        "Сон-Угроза",
      ),
      Leistungstraum: getLangDefault(
        "Leistungstraum",
        "Performance Dream",
        "Sueño de Rendimiento",
        "Rêve de Performance",
        "Сон Достижения",
      ),
      Mobilitätstraum: getLangDefault(
        "Mobilitätstraum",
        "Mobility Dream",
        "Sueño de Movilidad",
        "Rêve de Mobilité",
        "Сон Передвижения",
      ),
      "Sozialer Interaktionstraum": getLangDefault(
        "Sozialer Interaktionstraum",
        "Social Interaction Dream",
        "Sueño de Interacción Social",
        "Rêve d'Interaction Sociale",
        "Сон Социального Взаимодействия",
      ),
      Autonomietraum: getLangDefault(
        "Autonomietraum",
        "Autonomy Dream",
        "Sueño de Autonomía",
        "Rêve d'Autonomie",
        "Сон Автономии",
      ),
    };
    var label = typeMap[type] || type;
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    card.innerHTML =
      '<div class="la-section-header" style="color:' +
      color +
      '">🧭 ' +
      escHtml(title) +
      "</div>" +
      '<div class="la-structural-badge" style="background:' +
      hexToRgba(color, 0.16) +
      ";color:" +
      color +
      ";border-color:" +
      hexToRgba(color, 0.4) +
      '">' +
      escHtml(label) +
      "</div>";
    wrap.appendChild(card);
  }

  // ── Atmosphere Section ───────────────────────────────────────
  function buildAtmosphereSection(wrap, data, s) {
    var primary = data.atmosphere_primary || data.atmospherePrimary;
    var secondary = data.atmosphere_secondary || data.atmosphereSecondary;
    var primInt =
      data.atmosphere_primary_intensity != null
        ? data.atmosphere_primary_intensity
        : data.atmospherePrimaryIntensity;
    var secInt =
      data.atmosphere_secondary_intensity != null
        ? data.atmosphere_secondary_intensity
        : data.atmosphereSecondaryIntensity;
    if (!primary && !secondary) return;
    var color = "#A855F7";
    var title =
      s.sectionAtmosphere ||
      getLangDefault(
        "Atmosphäre",
        "Atmosphere",
        "Atmósfera",
        "Atmosphère",
        "Атмосфера",
      );
    var atmMap = {
      mystisch: {
        emo: "🌌",
        label: getLangDefault(
          "Mystisch",
          "Mystical",
          "Místico",
          "Mystique",
          "Мистический",
        ),
      },
      beklemmend: {
        emo: "😰",
        label: getLangDefault(
          "Beklemmend",
          "Oppressive",
          "Opresivo",
          "Oppressant",
          "Гнетущий",
        ),
      },
      melancholisch: {
        emo: "🌧️",
        label: getLangDefault(
          "Melancholisch",
          "Melancholic",
          "Melancólico",
          "Mélancolique",
          "Меланхоличный",
        ),
      },
      euphorisch: {
        emo: "✨",
        label: getLangDefault(
          "Euphorisch",
          "Euphoric",
          "Eufórico",
          "Euphorique",
          "Эйфоричный",
        ),
      },
      getrieben: {
        emo: "⏱️",
        label: getLangDefault(
          "Getrieben",
          "Driven",
          "Impulsado",
          "Poussé",
          "Гонимый",
        ),
      },
      friedvoll: {
        emo: "🕊️",
        label: getLangDefault(
          "Friedvoll",
          "Peaceful",
          "Apacible",
          "Paisible",
          "Мирный",
        ),
      },
      bedrohlich: {
        emo: "🌑",
        label: getLangDefault(
          "Bedrohlich",
          "Threatening",
          "Amenazante",
          "Menaçant",
          "Угрожающий",
        ),
      },
      absurd: {
        emo: "🎭",
        label: getLangDefault(
          "Absurd",
          "Absurd",
          "Absurdo",
          "Absurde",
          "Абсурдный",
        ),
      },
      nuechtern: {
        emo: "📋",
        label: getLangDefault(
          "Nüchtern",
          "Sober",
          "Sobrio",
          "Sobre",
          "Трезвый",
        ),
      },
      einsam: {
        emo: "🏝️",
        label: getLangDefault(
          "Einsam",
          "Lonely",
          "Solitario",
          "Solitaire",
          "Одинокий",
        ),
      },
      aggressiv: {
        emo: "⚡",
        label: getLangDefault(
          "Aggressiv",
          "Aggressive",
          "Agresivo",
          "Agressif",
          "Агрессивный",
        ),
      },
      offenbarend: {
        emo: "💡",
        label: getLangDefault(
          "Offenbarend",
          "Revelatory",
          "Revelador",
          "Révélateur",
          "Откровенный",
        ),
      },
    };

    function renderAtm(key, intensity, isSecondary) {
      var entry = atmMap[String(key).toLowerCase()] || { emo: "•", label: key };
      var raw = Number(intensity);
      if (isNaN(raw)) raw = 0;
      var maxScale = raw > 5 ? 10 : 5;
      var pct = Math.min(100, Math.max(0, (raw / maxScale) * 100));
      return (
        '<div class="la-atm-row' +
        (isSecondary ? " la-atm-row--sec" : "") +
        '">' +
        '<div class="la-atm-head">' +
        '<span class="la-atm-emo">' +
        entry.emo +
        "</span>" +
        '<span class="la-atm-label">' +
        escHtml(entry.label) +
        "</span>" +
        (raw
          ? '<span class="la-atm-intensity">' +
            raw +
            " / " +
            maxScale +
            "</span>"
          : "") +
        "</div>" +
        (raw
          ? '<div class="la-atm-bar"><div class="la-atm-bar-fill" style="width:' +
            pct +
            "%;background:" +
            color +
            '"></div></div>'
          : "") +
        "</div>"
      );
    }

    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">🌫 ' +
      escHtml(title) +
      "</div>" +
      '<div class="la-atm-wrap">';
    if (primary) html += renderAtm(primary, primInt, false);
    if (secondary) html += renderAtm(secondary, secInt, true);
    html += "</div>";
    card.innerHTML = html;
    wrap.appendChild(card);
  }

  // ── Aether Tags Section ──────────────────────────────────────
  function buildAetherTagsSection(wrap, data, s) {
    var tags = data.aether_tags || data.aetherTags;
    if (!tags || !tags.length) return;
    var color = "#22D3EE";
    var title =
      s.sectionAether ||
      getLangDefault(
        "Aether-Tags",
        "Aether Tags",
        "Etiquetas Aether",
        "Tags Aether",
        "Эфир-Теги",
      );
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">⟁ ' +
      escHtml(title) +
      "</div>" +
      '<div class="la-aether-chips">';
    tags.forEach(function (tag) {
      var txt =
        typeof tag === "string" ? tag : tag.name || tag.tag || String(tag);
      html +=
        '<span class="la-aether-chip" style="border-color:' +
        hexToRgba(color, 0.45) +
        ";color:" +
        color +
        '">' +
        escHtml(txt) +
        "</span>";
    });
    html += "</div>";
    card.innerHTML = html;
    wrap.appendChild(card);
  }

  // ── Symbol Alternatives Section ──────────────────────────────
  function buildSymbolAlternativesSection(wrap, data, s) {
    var alts = data.symbol_alternatives || data.symbolAlternatives;
    if (!alts || !alts.length) return;
    var color = "#8B5CF6";
    var title =
      s.sectionSymbolAlt ||
      getLangDefault(
        "Alternative Deutungen",
        "Alternative Interpretations",
        "Interpretaciones Alternativas",
        "Interprétations Alternatives",
        "Альтернативные Толкования",
      );
    var primaryLbl = getLangDefault(
      "Wahrscheinlichste Deutung",
      "Most likely",
      "Más probable",
      "Plus probable",
      "Наиболее вероятно",
    );
    var altLbl = getLangDefault(
      "Alternativen",
      "Alternatives",
      "Alternativas",
      "Alternatives",
      "Альтернативы",
    );
    var anchorLbl = getLangDefault(
      "Textstelle",
      "Text anchor",
      "Cita textual",
      "Citation",
      "Цитата",
    );
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">⟐ ' +
      escHtml(title) +
      "</div>" +
      '<div class="la-symalt-list">';
    alts.forEach(function (a) {
      var symName = a.symbol || a.name || "";
      var prim = a.primary || "";
      var altList = Array.isArray(a.alternatives) ? a.alternatives : [];
      var ev = (a.evidence || "").toLowerCase();
      var anchor = a.text_anchor || a.textAnchor || "";
      if (!symName) return;
      html += '<div class="la-symalt-item">';
      html +=
        '<div class="la-symalt-head"><span class="la-symbol-chip">' +
        escHtml(symName) +
        "</span>";
      if (ev)
        html +=
          '<span class="la-evidence-badge la-evidence-' +
          escHtml(ev) +
          '">' +
          escHtml(ev) +
          "</span>";
      html += "</div>";
      if (prim)
        html +=
          '<p class="la-symalt-primary"><strong>' +
          escHtml(primaryLbl) +
          ":</strong> " +
          escHtml(prim) +
          "</p>";
      if (altList.length) {
        html +=
          '<div class="la-symalt-alts"><strong>' +
          escHtml(altLbl) +
          ":</strong><ul>";
        altList.forEach(function (alt) {
          html += "<li>" + escHtml(alt) + "</li>";
        });
        html += "</ul></div>";
      }
      if (anchor)
        html +=
          '<blockquote class="la-symalt-anchor"><span class="la-symalt-anchor-label">' +
          escHtml(anchorLbl) +
          ':</span> "' +
          escHtml(anchor) +
          '"</blockquote>';
      html += "</div>";
    });
    html += "</div>";
    card.innerHTML = html;
    wrap.appendChild(card);
  }

  // ── Evidenced Hypotheses Section (replaces old hypothesen for evidenced case) ──
  function buildEvidencedHypothesesSection(wrap, data, s) {
    var evidenced = data.evidenced_hypotheses || data.evidencedHypotheses;
    if (!evidenced || !evidenced.length) return;
    var color = "#DC2626";
    var title =
      s.sectionHypothesen ||
      getLangDefault(
        "Hypothesen",
        "Hypotheses",
        "Hipótesis",
        "Hypothèses",
        "Гипотезы",
      );
    var anchorLbl = getLangDefault(
      "Beleg im Traumtext",
      "Evidence in dream text",
      "Evidencia en el texto",
      "Preuve dans le texte",
      "Подтверждение в тексте",
    );
    var card = document.createElement("div");
    card.className = "la-section-card";
    card.style.borderColor = hexToRgba(color, 0.22);
    var html =
      '<div class="la-section-header" style="color:' +
      color +
      '">💭 ' +
      escHtml(title) +
      "</div>" +
      '<div class="la-hyp-list">';
    evidenced.forEach(function (hyp) {
      var text = hyp.text || hyp.hypothesis || "";
      var ev = (hyp.evidence || hyp.confidence || "").toLowerCase();
      var anchor = hyp.text_anchor || hyp.textAnchor || "";
      html +=
        '<div class="la-hyp-item">' +
        '<p class="la-hyp-text">' +
        escHtml(text) +
        "</p>";
      if (ev)
        html +=
          '<span class="la-evidence-badge la-evidence-' +
          escHtml(ev) +
          '">' +
          escHtml(ev) +
          "</span>";
      if (anchor)
        html +=
          '<blockquote class="la-hyp-anchor"><span class="la-hyp-anchor-label">' +
          escHtml(anchorLbl) +
          ':</span> "' +
          escHtml(anchor) +
          '"</blockquote>';
      html += "</div>";
    });
    html += "</div>";
    card.innerHTML = html;
    wrap.appendChild(card);
  }

  function escHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ── Paywall ──────────────────────────────────────────────────

  function showPaywall() {
    var pw = document.getElementById("la-paywall");
    if (!pw) return;
    if (window.ethyriaTrack) {
      window.ethyriaTrack("Demo Blocked", {});
    }
    _focusTrapReturn = document.activeElement;
    pw.hidden = false;
    document.body.style.overflow = "hidden";
    trapFocus(pw);
  }

  function closePaywall() {
    var pw = document.getElementById("la-paywall");
    if (!pw) return;
    pw.hidden = true;
    document.body.style.overflow = "";
    releaseFocus(pw);
  }

  function handleBuyAnalysis() {
    if (!cfg || !cfg.checkoutEndpoint) return;
    var textarea = document.getElementById("la-textarea");
    var dreamText = (textarea && textarea.value.trim()) || "";
    var analysisType =
      activeMode || (cfg.modes && cfg.modes[0] ? cfg.modes[0].id : "general");
    savePendingAnalysis(dreamText, analysisType);

    var buyBtn = document.getElementById("la-paywall-buy");
    var loadingEl = document.getElementById("la-paywall-loading");
    if (buyBtn) buyBtn.hidden = true;
    if (loadingEl) loadingEl.hidden = false;

    fetch(cfg.checkoutEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        lang: cfg.lang || "de",
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else throw new Error("No checkout URL");
      })
      .catch(function () {
        if (buyBtn) buyBtn.hidden = false;
        if (loadingEl) loadingEl.hidden = true;
        // Show error inside the paywall card (visible to user)
        var errEl = document.getElementById("la-paywall-loading");
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent =
            (cfg.strings && cfg.strings.errorGeneral) ||
            "Fehler. Bitte versuche es erneut.";
          errEl.style.color = "#f87171";
          setTimeout(function () {
            errEl.hidden = true;
            errEl.style.color = "";
            errEl.textContent =
              (cfg.strings && cfg.strings.paywallLoading) ||
              "Weiterleitung zu Stripe\u2026";
          }, 4000);
        }
      });
  }

  // ── Dream session persistence ────────────────────────────────

  function saveDreamSession() {
    try {
      if (!dreamSession.dreamText) return;
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          dreamText: dreamSession.dreamText,
          dreamId: dreamSession.dreamId,
          analyses: dreamSession.analyses,
          activeTab: dreamSession.activeTab,
          ts: Date.now(),
        }),
      );
    } catch (e) {}
  }

  function loadDreamSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!saved || !saved.dreamText) return false;
      if (Date.now() - (saved.ts || 0) > SESSION_TTL) {
        localStorage.removeItem(SESSION_KEY);
        return false;
      }
      dreamSession.dreamText = saved.dreamText;
      dreamSession.dreamId = saved.dreamId || "";
      dreamSession.analyses = saved.analyses || {};
      dreamSession.activeTab =
        saved.activeTab ||
        (cfg && cfg.modes && cfg.modes[0] ? cfg.modes[0].id : "general");
      dreamSession.creditUsed = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── Pending analysis (Stripe redirect) ───────────────────────

  function savePendingAnalysis(text, mode) {
    try {
      localStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          text: text,
          mode: mode,
          lang: cfg.lang || "de",
          exp: Date.now() + PENDING_TTL,
        }),
      );
    } catch (e) {}
  }

  function loadPendingAnalysis() {
    try {
      var raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || obj.exp < Date.now()) {
        localStorage.removeItem(PENDING_KEY);
        return null;
      }
      return obj;
    } catch (e) {
      return null;
    }
  }

  function clearPendingAnalysis() {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch (e) {}
  }

  function checkPendingPayment() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("la_paid") !== "1") return;
    var sessionId = params.get("session_id");
    try {
      history.replaceState({}, "", window.location.pathname);
    } catch (e) {}

    if (!sessionId || !cfg.verifyEndpoint) {
      grantPaidCredit();
      runPendingIfAvailable();
      return;
    }

    fetch(cfg.verifyEndpoint + "?session_id=" + encodeURIComponent(sessionId))
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        grantPaidCredit();
        if (data && data.success) showPaidToast();
        runPendingIfAvailable();
      })
      .catch(function () {
        grantPaidCredit();
        runPendingIfAvailable();
      });
  }

  function runPendingIfAvailable() {
    var pending = loadPendingAnalysis();
    if (!pending) return;
    clearPendingAnalysis();
    setTimeout(function () {
      applyAnalysisUI();
      runAnalysis(pending.text, pending.mode);
    }, 800);
  }

  function showPaidToast() {
    var toast = document.getElementById("la-paid-toast");
    if (!toast) return;
    toast.hidden = false;
    setTimeout(function () {
      toast.classList.add("la-paid-toast--hide");
      setTimeout(function () {
        toast.hidden = true;
        toast.classList.remove("la-paid-toast--hide");
      }, 600);
    }, 3200);
  }

  // ── PDF ──────────────────────────────────────────────────────

  function downloadPdf() {
    var data = dreamSession.analyses[dreamSession.activeTab];
    if (!data) return;
    if (window.ethyriaTrack) {
      window.ethyriaTrack("PDF Downloaded", { mode: dreamSession.activeTab });
    }
    var btn = document.getElementById("la-pdf-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "…";
    }
    function restore() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = (cfg.strings && cfg.strings.pdfButton) || "📄 PDF";
      }
    }

    var pending = 0;
    var logoDataUrl = null;
    function loaded() {
      if (--pending === 0) buildDreamPdf(data, restore, logoDataUrl);
    }
    function addScript(url) {
      pending++;
      var el = document.createElement("script");
      el.src = url;
      el.onload = loaded;
      el.onerror = function () {
        restore();
      };
      document.head.appendChild(el);
    }

    // Pre-load logo image as data URL (non-fatal if it fails)
    pending++;
    var logoEl = new Image();
    logoEl.crossOrigin = "anonymous";
    logoEl.onload = function () {
      var c = document.createElement("canvas");
      c.width = logoEl.naturalWidth;
      c.height = logoEl.naturalHeight;
      c.getContext("2d").drawImage(logoEl, 0, 0);
      try {
        logoDataUrl = c.toDataURL("image/png");
      } catch (ex) {
        logoDataUrl = null;
      }
      loaded();
    };
    logoEl.onerror = function () {
      loaded();
    };
    logoEl.src = "assets/Ethyria_new.png";

    if (!window.html2canvas)
      addScript(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      );
    if (!window.jspdf && !window.jsPDF)
      addScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      );
    if (pending === 0) buildDreamPdf(data, restore, logoDataUrl);
  }

  function buildDreamPdf(data, onDone, logoDataUrl) {
    var JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!JsPDF || !window.html2canvas) {
      if (onDone) onDone();
      return;
    }

    var modeId = dreamSession.activeTab || "general";
    var modeObj = getModeObj(modeId);
    var s = cfg.strings || {};
    var modeColor = modeObj && modeObj.color ? modeObj.color : "#3184FF";
    var modeLabel = modeObj
      ? (
          (modeObj.icon || "") +
          " " +
          (modeObj.label || modeObj.name || modeId)
        ).trim()
      : modeId;

    // Build HTML template (browser renders emoji + unicode correctly)
    var container = document.createElement("div");
    container.style.cssText =
      "position:fixed;left:-9999px;top:0;width:794px;background:#ffffff;z-index:-9999";
    container.innerHTML = buildPdfHtml(
      data,
      modeColor,
      modeLabel,
      s,
      logoDataUrl,
    );
    document.body.appendChild(container);

    window
      .html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
      })
      .then(function (canvas) {
        document.body.removeChild(container);

        var JsPDF2 = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        var doc = new JsPDF2({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        var pageW = 210;
        var pageH = 297;
        var MARGIN = 20; // 2 cm — DIN A4 standard
        var footerH = 12; // footer strip within bottom margin
        var contentMaxH = pageH - 2 * MARGIN; // 257 mm usable content height

        // ── Smart page breaks: find nearest whitespace row near each cut ──
        var pxPerPage = Math.round((canvas.width * contentMaxH) / pageW);
        var tolerance = Math.round(pxPerPage * 0.12); // ~12 % slack
        // MIN_BLANK: require ≥20 consecutive blank canvas-rows (~10 px at 2× scale).
        // Prevents cutting inside a section header (small 3-6 px gaps are ignored).
        // The 40 px padding-top in secD() produces ≥80 blank rows — always qualifies.
        var MIN_BLANK = 20;

        function findSafeCutY(srcCanvas, targetY) {
          var ctx2 = srcCanvas.getContext("2d");
          var from = Math.max(0, targetY - tolerance);
          var to = Math.min(
            srcCanvas.height,
            targetY + Math.round(tolerance * 0.3),
          );
          var stripH = to - from;
          if (stripH <= 0) return targetY;
          var px = ctx2.getImageData(0, from, srcCanvas.width, stripH).data;
          var w = srcCanvas.width;

          function rowBlank(r) {
            for (var x = 0; x < w; x += 8) {
              if (px[(r * w + x) * 4] < 238) return false;
            }
            return true;
          }

          // Phase 1: scan backward from targetY.
          // Require MIN_BLANK consecutive blank rows so small in-section gaps are skipped.
          // Returns the bottom row of the qualifying blank zone.
          var relTarget = Math.min(stripH - 1, targetY - from);
          var run = 0;
          for (var r = relTarget; r >= 0; r--) {
            if (rowBlank(r)) {
              run++;
              if (run >= MIN_BLANK) return from + r + MIN_BLANK - 1;
            } else {
              run = 0;
            }
          }

          // Phase 2: fallback — any single blank row after targetY
          for (var r2 = relTarget + 1; r2 < stripH; r2++) {
            if (rowBlank(r2)) return from + r2;
          }

          return targetY; // last resort: mechanical cut
        }

        // Pre-compute all cut points
        var cutPoints = [0];
        var cur = 0;
        while (cur < canvas.height) {
          var nextCut = cur + pxPerPage;
          if (nextCut >= canvas.height) break;
          var safe = findSafeCutY(canvas, nextCut);
          if (safe <= cur) safe = cur + pxPerPage; // guard against infinite loop
          cutPoints.push(safe);
          cur = safe;
        }
        cutPoints.push(canvas.height);
        var totalPages = cutPoints.length - 1;

        for (var i = 0; i < totalPages; i++) {
          if (i > 0) doc.addPage();

          var startY = cutPoints[i];
          var sliceH = cutPoints[i + 1] - startY;
          var renderedH = Math.min(
            contentMaxH,
            (sliceH * pageW) / canvas.width,
          ); // mm

          var sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          var ctx = sliceCanvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, sliceH);
          ctx.drawImage(
            canvas,
            0,
            startY,
            canvas.width,
            sliceH,
            0,
            0,
            canvas.width,
            sliceH,
          );

          doc.addImage(
            sliceCanvas.toDataURL("image/jpeg", 0.93),
            "JPEG",
            0,
            MARGIN,
            pageW,
            renderedH,
          );

          // Footer — centered in bottom margin (2 cm)
          var footerY = pageH - MARGIN + 3;
          doc.setFillColor(248, 250, 252);
          doc.rect(0, pageH - MARGIN, pageW, MARGIN, "F");
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(
            MARGIN,
            pageH - MARGIN + 1,
            pageW - MARGIN,
            pageH - MARGIN + 1,
          );
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          var footerBrandL = getLangDefault(
            "Ethyria \u00b7 Traumanalyse mit KI",
            "Ethyria \u00b7 AI Dream Analysis",
            "Ethyria \u00b7 An\u00e1lisis de Sue\u00f1os con IA",
            "Ethyria \u00b7 Analyse de R\u00eaves par IA",
            "Ethyria \u00b7 \u0410\u043d\u0430\u043b\u0438\u0437 \u0441\u043d\u043e\u0432 \u0441 \u0418\u0418",
          );
          doc.text(footerBrandL, MARGIN, footerY + 6);
          doc.text("ethyria.app", pageW / 2, footerY + 6, { align: "center" });
          doc.text(i + 1 + " / " + totalPages, pageW - MARGIN, footerY + 6, {
            align: "right",
          });
        }

        var ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        doc.save("ethyria_dream_" + modeId + "_" + ts + ".pdf");
        if (onDone) onDone();
      })
      .catch(function (err) {
        console.error("PDF render error:", err);
        document.body.removeChild(container);
        if (onDone) onDone();
      });
  }

  function buildPdfHtml(data, modeColor, modeLabel, s, logoDataUrl) {
    var e = escHtml;
    var now = new Date();
    var lang = cfg.lang || "de";
    var dStr = now.toLocaleDateString(lang, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    var F =
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

    // ── Professional light-theme business-report palette ─────────
    var BG = "#FFFFFF";
    var BG2 = "#F8FAFC";
    var BG3 = "#F1F5F9";
    var TXT = "#1E293B";
    var MUTED = "#64748B";
    var BORD = "#E2E8F0";
    // Legacy aliases kept so downstream code compiles without change
    // ── Derived accent tints ─────────────────────────────────────
    var ABGL = hexToRgba(modeColor, 0.07); // ultra-light accent fill
    var ABGM = hexToRgba(modeColor, 0.18); // medium accent fill

    var h = "";
    h +=
      '<div style="' +
      F +
      ";background:" +
      BG +
      ";color:" +
      TXT +
      ';padding:0;width:794px;hyphens:none;-webkit-hyphens:none;overflow-wrap:break-word">';

    // ── Top accent stripe ──────────────────────────────────────
    h +=
      '<div style="height:5px;background:' + modeColor + ';width:100%"></div>';

    // ── Header ────────────────────────────────────────────────
    h += '<div style="padding:28px 48px 20px;background:' + BG + '">';
    h +=
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
    h += "<div>";
    if (logoDataUrl) {
      h +=
        '<img src="' +
        logoDataUrl +
        '" style="height:36px;width:auto;border-radius:8px;display:block;margin-bottom:5px" alt="Ethyria">';
    } else {
      h +=
        '<div style="font-size:9px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:' +
        modeColor +
        ';margin-bottom:5px">ETHYRIA</div>';
    }
    var reportTitleL = getLangDefault(
      "Traumanalyse Report",
      "Dream Analysis Report",
      "Informe de Análisis de Sueños",
      "Rapport d'Analyse de Rêve",
      "Отчёт о Толковании Сна",
    );
    h +=
      '<div style="font-size:24px;font-weight:800;color:' +
      TXT +
      ';line-height:1.2;margin-bottom:5px">' +
      e(reportTitleL) +
      "</div>";
    h +=
      '<div style="font-size:11px;color:' + MUTED + '">' + e(dStr) + "</div>";
    h += "</div>";
    h +=
      '<div style="background:' +
      BG3 +
      ";border:1px solid " +
      BORD +
      ';border-radius:8px;padding:10px 18px;text-align:right">';
    var modeHeaderL = getLangDefault(
      "Analyse-Modus",
      "Analysis Mode",
      "Modo de Análisis",
      "Mode d'Analyse",
      "Режим Анализа",
    );
    h +=
      '<div style="font-size:9px;font-weight:700;color:' +
      MUTED +
      ';text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">' +
      e(modeHeaderL) +
      "</div>";
    h +=
      '<div style="font-size:13px;font-weight:700;color:' +
      TXT +
      '">' +
      e(modeLabel) +
      "</div>";
    h += "</div>";
    h += "</div></div>";

    // ── Divider ────────────────────────────────────────────────
    h += '<div style="height:1px;background:' + BORD + ';margin:0 48px"></div>';

    // ── Content ───────────────────────────────────────────────
    h += '<div style="padding:24px 48px 36px">';

    // Dream title
    h +=
      '<h1 style="font-size:20px;font-weight:800;color:' +
      TXT +
      ';margin:0 0 14px;line-height:1.3">' +
      e(data.title || "") +
      "</h1>";

    // Metrics row
    var symbols = data.symbols || [];
    var rawEmotions =
      data.emotional_echo ||
      data.emotionalEcho ||
      data.core_emotions ||
      data.coreEmotions ||
      [];
    var moodChips = rawEmotions.length
      ? rawEmotions.map(function (em) {
          return typeof em === "string"
            ? em
            : em.emotion || em.name || String(em);
        })
      : data.mood
        ? data.mood
            .split(/[,;·•|\/\n]+/)
            .map(function (m) {
              return m.trim();
            })
            .filter(Boolean)
        : [];
    var wordCount = dreamSession.dreamText
      ? dreamSession.dreamText.trim().split(/\s+/).filter(Boolean).length
      : 0;
    var confRaw = (
      data.methodological_confidence ||
      data.methodologicalConfidence ||
      ""
    ).toLowerCase();
    var agScore =
      data.agency_score != null
        ? data.agency_score
        : data.agencyScore != null
          ? data.agencyScore
          : null;
    var cLabelsM = {
      hoch: "Hoch",
      high: "High",
      alta: "Alta",
      mittel: "Mittel",
      medium: "Medium",
      moyenne: "Moy.",
      niedrig: "Niedrig",
      low: "Low",
    };
    var metrics = [];
    if (wordCount)
      metrics.push({
        label: getLangDefault("Wörter", "Words", "Palabras", "Mots", "Слова"),
        value: String(wordCount),
      });
    if (symbols.length)
      metrics.push({
        label: getLangDefault(
          "Symbole",
          "Symbols",
          "Símbolos",
          "Symboles",
          "Символы",
        ),
        value: String(symbols.length),
      });
    if (agScore != null)
      metrics.push({
        label: getLangDefault(
          "Aktivität",
          "Agency",
          "Agencia",
          "Agentivité",
          "Активность",
        ),
        value: agScore + "/10",
      });
    if (confRaw)
      metrics.push({
        label: getLangDefault(
          "Evidenz",
          "Evidence",
          "Evidencia",
          "Evidence",
          "Достоверность",
        ),
        value: cLabelsM[confRaw] || confRaw,
      });
    if (metrics.length) {
      h +=
        '<div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">';
      metrics.forEach(function (m) {
        h +=
          '<div style="background:' +
          BG3 +
          ";border:1px solid " +
          BORD +
          ';border-radius:8px;padding:10px 16px;min-width:72px">';
        h +=
          '<div style="font-size:9px;color:' +
          MUTED +
          ';margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">' +
          e(m.label) +
          "</div>";
        h +=
          '<div style="font-size:20px;font-weight:800;color:' +
          TXT +
          '">' +
          e(m.value) +
          "</div>";
        h += "</div>";
      });
      h += "</div>";
    }

    // ── Section helper ─────────────────────────────────────────
    // icon + ALL-CAPS label + hairline + content (+ optional left accent border)
    function secD(icon, label, color, content, leftBorderColor) {
      if (!content) return "";
      var c = color || modeColor;
      var o = '<div style="margin-bottom:22px;padding-top:40px">';
      o +=
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">';
      if (icon)
        o += '<span style="font-size:13px;line-height:1">' + icon + "</span>";
      o +=
        '<span style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:' +
        c +
        '">' +
        e(label) +
        "</span>";
      o += "</div>";
      o +=
        '<div style="height:1px;background:' +
        BORD +
        ';margin-bottom:10px"></div>';
      if (leftBorderColor) {
        o +=
          '<div style="border-left:3px solid ' +
          leftBorderColor +
          ';padding-left:14px">';
        o += content;
        o += "</div>";
      } else {
        o += content;
      }
      o += "</div>";
      return o;
    }

    function bulD(text) {
      return (
        '<p style="font-size:12px;color:' +
        TXT +
        ';line-height:1.5;margin:0 0 5px">\u2022\u00a0' +
        e(text) +
        "</p>"
      );
    }
    function numD(text, n) {
      return (
        '<p style="font-size:12px;color:' +
        TXT +
        ';line-height:1.5;margin:0 0 8px"><strong style="color:' +
        modeColor +
        ';font-weight:700">' +
        n +
        ".</strong>\u00a0" +
        e(text) +
        "</p>"
      );
    }
    function plainD(text) {
      return (
        '<p style="font-size:12px;color:' +
        TXT +
        ';line-height:1.5;margin:0">' +
        e(text) +
        "</p>"
      );
    }

    // ── Analysis (left accent border, light tint background) ───
    if (data.analysis) {
      var anlLabel =
        modeLabel.replace(/^\S+\s*/, "") ||
        getLangDefault("Allgemein", "General", "General", "Général", "Общий");
      var anlContent =
        '<div style="background:' +
        ABGL +
        ";border-left:4px solid " +
        modeColor +
        ';border-radius:0 6px 6px 0;padding:14px 16px">';
      anlContent +=
        '<p style="font-size:12px;color:' +
        TXT +
        ';line-height:1.5;margin:0">' +
        e(data.analysis) +
        "</p>";
      anlContent += "</div>";
      h += secD("", anlLabel.toUpperCase(), modeColor, anlContent);
    }

    // ── Core insight ──────────────────────────────────────────────
    var insight = data.core_insight || data.coreInsight || "";
    if (insight) {
      var ciLabel =
        s.coreInsightLabel ||
        getLangDefault(
          "Kerneinsicht",
          "Core Insight",
          "Perspectiva Central",
          "Insight Central",
          "Ключевая Мысль",
        );
      var ciContent =
        '<div style="background:' +
        ABGL +
        ";border:1px solid " +
        hexToRgba(modeColor, 0.25) +
        ";border-left:4px solid " +
        modeColor +
        ';border-radius:0 6px 6px 0;padding:14px 18px">';
      ciContent +=
        '<p style="font-size:13px;font-style:italic;color:' +
        TXT +
        ';line-height:1.5;margin:0">\u201C' +
        e(insight) +
        "\u201D</p>";
      ciContent += "</div>";
      h += secD("", ciLabel.toUpperCase(), modeColor, ciContent);
    }

    // ── 🔥 Emotionaler Kern ────────────────────────────────────────
    var emotKern = data.emotional_kern || data.emotionalKern;
    if (emotKern) {
      var ekL =
        s.sectionEmotionalKern ||
        getLangDefault(
          "Emotionaler Kern",
          "Emotional Core",
          "Núcleo Emocional",
          "Noyau Émotionnel",
          "Эмоциональный Стержень",
        );
      h += secD("🔥", ekL, "#C2410C", plainD(emotKern));
    }

    // ── 🔑 Symbole ─────────────────────────────────────────────
    if (symbols.length) {
      var symL =
        s.symbolsLabel ||
        getLangDefault(
          "Erkannte Symbole",
          "Recognized Symbols",
          "Símbolos Reconocidos",
          "Symboles Reconnus",
          "Распознанные Символы",
        );
      var symC = "";
      symbols.slice(0, 6).forEach(function (sym) {
        var name = sym.name || sym.symbol || "";
        var meaning = sym.meaning || sym.interpretation || "";
        symC += bulD(name + (meaning ? ": " + meaning : ""));
      });
      h += secD("🔑", symL, "#92400E", symC);
    }

    // ── ⟐ Symbol-Alternativen (mit Evidenz + Textankern) ──────
    var symAlts = data.symbol_alternatives || data.symbolAlternatives;
    if (symAlts && symAlts.length) {
      var saL = getLangDefault(
        "Alternative Deutungen",
        "Alternative Interpretations",
        "Interpretaciones Alternativas",
        "Interprétations Alternatives",
        "Альтернативные Толкования",
      );
      var saAcc = "#7C3AED";
      var saPrimL = getLangDefault(
        "Wahrscheinlichste Deutung",
        "Most likely",
        "Más probable",
        "Plus probable",
        "Наиболее вероятно",
      );
      var saAltL = getLangDefault(
        "Alternativen",
        "Alternatives",
        "Alternativas",
        "Alternatives",
        "Альтернативы",
      );
      var saAnchL = getLangDefault(
        "Textstelle",
        "Text anchor",
        "Cita textual",
        "Citation",
        "Цитата",
      );
      var saC = "";
      var evColorMap = {
        hoch: "#16A34A",
        high: "#16A34A",
        alta: "#16A34A",
        mittel: "#D97706",
        medium: "#D97706",
        moyenne: "#D97706",
        niedrig: "#DC2626",
        low: "#DC2626",
      };
      symAlts.forEach(function (a) {
        var symName = a.symbol || a.name || "";
        var prim = a.primary || "";
        var altList = Array.isArray(a.alternatives) ? a.alternatives : [];
        var ev = (a.evidence || "").toLowerCase();
        var anchor = a.text_anchor || a.textAnchor || "";
        if (!symName) return;
        var evCol = evColorMap[ev] || MUTED;
        saC +=
          '<div style="margin-bottom:12px;padding:10px 12px;background:' +
          hexToRgba(saAcc, 0.05) +
          ";border:1px solid " +
          hexToRgba(saAcc, 0.2) +
          ';border-radius:8px">';
        saC +=
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
        saC +=
          '<span style="font-size:12px;font-weight:700;color:' +
          saAcc +
          ";background:" +
          hexToRgba(saAcc, 0.12) +
          ";border:1px solid " +
          hexToRgba(saAcc, 0.4) +
          ';border-radius:100px;padding:3px 12px">' +
          e(symName) +
          "</span>";
        if (ev)
          saC +=
            '<span style="font-size:9px;font-weight:700;color:' +
            evCol +
            ";background:" +
            hexToRgba(evCol, 0.1) +
            ";border:1px solid " +
            hexToRgba(evCol, 0.3) +
            ';border-radius:100px;padding:2px 8px;text-transform:uppercase;letter-spacing:0.5px">' +
            e(ev) +
            "</span>";
        saC += "</div>";
        if (prim)
          saC +=
            '<p style="font-size:12px;color:' +
            TXT +
            ';line-height:1.5;margin:0 0 6px"><strong style="color:' +
            saAcc +
            '">' +
            e(saPrimL) +
            ":</strong> " +
            e(prim) +
            "</p>";
        if (altList.length) {
          saC +=
            '<div style="font-size:11.5px;color:' +
            TXT +
            ';line-height:1.5;margin-bottom:6px"><strong style="color:' +
            saAcc +
            '">' +
            e(saAltL) +
            ":</strong>";
          saC += '<ul style="margin:4px 0 0;padding-left:18px">';
          altList.forEach(function (alt) {
            saC += '<li style="margin-bottom:2px">' + e(alt) + "</li>";
          });
          saC += "</ul></div>";
        }
        if (anchor) {
          saC +=
            '<div style="margin-top:8px;padding:6px 10px;border-left:3px solid ' +
            hexToRgba(saAcc, 0.5) +
            ";background:" +
            BG2 +
            ';border-radius:0 4px 4px 0">';
          saC +=
            '<div style="font-size:8.5px;font-weight:700;color:' +
            MUTED +
            ';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">' +
            e(saAnchL) +
            "</div>";
          saC +=
            '<div style="font-size:11px;color:' +
            TXT +
            ';line-height:1.5;font-style:italic">“' +
            e(anchor) +
            "”</div>";
          saC += "</div>";
        }
        saC += "</div>";
      });
      h += secD("⟐", saL, saAcc, saC);
    }

    // ── 🎯 Empfehlungen / Integration ──────────────────────────
    var integ = data.integration || {};
    var integQ =
      integ.questions ||
      integ.fragen ||
      data.integration_questions ||
      data.integrationQuestions ||
      [];
    if (integQ.length) {
      var empfL =
        s.sectionIntegration ||
        getLangDefault(
          "Empfehlungen",
          "Recommendations",
          "Recomendaciones",
          "Recommandations",
          "Рекомендации",
        );
      var empfC = "";
      integQ.forEach(function (q, i) {
        empfC += numD(typeof q === "string" ? q : String(q), i + 1);
      });
      h += secD("🎯", empfL, "#0369A1", empfC);
    }

    // ── 🌫 Atmosphäre ──────────────────────────────────────────
    if (moodChips.length) {
      var atmoL = getLangDefault(
        "Atmosphäre",
        "Atmosphere",
        "Atmósfera",
        "Atmosphère",
        "Атмосфера",
      );
      var atmoC = "";
      if (moodChips[0]) {
        atmoC +=
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
        atmoC += '<span style="font-size:18px">&#128165;</span>';
        atmoC +=
          '<span style="font-size:15px;font-weight:700;color:' +
          TXT +
          '">' +
          e(moodChips[0]) +
          "</span>";
        atmoC += "</div>";
      }
      if (moodChips.length > 1) {
        atmoC += '<div style="display:flex;align-items:center;gap:6px">';
        atmoC += '<span style="font-size:13px">&#127761;</span>';
        atmoC +=
          '<span style="font-size:12px;color:' +
          MUTED +
          '">' +
          e(moodChips.slice(1).join(" \u00b7 ")) +
          "</span>";
        atmoC += "</div>";
      }
      // ARCHIVED — superseded by structural_type + atmosphere_primary/secondary below
      // h += secD("🌫", atmoL, "#475569", atmoC);
    }

    // ── 🧭 Traumstruktur ───────────────────────────────────────
    var structType = data.structural_type || data.structuralType;
    if (structType) {
      var stL = getLangDefault(
        "Traumstruktur",
        "Dream Structure",
        "Estructura del Sueño",
        "Structure du Rêve",
        "Структура Сна",
      );
      var stTypeMap = {
        Bedrohungstraum: getLangDefault(
          "Bedrohungstraum",
          "Threat Dream",
          "Sueño de Amenaza",
          "Rêve de Menace",
          "Сон-Угроза",
        ),
        Leistungstraum: getLangDefault(
          "Leistungstraum",
          "Performance Dream",
          "Sueño de Rendimiento",
          "Rêve de Performance",
          "Сон Достижения",
        ),
        Mobilitätstraum: getLangDefault(
          "Mobilitätstraum",
          "Mobility Dream",
          "Sueño de Movilidad",
          "Rêve de Mobilité",
          "Сон Передвижения",
        ),
        "Sozialer Interaktionstraum": getLangDefault(
          "Sozialer Interaktionstraum",
          "Social Interaction Dream",
          "Sueño de Interacción Social",
          "Rêve d'Interaction Sociale",
          "Сон Социального Взаимодействия",
        ),
        Autonomietraum: getLangDefault(
          "Autonomietraum",
          "Autonomy Dream",
          "Sueño de Autonomía",
          "Rêve d'Autonomie",
          "Сон Автономии",
        ),
      };
      var stColor = "#0EA5E9";
      var stC =
        '<span style="display:inline-block;font-size:12px;font-weight:700;color:' +
        stColor +
        ";background:" +
        hexToRgba(stColor, 0.12) +
        ";border:1px solid " +
        hexToRgba(stColor, 0.4) +
        ';border-radius:100px;padding:6px 16px">' +
        e(stTypeMap[structType] || structType) +
        "</span>";
      h += secD("🧭", stL, stColor, stC);
    }

    // ── 🌫 Atmosphäre (atmosphere_primary/secondary) ───────────
    var atmPrim = data.atmosphere_primary || data.atmospherePrimary;
    var atmSec = data.atmosphere_secondary || data.atmosphereSecondary;
    var atmPrimI =
      data.atmosphere_primary_intensity != null
        ? data.atmosphere_primary_intensity
        : data.atmospherePrimaryIntensity;
    var atmSecI =
      data.atmosphere_secondary_intensity != null
        ? data.atmosphere_secondary_intensity
        : data.atmosphereSecondaryIntensity;
    if (atmPrim || atmSec) {
      var atmL = getLangDefault(
        "Atmosphäre",
        "Atmosphere",
        "Atmósfera",
        "Atmosphère",
        "Атмосфера",
      );
      var atmMap = {
        mystisch: {
          emo: "🌌",
          label: getLangDefault(
            "Mystisch",
            "Mystical",
            "Místico",
            "Mystique",
            "Мистический",
          ),
        },
        beklemmend: {
          emo: "😰",
          label: getLangDefault(
            "Beklemmend",
            "Oppressive",
            "Opresivo",
            "Oppressant",
            "Гнетущий",
          ),
        },
        melancholisch: {
          emo: "🌧️",
          label: getLangDefault(
            "Melancholisch",
            "Melancholic",
            "Melancólico",
            "Mélancolique",
            "Меланхоличный",
          ),
        },
        euphorisch: {
          emo: "✨",
          label: getLangDefault(
            "Euphorisch",
            "Euphoric",
            "Eufórico",
            "Euphorique",
            "Эйфоричный",
          ),
        },
        getrieben: {
          emo: "⏱️",
          label: getLangDefault(
            "Getrieben",
            "Driven",
            "Impulsado",
            "Poussé",
            "Гонимый",
          ),
        },
        friedvoll: {
          emo: "🕊️",
          label: getLangDefault(
            "Friedvoll",
            "Peaceful",
            "Apacible",
            "Paisible",
            "Мирный",
          ),
        },
        bedrohlich: {
          emo: "🌑",
          label: getLangDefault(
            "Bedrohlich",
            "Threatening",
            "Amenazante",
            "Menaçant",
            "Угрожающий",
          ),
        },
        absurd: {
          emo: "🎭",
          label: getLangDefault(
            "Absurd",
            "Absurd",
            "Absurdo",
            "Absurde",
            "Абсурдный",
          ),
        },
        nuechtern: {
          emo: "📋",
          label: getLangDefault(
            "Nüchtern",
            "Sober",
            "Sobrio",
            "Sobre",
            "Трезвый",
          ),
        },
        einsam: {
          emo: "🏝️",
          label: getLangDefault(
            "Einsam",
            "Lonely",
            "Solitario",
            "Solitaire",
            "Одинокий",
          ),
        },
        aggressiv: {
          emo: "⚡",
          label: getLangDefault(
            "Aggressiv",
            "Aggressive",
            "Agresivo",
            "Agressif",
            "Агрессивный",
          ),
        },
        offenbarend: {
          emo: "💡",
          label: getLangDefault(
            "Offenbarend",
            "Revelatory",
            "Revelador",
            "Révélateur",
            "Откровенный",
          ),
        },
      };
      var atmAccent = "#475569";
      var atmRowD = function (key, intensity, isSec) {
        var entry = atmMap[String(key).toLowerCase()] || {
          emo: "•",
          label: key,
        };
        var raw = Number(intensity);
        if (isNaN(raw)) raw = 0;
        var maxScale = raw > 5 ? 10 : 5;
        var pct = Math.min(100, Math.max(0, (raw / maxScale) * 100));
        var op = isSec ? "0.75" : "1";
        var row =
          '<div style="margin-bottom:' +
          (isSec ? "0" : "10px") +
          ";opacity:" +
          op +
          '">';
        row +=
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">';
        row += '<span style="font-size:15px">' + entry.emo + "</span>";
        row +=
          '<span style="font-size:13px;font-weight:700;color:' +
          TXT +
          '">' +
          e(entry.label) +
          "</span>";
        if (raw) {
          row +=
            '<span style="margin-left:auto;font-size:10px;font-weight:700;color:' +
            MUTED +
            '">' +
            raw +
            " / " +
            maxScale +
            "</span>";
        }
        row += "</div>";
        if (raw) {
          row +=
            '<div style="height:5px;background:' +
            BG3 +
            ";border:1px solid " +
            BORD +
            ';border-radius:3px;overflow:hidden">';
          row +=
            '<div style="height:100%;width:' +
            pct +
            "%;background:" +
            atmAccent +
            ';border-radius:3px"></div></div>';
        }
        row += "</div>";
        return row;
      };
      var atmC = "";
      if (atmPrim) atmC += atmRowD(atmPrim, atmPrimI, false);
      if (atmSec) atmC += atmRowD(atmSec, atmSecI, true);
      h += secD("🌫", atmL, atmAccent, atmC);
    }

    // ── ⟁ Aether-Tags ──────────────────────────────────────────
    var aetherTags = data.aether_tags || data.aetherTags;
    if (aetherTags && aetherTags.length) {
      var aetL = getLangDefault(
        "Aether-Tags",
        "Aether Tags",
        "Etiquetas Aether",
        "Tags Aether",
        "Эфир-Теги",
      );
      var aetAcc = "#0891B2";
      var aetC = '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      aetherTags.forEach(function (tag) {
        var t =
          typeof tag === "string" ? tag : tag.name || tag.tag || String(tag);
        aetC +=
          '<span style="font-size:11px;font-weight:600;color:' +
          aetAcc +
          ";background:" +
          hexToRgba(aetAcc, 0.08) +
          ";border:1px solid " +
          hexToRgba(aetAcc, 0.4) +
          ';border-radius:100px;padding:5px 12px">' +
          e(t) +
          "</span>";
      });
      aetC += "</div>";
      h += secD("⟁", aetL, aetAcc, aetC);
    }

    // ── 🌊 Emotional-Echo Segmente / Stress-Peak / Resilienz ───
    var echoObj = data.emotional_echo || data.emotionalEcho;
    if (
      echoObj &&
      typeof echoObj === "object" &&
      !Array.isArray(echoObj) &&
      (echoObj.segments ||
        echoObj.stress_peak ||
        echoObj.resilience ||
        echoObj.overall_arc)
    ) {
      var ecL = getLangDefault(
        "Emotionaler Nachhall",
        "Emotional Echo",
        "Eco Emocional",
        "Écho Émotionnel",
        "Эмоциональный Отклик",
      );
      var ecAcc = "#0284C7";
      var ecC = "";
      var segments = Array.isArray(echoObj.segments) ? echoObj.segments : [];
      var peak = echoObj.stress_peak || echoObj.stressPeak;
      var peakIdx =
        peak && peak.segment_index != null
          ? peak.segment_index
          : peak && peak.segmentIndex != null
            ? peak.segmentIndex
            : -1;
      segments.forEach(function (seg, idx) {
        var load = Number(
          seg.emotional_load != null ? seg.emotional_load : seg.emotionalLoad,
        );
        if (isNaN(load)) load = 0;
        var pct = Math.min(100, Math.max(0, load * 10));
        var isPeak = idx === peakIdx;
        var rowBg = isPeak ? hexToRgba(ecAcc, 0.1) : "transparent";
        var rowBord = isPeak ? hexToRgba(ecAcc, 0.4) : BORD;
        var emo = seg.dominant_emotion || seg.dominantEmotion || "";
        var phase = seg.phase || "";
        ecC +=
          '<div style="margin-bottom:8px;padding:8px 10px;background:' +
          rowBg +
          ";border:1px solid " +
          rowBord +
          ';border-radius:6px">';
        ecC +=
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">';
        ecC +=
          '<span style="font-size:12px;font-weight:700;color:' +
          TXT +
          '">' +
          e(seg.label || "") +
          "</span>";
        if (emo)
          ecC +=
            '<span style="margin-left:auto;font-size:10px;font-weight:700;color:' +
            ecAcc +
            '">' +
            e(emo) +
            "</span>";
        ecC += "</div>";
        ecC +=
          '<div style="height:4px;background:' +
          BG3 +
          ';border-radius:3px;overflow:hidden">';
        ecC +=
          '<div style="height:100%;width:' +
          pct +
          "%;background:" +
          ecAcc +
          ';border-radius:3px"></div></div>';
        if (phase)
          ecC +=
            '<div style="margin-top:4px;font-size:9px;color:' +
            MUTED +
            ';text-transform:uppercase;letter-spacing:0.5px;font-style:italic">' +
            e(phase) +
            "</div>";
        ecC += "</div>";
      });
      var meta = [];
      if (peak && peak.label) {
        var peakLbl = getLangDefault(
          "Stress-Peak",
          "Stress Peak",
          "Pico de Estrés",
          "Pic de Stress",
          "Пик Стресса",
        );
        meta.push("<strong>" + e(peakLbl) + ":</strong> " + e(peak.label));
      }
      if (
        echoObj.resilience &&
        (echoObj.resilience.type || echoObj.resilience.description)
      ) {
        var resLbl = getLangDefault(
          "Resilienz",
          "Resilience",
          "Resiliencia",
          "Résilience",
          "Устойчивость",
        );
        meta.push(
          "<strong>" +
            e(resLbl) +
            ":</strong> " +
            e(echoObj.resilience.description || echoObj.resilience.type),
        );
      }
      var arc = echoObj.overall_arc || echoObj.overallArc;
      if (arc) {
        var arcLbl = getLangDefault("Verlauf", "Arc", "Arco", "Arc", "Дуга");
        var arcMap = {
          ascending: getLangDefault(
            "aufsteigend",
            "ascending",
            "ascendente",
            "ascendant",
            "восходящий",
          ),
          descending: getLangDefault(
            "absteigend",
            "descending",
            "descendente",
            "descendant",
            "нисходящий",
          ),
          peak_and_release: getLangDefault(
            "Peak & Entladung",
            "peak & release",
            "pico y descarga",
            "pic et libération",
            "пик и разрядка",
          ),
          plateau: getLangDefault(
            "Plateau",
            "plateau",
            "meseta",
            "plateau",
            "плато",
          ),
          volatile: getLangDefault(
            "schwankend",
            "volatile",
            "volátil",
            "volatile",
            "изменчивый",
          ),
        };
        meta.push(
          "<strong>" + e(arcLbl) + ":</strong> " + e(arcMap[arc] || arc),
        );
      }
      if (meta.length) {
        ecC +=
          '<div style="margin-top:10px;padding-top:8px;border-top:1px dashed ' +
          hexToRgba(ecAcc, 0.3) +
          ";font-size:11px;color:" +
          TXT +
          ';line-height:1.55">';
        ecC += meta.join("<br>");
        ecC += "</div>";
      }
      h += secD("🌊", ecL, ecAcc, ecC);
    }

    // ── 👤 Traum-Ich ───────────────────────────────────────────
    var egoRole =
      data.dream_ego_role ||
      data.dreamEgoRole ||
      (data.traum_ich && (data.traum_ich.ego_role || data.traum_ich.egoRole));
    var agVal =
      agScore != null
        ? agScore
        : (data.traum_ich &&
              (data.traum_ich.ego_agency || data.traum_ich.egoAgency)) != null
          ? data.traum_ich.ego_agency || data.traum_ich.egoAgency
          : null;
    if (egoRole || agVal != null) {
      var tiL =
        s.sectionTraumIch ||
        getLangDefault(
          "Traum Ich",
          "Dream Ego",
          "Yo del Sueño",
          "Moi du Rêve",
          "Сновидческое Я",
        );
      var tiC = "";
      if (egoRole) {
        tiC +=
          '<div style="margin-bottom:10px"><span style="font-size:11px;font-weight:600;color:' +
          modeColor +
          ";background:" +
          ABGL +
          ";border:1px solid " +
          hexToRgba(modeColor, 0.3) +
          ';border-radius:100px;padding:5px 14px">' +
          e(egoRole) +
          "</span></div>";
      }
      if (agVal != null) {
        var agLabel = getLangDefault(
          "Agency Score",
          "Agency Score",
          "Puntuación de Agencia",
          "Score d\u2019Agence",
          "Уровень Активности",
        );
        var agPct = Math.min(100, Math.max(0, Number(agVal) * 10));
        tiC +=
          '<div style="font-size:10px;color:' +
          MUTED +
          ';margin-bottom:6px">' +
          e(agLabel) +
          ': <strong style="color:' +
          TXT +
          '">' +
          agVal +
          "/10</strong></div>";
        tiC +=
          '<div style="height:6px;background:' +
          BG3 +
          ";border-radius:3px;overflow:hidden;border:1px solid " +
          BORD +
          '">';
        tiC +=
          '<div style="height:100%;width:' +
          agPct +
          "%;background:" +
          modeColor +
          ';border-radius:3px"></div></div>';
      }
      h += secD("👤", tiL, "#854D0E", tiC);
    }

    // ── 🎭 Dramatische Struktur ────────────────────────────────
    var ds = data.dramatic_structure || data.dramaticStructure;
    var dsExpo =
      (ds && ds.exposition) ||
      data.dramatic_exposition ||
      data.dramaticExposition;
    var dsEntw =
      (ds && ds.entwicklung) ||
      data.dramatic_development ||
      data.dramaticDevelopment ||
      data.dramatic_conflict ||
      data.dramaticConflict;
    var dsKrise =
      (ds && ds.krise) ||
      data.dramatic_crisis ||
      data.dramaticCrisis ||
      data.dramatic_climax ||
      data.dramaticClimax ||
      data.dramatic_peaklevel ||
      data.dramaticPeaklevel;
    var dsLoesung =
      (ds && ds.loesung) || data.dramatic_resolution || data.dramaticResolution;
    var dsSteps = [
      {
        label: getLangDefault(
          "Exposition",
          "Exposition",
          "Exposición",
          "Exposition",
          "Экспозиция",
        ),
        text: dsExpo,
      },
      {
        label: getLangDefault(
          "Entwicklung",
          "Development",
          "Desarrollo",
          "Développement",
          "Развитие",
        ),
        text: dsEntw,
      },
      {
        label: getLangDefault("Krise", "Crisis", "Crisis", "Crise", "Кризис"),
        text: dsKrise,
      },
      {
        label: getLangDefault(
          "Lösung",
          "Resolution",
          "Resolución",
          "Résolution",
          "Развязка",
        ),
        text: dsLoesung,
      },
    ];
    var dsHasAny = dsSteps.some(function (st) {
      return !!st.text;
    });
    if (dsHasAny) {
      var dsAccent = "#7C3AED";
      var dsL = getLangDefault(
        "Dramatische Struktur",
        "Dramatic Structure",
        "Estructura Dramática",
        "Structure Dramatique",
        "Драматическая Структура",
      );
      var dsC = "<div>";
      var sn = 1;
      dsSteps.forEach(function (step) {
        if (!step.text) return;
        dsC +=
          '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start">';
        dsC +=
          '<div style="min-width:24px;height:24px;border-radius:50%;background:' +
          hexToRgba(dsAccent, 0.1) +
          ";border:2px solid " +
          dsAccent +
          ";display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:" +
          dsAccent +
          ';flex-shrink:0;margin-top:2px">' +
          (sn < 10 ? "0" + sn : sn) +
          "</div>";
        dsC +=
          '<div><div style="font-size:9.5px;font-weight:700;color:' +
          MUTED +
          ';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">' +
          e(step.label) +
          "</div>";
        dsC +=
          '<p style="font-size:12px;color:' +
          TXT +
          ';line-height:1.55;margin:0">' +
          e(step.text) +
          "</p></div></div>";
        sn++;
      });
      dsC += "</div>";
      h += secD("🎭", dsL, dsAccent, dsC);
    }

    // ── 💠 Kernemotion ─────────────────────────────────────────
    if (moodChips.length) {
      var keL = getLangDefault(
        "Kernemotion",
        "Core Emotion",
        "Emoción Central",
        "Émotion Centrale",
        "Основная Эмоция",
      );
      var keC = '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      moodChips.slice(0, 4).forEach(function (name) {
        keC +=
          '<span style="font-size:11px;font-weight:600;color:' +
          modeColor +
          ";background:" +
          ABGL +
          ";border:1px solid " +
          hexToRgba(modeColor, 0.3) +
          ';border-radius:100px;padding:5px 14px">' +
          e(name) +
          "</span>";
      });
      keC += "</div>";
      h += secD("💠", keL, "#0284C7", keC);
    }

    // ── 💡 Hypothesen ──────────────────────────────────────────
    var hyps =
      data.evidenced_hypotheses ||
      data.evidencedHypotheses ||
      data.hypothesen ||
      data.hypotheses ||
      [];
    if (hyps.length) {
      var hypL = getLangDefault(
        "Hypothesen",
        "Hypotheses",
        "Hipótesis",
        "Hypothèses",
        "Гипотезы",
      );
      var hypAnchL = getLangDefault(
        "Beleg im Traumtext",
        "Evidence in dream text",
        "Evidencia en el texto",
        "Preuve dans le texte",
        "Подтверждение в тексте",
      );
      var hypEvMap = {
        hoch: "#16A34A",
        high: "#16A34A",
        alta: "#16A34A",
        mittel: "#D97706",
        medium: "#D97706",
        moyenne: "#D97706",
        niedrig: "#DC2626",
        low: "#DC2626",
      };
      var hypC = "";
      hyps.slice(0, 4).forEach(function (hyp, idx) {
        var txt =
          typeof hyp === "string"
            ? hyp
            : hyp.text || hyp.hypothesis || String(hyp);
        if (!txt) return;
        var ev =
          typeof hyp === "object" && hyp
            ? (hyp.evidence || hyp.confidence || "").toLowerCase()
            : "";
        var anchor =
          typeof hyp === "object" && hyp
            ? hyp.text_anchor || hyp.textAnchor || ""
            : "";
        if (!ev && !anchor) {
          hypC += numD(txt, idx + 1);
        } else {
          var hypAcc = "#92400E";
          var evCol2 = hypEvMap[ev] || MUTED;
          hypC += '<div style="margin-bottom:10px">';
          hypC += '<div style="display:flex;align-items:flex-start;gap:8px">';
          hypC +=
            '<strong style="color:' +
            hypAcc +
            ';font-weight:700;font-size:12px;min-width:18px;flex-shrink:0;line-height:1.5">' +
            (idx + 1) +
            ".</strong>";
          hypC += '<div style="flex:1">';
          hypC +=
            '<div style="display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;margin-bottom:4px">';
          hypC +=
            '<p style="font-size:12px;color:' +
            TXT +
            ';line-height:1.5;margin:0;flex:1;min-width:200px">' +
            e(txt) +
            "</p>";
          if (ev)
            hypC +=
              '<span style="font-size:9px;font-weight:700;color:' +
              evCol2 +
              ";background:" +
              hexToRgba(evCol2, 0.1) +
              ";border:1px solid " +
              hexToRgba(evCol2, 0.3) +
              ';border-radius:100px;padding:2px 8px;text-transform:uppercase;letter-spacing:0.5px">' +
              e(ev) +
              "</span>";
          hypC += "</div>";
          if (anchor) {
            hypC +=
              '<div style="margin-top:4px;padding:6px 10px;border-left:3px solid ' +
              hexToRgba(hypAcc, 0.5) +
              ";background:" +
              BG2 +
              ';border-radius:0 4px 4px 0">';
            hypC +=
              '<div style="font-size:8.5px;font-weight:700;color:' +
              MUTED +
              ';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">' +
              e(hypAnchL) +
              "</div>";
            hypC +=
              '<div style="font-size:11px;color:' +
              TXT +
              ';line-height:1.5;font-style:italic">“' +
              e(anchor) +
              "”</div>";
            hypC += "</div>";
          }
          hypC += "</div></div></div>";
        }
      });
      if (hypC) h += secD("💡", hypL, "#92400E", hypC);
    }

    // ── ⚖️ Kompensation ────────────────────────────────────────
    var comp = data.compensation_note || data.compensationNote;
    if (comp) {
      var compL = getLangDefault(
        "Kompensation",
        "Compensation",
        "Compensación",
        "Compensation",
        "Компенсация",
      );
      var compC =
        '<div style="background:' +
        BG2 +
        ";border:1px solid " +
        BORD +
        ';border-left:4px solid #7C3AED;border-radius:0 6px 6px 0;padding:14px 18px">';
      compC +=
        '<p style="font-size:12px;color:' +
        TXT +
        ';line-height:1.5;margin:0;font-style:italic">\u201C' +
        e(comp) +
        "\u201D</p>";
      compC += "</div>";
      h += secD("⚖️", compL, "#7C3AED", compC);
    }

    // ── 🌱 Integration ─────────────────────────────────────────
    if (integQ.length) {
      var intL2 = getLangDefault(
        "Integration",
        "Integration",
        "Integración",
        "Intégration",
        "Интеграция",
      );
      var intC2 = "";
      integQ.forEach(function (q) {
        intC2 += bulD(typeof q === "string" ? q : String(q));
      });
      var creativePrompt =
        integ.creative_prompt || integ.kreativeUmsetzung || "";
      if (creativePrompt) {
        intC2 +=
          '<div style="margin-top:12px;padding-top:10px;border-top:1px solid ' +
          BORD +
          '">';
        intC2 +=
          '<span style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#16A34A">' +
          e(
            getLangDefault(
              "Kreative Umsetzung",
              "Creative Exercise",
              "Ejercicio Creativo",
              "Exercice Créatif",
              "Творческое задание",
            ),
          ) +
          "</span>";
        intC2 +=
          '<p style="font-size:12px;color:' +
          TXT +
          ';line-height:1.5;margin:6px 0 0">' +
          e(creativePrompt) +
          "</p></div>";
      }
      h += secD("🌱", intL2, "#15803D", intC2);
    }

    // ── 💡 Dein 24h-Experiment ─────────────────────────────────
    var action = data.action_step || data.actionStep;
    if (action) {
      var actL =
        s.actionLabel ||
        getLangDefault(
          "Dein 24h Experiment",
          "Your 24h Experiment",
          "Tu Experimento 24h",
          "Ton Expérience 24h",
          "Твой Эксперимент 24ч",
        );
      var actC =
        '<div style="background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #D97706;border-radius:0 6px 6px 0;padding:14px 18px">';
      actC +=
        '<p style="font-size:12px;color:' +
        TXT +
        ';line-height:1.5;margin:0">' +
        e(action) +
        "</p>";
      actC += "</div>";
      h += secD("💡", actL, "#D97706", actC);
    }

    // ── Confidence badge (footer of content) ───────────────────
    if (confRaw) {
      var cColorsD = {
        hoch: "#16A34A",
        high: "#16A34A",
        alta: "#16A34A",
        mittel: "#D97706",
        medium: "#D97706",
        moyenne: "#D97706",
        niedrig: "#DC2626",
        low: "#DC2626",
      };
      var cBgsD = {
        hoch: "#F0FDF4",
        high: "#F0FDF4",
        alta: "#F0FDF4",
        mittel: "#FFFBEB",
        medium: "#FFFBEB",
        moyenne: "#FFFBEB",
        niedrig: "#FEF2F2",
        low: "#FEF2F2",
      };
      var cBordD = {
        hoch: "#BBF7D0",
        high: "#BBF7D0",
        alta: "#BBF7D0",
        mittel: "#FDE68A",
        medium: "#FDE68A",
        moyenne: "#FDE68A",
        niedrig: "#FECACA",
        low: "#FECACA",
      };
      var cLabelsFull = {
        hoch: "Hohe Evidenz",
        mittel: "Mittlere Evidenz",
        niedrig: "Niedrige Evidenz",
        high: "High Evidence",
        medium: "Medium Evidence",
        low: "Low Evidence",
        alta: "Alta Evidencia",
        moyenne: "Preuve Moyenne",
      };
      var cC = cColorsD[confRaw] || MUTED;
      h +=
        '<div style="display:inline-flex;align-items:center;gap:7px;background:' +
        (cBgsD[confRaw] || BG3) +
        ";border:1px solid " +
        (cBordD[confRaw] || BORD) +
        ';border-radius:100px;padding:6px 16px;margin-bottom:8px">';
      h +=
        '<div style="width:7px;height:7px;border-radius:50%;background:' +
        cC +
        '"></div>';
      h +=
        '<span style="font-size:11px;font-weight:700;color:' +
        cC +
        '">' +
        e(cLabelsFull[confRaw] || confRaw) +
        "</span>";
      h += "</div>";
    }

    h += "</div>"; // end content area
    h += "</div>"; // end main container
    return h;
  }

  // ── Share ────────────────────────────────────────────────────

  function shareAnalysis() {
    var s = cfg.strings || {};
    var data = dreamSession.analyses[dreamSession.activeTab];
    if (!data) return;
    var text = buildShareText(data);
    if (window.ethyriaTrack) {
      window.ethyriaTrack("Analysis Shared", {
        method: navigator.share ? "native" : "clipboard",
      });
    }

    if (navigator.share) {
      navigator
        .share({
          title: data.title || "Ethyria",
          text: text,
          url: window.location.href,
        })
        .catch(function () {});
    } else {
      copyToClipboard(text, function (ok) {
        var btn = document.getElementById("la-share-btn");
        if (!btn) return;
        var orig = btn.textContent;
        btn.textContent = ok ? s.shareCopied || "✓ Kopiert!" : "✗";
        setTimeout(function () {
          btn.textContent = orig;
        }, 2000);
      });
    }
  }

  function buildShareText(data) {
    var parts = [];
    if (data.title) parts.push(data.title);
    if (data.core_insight || data.coreInsight)
      parts.push(data.core_insight || data.coreInsight);
    if (data.action_step || data.actionStep)
      parts.push("💡 " + (data.action_step || data.actionStep));
    parts.push("Ethyria Traumanalyse");
    return parts.join("\n\n");
  }

  function copyToClipboard(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          cb(true);
        })
        .catch(function () {
          cb(false);
        });
    } else {
      try {
        var el = document.createElement("textarea");
        el.value = text;
        el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        cb(true);
      } catch (e) {
        cb(false);
      }
    }
  }

  // ── Visitor ID ───────────────────────────────────────────────

  function getVisitorId() {
    var KEY = "ethyria_vid";
    try {
      var id = localStorage.getItem(KEY);
      if (!id) {
        id = "v-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(KEY, id);
      }
      return id;
    } catch (e) {
      return "v-" + Date.now();
    }
  }

  // ── Util ─────────────────────────────────────────────────────

  function hexToRgba(hex, alpha) {
    if (!hex) return "rgba(49,132,255," + alpha + ")";
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  // ── Boot ─────────────────────────────────────────────────────

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
