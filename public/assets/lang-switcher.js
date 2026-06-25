// Language dropdown toggle for pillar pages
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var drop = document.getElementById('langDrop');
    if (!drop) return;

    // Support both markup patterns used across pillar pages
    var btn = document.querySelector('button[aria-label="Language"]') || document.querySelector('#langSw button');
    if (!btn) return;

    // Detect toggle mode: HTML hidden attribute vs Tailwind "hidden" class
    var usesHiddenAttr = drop.hasAttribute('hidden');

    function openDrop() {
      usesHiddenAttr ? drop.removeAttribute('hidden') : drop.classList.remove('hidden');
    }
    function closeDrop() {
      usesHiddenAttr ? drop.setAttribute('hidden', '') : drop.classList.add('hidden');
    }
    function isOpen() {
      return usesHiddenAttr ? !drop.hasAttribute('hidden') : !drop.classList.contains('hidden');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen() ? closeDrop() : openDrop();
    });

    // Close on outside click or Escape
    document.addEventListener('click', function () {
      closeDrop();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrop();
    });
  });
})();
