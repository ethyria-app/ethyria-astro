(function () {
  'use strict';
  if (typeof Sentry === 'undefined') return;

  Sentry.onLoad(function () {
    Sentry.init({
      dsn: 'https://5fac2f422b6fa31f4963b10e0a6a295e@o4511010131542016.ingest.de.sentry.io/4511478058451024',
      environment: 'production',
      release: 'ethyria@1.0',
      tracesSampleRate: 0.1,
      sendDefaultPii: false,

      ignoreErrors: [
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed',
        'NetworkError when attempting to fetch resource',
        'Failed to fetch',
        'Load failed',
        'AbortError',
        'The operation was aborted',
      ],

      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^moz-extension:\/\//i,
        /^safari-extension:\/\//i,
      ],

      beforeSend: function (event) {
        // Drop errors from browser extensions
        var frames =
          event.exception &&
          event.exception.values &&
          event.exception.values[0] &&
          event.exception.values[0].stacktrace &&
          event.exception.values[0].stacktrace.frames;
        if (
          frames &&
          frames.some(function (f) {
            return f.filename && (/extension/.test(f.filename) || /^<anonymous>$/.test(f.filename));
          })
        ) {
          return null;
        }
        return event;
      },
    });
  });
})();
