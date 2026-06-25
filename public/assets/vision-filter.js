(function () {
  var btns = document.querySelectorAll(".vw-filter");
  var cells = document.querySelectorAll("#vwGrid .vw-cell");

  btns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.dataset.filter;
      btns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      cells.forEach(function (c) {
        if (f === "all" || c.dataset.cat === f) { c.classList.remove("vw-dim"); }
        else { c.classList.add("vw-dim"); }
      });
    });
  });

  var lb = document.createElement("div");
  lb.className = "vw-lightbox";
  var lbImg = document.createElement("img");
  var lbClose = document.createElement("button");
  lbClose.className = "vw-lb-close";
  lbClose.innerHTML = "&#x2715;";
  lbClose.setAttribute("aria-label", "Close");
  lb.appendChild(lbImg);
  lb.appendChild(lbClose);
  document.body.appendChild(lb);

  function openLb(src) {
    lbImg.src = src;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLb() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
  }

  cells.forEach(function (c) {
    c.addEventListener("click", function () {
      var img = c.querySelector("img");
      if (img) openLb(img.src);
    });
  });

  lbClose.addEventListener("click", function (e) { e.stopPropagation(); closeLb(); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });
})();
