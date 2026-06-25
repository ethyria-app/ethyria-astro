(function () {
  var btn = document.getElementById('roadmap-mehr-btn');
  var panel = document.getElementById('roadmap-collapse');
  if (!btn || !panel) return;

  btn.addEventListener('click', function () {
    panel.classList.add('is-open');
    btn.hidden = true;
    setTimeout(function () {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  });
})();
