/* EatSearch: predictive directory search over the four restaurants, the ten ways to eat and their menus.
   The index is built once from window.EAT_DATA. Scoring mixes exact and prefix hits on names, keyword and
   synonym hits, character bigram similarity (Dice) and a bounded Damerau-Levenshtein pass for typos, then
   adds time-aware boosts from EatHours and a small model that learns from what gets tapped.
   The model is a bag of feature weights in localStorage. Nothing leaves this browser. */
(function () {
  // Loaded twice (a stray second script tag) means rebind, not a second set of listeners.
  if (window.EatSearch && typeof window.EatSearch.init === 'function') { window.EatSearch.init(); return; }

  // ---------- Tuning ----------
  const LEARN_RATE = 0.15;      // w[f] += 0.15 * (1 - w[f]) on a touched feature
  const DECAY = 0.98;           // every other feature decays on each event
  const FLOOR = 0.004;          // weights under this are dropped so storage stays small
  const LEARN_SCALE = 3;        // how far the learned affinity can move a score
  const DEBOUNCE = 40;          // ms between keystroke and render
  const MAX_ITEMS = 8;          // rows in the suggestions panel
  const MAX_RECENT = 6;
  const ROTATE_MS = 3500;       // placeholder cycle
  const KEY_PROFILE = 'eat.profile.v1';
  const KEY_RECENT = 'eat.recent.v1';
  const FIELD_W = { name: 10, key: 5, text: 2 };
  const PRIOR = { restaurant: 0.9, category: 0.7, service: 0.5, dish: 0.35, drink: 0.35, dessert: 0.3 };
  const GROUP = {
    restaurant: 'Restaurants', category: 'Ways to eat', service: 'Ways to eat',
    dish: 'Dishes and drinks', drink: 'Dishes and drinks', dessert: 'Dishes and drinks',
  };
  const PLACEHOLDERS = [
    'Search late night',
    'Search tacos and mezcal',
    'Search mai tai',
    'Search weekend brunch',
    'Search private dining',
    'Search hula pie',
  ];
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  // Dropped from a multi word query. "to", "on" and "off" stay: they carry meaning on this menu.
  const STOP = { a: 1, an: 1, the: 1, and: 1, or: 1, of: 1, for: 1, with: 1, my: 1, me: 1, i: 1, is: 1, are: 1, it: 1, any: 1, some: 1, please: 1 };

  // Phosphor regular, path data copied from node_modules/@phosphor-icons/core/assets/regular/.
  const ICON_RECENT = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0Zm-8-48A95.44,95.44,0,0,0,60.08,60.15C52.81,67.51,46.35,74.59,40,82V64a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16H49c7.15-8.42,14.27-16.35,22.39-24.57a80,80,0,1,1,1.66,114.75,8,8,0,1,0-11,11.64A96,96,0,1,0,128,32Z"/></svg>';
  const ICON_FIND = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg>';

  const SERVICE_LABEL = {
    brunch: 'Brunch', lunch: 'Lunch', dinner: 'Dinner', late_night: 'Late Night',
    private_dining: 'Private Dining', catering: 'Catering', takeout: 'Takeout', delivery: 'Delivery',
    secret_menu: 'Secret Menu', industry_specials: 'Industry Specials', happy_hour: 'Happy Hour',
    full_bar: 'Full Bar', patio: 'Patio', live_music: 'Live Music', reservations: 'Reservations',
    kids_menu: 'Kids Menu', dog_friendly: 'Dog Friendly',
  };

  // Synonym map from DESIGN.md. Keys are index ids, values ride in the keyword field.
  const SYNONYMS = {
    'r:rancho-cantina': ['tacos', 'taco'],
    'r:incontro': ['pasta', 'italian'],
    'r:kaias': ['tiki', 'mai tai', 'hawaiian'],
    'r:harvest': ['farm to table', 'seasonal'],
    'c:late-night': ['nightcap', 'late', 'after dinner', 'dessert'],
    'c:industry-specials': ['industry', 'foh', 'boh', 'service industry'],
    'c:brunch': ['brunch', 'mimosa'],
    'c:takeout': ['to go'],
    'c:delivery': ['doordash', 'ubereats'],
    'c:private-dining': ['party', 'event', 'group', 'buyout'],
    'c:catering': ['office', 'party platters'],
    'c:secret-menu': ['off menu', 'hidden'],
  };

  // ---------- Small helpers ----------
  const hasDoc = typeof document !== 'undefined' && !!document;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const data = () => window.EAT_DATA || { restaurants: [], categories: [], site: {} };
  const hours = () => window.EatHours || null;
  const clamp = (n) => (n > 1 ? 1 : n < -1 ? -1 : n);

  function nowCtx() {
    const H = hours();
    if (H && H.now) return H.now();
    const d = new Date();
    return { day: DAYS[d.getDay()], minutes: d.getHours() * 60 + d.getMinutes(), date: d };
  }

  function daypartOf(at) {
    const H = hours();
    if (H && H.daypart) return H.daypart(at);
    const h = at.minutes / 60;
    const weekend = at.day === 'sat' || at.day === 'sun';
    if (h < 11) return weekend ? 'brunch' : 'morning';
    if (h < 14.5) return weekend ? 'brunch' : 'lunch';
    if (h < 17) return 'afternoon';
    if (h < 20) return 'dinner';
    return 'late';
  }

  function hourBucket(h) {
    if (h < 5) return 'late';
    if (h < 11) return 'morning';
    if (h < 15) return 'midday';
    if (h < 17) return 'afternoon';
    if (h < 21) return 'evening';
    return 'late';
  }

  // Lowercase, fold accents, drop punctuation, keep apostrophes inside words.
  function norm(s) {
    let out = String(s == null ? '' : s).toLowerCase();
    if (out.normalize) out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return out
      .replace(/[\u2018\u2019\u02bc]/g, "'")
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9']+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // "Kaia's Island" -> ["kaia's", "kaias", "island"]
  function tokens(s) {
    const out = [];
    const parts = norm(s).split(' ');
    for (let i = 0; i < parts.length; i++) {
      const w = parts[i].replace(/^'+|'+$/g, '');
      if (!w) continue;
      out.push(w);
      if (w.indexOf("'") > -1) out.push(w.replace(/'/g, ''));
    }
    return out;
  }

  // Optimal string alignment Damerau-Levenshtein, gives up as soon as it passes max.
  function dl(a, b, max) {
    if (a === b) return 0;
    const la = a.length, lb = b.length;
    if (!la) return lb;
    if (!lb) return la;
    if (Math.abs(la - lb) > max) return max + 1;
    let two = null;
    let one = [];
    for (let j = 0; j <= lb; j++) one[j] = j;
    let row = one;
    for (let i = 1; i <= la; i++) {
      row = [i];
      let best = i;
      for (let j = 1; j <= lb; j++) {
        const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        let v = Math.min(row[j - 1] + 1, one[j] + 1, one[j - 1] + cost);
        if (two && i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          v = Math.min(v, two[j - 2] + 1);
        }
        row[j] = v;
        if (v < best) best = v;
      }
      if (best > max) return max + 1;
      two = one;
      one = row;
    }
    return row[lb];
  }

  // Dice coefficient over character bigrams.
  function dice(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const counts = Object.create(null);
    let total = 0;
    for (let i = 0; i < a.length - 1; i++) {
      const g = a.substr(i, 2);
      counts[g] = (counts[g] || 0) + 1;
      total++;
    }
    let hits = 0, seen = 0;
    for (let i = 0; i < b.length - 1; i++) {
      const g = b.substr(i, 2);
      seen++;
      if (counts[g] > 0) { counts[g]--; hits++; }
    }
    return (2 * hits) / (total + seen);
  }

  // How well one query token matches one indexed token, 0 to 1. Typo tolerance is off for long
  // free text (descriptions), where a distance-2 hit on a stray word is noise rather than a match.
  function strengthOne(q, w, fuzzy) {
    if (q === w) return 1;
    const lq = q.length, lw = w.length;
    if (lq >= 2 && lw > lq && w.lastIndexOf(q, 0) === 0) return lq >= 3 ? 0.7 + 0.25 * (lq / lw) : 0.45;
    if (lq >= 4 && lw > lq && w.indexOf(q) > 0) return 0.5;
    if (fuzzy === false) return 0;
    if (lq >= 4 && lw >= 4 && Math.abs(lq - lw) <= 2) {
      const d = dl(q, w, 2);
      // A typo hit never outranks a literal keyword hit, so it sits just under the contains score.
      if (d === 1) return 0.5;
      // Distance 2 on a five-letter word is half the word, so ask for a longer token first.
      if (d === 2 && Math.min(lq, lw) >= 6) return 0.35;
    }
    if (lq >= 3 && lw >= 3 && Math.abs(lq - lw) <= 3) {
      const g = dice(q, w);
      if (g >= 0.7) return 0.3 + 0.2 * g;
    }
    return 0;
  }

  function strength(tok, field, fuzzy) {
    if (!field || !field.list.length) return 0;
    if (field.set[tok] === 1) return 1;
    let best = 0;
    for (let i = 0; i < field.list.length; i++) {
      const s = strengthOne(tok, field.list[i], fuzzy);
      if (s > best) { best = s; if (best === 1) break; }
    }
    return best;
  }

  // A query token is compared against the whole vocabulary once, not once per entry. The result is a
  // flat [word, strength, word, strength, ...] list of the words it can match, cached between keystrokes.
  let SIM = Object.create(null);
  let SIM_KEYS = [];

  function simPairs(tok, fuzzy) {
    const key = (fuzzy ? 'f ' : 'p ') + tok;
    if (SIM[key]) return SIM[key];
    const vocab = fuzzy ? VOCAB_KEY : VOCAB_TEXT;
    const pairs = [];
    for (let i = 0; i < vocab.length; i++) {
      const s = strengthOne(tok, vocab[i], fuzzy);
      if (s > 0) { pairs.push(vocab[i]); pairs.push(s); }
    }
    if (SIM_KEYS.length > 400) { SIM = Object.create(null); SIM_KEYS = []; }
    SIM[key] = pairs;
    SIM_KEYS.push(key);
    return pairs;
  }

  function bestIn(pairs, field) {
    let best = 0;
    for (let i = 0; i < pairs.length; i += 2) {
      if (pairs[i + 1] > best && field.set[pairs[i]] === 1) best = pairs[i + 1];
    }
    return best;
  }

  function fieldOf(parts) {
    const list = [];
    const set = Object.create(null);
    for (let i = 0; i < parts.length; i++) {
      const t = tokens(parts[i]);
      for (let j = 0; j < t.length; j++) {
        if (set[t[j]] !== 1) { set[t[j]] = 1; list.push(t[j]); }
      }
    }
    return { list, set };
  }

  // ---------- Storage ----------
  function readStore(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) { return null; }
  }
  function writeStore(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (err) { return false; }
  }
  function dropStore(key) {
    try { window.localStorage.removeItem(key); } catch (err) { /* private mode */ }
  }

  // ---------- The on-device model ----------
  let profileCache = null;

  function profile() {
    if (!profileCache) {
      const saved = readStore(KEY_PROFILE);
      const w = saved && saved.w && typeof saved.w === 'object' ? saved.w : {};
      const clean = {};
      Object.keys(w).forEach((f) => { if (typeof w[f] === 'number' && isFinite(w[f])) clean[f] = clamp(w[f]); });
      profileCache = { w: clean, n: saved && isFinite(saved.n) ? Number(saved.n) : 0 };
    }
    return profileCache;
  }

  function learn(event) {
    const ev = event || {};
    const p = profile();
    const at = nowCtx();
    const touched = [];
    if (ev.restaurant) touched.push('r:' + ev.restaurant);
    if (ev.category) touched.push('c:' + ev.category);
    touched.push('dp:' + daypartOf(at));
    touched.push('h:' + hourBucket(Math.floor(at.minutes / 60)));
    const hit = Object.create(null);
    touched.forEach((f) => { hit[f] = 1; });
    Object.keys(p.w).forEach((f) => {
      if (hit[f] === 1) return;
      const v = clamp(p.w[f] * DECAY);
      if (Math.abs(v) < FLOOR) delete p.w[f]; else p.w[f] = v;
    });
    touched.forEach((f) => {
      const cur = typeof p.w[f] === 'number' ? p.w[f] : 0;
      p.w[f] = clamp(cur + LEARN_RATE * (1 - cur));
    });
    p.n = (p.n || 0) + 1;
    writeStore(KEY_PROFILE, p);
    return p;
  }

  function reset() {
    profileCache = { w: {}, n: 0 };
    dropStore(KEY_PROFILE);
    return profileCache;
  }

  // Affinity for a restaurant: its own weight plus what the profile thinks of the services it runs.
  // With ctx.category only that one service counts, which is what rank() uses.
  function boost(r, ctx) {
    if (!r) return 0;
    const p = profile();
    const rest = typeof r === 'string' ? bySlug()[r] : (r.slug && r.services ? r : bySlug()[r.slug || r.restaurant || '']);
    if (!rest) {
      if (r && r.type === 'category' && r.service) return p.w['c:' + r.service] || 0;
      return 0;
    }
    let total = p.w['r:' + rest.slug] || 0;
    const services = rest.services || {};
    const pick = ctx && ctx.category ? [ctx.category] : Object.keys(services);
    let sum = 0, count = 0;
    for (let i = 0; i < pick.length; i++) {
      const s = pick[i];
      if (!services[s]) continue;
      count++;
      sum += p.w['c:' + s] || 0;
    }
    if (count) total += ctx && ctx.category ? sum : 0.5 * (sum / count);
    return clamp(total);
  }

  function rank(list, ctx) {
    const arr = Array.isArray(list) ? list.slice() : [];
    return arr
      .map((r, i) => ({ r, i, a: boost(r, ctx) }))
      .sort((x, y) => y.a - x.a || x.i - y.i)
      .map((x) => x.r);
  }

  // ---------- Recent searches ----------
  let recentCache = null;

  function recent(text) {
    if (!recentCache) {
      const saved = readStore(KEY_RECENT);
      recentCache = Array.isArray(saved) ? saved.filter((x) => typeof x === 'string' && x.trim()).slice(0, MAX_RECENT) : [];
    }
    if (typeof text === 'string' && text.trim()) {
      const t = text.trim().replace(/\s+/g, ' ');
      const low = t.toLowerCase();
      recentCache = [t].concat(recentCache.filter((x) => x.toLowerCase() !== low)).slice(0, MAX_RECENT);
      writeStore(KEY_RECENT, recentCache);
    }
    return recentCache.slice();
  }

  // ---------- Index ----------
  let INDEX = null;
  let BY_SLUG = null;
  let VOCAB_KEY = [];   // every token in a name or keyword field, where typos are tolerated
  let VOCAB_TEXT = [];  // every token in a description field, matched literally

  function bySlug() {
    if (!BY_SLUG) {
      BY_SLUG = {};
      data().restaurants.forEach((r) => { BY_SLUG[r.slug] = r; });
    }
    return BY_SLUG;
  }

  function notes(r) {
    const out = [];
    const n = r.service_notes || {};
    Object.keys(n).forEach((k) => { if (n[k]) out.push(String(n[k])); });
    return out;
  }

  function build() {
    const D = data();
    const restaurants = D.restaurants || [];
    const categories = D.categories || [];
    const list = [];
    const covered = {};
    categories.forEach((c) => { if (c.service) covered[c.service] = c; });

    restaurants.forEach((r) => {
      const id = 'r:' + r.slug;
      const labels = [];
      Object.keys(r.services || {}).forEach((s) => { if (r.services[s] && SERVICE_LABEL[s]) labels.push(SERVICE_LABEL[s]); });
      Object.keys(r.services || {}).forEach((s) => { if (r.services[s] && covered[s] && covered[s].alt) labels.push(covered[s].alt); });
      list.push({
        id, type: 'restaurant', title: r.name, slug: r.slug, restaurant: r.slug, service: '',
        prior: PRIOR.restaurant, data: r,
        name: fieldOf([r.name, r.short || '']),
        key: fieldOf([r.cuisine || ''].concat(r.tags || [], labels, SYNONYMS[id] || [])),
        text: fieldOf([r.description || ''].concat(notes(r))),
      });

      (r.dishes || []).forEach((d, i) => {
        if (!d || !d.name) return;
        list.push({
          id: 'd:' + r.slug + ':' + i, type: 'dish', title: d.name, slug: r.slug, restaurant: r.slug, service: '',
          prior: PRIOR.dish, data: d,
          name: fieldOf([d.name]),
          key: fieldOf([d.course || '', r.short || r.name]),
          text: fieldOf([d.desc || '']),
        });
      });

      (r.drinks || []).forEach((d, i) => {
        if (!d || !d.name) return;
        list.push({
          id: 'k:' + r.slug + ':' + i, type: 'drink', title: d.name, slug: r.slug, restaurant: r.slug, service: '',
          prior: PRIOR.drink, data: d,
          name: fieldOf([d.name]),
          key: fieldOf(['drink cocktail bar', r.short || r.name]),
          text: fieldOf([d.desc || '']),
        });
      });

      const dishNames = {};
      (r.dishes || []).forEach((d) => { if (d && d.name) dishNames[norm(d.name)] = 1; });
      (r.desserts || []).forEach((name, i) => {
        if (!name || dishNames[norm(name)] === 1) return;
        list.push({
          id: 's:' + r.slug + ':' + i, type: 'dessert', title: name, slug: r.slug, restaurant: r.slug, service: '',
          prior: PRIOR.dessert, data: { name, desc: '', price: '' },
          name: fieldOf([name]),
          key: fieldOf(['dessert sweet', r.short || r.name]),
          text: fieldOf([]),
        });
      });
    });

    categories.forEach((c) => {
      const id = 'c:' + c.slug;
      const count = restaurants.filter((r) => r.services && r.services[c.service]).length;
      list.push({
        id, type: 'category', title: c.name, slug: c.slug, restaurant: '', service: c.service || '',
        prior: PRIOR.category, data: c, count,
        name: fieldOf([c.name, c.alt || '']),
        key: fieldOf((c.keywords || []).concat(SYNONYMS[id] || [])),
        text: fieldOf([c.blurb || '']),
      });
    });

    // Services with no category tile of their own (full bar, patio, live music and friends).
    Object.keys(SERVICE_LABEL).forEach((s) => {
      if (covered[s]) return;
      const hits = restaurants.filter((r) => r.services && r.services[s]);
      if (!hits.length) return;
      list.push({
        id: 'v:' + s, type: 'service', title: SERVICE_LABEL[s], slug: '', restaurant: '', service: s,
        prior: PRIOR.service, data: { service: s, label: SERVICE_LABEL[s] }, count: hits.length,
        name: fieldOf([SERVICE_LABEL[s]]),
        key: fieldOf([]),
        text: fieldOf(hits.map((r) => (r.short || r.name) + ' ' + ((r.service_notes && r.service_notes[s]) || ''))),
      });
    });

    const seenKey = Object.create(null);
    const seenText = Object.create(null);
    VOCAB_KEY = [];
    VOCAB_TEXT = [];
    list.forEach((e, i) => {
      e.order = i;
      e.titleToks = tokens(e.title);
      e.titleNorm = norm(e.title);
      e.titleFlat = e.titleNorm.replace(/[^a-z0-9]/g, '');
      e.name.list.concat(e.key.list).forEach((t) => { if (seenKey[t] !== 1) { seenKey[t] = 1; VOCAB_KEY.push(t); } });
      e.text.list.forEach((t) => { if (seenText[t] !== 1) { seenText[t] = 1; VOCAB_TEXT.push(t); } });
    });
    SIM = Object.create(null);
    SIM_KEYS = [];
    return list;
  }

  function index() {
    if (!INDEX) INDEX = build();
    return INDEX;
  }

  // ---------- Scoring ----------
  function isOpenAt(slug, at, cache) {
    if (cache[slug] === undefined) {
      const H = hours();
      const r = bySlug()[slug];
      cache[slug] = !!(H && r && H.isOpen(r, at));
    }
    return cache[slug];
  }

  function timeBoost(e, at, cache) {
    const H = hours();
    if (!H) return 0;
    const evening = at.minutes >= 19 * 60;
    const weekendMorning = (at.day === 'sat' || at.day === 'sun') && at.minutes < 14 * 60;
    let b = 0;
    if (e.restaurant) {
      const r = bySlug()[e.restaurant];
      if (!r) return 0;
      const kitchen = H.status(r.hours, at);
      const bar = r.bar_hours ? H.status(r.bar_hours, at) : null;
      if (kitchen.open || (bar && bar.open)) b += 1.2;
      if (kitchen.open && kitchen.closingSoon && !(bar && bar.open && bar.closes > kitchen.closes)) b -= 0.8;
      const services = r.services || {};
      if (evening && services.late_night && H.openPast(r, 20, at.day)) b += 1;
      if (weekendMorning && services.brunch) b += 1;
      if (e.type !== 'restaurant') b *= 0.6;
      return b;
    }
    if (e.service === 'late_night' && evening) b += 1.4;
    if (e.service === 'brunch' && weekendMorning) b += 1.4;
    return b;
  }

  function learnedBoost(e) {
    if (e.type === 'restaurant') return boost(e.data);
    if (e.restaurant) return 0.5 * boost(bySlug()[e.restaurant]);
    if (e.service) return profile().w['c:' + e.service] || 0;
    return 0;
  }

  function scoreEntry(e, q, at, cache) {
    let sum = 0, matched = 0;
    for (let i = 0; i < q.toks.length; i++) {
      const tok = q.toks[i];
      const sn = bestIn(q.sim[i], e.name) * FIELD_W.name;
      const sk = bestIn(q.sim[i], e.key) * FIELD_W.key;
      const st = bestIn(q.plain[i], e.text) * FIELD_W.text;
      let v = Math.max(sn, sk, st);
      let fields = 0;
      if (sn > 0) fields++;
      if (sk > 0) fields++;
      if (st > 0) fields++;
      if (fields > 1) v += 0.6;
      // "Open now" is a question about the clock, so it answers with places that are open and nothing else.
      if (q.open && (tok === 'open' || tok === 'now')) {
        v = e.type === 'restaurant' && isOpenAt(e.restaurant, at, cache) ? Math.max(v, 6) : 0;
      }
      if (v > 0) { sum += v; matched++; }
    }
    if (!matched) return 0;

    let score = sum * (0.55 + 0.45 * (matched / q.toks.length));

    // The whole title is in the query ("late night" inside "late night tacos").
    if (e.titleToks.length) {
      let full = true;
      for (let i = 0; i < e.titleToks.length && full; i++) {
        let hit = false;
        for (let j = 0; j < q.toks.length && !hit; j++) hit = strengthOne(q.toks[j], e.titleToks[i], true) >= 0.5;
        full = hit;
      }
      if (full) score += 2.5;
    }
    // The query is in the title, worth most when it starts a word there.
    const pos = q.norm.length >= 3 ? e.titleNorm.indexOf(q.norm) : -1;
    if (pos === 0) score += 4;
    else if (pos > 0) score += e.titleNorm.charAt(pos - 1) === ' ' ? 4 : 2.5;
    // Bigram similarity of the whole phrase against the whole title, for the misspelled cases.
    const g = dice(q.flat, e.titleFlat);
    if (g > 0.6) score += 3 * g;

    score += e.prior;
    score += timeBoost(e, at, cache);
    score += LEARN_SCALE * learnedBoost(e);
    return score > 0 ? score : 0;
  }

  // ---------- Result objects ----------
  function statusOf(r, at) {
    const H = hours();
    if (H && H.statusLine) return H.statusLine(r, at);
    return r.cuisine || '';
  }

  function countLine(n) {
    const total = (data().restaurants || []).length || 4;
    return n + ' of ' + total;
  }

  function present(e, score, at) {
    const out = {
      type: e.type, id: e.id, title: e.title, slug: e.slug, restaurant: e.restaurant, service: e.service,
      group: GROUP[e.type] || 'Ways to eat', score: Math.round(score * 1000) / 1000, data: e.data,
      subtitle: '', hint: '', href: '/',
    };
    if (e.type === 'restaurant') {
      out.subtitle = statusOf(e.data, at);
      out.hint = e.data.price || '';
      out.href = '/r/' + e.slug + '/';
    } else if (e.type === 'category') {
      out.subtitle = e.data.blurb || '';
      out.hint = countLine(e.count);
      out.href = '/#c=' + e.slug;
    } else if (e.type === 'service') {
      const hits = (data().restaurants || []).filter((r) => r.services && r.services[e.service]);
      out.subtitle = hits.map((r) => r.short || r.name).join(', ');
      out.hint = countLine(e.count);
      out.href = '/search/?q=' + encodeURIComponent(e.title);
    } else {
      const r = bySlug()[e.restaurant];
      out.subtitle = r ? r.name : '';
      out.hint = (e.data && e.data.price) || '';
      out.href = '/r/' + e.slug + '/#menu';
    }
    return out;
  }

  function query(text, opts) {
    const options = opts || {};
    const limit = typeof options.limit === 'number' ? options.limit : 24;
    let toks = tokens(text);
    if (!toks.length) return [];
    if (toks.length > 1) {
      const kept = toks.filter((t) => STOP[t] !== 1);
      if (kept.length) toks = kept;
    }
    index();
    const q = { norm: norm(text), toks, open: toks.indexOf('open') > -1, sim: [], plain: [] };
    q.flat = q.norm.replace(/[^a-z0-9]/g, '');
    for (let i = 0; i < toks.length; i++) {
      q.sim.push(simPairs(toks[i], true));
      q.plain.push(simPairs(toks[i], false));
    }
    const at = options.at || nowCtx();
    const cache = Object.create(null);
    const list = index();
    const scored = [];
    for (let i = 0; i < list.length; i++) {
      const s = scoreEntry(list[i], q, at, cache);
      if (s > 0) scored.push({ e: list[i], s });
    }
    scored.sort((a, b) => b.s - a.s || a.e.order - b.e.order);
    const out = [];
    for (let i = 0; i < scored.length && out.length < limit; i++) out.push(present(scored[i].e, scored[i].s, at));
    return out;
  }

  // ---------- Panel markup ----------
  function highlight(title, toks) {
    const raw = String(title == null ? '' : title);
    if (!toks || !toks.length) return esc(raw);
    const low = raw.toLowerCase().replace(/[\u2018\u2019\u02bc]/g, "'");
    const marks = [];
    for (let i = 0; i < toks.length; i++) {
      const bare = toks[i].replace(/'/g, '');
      if (bare.length < 2 || !/^[a-z0-9]+$/.test(bare)) continue;
      const re = new RegExp(bare.split('').join("'?"), 'g');
      let m;
      while ((m = re.exec(low)) !== null) {
        if (!m[0].length) { re.lastIndex++; continue; }
        const start = m.index;
        const before = start === 0 ? '' : low.charAt(start - 1);
        if (start === 0 || !/[a-z0-9]/.test(before) || bare.length >= 4) marks.push([start, start + m[0].length]);
      }
    }
    if (!marks.length) return esc(raw);
    marks.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const merged = [];
    for (let i = 0; i < marks.length; i++) {
      const last = merged[merged.length - 1];
      if (last && marks[i][0] <= last[1]) { if (marks[i][1] > last[1]) last[1] = marks[i][1]; }
      else merged.push([marks[i][0], marks[i][1]]);
    }
    let out = '', pos = 0;
    for (let i = 0; i < merged.length; i++) {
      out += esc(raw.slice(pos, merged[i][0])) + '<mark>' + esc(raw.slice(merged[i][0], merged[i][1])) + '</mark>';
      pos = merged[i][1];
    }
    return out + esc(raw.slice(pos));
  }

  function initialOf(r) {
    return (r && (r.initial || (r.name || '').charAt(0))) || '';
  }

  function thumbHtml(row) {
    if (row.icon) return '<span class="thumb">' + row.icon + '</span>';
    if (row.type === 'restaurant') {
      const r = row.data;
      const img = r.images && (r.images.card || r.images.hero);
      if (img) return '<span class="thumb"><img src="/' + esc(img) + '" alt="" loading="lazy"></span>';
      return '<span class="thumb">' + esc(initialOf(r)) + '</span>';
    }
    if (row.type === 'category' || row.type === 'service') return '<span class="thumb">' + esc(row.title.charAt(0)) + '</span>';
    return '<span class="thumb">' + esc(initialOf(bySlug()[row.restaurant])) + '</span>';
  }

  // Suggestion rows stay two lines tall: cut a long blurb at its first sentence or clause.
  function clip(text, max) {
    const t = String(text == null ? '' : text).trim();
    if (t.length <= max) return t;
    const stop = t.search(/[.!?](\s|$)/);
    if (stop > 0 && stop < max) return t.slice(0, stop + 1);
    const comma = t.lastIndexOf(',', max);
    if (comma > max * 0.5) return t.slice(0, comma);
    const space = t.lastIndexOf(' ', max);
    return t.slice(0, space > 0 ? space : max) + '...';
  }

  function itemHtml(row, idx, id, toks) {
    const attrs = [
      'class="search-item"', 'role="option"', 'id="' + esc(id) + '"',
      'aria-selected="false"', 'data-idx="' + idx + '"', 'data-act="' + esc(row.act) + '"',
    ];
    if (row.slug) attrs.push('data-slug="' + esc(row.slug) + '"');
    if (row.restaurant) attrs.push('data-restaurant="' + esc(row.restaurant) + '"');
    if (row.service) attrs.push('data-service="' + esc(row.service) + '"');
    if (row.q) attrs.push('data-q="' + esc(row.q) + '"');
    return '<div ' + attrs.join(' ') + '>' + thumbHtml(row)
      + '<div><div class="t">' + highlight(row.title, toks) + '</div>'
      + (row.subtitle ? '<div class="s">' + esc(clip(row.subtitle, 72)) + '</div>' : '')
      + '</div>'
      + '<div class="k">' + esc(row.hint || '') + '</div></div>';
  }

  function footHtml() {
    return '<div class="search-foot" role="presentation">'
      + '<span>Suggestions learn from what you tap, only on this device.</span>'
      + '<span><kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close</span></div>';
  }

  function actOf(type) {
    if (type === 'restaurant') return 'restaurant';
    if (type === 'category') return 'category';
    if (type === 'service') return 'text';
    return 'dish';
  }

  function rowsFromResults(list) {
    const rows = [];
    for (let i = 0; i < list.length && rows.length < MAX_ITEMS; i++) {
      const res = list[i];
      rows.push({
        act: actOf(res.type), type: res.type, title: res.title, subtitle: res.subtitle, hint: res.hint,
        slug: res.slug, restaurant: res.restaurant, service: res.service, data: res.data,
        group: res.group, score: res.score, q: res.type === 'service' ? res.title : '',
      });
    }
    return rows;
  }

  function starterRows(at) {
    const dp = daypartOf(at);
    const sets = {
      morning: ['Brunch', 'Lunch', 'Open now', 'Takeout'],
      brunch: ['Brunch', 'Mimosa', 'Patio', 'Open now'],
      lunch: ['Lunch', 'Tacos', 'Takeout', 'Open now'],
      afternoon: ['Happy hour', 'Patio', 'Open now', 'Dinner'],
      dinner: ['Dinner', 'Private dining', 'Open now', 'Patio'],
      late: ['Late night', 'Nightcap', 'Open now', 'Dessert'],
    };
    const labels = sets[dp] || sets.dinner;
    const cats = data().categories || [];
    const restaurants = data().restaurants || [];
    return labels.map((label) => {
      const low = label.toLowerCase();
      const row = { act: 'fill', type: 'starter', title: label, subtitle: '', hint: '', q: low, icon: ICON_FIND };
      if (low === 'open now') {
        const H = hours();
        const n = H ? restaurants.filter((r) => H.isOpen(r, at)).length : 0;
        row.subtitle = 'Still serving on the corner';
        row.hint = countLine(n);
        return row;
      }
      const c = cats.find((x) => norm(x.name) === norm(label) || norm(x.alt || '') === norm(label));
      if (c) {
        row.subtitle = c.blurb || '';
        row.hint = countLine(restaurants.filter((r) => r.services && r.services[c.service]).length);
        return row;
      }
      const top = query(label, { limit: 1, at })[0];
      if (top && norm(top.title) === norm(label)) { row.subtitle = top.subtitle || ''; row.hint = top.hint || ''; }
      else if (top) row.subtitle = top.title;
      return row;
    });
  }

  function renderPanel(block, text, list) {
    const trimmed = String(text || '').trim();
    const toks = trimmed ? tokens(trimmed) : [];
    const groups = [];
    const rows = [];

    function bucket(name, row, best) {
      let g = null;
      for (let i = 0; i < groups.length; i++) if (groups[i].name === name) g = groups[i];
      if (!g) { g = { name, rows: [], best: best }; groups.push(g); }
      if (best > g.best) g.best = best;
      g.rows.push(row);
    }

    if (!trimmed) {
      const at = nowCtx();
      const rec = recent();
      const starters = starterRows(at);
      const room = MAX_ITEMS - starters.length;
      rec.slice(0, room > 0 ? room : 0).forEach((t) => {
        bucket('Recent', { act: 'fill', type: 'recent', title: t, subtitle: '', hint: '', q: t, icon: ICON_RECENT }, 2);
      });
      starters.forEach((row) => bucket('Right now', row, 1));
    } else {
      rowsFromResults(list).forEach((row) => bucket(row.group, row, row.score));
      groups.sort((a, b) => b.best - a.best);
    }

    let html = '';
    let idx = 0;
    groups.forEach((g) => {
      html += '<div role="group" aria-label="' + esc(g.name) + '">'
        + '<div class="search-group" aria-hidden="true">' + esc(g.name) + '</div>';
      g.rows.forEach((row) => {
        const id = block.base + '-opt-' + idx;
        row.id = id;
        html += itemHtml(row, idx, id, toks);
        rows.push(row);
        idx++;
      });
      html += '</div>';
    });

    if (!rows.length) {
      html = '<div class="search-empty">No match for ' + esc(trimmed)
        + '. Try late night, brunch, tacos, tiki or private dining.</div>';
    }
    html += footHtml();

    block.items = rows;
    block.sel = -1;
    block.panel.innerHTML = html;
    block.panel.scrollTop = 0;
    openPanel(block);
  }

  // ---------- Results page ----------
  let SERVICE_FIELD = null;

  function matchedServices(r, toks) {
    if (!SERVICE_FIELD) {
      SERVICE_FIELD = {};
      Object.keys(SERVICE_LABEL).forEach((s) => { SERVICE_FIELD[s] = fieldOf([SERVICE_LABEL[s]]); });
    }
    const out = [];
    const services = r.services || {};
    Object.keys(services).forEach((s) => {
      if (!services[s] || !SERVICE_LABEL[s]) return;
      const f = SERVICE_FIELD[s];
      let hit = false;
      for (let i = 0; i < toks.length && !hit; i++) hit = strength(toks[i], f, true) >= 0.55;
      if (hit) out.push(s);
    });
    return out;
  }

  function ownCard(href, thumb, title, why, chips, extra) {
    return '<a class="result" href="' + esc(href) + '"' + (extra || '') + '>'
      + thumb
      + '<span><h4>' + esc(title) + '</h4>'
      + (why ? '<p class="why">' + esc(why) + '</p>' : '')
      + '<span class="meta">' + chips.map((c) => '<span class="chip">' + esc(c) + '</span>').join('') + '</span>'
      + '</span></a>';
  }

  function imgThumb(src) {
    return src ? '<span class="thumb"><img src="/' + esc(src) + '" alt="" loading="lazy"></span>' : '<span class="thumb"></span>';
  }

  function cardHtml(res, toks) {
    if (res.type === 'restaurant') {
      const r = res.data;
      const services = matchedServices(r, toks);
      const why = (services.length && r.service_notes && r.service_notes[services[0]]) || r.cuisine || '';
      const chips = [];
      if (r.price) chips.push(r.price);
      services.slice(0, 2).forEach((s) => chips.push(SERVICE_LABEL[s]));
      const drawer = window.EatDrawer;
      if (drawer && drawer.resultCard) return drawer.resultCard(r, why, chips);
      return ownCard('/r/' + r.slug + '/', imgThumb((r.images && (r.images.card || r.images.hero)) || ''), r.name, why,
        [statusOf(r, nowCtx())].concat(chips), ' data-track="result" data-slug="' + esc(r.slug) + '"');
    }
    if (res.type === 'category') {
      const c = res.data;
      return ownCard('/#c=' + c.slug, imgThumb(c.image || ''), c.name, c.blurb || '', [res.hint],
        ' data-drawer-category="' + esc(c.slug) + '"');
    }
    if (res.type === 'service') {
      return ownCard(res.href, '<span class="thumb"></span>', res.title, res.subtitle, [res.hint], '');
    }
    const r = bySlug()[res.restaurant];
    const chips = [];
    if (res.hint) chips.push(res.hint);
    if (r) chips.push(r.short || r.name);
    return ownCard('/r/' + res.slug + '/#menu', imgThumb((r && r.images && (r.images.card || r.images.hero)) || ''),
      res.title, (res.data && res.data.desc) || '', chips,
      ' data-track="result" data-slug="' + esc(res.slug) + '"');
  }

  function renderResults(block) {
    if (!hasDoc) return;
    const holder = document.getElementById('results');
    if (!holder) return;
    const intro = document.getElementById('results-intro');
    const text = block && block.input ? block.input.value : paramQ();
    const trimmed = String(text || '').trim();
    const toks = tokens(trimmed);

    if (!trimmed) {
      const four = rank(data().restaurants || [], {});
      holder.innerHTML = four.map((r) => cardHtml({ type: 'restaurant', data: r, slug: r.slug }, [])).join('');
      if (intro) intro.textContent = 'Four kitchens on one corner. Type to search hours, menus and ways to eat.';
      return;
    }

    const list = query(trimmed, { limit: 24 });
    holder.innerHTML = list.map((res) => cardHtml(res, toks)).join('');
    if (intro) {
      intro.innerHTML = list.length
        ? list.length + ' result' + (list.length === 1 ? '' : 's') + ' for <strong>' + esc(trimmed) + '</strong>'
        : 'No results for <strong>' + esc(trimmed) + '</strong>. Try late night, brunch, tacos, tiki or private dining.';
    }
  }

  function paramQ() {
    try {
      const m = /[?&]q=([^&]*)/.exec(window.location.search || '');
      return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    } catch (err) { return ''; }
  }

  // ---------- Blocks ----------
  const blocks = [];
  let docBound = false;
  let blockSeq = 0;

  function blockFor(el) {
    for (let i = 0; i < blocks.length; i++) if (blocks[i].el === el) return blocks[i];
    return null;
  }

  function openPanel(block) {
    const on = block.items.length > 0 || block.panel.innerHTML.indexOf('search-empty') > -1;
    block.el.classList.toggle('is-open', on);
    block.input.setAttribute('aria-expanded', on ? 'true' : 'false');
    block.open = on;
    if (!on) block.input.removeAttribute('aria-activedescendant');
  }

  function closePanel(block) {
    block.open = false;
    block.sel = -1;
    block.items = [];
    block.el.classList.remove('is-open');
    block.input.setAttribute('aria-expanded', 'false');
    block.input.removeAttribute('aria-activedescendant');
  }

  function run(block) {
    const text = block.input.value;
    const list = String(text || '').trim() ? query(text, { limit: MAX_ITEMS * 3 }) : [];
    renderPanel(block, text, list);
    if (block.page) renderResults(block);
  }

  function schedule(block) {
    if (block.timer) clearTimeout(block.timer);
    block.timer = setTimeout(() => { block.timer = 0; run(block); }, DEBOUNCE);
  }

  function select(block, i) {
    const nodes = block.panel.querySelectorAll('.search-item');
    for (let n = 0; n < nodes.length; n++) nodes[n].setAttribute('aria-selected', n === i ? 'true' : 'false');
    block.sel = i;
    if (i < 0 || !block.items[i]) { block.input.removeAttribute('aria-activedescendant'); return; }
    block.input.setAttribute('aria-activedescendant', block.items[i].id);
    const node = nodes[i];
    if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
  }

  function move(block, step) {
    if (!block.items.length) return;
    let i = block.sel + step;
    if (i < 0) i = block.items.length - 1;
    if (i >= block.items.length) i = 0;
    select(block, i);
  }

  function go(url) {
    try { window.location.href = url; } catch (err) { /* no navigation available */ }
  }

  function commit(block) {
    const text = String(block.input.value || '').trim();
    if (!text) return;
    recent(text);
    closePanel(block);
    if (block.page) {
      try { window.history.replaceState(null, '', '/search/?q=' + encodeURIComponent(text)); } catch (err) { /* file:// */ }
      renderResults(block);
      return;
    }
    go('/search/?q=' + encodeURIComponent(text));
  }

  function openCategory(block, slug, service) {
    const drawer = window.EatDrawer;
    if (drawer && drawer.showCategory && document.getElementById('drawer')) {
      closePanel(block);
      drawer.showCategory(slug); // the drawer records the tap itself
      return;
    }
    learn({ type: 'search', category: service });
    go('/#c=' + slug);
  }

  function activate(block, row) {
    if (!row) return;
    const typed = String(block.input.value || '').trim();
    if (row.act === 'fill') {
      block.input.value = row.q;
      if (block.input.focus) block.input.focus();
      run(block);
      return;
    }
    if (typed) recent(typed);
    if (row.act === 'restaurant') {
      learn({ type: 'search', restaurant: row.slug });
      go('/r/' + row.slug + '/');
      return;
    }
    if (row.act === 'category') {
      openCategory(block, row.slug, row.service);
      return;
    }
    if (row.act === 'dish') {
      learn({ type: 'search', restaurant: row.restaurant });
      go('/r/' + row.slug + '/#menu');
      return;
    }
    if (!typed) recent(row.q || row.title);
    go('/search/?q=' + encodeURIComponent(row.q || row.title));
  }

  function onKey(block, e) {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'Down') {
      e.preventDefault();
      if (!block.open) run(block);
      move(block, 1);
    } else if (k === 'ArrowUp' || k === 'Up') {
      e.preventDefault();
      if (!block.open) run(block);
      move(block, -1);
    } else if (k === 'Enter') {
      if (block.open && block.sel >= 0 && block.items[block.sel]) {
        e.preventDefault();
        activate(block, block.items[block.sel]);
      } else {
        e.preventDefault();
        commit(block);
      }
    } else if (k === 'Escape' || k === 'Esc') {
      if (block.open) { e.stopPropagation(); closePanel(block); }
    } else if (k === 'Tab') {
      closePanel(block);
    }
  }

  function reduced() {
    try {
      if (document.documentElement.classList.contains('reduced')) return true;
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (err) { return false; }
  }

  function startRotate(block) {
    if (block.rotate || reduced()) return;
    let i = 0;
    block.rotate = setInterval(() => {
      if (document.hidden) return;
      if (block.input.value || block.open || block.input === document.activeElement) return;
      i = (i + 1) % PLACEHOLDERS.length;
      block.input.setAttribute('placeholder', PLACEHOLDERS[i]);
    }, ROTATE_MS);
  }

  function bind(el) {
    const found = blockFor(el);
    if (found) return found;
    const input = el.querySelector('.search-input');
    const panel = el.querySelector('.search-panel');
    if (!input || !panel) return null;
    const block = {
      el, input, panel,
      form: el.querySelector('form'),
      page: el.hasAttribute('data-page'),
      base: 'eat-search-' + (++blockSeq),
      items: [], sel: -1, open: false, timer: 0, rotate: 0,
    };
    blocks.push(block);

    if (!panel.id) panel.id = block.base + '-panel';
    if (!input.getAttribute('aria-controls')) input.setAttribute('aria-controls', panel.id);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    panel.setAttribute('role', 'listbox');

    input.addEventListener('input', () => schedule(block));
    input.addEventListener('focus', () => run(block));
    input.addEventListener('keydown', (e) => onKey(block, e));
    el.addEventListener('focusout', () => {
      setTimeout(() => { if (!el.contains(document.activeElement)) closePanel(block); }, 0);
    });
    panel.addEventListener('mousedown', (e) => { e.preventDefault(); });
    panel.addEventListener('click', (e) => {
      const node = e.target.closest ? e.target.closest('.search-item') : null;
      if (!node) return;
      e.preventDefault();
      activate(block, block.items[Number(node.getAttribute('data-idx'))]);
    });
    if (block.form) block.form.addEventListener('submit', (e) => { e.preventDefault(); commit(block); });

    startRotate(block);
    return block;
  }

  function whenReady(fn) {
    if (!hasDoc) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(fn, 0), { once: true });
      return;
    }
    setTimeout(fn, 0);
  }

  function init() {
    if (!hasDoc || !document.querySelectorAll) return;
    const wraps = document.querySelectorAll('[data-search]');
    for (let i = 0; i < wraps.length; i++) bind(wraps[i]);

    if (!docBound) {
      docBound = true;
      document.addEventListener('click', (e) => {
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.open && !b.el.contains(e.target)) closePanel(b);
        }
      });
    }

    const page = document.querySelector('[data-search][data-page]');
    const holder = document.getElementById('results');
    if (!holder) return;
    const block = page ? blockFor(page) : null;
    const q = paramQ();
    if (block && block.input && q && !block.input.value) block.input.value = q;
    // app.js defines EatDrawer after this file loads, so paint once the deferred scripts are done.
    whenReady(() => renderResults(block));
  }

  window.EatSearch = { init, query, profile, learn, rank, boost, reset, recent };
  init();
})();
