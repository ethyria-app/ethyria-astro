(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  function onCLS(cb) {
    var clsValue = 0;
    var clsEntries = [];
    var sessionValue = 0;
    var sessionEntries = [];
    if (!('PerformanceObserver' in window)) return;
    var po = new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        if (!entry.hadRecentInput) {
          var firstEntry = sessionEntries[0];
          var lastEntry = sessionEntries[sessionEntries.length - 1];
          if (
            sessionValue &&
            entry.startTime - lastEntry.startTime < 1000 &&
            entry.startTime - firstEntry.startTime < 5000
          ) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            clsEntries = sessionEntries.slice();
            cb({ value: clsValue, entries: clsEntries });
          }
        }
      });
    });
    try {
      po.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}
  }

  function onLCP(cb) {
    if (!('PerformanceObserver' in window)) return;
    var po = new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      var last = entries[entries.length - 1];
      cb({ value: last.startTime, entries: [last] });
    });
    try {
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}
    document.addEventListener(
      'visibilitychange',
      function () {
        if (document.visibilityState === 'hidden') po.takeRecords();
      },
      { once: true }
    );
  }

  function onFID(cb) {
    if (!('PerformanceObserver' in window)) return;
    var po = new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        cb({ value: entry.processingStart - entry.startTime, entries: [entry] });
      });
    });
    try {
      po.observe({ type: 'first-input', buffered: true });
    } catch (e) {}
  }

  function onINP(cb) {
    if (!('PerformanceObserver' in window)) return;
    var po = new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        if (entry.interactionId) {
          cb({ value: entry.duration, entries: [entry] });
        }
      });
    });
    try {
      po.observe({ type: 'event', durationThreshold: 16, buffered: true });
    } catch (e) {}
  }

  function sendToPlausible(metricName, value) {
    if (!window.plausible) return;
    var rounded = Math.round(value);
    window.plausible('Web Vital', { props: { metric: metricName, value: rounded } });
  }

  onLCP(function (m) {
    sendToPlausible('LCP', m.value);
  });
  onCLS(function (m) {
    sendToPlausible('CLS', m.value * 1000);
  });
  onFID(function (m) {
    sendToPlausible('FID', m.value);
  });
  onINP(function (m) {
    sendToPlausible('INP', m.value);
  });
})();
