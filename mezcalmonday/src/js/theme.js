// Theme: light by day, night theme on request. Persists to localStorage mm.theme.
(function () {
  var d = document.documentElement;
  function apply(t) {
    d.dataset.theme = t;
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to the day theme' : 'Switch to the night theme');
    });
    window.dispatchEvent(new CustomEvent('mm:theme', { detail: { theme: t } }));
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-toggle]');
    if (!b) return;
    var t = d.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('mm.theme', t); } catch (err) {}
    apply(t);
  });
  apply(d.dataset.theme || 'light');
  window.MMTheme = { get: function () { return d.dataset.theme; }, set: apply };
})();
