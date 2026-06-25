(function () {
  var buttons = document.querySelectorAll("#emotion-filters .filter-btn");
  var cards = document.querySelectorAll("#symbol-grid .symbol-card");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var filter = btn.getAttribute("data-filter");
      buttons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      cards.forEach(function (card) {
        if (filter === "all" || (card.getAttribute("data-category") || "").indexOf(filter) > -1) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
})();
