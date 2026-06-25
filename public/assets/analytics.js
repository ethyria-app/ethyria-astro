(function () {
  'use strict';
  window.ethyriaTrack = function (eventName, props) {
    var base = {
      lang: document.documentElement.lang || 'de',
      page: window.location.pathname,
    };
    var payload = Object.assign({}, base, props || {});
    if (typeof plausible === 'function') {
      plausible(eventName, { props: payload });
    }
    fetch('https://ethyria-api.omcstolz.workers.dev/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, props: payload, ts: Date.now() }),
      keepalive: true,
    }).catch(function () {});
  };
})();
