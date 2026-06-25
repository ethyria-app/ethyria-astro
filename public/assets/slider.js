(function () {
  var TRANSITION_MS = 600;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.ethyria-slider').forEach(function (root) {
    var track = root.querySelector('.ethyria-slider__track');
    var slides = Array.from(track.querySelectorAll('.ethyria-slider__slide'));
    var prevBtns = Array.from(root.querySelectorAll('.ethyria-slider__nav--prev'));
    var nextBtns = Array.from(root.querySelectorAll('.ethyria-slider__nav--next'));
    var dotsWraps = Array.from(root.querySelectorAll('.ethyria-slider__dots'));
    var current = 0;
    var total = slides.length;
    var isAnimating = false;
    var autoplayMs = parseInt(root.dataset.autoplay, 10) || 0;
    var autoTimer = null;
    var isPaused = false;
    var isVisible = true;

    var allDotSets = dotsWraps.map(function () {
      return [];
    });
    slides.forEach(function (slide, i) {
      dotsWraps.forEach(function (wrap, wi) {
        var dot = document.createElement('button');
        dot.className = 'ethyria-slider__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        dot.addEventListener('click', function () {
          goTo(i);
          resetAutoplay();
        });
        wrap.appendChild(dot);
        allDotSets[wi].push(dot);
      });

      slide.setAttribute('role', 'tabpanel');
      slide.setAttribute('aria-label', 'Slide ' + (i + 1) + ' von ' + total);
    });

    function updateUI() {
      prevBtns.forEach(function (btn) {
        btn.disabled = current === 0;
      });
      nextBtns.forEach(function (btn) {
        btn.disabled = current === total - 1;
      });
      allDotSets.forEach(function (dotSet) {
        dotSet.forEach(function (d, i) {
          var active = i === current;
          d.classList.toggle('is-active', active);
          d.setAttribute('aria-selected', active ? 'true' : 'false');
        });
      });
    }

    function goTo(index, forceDir) {
      if (isAnimating || index === current || index < 0 || index >= total) return;
      isAnimating = true;

      var dir = forceDir || (index > current ? 1 : -1);
      var outSlide = slides[current];
      var inSlide = slides[index];

      outSlide.classList.remove('is-active');
      outSlide.classList.add(dir > 0 ? 'is-exit-left' : 'is-exit-right');

      inSlide.style.transition = 'none';
      inSlide.style.transform = 'translateX(' + (dir > 0 ? '100' : '-100') + 'px) scale(0.96)';
      inSlide.style.opacity = '0';
      inSlide.classList.add('is-active');

      void inSlide.offsetHeight;

      inSlide.style.transition = '';
      inSlide.style.transform = '';
      inSlide.style.opacity = '';

      current = index;
      updateUI();

      var dur = reducedMotion ? 50 : TRANSITION_MS;
      setTimeout(function () {
        outSlide.classList.remove('is-exit-left', 'is-exit-right');
        outSlide.style.transform = '';
        outSlide.style.opacity = '';
        isAnimating = false;
      }, dur + 20);
    }

    function next() {
      if (current < total - 1) {
        goTo(current + 1);
      } else {
        goTo(0, 1);
      }
    }

    prevBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        goTo(current - 1);
        resetAutoplay();
      });
    });
    nextBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        goTo(current + 1);
        resetAutoplay();
      });
    });

    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(current - 1);
        resetAutoplay();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(current + 1);
        resetAutoplay();
      }
    });

    var touchStartX = 0;
    var touchStartT = 0;
    root.addEventListener(
      'touchstart',
      function (e) {
        touchStartX = e.changedTouches[0].clientX;
        touchStartT = Date.now();
        pauseAutoplay();
      },
      { passive: true }
    );

    root.addEventListener(
      'touchend',
      function (e) {
        var dx = touchStartX - e.changedTouches[0].clientX;
        var dt = Date.now() - touchStartT;
        var velocity = Math.abs(dx) / (dt || 1);

        if (Math.abs(dx) > 40 || velocity > 0.3) {
          if (dx > 0) goTo(current + 1);
          else goTo(current - 1);
        }
        resumeAutoplay();
      },
      { passive: true }
    );

    function startAutoplay() {
      if (!autoplayMs || isPaused || !isVisible) return;
      clearInterval(autoTimer);
      autoTimer = setInterval(function () {
        next();
      }, autoplayMs);
    }

    function pauseAutoplay() {
      isPaused = true;
      clearInterval(autoTimer);
    }

    function resumeAutoplay() {
      isPaused = false;
      startAutoplay();
    }

    function resetAutoplay() {
      if (!autoplayMs) return;
      clearInterval(autoTimer);
      isPaused = false;
      startAutoplay();
    }

    root.addEventListener('mouseenter', pauseAutoplay);
    root.addEventListener('mouseleave', function () {
      isPaused = false;
      startAutoplay();
    });

    root.addEventListener('focusin', pauseAutoplay);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) {
        isPaused = false;
        startAutoplay();
      }
    });

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(
        function (entries) {
          isVisible = entries[0].isIntersecting;
          if (isVisible && !isPaused) startAutoplay();
          else {
            clearInterval(autoTimer);
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(root);
    }

    root._sliderGoTo = goTo;
    root._sliderResetAutoplay = resetAutoplay;

    updateUI();
    if (autoplayMs) {
      if (root.classList.contains('reveal') && 'MutationObserver' in window) {
        var autoMo = new MutationObserver(function (mutations, mo) {
          if (root.classList.contains('is-visible')) {
            mo.disconnect();
            setTimeout(function () {
              startAutoplay();
            }, 620);
          }
        });
        autoMo.observe(root, { attributes: true, attributeFilter: ['class'] });
      } else {
        startAutoplay();
      }
    }
  });
})();

(function () {
  if (!('IntersectionObserver' in window)) return;
  var hinted = new WeakSet();

  function triggerHint(slider) {
    if (typeof slider._sliderGoTo !== 'function') return;
    slider.classList.add('is-hint-slow');
    slider._sliderGoTo(1);
    slider.classList.add('is-hinting');
    setTimeout(function () {
      slider.classList.remove('is-hinting');
    }, 600);
    setTimeout(function () {
      slider._sliderGoTo(0);
      slider.classList.add('is-hinting');
      setTimeout(function () {
        slider.classList.remove('is-hinting');
        slider.classList.remove('is-hint-slow');
        if (typeof slider._sliderResetAutoplay === 'function') {
          slider._sliderResetAutoplay();
        }
      }, 600);
    }, 1500);
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !hinted.has(entry.target)) {
          hinted.add(entry.target);
          var slider = entry.target;
          observer.unobserve(slider);
          if (slider.classList.contains('reveal') && 'MutationObserver' in window) {
            var hintMo = new MutationObserver(function (mutations, mo) {
              if (slider.classList.contains('is-visible')) {
                mo.disconnect();
                setTimeout(function () {
                  triggerHint(slider);
                }, 620);
              }
            });
            hintMo.observe(slider, { attributes: true, attributeFilter: ['class'] });
          } else {
            setTimeout(function () {
              triggerHint(slider);
            }, 400);
          }
        }
      });
    },
    { threshold: 0.2 }
  );

  document.querySelectorAll('.ethyria-slider').forEach(function (el) {
    observer.observe(el);
  });
})();
