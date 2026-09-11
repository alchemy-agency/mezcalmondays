/* EatMap: the corner on a Leaflet map. Four restaurants, free parking, landmarks and the walking loop between them.
   Tiles are CARTO raster basemaps that follow the site theme. No network calls beyond the tiles. */
(function () {
  const DATA = window.EAT_DATA || {};
  const SITE = DATA.site || {};
  const RESTAURANTS = Array.isArray(DATA.restaurants) ? DATA.restaurants : [];
  const PARKING = Array.isArray(SITE.parking) ? SITE.parking : [];
  const LANDMARKS = Array.isArray(SITE.landmarks) ? SITE.landmarks : [];

  // Walk the corner clockwise and come back to where you started.
  const LOOP = ['rancho-cantina', 'harvest', 'kaias', 'incontro'];
  const DEFAULT_ZOOM = 17;
  const TILE_MAX_ZOOM = 20;
  const FIT_PADDING = 40;
  const FLY_SECONDS = 0.8;
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  const DOT = ' \u00B7 '; // middle dot, escaped so the file stays plain ASCII like the rest of src/js
  const ACCENT_FALLBACK = '#C4472A';

  // Phosphor regular, copied from node_modules/@phosphor-icons/core/assets/regular/.
  const ICON_CAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M240,104H229.2L201.42,41.5A16,16,0,0,0,186.8,32H69.2a16,16,0,0,0-14.62,9.5L26.8,104H16a8,8,0,0,0,0,16h8v80a16,16,0,0,0,16,16H64a16,16,0,0,0,16-16V184h96v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V120h8a8,8,0,0,0,0-16ZM69.2,48H186.8l24.89,56H44.31ZM216,200H192V176a8,8,0,0,0-8-8H72a8,8,0,0,0-8,8v24H40V120H216Z"/></svg>';
  const ICON_PIN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"/></svg>';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const isNum = (n) => typeof n === 'number' && isFinite(n);
  // Matches the id the legend templates write: lowercase, every run of non-alphanumerics becomes one hyphen.
  const slugify = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const instances = [];
  const maps = [];

  // ---------- small DOM helpers (all no-ops when the hooks are missing) ----------
  function each(sel, fn) {
    let list;
    try { list = document.querySelectorAll(sel); } catch (e) { return; }
    if (!list) return;
    Array.prototype.forEach.call(list, fn);
  }

  function mq(query) {
    try { return window.matchMedia ? window.matchMedia(query) : null; } catch (e) { return null; }
  }
  function prefersReduced() { const m = mq('(prefers-reduced-motion: reduce)'); return !!(m && m.matches); }
  function finePointer() { const m = mq('(hover: hover) and (pointer: fine)'); return !!(m && m.matches); }

  function raf(fn) {
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(fn);
    else if (typeof window.setTimeout === 'function') window.setTimeout(fn, 0);
    else fn();
  }

  function fire(name) {
    try {
      if (typeof window.CustomEvent !== 'function' || !window.dispatchEvent) return;
      window.dispatchEvent(new window.CustomEvent(name));
    } catch (e) { /* events unavailable */ }
  }

  // ---------- theme ----------
  function themeNow() {
    const root = document.documentElement;
    return root && root.dataset && root.dataset.theme === 'dark' ? 'dark' : 'light';
  }
  // Tiles: CARTO light_all / dark_all when a basemaps key is set in data/district.json (map_tiles.carto_key),
  // otherwise OpenStreetMap standard tiles, toned by CSS filters on .map.is-osm .leaflet-tile-pane.
  function cartoKey() {
    try {
      const d = window.EAT_DATA && window.EAT_DATA.site && window.EAT_DATA.site.map_tiles;
      return d && typeof d.carto_key === 'string' ? d.carto_key.trim() : '';
    } catch (e) { return ''; }
  }
  function tileUrl(theme) {
    const key = cartoKey();
    if (key) return 'https://basemaps.cartocdn.com/rastertiles/' + (theme === 'dark' ? 'dark_all' : 'light_all') + '/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(key);
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  }
  function attribution() {
    return cartoKey() ? ATTRIBUTION + ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>' : ATTRIBUTION;
  }
  function accentColor() {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent');
      return (v || '').trim() || ACCENT_FALLBACK;
    } catch (e) { return ACCENT_FALLBACK; }
  }

  // ---------- geometry ----------
  const RAD = Math.PI / 180;
  const EARTH_FT = 20902231; // mean Earth radius in feet

  function feetBetween(a, b) {
    const dLat = (b.lat - a.lat) * RAD;
    const dLng = (b.lng - a.lng) * RAD;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_FT * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // Anything across the corner reads as one minute. Past that, a normal walking pace of 270 feet a minute.
  function walkText(feet) { return feet <= 300 ? '1 min' : Math.ceil(feet / 270) + ' min'; }

  function midpoint(a, b) { return [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2]; }

  function loopPoints() {
    const out = [];
    LOOP.forEach((slug) => {
      const r = RESTAURANTS.find((x) => x && x.slug === slug);
      if (r && isNum(r.lat) && isNum(r.lng)) out.push({ lat: r.lat, lng: r.lng, slug: r.slug, name: r.name });
    });
    if (out.length >= 2) return out;
    return RESTAURANTS
      .filter((r) => r && isNum(r.lat) && isNum(r.lng))
      .map((r) => ({ lat: r.lat, lng: r.lng, slug: r.slug, name: r.name }));
  }

  function cornerPoint() {
    const c = SITE.corner;
    if (c && isNum(c.lat) && isNum(c.lng)) return { lat: c.lat, lng: c.lng };
    const pts = RESTAURANTS.filter((r) => r && isNum(r.lat) && isNum(r.lng));
    if (!pts.length) return null;
    let lat = 0, lng = 0;
    pts.forEach((p) => { lat += p.lat; lng += p.lng; });
    return { lat: lat / pts.length, lng: lng / pts.length };
  }

  // ---------- popups ----------
  function statusLine(r) {
    const H = window.EatHours;
    if (!H || typeof H.statusLine !== 'function') return '';
    try { return H.statusLine(r) || ''; } catch (e) { return ''; }
  }

  function restaurantPopup(r) {
    const links = [`<a href="/r/${esc(r.slug)}/" data-track="map" data-slug="${esc(r.slug)}">Details</a>`];
    if (r.reservation_url) {
      links.push(`<a href="${esc(r.reservation_url)}" target="_blank" rel="noopener" data-track="reserve" data-slug="${esc(r.slug)}">Reserve</a>`);
    }
    return `<strong>${esc(r.name)}</strong>${esc(statusLine(r))}<br>${links.join(DOT)}`;
  }

  function parkingPopup(p) {
    return `<strong>${esc(p.name)}</strong>${esc(p.address)}${p.note ? `<br>${esc(p.note)}` : ''}`;
  }

  function landmarkPopup(l) {
    return `<strong>${esc(l.name)}</strong>${esc(l.note)}`;
  }

  // ---------- icons ----------
  function restaurantIcon(L, letter) {
    return L.divIcon({
      className: 'eat-pin-wrap',
      html: `<div class="eat-pin">${esc(letter)}</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -21],
    });
  }

  function altIcon(L, svg) {
    return L.divIcon({
      className: 'eat-pin-wrap',
      html: `<div class="eat-pin alt">${svg}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -17],
    });
  }

  function walkIcon(L, text) {
    return L.divIcon({
      className: 'walk-label-wrap',
      html: `<span class="walk-label">${esc(text)}</span>`,
      iconSize: [48, 20],
      iconAnchor: [24, 10],
    });
  }

  // ---------- active pin state ----------
  function pinNode(marker) {
    const node = marker && marker.getElement ? marker.getElement() : null;
    if (!node || !node.querySelector) return null;
    return node.querySelector('.eat-pin');
  }

  function markActive(marker) {
    instances.forEach((inst) => {
      inst.pins.forEach((p) => {
        const pin = pinNode(p.marker);
        if (pin && pin.classList) pin.classList.toggle('is-active', p.marker === marker);
      });
    });
  }

  function markLegend(id) {
    each('[data-pin]', (row) => {
      if (row.classList && row.dataset) row.classList.toggle('is-active', !!id && row.dataset.pin === id);
    });
  }

  // Screen readers get the pin's name; Leaflet already makes the marker focusable.
  function applyLabels(inst) {
    inst.pins.forEach((p) => {
      const node = p.marker && p.marker.getElement ? p.marker.getElement() : null;
      if (!node || !node.setAttribute) return;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', p.name);
    });
  }

  // ---------- layers ----------
  function layerState() {
    const state = {};
    instances.forEach((inst) => {
      Object.keys(inst.on).forEach((k) => { if (!(k in state)) state[k] = inst.on[k]; });
    });
    return state;
  }

  function syncToggles(only) {
    const state = layerState();
    each('[data-layer]', (btn) => {
      const key = btn.dataset ? btn.dataset.layer : '';
      if (!key || (only && key !== only) || !(key in state)) return;
      if (btn.setAttribute) btn.setAttribute('aria-pressed', state[key] ? 'true' : 'false');
    });
  }

  function setLayer(name, on) {
    if (name === 'restaurants') on = true; // the four are the point of the map
    instances.forEach((inst) => {
      const group = inst.groups[name];
      if (!group) return;
      inst.on[name] = !!on;
      if (on) {
        if (!inst.map.hasLayer(group)) group.addTo(inst.map);
        applyLabels(inst);
      } else if (inst.map.hasLayer(group)) {
        inst.map.removeLayer(group);
      }
    });
    syncToggles(name);
  }

  // ---------- build one map ----------
  function build(el) {
    const L = window.L;
    if (el._leaflet_id) return null; // a second copy of this script must not fight the first
    const points = loopPoints();
    const center = points.length ? points[0] : cornerPoint();
    if (!center) return null; // no coordinates in the data, draw nothing rather than throw

    const zoomAttr = parseFloat(el.dataset ? el.dataset.zoom : '');
    const zoom = isNum(zoomAttr) && zoomAttr >= 1 && zoomAttr <= TILE_MAX_ZOOM ? zoomAttr : DEFAULT_ZOOM;
    const full = !!(el.dataset && 'full' in el.dataset && el.dataset.full !== 'false');
    const focusId = el.dataset && el.dataset.focus ? String(el.dataset.focus) : '';
    const fine = finePointer();

    const map = L.map(el, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // the page scrolls until the visitor asks the map for the wheel
      doubleClickZoom: true,
      tap: true,
      tapTolerance: 15,
    });
    if (map.dragging && map.dragging.enable) map.dragging.enable(); // Leaflet defaults, touch included

    el.classList.add(cartoKey() ? 'is-carto' : 'is-osm');
    const tiles = L.tileLayer(tileUrl(themeNow()), {
      attribution: attribution(),
      maxZoom: TILE_MAX_ZOOM,
      maxNativeZoom: cartoKey() ? 20 : 19,
    });
    tiles.addTo(map);

    const groups = {
      restaurants: L.layerGroup(),
      parking: L.layerGroup(),
      landmarks: L.layerGroup(),
      loop: L.layerGroup(),
    };
    const inst = {
      el: el,
      map: map,
      tiles: tiles,
      groups: groups,
      line: null,
      targets: Object.create(null),
      pins: [],
      zoom: zoom,
      on: { restaurants: true, parking: true, landmarks: full, loop: true },
    };

    function register(marker, id, name, layer) {
      const rec = { marker: marker, id: id, name: name, layer: layer };
      inst.pins.push(rec);
      if (id) inst.targets[id] = rec;
      if (marker.on) {
        marker.on('popupopen', () => { markActive(marker); markLegend(id); });
        marker.on('popupclose', () => { markActive(null); markLegend(null); });
      }
    }

    RESTAURANTS.forEach((r) => {
      if (!r || !isNum(r.lat) || !isNum(r.lng)) return;
      const letter = r.initial || String(r.name || '?').charAt(0);
      const marker = L.marker([r.lat, r.lng], {
        icon: restaurantIcon(L, letter),
        title: r.name || '',
        alt: r.name || '',
        keyboard: true,
        riseOnHover: fine,
      });
      marker.bindPopup(restaurantPopup(r), { maxWidth: 264, minWidth: 176, autoPanPadding: [24, 24] });
      marker.addTo(groups.restaurants);
      register(marker, r.slug, r.name || '', 'restaurants');
    });

    PARKING.forEach((p) => {
      if (!p || !isNum(p.lat) || !isNum(p.lng)) return;
      const marker = L.marker([p.lat, p.lng], {
        icon: altIcon(L, ICON_CAR),
        title: p.name || '',
        alt: p.name || '',
        keyboard: true,
        riseOnHover: fine,
      });
      marker.bindPopup(parkingPopup(p), { maxWidth: 240, autoPanPadding: [24, 24] });
      marker.addTo(groups.parking);
      register(marker, 'parking-' + slugify(p.name), p.name || '', 'parking');
    });

    LANDMARKS.forEach((l) => {
      if (!l || !isNum(l.lat) || !isNum(l.lng)) return;
      const marker = L.marker([l.lat, l.lng], {
        icon: altIcon(L, ICON_PIN),
        title: l.name || '',
        alt: l.name || '',
        keyboard: true,
        riseOnHover: fine,
      });
      marker.bindPopup(landmarkPopup(l), { maxWidth: 240, autoPanPadding: [24, 24] });
      marker.addTo(groups.landmarks);
      register(marker, 'landmark-' + slugify(l.name), l.name || '', 'landmarks');
    });

    if (points.length >= 2) {
      const ring = points.concat([points[0]]);
      inst.line = L.polyline(ring.map((p) => [p.lat, p.lng]), {
        color: accentColor(),
        weight: 3,
        opacity: 0.85,
        dashArray: '3 9',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      });
      inst.line.addTo(groups.loop);
      for (let i = 0; i < ring.length - 1; i++) {
        const text = walkText(feetBetween(ring[i], ring[i + 1]));
        L.marker(midpoint(ring[i], ring[i + 1]), {
          icon: walkIcon(L, text),
          interactive: false,
          keyboard: false,
          zIndexOffset: -200,
        }).addTo(groups.loop);
      }
    }

    groups.restaurants.addTo(map);
    if (inst.on.parking) groups.parking.addTo(map);
    if (inst.on.landmarks) groups.landmarks.addTo(map);
    if (inst.on.loop) groups.loop.addTo(map);
    applyLabels(inst);

    const target = focusId && inst.targets[focusId] ? inst.targets[focusId] : null;
    if (target && target.marker.getLatLng) {
      map.setView(target.marker.getLatLng(), zoom);
    } else if (points.length >= 2 && L.latLngBounds) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [FIT_PADDING, FIT_PADDING], maxZoom: zoom });
    } else {
      map.setView([center.lat, center.lng], zoom);
    }

    wireWheel(inst);
    wireResize(inst);

    instances.push(inst);
    maps.push(map);
    if (target && target.marker.openPopup) target.marker.openPopup();
    return inst;
  }

  // The wheel belongs to the page until the visitor clicks or tabs into the map, and goes back when they leave.
  function wireWheel(inst) {
    const el = inst.el;
    const map = inst.map;
    const wheel = map.scrollWheelZoom;
    if (!wheel || !wheel.enable) return;
    let over = false;

    function on() { if (!wheel.enabled()) wheel.enable(); }
    function off() { if (wheel.enabled()) wheel.disable(); }

    if (map.on) map.on('click', on);
    if (!el.addEventListener) return;
    el.addEventListener('mouseenter', () => { over = true; });
    el.addEventListener('mouseleave', () => {
      over = false;
      if (!(el.contains && document.activeElement && el.contains(document.activeElement))) off();
    });
    el.addEventListener('focusin', on);
    el.addEventListener('focusout', (e) => {
      const to = e && e.relatedTarget;
      if (!over && !(to && el.contains && el.contains(to))) off();
    });
  }

  // Keeps the map honest when its container changes size (sticky column, revealed section, rotated phone).
  function wireResize(inst) {
    if (typeof window.ResizeObserver !== 'function') return;
    try {
      const ro = new window.ResizeObserver(() => {
        if (inst.map.invalidateSize) inst.map.invalidateSize({ debounceMoveend: true });
      });
      ro.observe(inst.el);
    } catch (e) { /* observer unavailable */ }
  }

  // ---------- public ----------
  function focus(id) {
    const key = id == null ? '' : String(id);
    if (!key) return null;
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      const rec = inst.targets[key];
      if (!rec) continue;
      if (rec.layer && inst.on[rec.layer] === false) setLayer(rec.layer, true);
      const ll = rec.marker.getLatLng ? rec.marker.getLatLng() : null;
      const here = typeof inst.map.getZoom === 'function' ? inst.map.getZoom() : 0;
      const z = Math.max(isNum(here) ? here : 0, inst.zoom);
      if (ll) {
        if (prefersReduced()) { if (inst.map.setView) inst.map.setView(ll, z); }
        else if (inst.map.flyTo) inst.map.flyTo(ll, z, { duration: FLY_SECONDS });
        else if (inst.map.setView) inst.map.setView(ll, z);
      }
      if (rec.marker.openPopup) rec.marker.openPopup();
      markActive(rec.marker);
      markLegend(key);
      return rec.marker;
    }
    return null;
  }

  let retried = false;
  function init() {
    let nodes;
    try { nodes = document.querySelectorAll('[data-map]'); } catch (e) { return; }
    if (!nodes || !nodes.length) return;
    const pending = Array.prototype.filter.call(nodes, (el) => !instances.some((inst) => inst.el === el));
    if (!pending.length) return;

    const L = window.L;
    if (!L || typeof L.map !== 'function') {
      // Leaflet is a separate deferred script; give it one more chance after load, then stop asking.
      if (retried || !window.addEventListener) return;
      retried = true;
      window.addEventListener('load', init, { once: true });
      return;
    }

    let added = 0;
    pending.forEach((el) => { if (build(el)) added++; });
    if (!added) return;
    syncToggles();
    raf(() => fire('eat:map-ready'));
  }

  // ---------- wiring that lives for the page, not for one map ----------
  if (document.addEventListener) {
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('[data-layer]') : null;
      if (!btn || !btn.dataset || !btn.dataset.layer) return;
      setLayer(btn.dataset.layer, btn.getAttribute('aria-pressed') !== 'true');
    });
  }

  if (window.addEventListener) {
    window.addEventListener('eat:theme', (e) => {
      const theme = (e && e.detail && e.detail.theme) || themeNow();
      const url = tileUrl(theme);
      const color = accentColor();
      instances.forEach((inst) => {
        if (inst.tiles && inst.tiles.setUrl) inst.tiles.setUrl(url);
        if (inst.line && inst.line.setStyle) inst.line.setStyle({ color: color });
      });
    });
  }

  window.EatMap = { init: init, focus: focus, maps: maps };

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
