(function () {
  var grid = document.getElementById('vwGrid');
  var btn = document.getElementById('vwMoreBtn');
  if (!grid || !btn) return;

  var ROWS_PER_STEP = 4;
  var currentRows = ROWS_PER_STEP;
  var isFiltered = false;

  function rowHeight() {
    if (window.innerWidth > 768) return 210; // 200px + 10px gap
    if (window.innerWidth > 480) return 160; // 150px + 10px gap
    return 130; // 120px + 10px gap
  }

  function totalRows() {
    var cols = window.innerWidth > 768 ? 4 : 2;
    var cells = grid.querySelectorAll('.vw-cell').length;
    return Math.ceil(cells / cols);
  }

  function applyRows(n) {
    var total = totalRows();
    if (n >= total) {
      grid.style.maxHeight = '';
      grid.style.overflow = '';
      btn.hidden = true;
    } else {
      grid.style.maxHeight = n * rowHeight() - 10 + 'px';
      grid.style.overflow = 'hidden';
      btn.hidden = false;
    }
  }

  btn.addEventListener('click', function () {
    currentRows += ROWS_PER_STEP;
    applyRows(currentRows);
  });

  /* Observe filter button clicks — inline script adds/removes .vw-dim */
  document.querySelectorAll('.vw-filter').forEach(function (filterBtn) {
    filterBtn.addEventListener('click', function () {
      isFiltered = filterBtn.dataset.filter !== 'all';
      currentRows = ROWS_PER_STEP;
      setTimeout(function () {
        applyRows(currentRows);
      }, 0);
    });
  });

  window.addEventListener('resize', function () {
    applyRows(currentRows);
  });

  applyRows(currentRows);
})();
