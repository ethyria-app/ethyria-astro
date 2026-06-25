(function () {
  function init() {
    var chips = document.querySelectorAll('#briefs-filter [data-brief-chip]');
    var cards = document.querySelectorAll('[data-brief-category]');
    if (!chips.length || !cards.length) return;

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var filter = chip.dataset.briefChip;
        chips.forEach(function (c) {
          c.classList.remove('active');
        });
        chip.classList.add('active');
        cards.forEach(function (card) {
          card.style.display = filter === 'all' || card.dataset.briefCategory === filter ? '' : 'none';
        });
      });
    });

    chips[0].classList.add('active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
