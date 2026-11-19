// Lab: the quarterly report sample. Pointing at a list item lights up its part of the sheet and back.
// With motion on, the sheet walks through its four parts once when it first comes into view.
(function () {
  var rep = document.getElementById('report');
  if (!rep) return;
  var parts = rep.querySelectorAll('.rep__list li, .doc__sec');
  var tour = null, toured = false;

  function set(n) {
    rep.classList.toggle('has-on', !!n);
    parts.forEach(function (el) { el.classList.toggle('is-on', el.dataset.rep === n); });
  }
  function stop() { if (tour) { clearInterval(tour); tour = null; } }

  parts.forEach(function (el) {
    el.addEventListener('mouseenter', function () { stop(); set(el.dataset.rep); });
    el.addEventListener('mouseleave', function () { set(null); });
    el.addEventListener('click', function () { stop(); set(el.classList.contains('is-on') ? null : el.dataset.rep); });
  });

  if (!document.documentElement.classList.contains('motion') || !('IntersectionObserver' in window)) return;
  var doc = rep.querySelector('.doc');
  new IntersectionObserver(function (es, io) {
    if (toured || !es[0].isIntersecting) return;
    toured = true; io.disconnect();
    var n = 0;
    setTimeout(function () {
      tour = setInterval(function () {
        n += 1;
        if (n > 4) { stop(); set(null); return; }
        set(String(n));
      }, 1400);
    }, 600);
  }, { threshold: 0.6 }).observe(doc);
})();
