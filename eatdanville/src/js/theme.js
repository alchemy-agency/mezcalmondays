/* Theme: light by day, After Dark by night. The inline head script sets the initial theme before paint; this file wires the toggle. */
(function () {
  const root = document.documentElement;
  const KEY = 'eat.theme';

  function current() { return root.dataset.theme === 'dark' ? 'dark' : 'light'; }

  // Status bar color: navy while a photographic hero is under the browser chrome, otherwise the page background.
  const HERO_COLOR = '#0B1020';
  let heroUnderChrome = false;
  function paintStatusBar() {
    const meta = document.getElementById('theme-color');
    if (!meta) return;
    let bg = '';
    try { bg = getComputedStyle(root).getPropertyValue('--bg').trim(); } catch (e) { /* ignore */ }
    meta.setAttribute('content', heroUnderChrome ? HERO_COLOR : (bg || (current() === 'dark' ? HERO_COLOR : '#F4F4F2')));
  }
  function watchHero() {
    const hero = document.querySelector('.hero, .rhero');
    if (!hero || !('IntersectionObserver' in window)) { heroUnderChrome = false; paintStatusBar(); return; }
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      heroUnderChrome = e.isIntersecting && e.boundingClientRect.top <= 0 && e.boundingClientRect.bottom > 80;
      paintStatusBar();
    }, { threshold: [0, 0.05, 0.2, 0.5, 0.9, 1], rootMargin: '0px 0px -60% 0px' });
    io.observe(hero);
    heroUnderChrome = hero.getBoundingClientRect().top <= 0 && hero.getBoundingClientRect().bottom > 80;
    paintStatusBar();
  }

  function apply(theme, persist) {
    root.dataset.theme = theme;
    setTimeout(paintStatusBar, 0);
    if (persist) { try { localStorage.setItem(KEY, theme); } catch (e) { /* storage unavailable */ } }
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      b.setAttribute('aria-label', theme === 'dark' ? 'Switch to daytime theme' : 'Switch to After Dark theme');
      b.title = theme === 'dark' ? 'After Dark is on' : 'Turn on After Dark';
    });
    window.dispatchEvent(new CustomEvent('eat:theme', { detail: { theme } }));
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-toggle]');
    if (!b) return;
    apply(current() === 'dark' ? 'light' : 'dark', true);
  });

  // Follow the system when the visitor has not chosen and it is daytime.
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', () => {
    let saved = null; try { saved = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (saved) return;
    const h = new Date().getHours();
    const night = h >= 20 || h < 4;
    apply(night || mq.matches ? 'dark' : 'light', false);
  });

  apply(current(), false);
  watchHero();
  window.EatTheme = { current, apply };
})();
