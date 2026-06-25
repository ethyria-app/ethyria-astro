(function () {
  function init() {
    var chips = document.querySelectorAll('#dream-cards-filter [data-filter-chip]');
    var cards = document.querySelectorAll('[data-card-type]');
    if (!chips.length || !cards.length) return;

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var filter = chip.getAttribute('data-filter-chip');
        chips.forEach(function (c) {
          c.classList.remove('active');
        });
        chip.classList.add('active');
        cards.forEach(function (card) {
          var show = filter === 'all' || card.getAttribute('data-card-type') === filter;
          card.style.display = show ? '' : 'none';
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
