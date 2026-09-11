// Finder page: filters (region, category, query, near me), list + map in sync, URL state.
(function () {
  var root = document.querySelector('[data-finder]'); var D = window.MM_DATA; if (!root || !D) return;
  var state = { q: '', region: null, cat: null, near: null };
  var results = document.getElementById('results'), empty = document.getElementById('results-empty'), count = root.querySelector('[data-count]'), label = root.querySelector('[data-count-label]'), sortNote = root.querySelector('[data-sort-note]'), clearBtn = root.querySelector('[data-clear]');
  var cards = {}; Array.prototype.forEach.call(results.children, function (c) { cards[c.dataset.slug] = c; });
  var regions = {}; D.regions.forEach(function (r) { regions[r.slug] = r; });
  function inRegion(v, r) { if (!r) return true; if (r.match.state !== v.state) return false; return !r.match.cities || r.match.cities.indexOf(v.city) >= 0; }
  function inCat(v, c) { if (!c) return true; if (c === 'special') return !!v.monday_special; if (c === 'cocktails') return true; return v.type === c; }
  function dist(a, b) { var R = 3958.8, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180; var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2); return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); }
  function apply() {
    var list = D.venues.slice();
    if (state.q) { var ids = {}; window.MMSearch.query(state.q, 200).forEach(function (it, i) { if (it.type === 'venue') ids[it.id] = i; }); list = list.filter(function (v) { return ids[v.slug] !== undefined; }).sort(function (a, b) { return ids[a.slug] - ids[b.slug]; }); }
    list = list.filter(function (v) { return inRegion(v, regions[state.region]) && inCat(v, state.cat); });
    if (state.near) { list.forEach(function (v) { v._d = dist(state.near, v); }); list.sort(function (a, b) { return a._d - b._d; }); }
    else if (!state.q) list.sort(function (a, b) { return (b.featured - a.featured) || a.name.localeCompare(b.name); });
    var frag = document.createDocumentFragment();
    list.forEach(function (v) { var c = cards[v.slug]; if (!c) return; var d = c.querySelector('.v-dist'); if (state.near) { if (!d) { d = document.createElement('span'); d.className = 'v-dist'; c.querySelector('.v-foot').appendChild(d); } d.textContent = (v._d < 10 ? v._d.toFixed(1) : Math.round(v._d)) + ' mi'; } else if (d) d.remove(); frag.appendChild(c); });
    results.innerHTML = ''; results.appendChild(frag);
    empty.hidden = list.length > 0;
    count.textContent = list.length;
    var parts = [];
    if (state.cat) parts.push({ special: 'with a Monday special', cocktails: 'with mezcal cocktails', restaurant: 'restaurants', bar: 'bars and lounges', hotel: 'hotels and casinos' }[state.cat]);
    if (state.region) parts.push('in ' + regions[state.region].name);
    if (state.q) parts.push('for "' + state.q + '"');
    label.textContent = (parts.length ? parts.join(' ') : 'places pour mezcal');
    sortNote.textContent = state.near ? 'Sorted by distance from you' : '';
    root.querySelectorAll('[data-region]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.region === state.region ? 'true' : 'false'); });
    root.querySelectorAll('[data-cat]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.cat === state.cat ? 'true' : 'false'); });
    clearBtn.hidden = !(state.q || state.region || state.cat || state.near);
    var m = document.querySelector('[data-map]'); if (m && m._mm) m._mm.setList(list.map(function (v) { return v.slug; }));
    var p = new URLSearchParams(); if (state.q) p.set('q', state.q); if (state.region) p.set('region', state.region); if (state.cat) p.set('cat', state.cat);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-region]'); if (b) { state.region = state.region === b.dataset.region ? null : b.dataset.region; state.near = null; apply(); if (state.region) { var m = document.querySelector('[data-map]'); } return; }
    var c = e.target.closest('[data-cat]'); if (c) { state.cat = state.cat === c.dataset.cat ? null : c.dataset.cat; apply(); return; }
    if (e.target.closest('[data-clear]')) { state = { q: '', region: null, cat: null, near: null }; var inp = root.querySelector('.search-input'); if (inp) inp.value = ''; apply(); return; }
    var n = e.target.closest('[data-near]'); if (n) near(n);
  });
  function near(btn) {
    if (!navigator.geolocation) { window.MMToast('Location is not available in this browser'); return; }
    btn.disabled = true; btn.textContent = 'Locating';
    navigator.geolocation.getCurrentPosition(function (pos) {
      state.near = { lat: pos.coords.latitude, lng: pos.coords.longitude }; state.region = null; btn.disabled = false; btn.innerHTML = (D.icons.crosshair || '') + ' Near me';
      apply();
      var m = document.querySelector('[data-map]'); if (m && m._mm) { m._mm.setMe(state.near.lat, state.near.lng); m._mm.flyTo(state.near.lat, state.near.lng, 10); }
      var nearest = D.venues.map(function (v) { return v._d; }).filter(function (x) { return x !== undefined; }).sort(function (a, b) { return a - b; })[0];
      if (nearest > 60) window.MMToast('Nearest mezcal is ' + Math.round(nearest) + ' miles away. We are working on your city.');
    }, function () { btn.disabled = false; btn.innerHTML = (D.icons.crosshair || '') + ' Near me'; window.MMToast('Could not get your location'); }, { timeout: 8000, maximumAge: 300000 });
  }
  var p = new URLSearchParams(location.search);
  state.q = p.get('q') || ''; state.region = p.get('region') && regions[p.get('region')] ? p.get('region') : null; state.cat = p.get('cat') || null;
  var inp = root.querySelector('.search-input'); if (inp && state.q) inp.value = state.q;
  window.MMFinder = { setQuery: function (q) { state.q = q.trim(); apply(); }, state: state, apply: apply };
  if (p.get('near')) { var nb = root.querySelector('[data-near]'); if (nb) near(nb); }
  if (window.L && document.querySelector('[data-map]') && document.querySelector('[data-map]')._mm) apply(); else window.addEventListener('mm:map-ready', apply, { once: true });
  apply();
})();
