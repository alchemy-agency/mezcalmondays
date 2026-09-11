// Predictive search over venues, regions, categories, recipes and stores. Vanilla, no network.
(function () {
  var D = window.MM_DATA; if (!D) return;
  var ICONS = D.icons || {};
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
  var tokens = function (s) { return norm(s).split(' ').filter(Boolean); };

  var SYN = { taco: 'restaurant', tacos: 'restaurant', mexican: 'restaurant', cantina: 'restaurant', steak: 'restaurant', seafood: 'restaurant', dinner: 'restaurant', eat: 'restaurant', food: 'restaurant',
    pub: 'bar', tavern: 'bar', lounge: 'bar', speakeasy: 'bar', late: 'bar', drinks: 'bar', patio: 'bar',
    casino: 'hotel', resort: 'hotel', strip: 'hotel', hotel: 'hotel',
    deal: 'special', deals: 'special', cheap: 'special', discount: 'special', special: 'special', specials: 'special', monday: 'special', happy: 'special',
    margarita: 'cocktails', paloma: 'cocktails', mezcaloma: 'cocktails', negroni: 'cocktails', cocktail: 'cocktails', cocktails: 'cocktails', carajillo: 'cocktails', mule: 'cocktails', sour: 'cocktails',
    buy: 'store', bottle: 'store', shop: 'store', liquor: 'store', store: 'store', online: 'store', delivery: 'store',
    vegas: 'las-vegas', sf: 'bay-area', bay: 'bay-area', oakland: 'bay-area', lafayette: 'bay-area', la: 'southern-california', socal: 'southern-california', oc: 'southern-california', orange: 'southern-california', cape: 'cape-cod', tahoe: 'lake-tahoe' };

  var index = [];
  D.venues.forEach(function (v) { index.push({ type: 'venue', id: v.slug, title: v.name, sub: v.city + ', ' + v.state, k: v.type, text: norm(v.name + ' ' + v.city + ' ' + v.state + ' ' + v.state_name + ' ' + v.street + ' ' + (v.tags || []).join(' ')), href: '/bar/' + v.slug + '/', v: v }); });
  D.regions.forEach(function (r) { index.push({ type: 'region', id: r.slug, title: r.name, sub: r.blurb, text: norm(r.name + ' ' + r.blurb + ' ' + (r.match.cities || []).join(' ') + ' ' + r.match.state), href: '/find/?region=' + r.slug }); });
  D.categories.forEach(function (c) { index.push({ type: 'cat', id: c.filter, title: c.name, sub: c.blurb, text: norm(c.name + ' ' + c.blurb + ' ' + c.keywords.join(' ')), href: c.filter === 'recipe' ? '/recipes/' : c.filter === 'store' ? '/buy/' : c.filter === 'special' ? '/specials/' : '/find/?cat=' + c.filter }); });
  D.recipes.forEach(function (r) { index.push({ type: 'recipe', id: r.slug, title: r.name, sub: r.kicker, text: norm(r.name + ' ' + r.kicker + ' ' + r.tags.join(' ') + ' recipe make at home'), href: '/recipes/' + r.slug + '/' }); });
  D.stores.forEach(function (s) { index.push({ type: 'store', id: s.slug, title: s.name, sub: s.city + ', ' + s.state, text: norm(s.name + ' ' + s.city + ' ' + s.state + ' ' + s.state_name + ' buy bottle shop liquor'), href: 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng }); });

  function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 3; var m = [], i, j; for (i = 0; i <= a.length; i++) m[i] = [i]; for (j = 0; j <= b.length; j++) m[0][j] = j; for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) { var c = a[i - 1] === b[j - 1] ? 0 : 1; m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + c); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) m[i][j] = Math.min(m[i][j], m[i - 2][j - 2] + 1); } return m[a.length][b.length]; }

  function score(item, q) {
    var qs = tokens(q); if (!qs.length) return 0;
    var s = 0, tt = item.text.split(' ');
    qs.forEach(function (t) {
      var hit = 0;
      if (norm(item.title).indexOf(t) === 0) hit = 6; else if (norm(item.title).indexOf(t) >= 0) hit = 4;
      else if (tt.some(function (w) { return w.indexOf(t) === 0; })) hit = 3;
      else if (t.length >= 4 && tt.some(function (w) { return w.length >= 4 && lev(w, t) <= (t.length > 6 ? 2 : 1); })) hit = 2;
      var syn = SYN[t];
      if (syn && ((item.type === 'cat' && item.id === syn) || (item.type === 'region' && item.id === syn) || (item.type === 'venue' && item.k === syn))) hit = Math.max(hit, 3);
      if (!hit) s -= 2; else s += hit;
    });
    if (s <= 0) return 0;
    if (item.type === 'venue' && item.v.featured) s += 1;
    if (item.type === 'cat') s += 0.5;
    return s;
  }

  function query(q, limit) {
    var res = index.map(function (it) { return { it: it, s: score(it, q) }; }).filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s || a.it.title.localeCompare(b.it.title); });
    return res.slice(0, limit || 50).map(function (r) { return r.it; });
  }

  var RECENT_KEY = 'mm.recent.v1';
  function recent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; } }
  function remember(q) { q = q.trim(); if (!q) return; var r = recent().filter(function (x) { return x !== q; }); r.unshift(q); try { localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 6))); } catch (e) {} }

  var GROUP = { venue: 'Bars and restaurants', region: 'Cities', cat: 'Browse', recipe: 'Recipes', store: 'Where to buy' };
  var ORDER = ['venue', 'region', 'cat', 'recipe', 'store'];
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function mark(title, q) { var t = esc(title); var qs = tokens(q); qs.forEach(function (w) { if (w.length < 2) return; t = t.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'), '<mark>$1</mark>'); }); return t; }
  function thumb(it) {
    if (it.type === 'venue') { var ini = it.title.replace(/^(the|a|an)\s+/i, '').split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); return '<span class="thumb' + (it.v.featured ? ' acc' : '') + '">' + esc(ini) + '</span>'; }
    var name = it.type === 'region' ? 'map-pin' : it.type === 'recipe' ? 'cooking-pot' : it.type === 'store' ? 'storefront' : 'magnifying-glass';
    return '<span class="thumb">' + (ICONS[name] || '') + '</span>';
  }
  function itemHtml(it, q, i) {
    var k = it.type === 'venue' ? ({ restaurant: 'Restaurant', bar: 'Bar', hotel: 'Hotel' }[it.k] || '') : it.type === 'store' ? 'Directions' : '';
    return '<a class="search-item" role="option" id="sopt-' + i + '" href="' + esc(it.href) + '" data-type="' + it.type + '" data-id="' + esc(it.id) + '"' + (it.type === 'store' ? ' target="_blank" rel="noopener"' : '') + '>' + thumb(it) + '<span><span class="t">' + mark(it.title, q) + '</span><span class="s">' + esc(it.sub) + '</span></span><span class="k">' + esc(k) + '</span></a>';
  }

  function starters() {
    var d = new Date().getDay();
    var list = d === 1 ? ['Monday specials', 'Las Vegas', 'Margarita', 'Near me'] : ['Las Vegas', 'Boston', 'Mezcal Margarita', 'Where to buy'];
    return list;
  }

  function bind(wrap) {
    var input = wrap.querySelector('.search-input'), panel = wrap.querySelector('.search-panel'), form = wrap.querySelector('form');
    var isPage = wrap.hasAttribute('data-page'), sel = -1, items = [], t;
    function open() { wrap.classList.add('is-open'); input.setAttribute('aria-expanded', 'true'); }
    function close() { wrap.classList.remove('is-open'); input.setAttribute('aria-expanded', 'false'); sel = -1; }
    function render() {
      var q = input.value.trim();
      var html = '';
      if (!q) {
        var r = recent();
        if (r.length) html += '<div class="search-group">Recent</div>' + r.map(function (x, i) { return '<button class="search-item" role="option" type="button" data-q="' + esc(x) + '"><span class="thumb">' + (ICONS['clock-counter-clockwise'] || '') + '</span><span><span class="t">' + esc(x) + '</span></span><span class="k"></span></button>'; }).join('');
        html += '<div class="search-group">Try</div>' + starters().map(function (x) { return x === 'Near me' ? '<a class="search-item" role="option" href="/find/?near=1"><span class="thumb acc">' + (ICONS.crosshair || '') + '</span><span><span class="t">Near me</span><span class="s">Bars pouring mezcal around you</span></span><span class="k"></span></a>' : '<button class="search-item" role="option" type="button" data-q="' + esc(x) + '"><span class="thumb">' + (ICONS['magnifying-glass'] || '') + '</span><span><span class="t">' + esc(x) + '</span></span><span class="k"></span></button>'; }).join('');
      } else {
        var res = query(q, 40), groups = {};
        res.forEach(function (it) { (groups[it.type] = groups[it.type] || []).push(it); });
        var n = 0, out = [];
        ORDER.forEach(function (ty) { if (!groups[ty]) return; var lim = ty === 'venue' ? 5 : 2; out.push('<div class="search-group">' + GROUP[ty] + '</div>'); groups[ty].slice(0, lim).forEach(function (it) { out.push(itemHtml(it, q, n++)); }); });
        html = out.length ? out.join('') : '<div class="search-empty">Nothing for "' + esc(q) + '". Try a city, a bar name or a drink, or <a href="/add-your-bar/">add the bar</a>.</div>';
        if (out.length) html += '<a class="search-item" role="option" href="/find/?q=' + encodeURIComponent(q) + '"><span class="thumb">' + (ICONS['arrow-right'] || '') + '</span><span><span class="t">See all results for "' + esc(q) + '"</span></span><span class="k"></span></a>';
      }
      html += '<div class="search-foot"><span>Type a bar, a city or a drink</span><span><kbd>Esc</kbd> closes</span></div>';
      panel.innerHTML = html; items = panel.querySelectorAll('[role=option]'); sel = -1;
    }
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { render(); open(); if (isPage) renderPage(input.value); }, 40); });
    input.addEventListener('focus', function () { render(); open(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach(function (it, i) { it.setAttribute('aria-selected', i === sel ? 'true' : 'false'); }); items[sel].scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', items[sel].id || ''); }
      else if (e.key === 'Enter') { if (sel >= 0 && items[sel]) { e.preventDefault(); items[sel].click(); } else { remember(input.value); if (isPage) { e.preventDefault(); renderPage(input.value); close(); } } }
      else if (e.key === 'Escape') { close(); input.blur(); }
      else if (e.key === 'Tab') close();
    });
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (b) { input.value = b.dataset.q; render(); if (isPage) renderPage(input.value); input.focus(); return; }
      var a = e.target.closest('a.search-item'); if (a) remember(input.value);
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
    form.addEventListener('submit', function () { remember(input.value); });

    function renderPage(q) {
      if (window.MMFinder) { window.MMFinder.setQuery(q); return; }
      var results = document.getElementById('results'), intro = document.getElementById('results-intro');
      if (!results) return;
      var res = query(q, 60);
      if (intro) intro.textContent = q ? res.length + ' results for "' + q + '"' : '';
      results.innerHTML = res.map(function (it, i) { return itemHtml(it, q, 'r' + i).replace('class="search-item"', 'class="search-item" style="border:1px solid var(--line);border-radius:var(--r)"'); }).join('');
    }
    if (isPage) { var p = new URLSearchParams(location.search); if (p.get('q')) { input.value = p.get('q'); renderPage(p.get('q')); } }
  }

  document.querySelectorAll('[data-search]').forEach(bind);
  window.MMSearch = { query: query, recent: recent, index: index };
})();
