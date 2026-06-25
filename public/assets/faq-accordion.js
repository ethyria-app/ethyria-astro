(function () {
  'use strict';
  function initAll() {
    document.querySelectorAll('.faq-accordion').forEach(function (accordion) {
      var questions = accordion.querySelectorAll('.faq-question');
      questions.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var expanded = this.getAttribute('aria-expanded') === 'true';
          questions.forEach(function (b) {
            b.setAttribute('aria-expanded', 'false');
          });
          if (!expanded) {
            this.setAttribute('aria-expanded', 'true');
            if (window.ethyriaTrack) {
              var idx = Array.prototype.indexOf.call(questions, this);
              window.ethyriaTrack('FAQ Opened', { question_index: idx });
            }
          }
        });
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
