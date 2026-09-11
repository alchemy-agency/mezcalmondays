/* Nav: hamburger morph, overlay menu, hide-on-scroll-down (IntersectionObserver based, no scroll listener), current page marking. */
(function () {
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  const nav = document.querySelector('.nav');

  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('menu-open', open);
    if (open) { const first = menu.querySelector('a'); first && first.focus({ preventScroll: true }); }
  }
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  // Mark the current page in the nav.
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav-links a, .menu a').forEach((a) => {
    const p = a.getAttribute('href') || '';
    if (p.startsWith('/#') || p === '/') return;
    if (here.startsWith(p.replace(/#.*$/, ''))) a.setAttribute('aria-current', 'page');
  });

  // Compact nav after the hero: a sentinel at the top of the page is observed instead of listening to scroll.
  if (nav) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:140px;pointer-events:none;';
    document.body.prepend(sentinel);
    const io = new IntersectionObserver((entries) => {
      nav.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }, { threshold: 0 });
    io.observe(sentinel);
  }
})();
