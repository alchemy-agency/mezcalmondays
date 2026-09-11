// Leaflet map with clustering. Venues (or stores) from MM_DATA. Options: data-focus, data-zoom, data-full, data-stores.
(function () {
  var D = window.MM_DATA; if (!D) return;
  var maps = [];
  function tiles(theme) {
    var key = D.site.map_tiles && D.site.map_tiles.carto_key;
    if (key) return L.tileLayer('https://{s}.basemaps.cartocdn.com/' + (theme === 'dark' ? 'dark_all' : 'light_all') + '/{z}/{x}/{y}{r}.png?api_key=' + key, { subdomains: 'abcd', maxZoom: 20, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' });
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' });
  }
  function ini(name) { return name.replace(/^(the|a|an)\s+/i, '').split(/\s+/).filter(function (w) { return /^[a-z0-9]/i.test(w); }).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join(''); }
  function pin(item, kind) {
    var html = kind === 'store' ? '<div class="mm-pin store">' + (D.icons.storefront || 'S') + '</div>' : '<div class="mm-pin" data-slug="' + item.slug + '">' + ini(item.name) + '</div>';
    return L.divIcon({ className: 'mm-pin-wrap', html: html, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -16] });
  }
  function popup(item, kind) {
    var dir = 'https://www.google.com/maps/dir/?api=1&destination=' + item.lat + ',' + item.lng;
    if (kind === 'store') return '<strong>' + item.name + '</strong>' + item.street + ', ' + item.city + '<div class="pl"><a href="' + dir + '" target="_blank" rel="noopener">Directions</a></div>';
    return '<strong>' + item.name + '</strong>' + item.city + ', ' + item.state + '<div class="pl"><a href="/bar/' + item.slug + '/">Details</a><a href="' + dir + '" target="_blank" rel="noopener">Directions</a></div>';
  }
  function init(el) {
    if (!window.L || el._mm) return;
    var kind = el.dataset.stores ? 'store' : 'venue';
    var list = kind === 'store' ? D.stores : D.venues;
    var full = el.dataset.full === 'true';
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    var isOsm = !(D.site.map_tiles && D.site.map_tiles.carto_key);
    el.classList.toggle('is-osm', isOsm);
    var layer = tiles(document.documentElement.dataset.theme).addTo(map);
    window.addEventListener('mm:theme', function (e) { if (isOsm) return; map.removeLayer(layer); layer = tiles(e.detail.theme).addTo(map); });
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
    var cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 44, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 15 });
    var markers = {};
    list.forEach(function (it) {
      var m = L.marker([it.lat, it.lng], { icon: pin(it, kind), title: it.name }).bindPopup(popup(it, kind));
      markers[it.slug] = m; cluster.addLayer(m);
    });
    map.addLayer(cluster);
    var focus = el.dataset.focus;
    if (focus && markers[focus]) { map.setView(markers[focus].getLatLng(), Number(el.dataset.zoom || 15)); setTimeout(function () { markers[focus].openPopup(); }, 300); }
    else if (list.length) map.fitBounds(cluster.getBounds(), { padding: [30, 30], maxZoom: 12 });
    var rec = { el: el, map: map, cluster: cluster, markers: markers, kind: kind, me: null };
    el._mm = rec; maps.push(rec);
    rec.setList = function (slugs) {
      cluster.clearLayers();
      var b = [];
      list.forEach(function (it) { if (!slugs || slugs.indexOf(it.slug) >= 0) { cluster.addLayer(markers[it.slug]); b.push([it.lat, it.lng]); } });
      if (b.length) map.fitBounds(b, { padding: [30, 30], maxZoom: 13 });
    };
    rec.setMe = function (lat, lng) {
      if (rec.me) map.removeLayer(rec.me);
      rec.me = L.marker([lat, lng], { icon: L.divIcon({ className: 'mm-pin-wrap', html: '<div class="mm-pin me">' + (D.icons.crosshair || '') + '</div>', iconSize: [34, 34], iconAnchor: [17, 17] }), zIndexOffset: 1000, interactive: false }).addTo(map);
    };
    rec.flyTo = function (lat, lng, z) { map.flyTo([lat, lng], z || 11, { duration: 0.8 }); };
    window.dispatchEvent(new CustomEvent('mm:map-ready', { detail: rec }));
  }
  function boot() { document.querySelectorAll('[data-map]').forEach(init); }
  if (window.L) boot(); else window.addEventListener('load', boot);
  window.MMMap = { maps: maps, init: init };
})();
