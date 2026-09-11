(function () {
  var burger = document.querySelector('.burger'), menu = document.getElementById('menu');
  if (!burger || !menu) return;
  function set(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('no-scroll', open);
  }
  burger.addEventListener('click', function () { set(burger.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) set(false); });
})();
