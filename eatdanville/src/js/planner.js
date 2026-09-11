/* EatPlanner: "Plan my night". Builds a two-stop itinerary out of the posted hours, the mood chips and the
   preference chips, keeps a readable reason for every pick, and hands back a calendar file, a copyable plan
   and a share link. No network calls, no scroll listeners, no animation of its own. */
(function () {
  'use strict';

  const H = window.EatHours;
  const DATA = window.EAT_DATA || {};
  const LIST = Array.isArray(DATA.restaurants) ? DATA.restaurants : [];
  const SITE = DATA.site || {};

  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_PLURAL = { sun: 'Sundays', mon: 'Mondays', tue: 'Tuesdays', wed: 'Wednesdays', thu: 'Thursdays', fri: 'Fridays', sat: 'Saturdays' };

  const DINNER_LEN = 90;      // minutes blocked for the first stop
  const NIGHTCAP_LEN = 60;    // minutes blocked for the second stop
  const DINNER_RUNWAY = 75;   // a dinner needs this much kitchen time left
  const NIGHTCAP_RUNWAY = 30; // a nightcap needs this much bar time left
  const GAP = 105;            // dinner start to nightcap start
  const DINNER_TRADE = 2;     // dinner score we will give up to keep a second stop alive
  const SHOW_RUNWAY = 45;     // one stop after a show needs a proper sit, not a last call
  const WALK_SPEED = 80;      // meters a minute, the pace of a full sidewalk

  const SPIRIT_TAGS = ['tequila', 'mezcal', 'whiskey', 'bourbon', 'rum', 'amaro', 'wine', 'mai tai'];
  const COCKTAIL_TAGS = ['tiki', 'mezcal', 'whiskey'];
  const COCKTAIL_DETAIL = ['mezcal', 'whiskey', 'bourbon', 'rum', 'tiki', 'mai tai', 'margaritas', 'manhattan', 'amaro', 'tequila'];

  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ESC_MAP[m]);

  /* Phosphor regular, copied from node_modules/@phosphor-icons/core/assets/regular/. */
  const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">';
  const ICON = {
    walk: SVG_OPEN + '<path d="M152,80a32,32,0,1,0-32-32A32,32,0,0,0,152,80Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,32Zm64,112a8,8,0,0,1-8,8c-35.31,0-52.95-17.81-67.12-32.12-2.74-2.77-5.36-5.4-8-7.84l-13.43,30.88,37.2,26.57A8,8,0,0,1,160,176v56a8,8,0,0,1-16,0V180.12l-31.07-22.2L79.34,235.19A8,8,0,0,1,72,240a7.84,7.84,0,0,1-3.19-.67,8,8,0,0,1-4.15-10.52l54.08-124.37c-9.31-1.65-20.92,1.2-34.7,8.58a163.88,163.88,0,0,0-30.57,21.77,8,8,0,0,1-10.95-11.66c2.5-2.35,61.69-57.23,98.72-25.08,3.83,3.32,7.48,7,11,10.57C166.19,122.7,179.36,136,208,136A8,8,0,0,1,216,144Z"/></svg>',
    calendar: SVG_OPEN + '<path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-48-56a8,8,0,0,1-8,8H136v16a8,8,0,0,1-16,0V160H104a8,8,0,0,1,0-16h16V128a8,8,0,0,1,16,0v16h16A8,8,0,0,1,160,152Z"/></svg>',
    copy: SVG_OPEN + '<path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/></svg>',
    share: SVG_OPEN + '<path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Zm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z"/></svg>',
    reserve: SVG_OPEN + '<path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z"/></svg>',
    menu: SVG_OPEN + '<path d="M72,88V40a8,8,0,0,1,16,0V88a8,8,0,0,1-16,0ZM216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40ZM200,53.9c-32.17,24.57-38.47,84.42-39.7,106.1H200ZM119.89,38.69a8,8,0,1,0-15.78,2.63L112,88.63a32,32,0,0,1-64,0l7.88-47.31a8,8,0,1,0-15.78-2.63l-8,48A8.17,8.17,0,0,0,32,88a48.07,48.07,0,0,0,40,47.32V224a8,8,0,0,0,16,0V135.32A48.07,48.07,0,0,0,128,88a8.17,8.17,0,0,0-.11-1.31Z"/></svg>',
    details: SVG_OPEN + '<path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/></svg>',
  };

  // ---------- small helpers ----------

  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  function sentence(s) {
    s = clean(s);
    if (!s) return '';
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  // Trims long source copy to one readable line without cutting a word in half.
  function clip(s, max) {
    s = clean(s);
    max = max || 150;
    if (s.length <= max) return sentence(s);
    const stop = s.slice(0, max + 1).lastIndexOf('. ');
    if (stop > 40) return s.slice(0, stop + 1);
    const cut = s.slice(0, max);
    const space = cut.lastIndexOf(' ');
    return sentence(cut.slice(0, space > 40 ? space : max).replace(/[,;:]+$/, ''));
  }

  function joinAnd(list) {
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }

  // Clock face that always shows minutes: 7:00 PM, 8:45 PM.
  function clock(min) {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const hh = ((h + 11) % 12) + 1;
    return hh + ':' + String(m % 60).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  // Loose clock for closing times: 10 PM, 8:30 PM. Falls back when hours.js is missing.
  function fmt(min) {
    if (H && H.fmt) return H.fmt(min);
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const hh = ((h + 11) % 12) + 1;
    const mm = m % 60;
    return (mm ? hh + ':' + String(mm).padStart(2, '0') : String(hh)) + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  function toMin(t) {
    if (typeof t === 'number') return t;
    const parts = String(t || '').split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h)) return NaN;
    return h * 60 + (isNaN(m) ? 0 : m);
  }

  function today() { return H && H.now ? H.now().day : DAYS[new Date().getDay()]; }

  function svc(r, key) { return !!(r && r.services && r.services[key]); }
  function note(r, key) { return r && r.service_notes && r.service_notes[key] ? clean(r.service_notes[key]) : ''; }
  function tagsOf(r) { return Array.isArray(r && r.tags) ? r.tags.map((t) => String(t).toLowerCase()) : []; }
  function pickTags(r, list) { const t = tagsOf(r); return list.filter((x) => t.indexOf(x) !== -1); }
  function hasTag(r, list) { return pickTags(r, list).length > 0; }
  function dessertsOf(r) { return Array.isArray(r && r.desserts) ? r.desserts.filter(Boolean) : []; }
  function nightcapText(r) { return r && r.nightcap && r.nightcap.text ? clean(r.nightcap.text) : ''; }
  function lateText(r) { return r && r.late_night && r.late_night.text ? clean(r.late_night.text) : ''; }
  function shortName(r) { return clean(r && (r.short || r.name)); }

  // ---------- hours ----------

  // Spans for one day plus anything from the night before that is still running.
  function daySpans(hours, day) {
    if (!H || !H.spans || !hours) return [];
    const idx = DAYS.indexOf(day);
    if (idx < 0) return [];
    const out = H.spans(hours, day).map((s) => ({ open: s.open, close: s.close }));
    H.spans(hours, DAYS[(idx + 6) % 7]).forEach((s) => {
      if (s.close > 1440) out.push({ open: s.open - 1440, close: s.close - 1440 });
    });
    return out;
  }

  function unionSpans(list) {
    const sorted = list.slice().sort((a, b) => a.open - b.open);
    const out = [];
    sorted.forEach((s) => {
      const last = out[out.length - 1];
      if (last && s.open <= last.close) { if (s.close > last.close) last.close = s.close; }
      else out.push({ open: s.open, close: s.close });
    });
    return out;
  }

  function spansFor(r, day, withBar) {
    const list = daySpans(r.hours, day).concat(withBar && r.bar_hours ? daySpans(r.bar_hours, day) : []);
    return unionSpans(list);
  }

  // The span covering a moment, or null.
  function windowAt(r, day, at, withBar) {
    const spans = spansFor(r, day, withBar);
    for (let i = 0; i < spans.length; i++) {
      if (at >= spans[i].open && at < spans[i].close) return spans[i];
    }
    return null;
  }

  function lastClose(r, day, withBar) {
    const spans = spansFor(r, day, withBar);
    return spans.length ? spans[spans.length - 1].close : null;
  }

  // The bar pouring past the kitchen is the single best nightcap signal on this corner.
  function barPastKitchen(r, day) {
    if (!r.bar_hours) return null;
    const k = lastClose(r, day, false);
    const b = lastClose(r, day, true);
    return k !== null && b !== null && b > k ? { kitchen: k, bar: b } : null;
  }

  function walkMinutes(a, b) {
    if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return 1;
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const mid = ((a.lat + b.lat) / 2) * rad;
    const x = dLng * Math.cos(mid);
    const meters = Math.sqrt(dLat * dLat + x * x) * 6371000;
    return Math.max(1, Math.round(meters / WALK_SPEED));
  }

  // ---------- preferences and moods ----------

  const PREFS = {
    cocktails: {
      score: (r) => (hasTag(r, COCKTAIL_TAGS) ? 2 : 0),
      reason: (r) => {
        const t = pickTags(r, COCKTAIL_DETAIL);
        return t.length ? 'Cocktails: ' + joinAnd(t.slice(0, 2)) + ' at the bar.' : null;
      },
    },
    dessert: {
      score: (r) => (dessertsOf(r).length ? 2 : 0),
      reason: (r) => {
        const d = dessertsOf(r);
        return d.length ? 'Dessert on site: ' + joinAnd(d.slice(0, 2)) + '.' : null;
      },
    },
    tequila: {
      score: (r) => (r.slug === 'rancho-cantina' ? 2.4 : hasTag(r, ['tequila', 'mezcal']) ? 1.4 : 0),
      reason: (r) => (hasTag(r, ['tequila', 'mezcal']) ? 'The tequila and mezcal bar on the corner.' : null),
    },
    wine: {
      score: (r) => (hasTag(r, ['wine']) ? 2.2 : r.slug === 'incontro' || r.slug === 'harvest' ? 1 : 0),
      reason: (r) => (hasTag(r, ['wine']) ? 'Wine with ' + clip(lowerFirst(r.cuisine), 80) : null),
    },
    tiki: {
      score: (r) => (hasTag(r, ['tiki']) ? 2.4 : 0),
      reason: (r) => {
        const t = pickTags(r, ['mai tai', 'rum']);
        return hasTag(r, ['tiki']) ? 'Tiki: ' + (t.length ? joinAnd(t) + ' at the bar.' : 'the tiki bar on the corner.') : null;
      },
    },
    patio: {
      score: (r) => (svc(r, 'patio') ? 1.6 : 0),
      reason: (r) => (svc(r, 'patio') && note(r, 'patio') ? 'Patio: ' + clip(note(r, 'patio'), 90) : null),
    },
  };

  function lowerFirst(s) {
    s = clean(s);
    return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }

  function spirits(r) { return pickTags(r, SPIRIT_TAGS); }

  const MOODS = {
    date: {
      dinner: { incontro: 3, harvest: 2.4 },
      nightcap: { kaias: 2, 'rancho-cantina': 2 },
      reason: (r) => 'Date night: ' + clip(r.cuisine, 90),
    },
    group: {
      dinner: { kaias: 1.4 },
      nightcap: { kaias: 1.4 },
      service: { private_dining: 2.6 },
      reason: (r) => (svc(r, 'private_dining') && note(r, 'private_dining') ? 'Room for a group: ' + clip(note(r, 'private_dining'), 90) : null),
    },
    solo: {
      dinner: { kaias: 1.2, 'rancho-cantina': 1.2, harvest: 1.2 },
      nightcap: { kaias: 1.2, 'rancho-cantina': 1.2, harvest: 1.2 },
      service: { full_bar: 2.2 },
      reason: (r) => {
        if (!svc(r, 'full_bar')) return null;
        const s = spirits(r);
        return s.length ? 'Solo at the bar: ' + joinAnd(s.slice(0, 2)) + ' by the glass.' : 'Solo at the bar: full bar.';
      },
    },
    // After a show is a single late stop, scored in singleCard rather than through the two slot maps.
    show: {},
  };

  // ---------- scoring ----------

  function Card(r) {
    return {
      r: r,
      score: 0,
      lines: [],
      add: function (weight, text) {
        this.score += weight;
        if (text) this.lines.push({ w: weight, text: clean(text) });
        return this;
      },
      note: function (weight, text) {
        if (text) this.lines.push({ w: weight, text: clean(text) });
        return this;
      },
    };
  }

  function reasonList(card) {
    const seen = {};
    return card.lines
      .slice()
      .sort((a, b) => b.w - a.w)
      .map((x) => x.text)
      .filter((t) => {
        if (!t || seen[t]) return false;
        seen[t] = 1;
        return true;
      });
  }

  function applyPrefs(card, prefs) {
    prefs.forEach((key) => {
      const p = PREFS[key];
      if (!p) return;
      const s = p.score(card.r);
      if (s > 0) card.add(s, p.reason(card.r));
    });
  }

  function applyMood(card, mood, slot) {
    const m = MOODS[mood];
    if (!m) return;
    let hit = 0;
    const bySlug = (slot === 'nightcap' ? m.nightcap : m.dinner) || {};
    if (bySlug[card.r.slug]) hit += bySlug[card.r.slug];
    if (m.service) {
      Object.keys(m.service).forEach((key) => { if (svc(card.r, key)) hit += m.service[key]; });
    }
    if (hit > 0) card.add(hit, m.reason(card.r));
  }

  function applyLearned(card) {
    let boost = 0;
    try {
      if (window.EatSearch && typeof window.EatSearch.boost === 'function') boost = Number(window.EatSearch.boost(card.r)) || 0;
    } catch (e) { boost = 0; }
    if (!boost) return;
    card.score += boost * 1.5;
    if (boost >= 0.2) card.note(Math.min(boost, 1), 'Moved up by what you tap on this device.');
  }

  function stopFrom(card, slot, at, label, win) {
    const r = card.r;
    return {
      slot: slot,
      label: label,
      slug: r.slug,
      name: r.name,
      short: shortName(r),
      address: clean(r.address),
      restaurant: r,
      at: at,
      atText: clock(at),
      minutes: slot === 'nightcap' ? NIGHTCAP_LEN : DINNER_LEN,
      closes: win ? win.close : null,
      closesText: win ? fmt(win.close) : '',
      score: Math.round(card.score * 100) / 100,
      reasons: reasonList(card),
    };
  }

  function dinnerCard(r, day, at, mood, prefs, runway) {
    const win = windowAt(r, day, at, false);
    if (!win || win.close - at < runway) return null;
    const card = Card(r);
    const left = win.close - at;
    card.add(0.9 + (Math.min(left, 300) / 300) * 0.9, 'Kitchen open until ' + fmt(win.close) + ', room for a ' + DINNER_LEN + ' minute dinner.');
    // A bar that outlives its kitchen is worth more as the second stop, so hold it back from dinner.
    if (barPastKitchen(r, day)) card.score -= 0.4;
    applyMood(card, mood, 'dinner');
    applyPrefs(card, prefs);
    applyLearned(card);
    card.note(0.4, sentence(r.cuisine));
    card.win = win;
    return card;
  }

  function nightcapCard(r, day, at, mood, prefs) {
    const win = windowAt(r, day, at, true);
    if (!win || win.close - at < NIGHTCAP_RUNWAY) return null;
    const card = Card(r);
    const left = win.close - at;
    card.add(0.6 + (Math.min(left, 150) / 150) * 1.4, 'Still pouring at ' + clock(at) + ', open until ' + fmt(win.close) + '.');
    const bar = barPastKitchen(r, day);
    if (bar) card.add(2.2, 'Kitchen closes ' + fmt(bar.kitchen) + ', the bar pours until ' + fmt(bar.bar) + '.');
    if (svc(r, 'late_night')) card.add(2, lateText(r) ? clip(lateText(r), 120) : 'Listed for late night on the corner.');
    // A posted nightcap is a small signal but the best paragraph, so the score and the reason weight differ.
    if (nightcapText(r)) card.add(0.6, null).note(2.8, clip(nightcapText(r), 170));
    applyMood(card, mood, 'nightcap');
    applyPrefs(card, prefs);
    applyLearned(card);
    card.note(0.4, sentence(r.cuisine));
    card.win = win;
    return card;
  }

  function singleCard(r, day, at, mood, prefs, runway) {
    const win = windowAt(r, day, at, true);
    if (!win || win.close - at < (runway || NIGHTCAP_RUNWAY)) return null;
    const card = Card(r);
    const left = win.close - at;
    card.add(0.8 + (Math.min(left, 180) / 180) * 1.4, 'Open until ' + fmt(win.close) + ', about ' + left + ' minutes from ' + clock(at) + '.');
    const bar = barPastKitchen(r, day);
    if (bar) card.add(1.4, 'Kitchen closes ' + fmt(bar.kitchen) + ', the bar pours until ' + fmt(bar.bar) + '.');
    if (svc(r, 'late_night')) card.add(1.6, lateText(r) ? clip(lateText(r), 120) : 'Listed for late night on the corner.');
    if (mood === 'show') {
      if (dessertsOf(r).length) card.add(1.2, 'Dessert on site: ' + joinAnd(dessertsOf(r).slice(0, 2)) + '.');
      if (nightcapText(r)) card.note(2.4, 'After the show: ' + clip(nightcapText(r), 150));
    }
    applyMood(card, mood, 'dinner');
    applyPrefs(card, prefs);
    applyLearned(card);
    card.note(0.4, sentence(r.cuisine));
    card.win = win;
    return card;
  }

  function best(cards) {
    let top = null;
    cards.forEach((c) => { if (c && (!top || c.score > top.score)) top = c; });
    return top;
  }

  // ---------- closure notes ----------

  function closureNotes(day, at, skipSlugs) {
    const out = [];
    LIST.forEach((r) => {
      if (skipSlugs.indexOf(r.slug) !== -1) return;
      const spans = spansFor(r, day, true);
      if (!spans.length) { out.push(shortName(r) + ' is closed ' + DAY_PLURAL[day] + '.'); return; }
      const close = spans[spans.length - 1].close;
      if (close <= at) out.push(shortName(r) + ' closes at ' + fmt(close) + ' on ' + DAY_PLURAL[day] + '.');
    });
    return out;
  }

  function theatreNote() {
    const marks = Array.isArray(SITE.landmarks) ? SITE.landmarks : [];
    for (let i = 0; i < marks.length; i++) {
      if (marks[i] && /theatre|theater/i.test(String(marks[i].name || ''))) {
        return 'The ' + clean(marks[i].name).replace(/\s*&.*$/, '') + ' is 1 to 2 minutes up Church Street, so one stop is enough after the curtain.';
      }
    }
    return 'One stop is enough after the curtain.';
  }

  // ---------- the algorithm ----------

  function plan(input) {
    input = input || {};
    const dayIn = String(input.day || 'today').toLowerCase();
    const day = dayIn === 'today' || DAYS.indexOf(dayIn) === -1 ? today() : dayIn;
    let at = toMin(input.time);
    if (isNaN(at) || at < 0 || at > 1439) at = toMin('19:00');
    const mood = MOODS[String(input.mood || '')] ? String(input.mood) : '';
    const prefs = (Array.isArray(input.prefs) ? input.prefs : String(input.prefs || '').split(','))
      .map((p) => clean(p).toLowerCase())
      .filter((p) => !!PREFS[p]);

    const result = { dinner: null, nightcap: null, walkMin: 0, notes: [], day: day, time: clock(at), at: at, mood: mood, prefs: prefs };

    if (!H || !LIST.length) {
      result.notes.push('Hours are still loading. Refresh the page to route the evening.');
      return result;
    }

    const at2 = at + GAP;

    // "After a show" is one late stop, not two.
    if (mood === 'show') {
      const single = best(LIST.map((r) => singleCard(r, day, at, mood, prefs, SHOW_RUNWAY)));
      if (single) {
        result.dinner = stopFrom(single, 'single', at, 'After the show', single.win);
        result.notes.push(theatreNote());
        pushRunwayNote(result, single, at);
      } else {
        result.notes.push('Nothing on the corner is open at ' + clock(at) + ' on ' + DAY_PLURAL[day] + '.');
      }
      result.notes = result.notes.concat(closureNotes(day, at, result.dinner ? [result.dinner.slug] : [])).slice(0, 3);
      return result;
    }

    const dinners = LIST.map((r) => dinnerCard(r, day, at, mood, prefs, DINNER_RUNWAY)).filter(Boolean);
    const ranked = dinners.slice().sort((a, b) => b.score - a.score);

    // The corner lives on cross-visits, so the best dinner gives up a little ground when it is the only
    // kitchen left for the second stop. It trades down by at most DINNER_TRADE, never further.
    let topDinner = ranked[0] || null;
    let topNightcap = null;
    let traded = false;
    for (let i = 0; i < ranked.length; i++) {
      if (ranked[i].score < ranked[0].score - DINNER_TRADE) break;
      const found = best(LIST
        .filter((r) => r.slug !== ranked[i].r.slug)
        .map((r) => nightcapCard(r, day, at2, mood, prefs))
        .filter(Boolean));
      if (found) { topDinner = ranked[i]; topNightcap = found; traded = i > 0; break; }
    }

    if (topDinner) {
      if (traded && topNightcap) topDinner.note(1, 'Eating here first keeps ' + shortName(topNightcap.r) + ' open for the second stop.');
      result.dinner = stopFrom(topDinner, 'dinner', at, 'Dinner', topDinner.win);

      if (topNightcap) {
        result.nightcap = stopFrom(topNightcap, 'nightcap', at2, 'Nightcap', topNightcap.win);
        result.walkMin = walkMinutes(topDinner.r, topNightcap.r);
        const bar = barPastKitchen(topNightcap.r, day);
        if (bar) {
          const gap = bar.bar - bar.kitchen;
          result.notes.push(shortName(topNightcap.r) + ' seats the bar until ' + fmt(bar.bar) + ', ' + (gap === 60 ? 'an hour' : gap + ' minutes') + ' past the kitchen.');
        }
      } else {
        result.notes.push('Nothing else on the corner is open at ' + clock(at2) + ' on ' + DAY_PLURAL[day] + '. Make it one long stop at ' + result.dinner.name + '.');
        pushRunwayNote(result, topDinner, at);
      }
      result.notes = result.notes.concat(closureNotes(day, at, [result.dinner.slug].concat(result.nightcap ? [result.nightcap.slug] : []))).slice(0, 3);
      return result;
    }

    // Nothing has a full dinner runway left. Fall back to the best single stop.
    const openNow = LIST.map((r) => singleCard(r, day, at, mood, prefs)).filter(Boolean);
    const single = best(openNow);

    if (!single) {
      result.notes.push('Nothing on the corner is open at ' + clock(at) + ' on ' + DAY_PLURAL[day] + '.');
      const later = latestTonight(day);
      if (later) result.notes.push('The last kitchen that day is ' + later.name + ', open until ' + fmt(later.close) + '.');
      result.notes = result.notes.concat(closureNotes(day, at, [])).slice(0, 3);
      return result;
    }

    result.dinner = stopFrom(single, 'single', at, 'Dinner', single.win);
    if (openNow.length === 1) {
      result.notes.push('Only ' + single.r.name + ' is open at ' + clock(at) + ' on ' + DAY_PLURAL[day] + '. Make it one long dinner.');
    } else {
      result.notes.push('No kitchen has ' + DINNER_RUNWAY + ' minutes left at ' + clock(at) + ' on ' + DAY_PLURAL[day] + '. One stop it is.');
    }
    pushRunwayNote(result, single, at);
    result.notes = result.notes.concat(closureNotes(day, at, [result.dinner.slug])).slice(0, 3);
    return result;
  }

  function pushRunwayNote(result, card, at) {
    if (!card || !card.win) return;
    const left = card.win.close - at;
    if (left >= DINNER_LEN) return;
    result.notes.push(card.r.name + ' closes at ' + fmt(card.win.close) + ', about ' + left + ' minutes from ' + clock(at) + '.');
  }

  function latestTonight(day) {
    let out = null;
    LIST.forEach((r) => {
      const c = lastClose(r, day, true);
      if (c !== null && (!out || c > out.close)) out = { name: r.name, close: c };
    });
    return out;
  }

  // ---------- plain text, calendar, share ----------

  function walkSentence(min) { return min === 1 ? 'One-minute walk.' : min + '-minute walk.'; }

  function planText(result) {
    const parts = [];
    [result.dinner, result.nightcap].forEach((s) => {
      if (!s) return;
      parts.push(s.atText + ' ' + s.label.toLowerCase() + ' at ' + s.name + (s.address ? ' (' + s.address + ')' : '') + '.');
    });
    if (!parts.length) return result.notes.join(' ');
    if (result.dinner && result.nightcap) parts.push(walkSentence(result.walkMin));
    else if (result.notes.length) parts.push(result.notes[0]);
    return parts.join(' ');
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function localStamp(d) {
    return String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  }

  function utcStamp(d) {
    return String(d.getUTCFullYear()) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  // Midnight of the next occurrence of that weekday. Today counts until the start time passes.
  function baseDate(day, refMin) {
    const now = new Date();
    const target = DAYS.indexOf(day);
    let delta = target < 0 ? 0 : (target - now.getDay() + 7) % 7;
    if (delta === 0 && now.getHours() * 60 + now.getMinutes() >= refMin) delta = 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta, 0, 0, 0, 0);
  }

  function atDate(base, min) {
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(min / 60), min % 60, 0, 0);
  }

  function icsEscape(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function fold(line) {
    if (line.length <= 74) return line;
    const out = [line.slice(0, 74)];
    let rest = line.slice(74);
    while (rest.length > 73) { out.push(' ' + rest.slice(0, 73)); rest = rest.slice(73); }
    if (rest) out.push(' ' + rest);
    return out.join('\r\n');
  }

  function icsText(result) {
    const stops = [result.dinner, result.nightcap].filter(Boolean);
    if (!stops.length) return '';
    const base = baseDate(result.day, result.dinner.at);
    const stamp = utcStamp(new Date());
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Eat Danville//Plan my night//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    stops.forEach((s, i) => {
      const start = atDate(base, s.at);
      const end = new Date(start.getTime() + s.minutes * 60000);
      const bits = [s.reasons[0] || '', s.restaurant.reservation_url ? 'Reserve: ' + s.restaurant.reservation_url : ''].filter(Boolean);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + s.slug + '-' + localStamp(start) + '-' + i + '@eatdanville.com');
      lines.push('DTSTAMP:' + stamp);
      lines.push('DTSTART:' + localStamp(start));
      lines.push('DTEND:' + localStamp(end));
      lines.push('SUMMARY:' + icsEscape(s.label + ' at ' + s.name));
      if (s.address) lines.push('LOCATION:' + icsEscape(s.address + ', Danville, CA'));
      if (bits.length) lines.push('DESCRIPTION:' + icsEscape(bits.join(' ')));
      lines.push('URL:' + icsEscape('https://eatdanville.com/r/' + s.slug + '/'));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  const icsUrls = typeof WeakMap === 'function' ? new WeakMap() : null;

  function icsUrlFor(result, el) {
    let text = '';
    try { text = icsText(result); } catch (e) { text = ''; }
    if (!text) return '';
    if (typeof Blob !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL) return '';
    try {
      if (icsUrls && el && icsUrls.has(el) && URL.revokeObjectURL) URL.revokeObjectURL(icsUrls.get(el));
      const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
      if (icsUrls && el) icsUrls.set(el, url);
      return url;
    } catch (e) { return ''; }
  }

  function chipDay(day) {
    return day === today() ? 'today' : day;
  }

  // Colons and commas are legal in a query value and the share link reads better with them left alone.
  function q(value) {
    return encodeURIComponent(value).replace(/%3A/g, ':').replace(/%2C/g, ',');
  }

  function shareUrl(result) {
    try {
      const loc = window.location || {};
      const base = (loc.origin || '') + (loc.pathname || '/');
      const parts = ['t=' + q(hhmm(result.at))];
      if (result.mood) parts.push('m=' + q(result.mood));
      if (result.prefs && result.prefs.length) parts.push('p=' + q(result.prefs.join(',')));
      parts.push('d=' + q(chipDay(result.day)));
      return base + '?' + parts.join('&') + '#plan';
    } catch (e) { return ''; }
  }

  function hhmm(min) {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }

  function toast(msg) {
    try { if (typeof window.EatToast === 'function') window.EatToast(msg); } catch (e) { /* toast is decoration */ }
  }

  function copyText(text) {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
      }
    } catch (e) { /* fall through */ }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand ? document.execCommand('copy') : false;
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) { return false; }
  }

  // ---------- markup ----------

  function linkChips(r) {
    const out = [];
    const slug = esc(r.slug);
    if (r.reservation_url) out.push('<a class="chip" href="' + esc(r.reservation_url) + '" target="_blank" rel="noopener" data-track="plan" data-slug="' + slug + '">' + ICON.reserve + 'Reserve</a>');
    if (r.menu_url) out.push('<a class="chip" href="' + esc(r.menu_url) + '" target="_blank" rel="noopener" data-track="plan" data-slug="' + slug + '">' + ICON.menu + 'Menu</a>');
    out.push('<a class="chip" href="/r/' + slug + '/" data-track="plan" data-slug="' + slug + '">' + ICON.details + 'Details</a>');
    return out.join('');
  }

  function thumbHtml(r) {
    const src = r.images && (r.images.card || r.images.hero);
    if (!src) return '';
    return '<span class="thumb"><img src="/' + esc(src) + '" alt="" loading="lazy" decoding="async"></span>';
  }

  function stopHtml(stop) {
    const r = stop.restaurant;
    return '<div class="stop">' +
      '<div class="when">' + esc(fmt(stop.at)) + '<small>' + esc(stop.label) + '</small></div>' +
      '<div class="what">' +
        '<h4>' + esc(stop.name) + '</h4>' +
        '<p>' + esc(stop.reasons[0] || sentence(r.cuisine)) + '</p>' +
        thumbHtml(r) +
        '<div class="links">' + linkChips(r) + '</div>' +
      '</div>' +
    '</div>';
  }

  function walkHtml(min) {
    const text = min === 1 ? '1 min across the corner' : min + ' min across the corner';
    return '<div class="walk"><span class="ico">' + ICON.walk + '</span>' + esc(text) + '</div>';
  }

  function emptyHtml(result) {
    const rest = result.notes.slice(1).filter(Boolean).join(' ');
    return '<div class="itin"><div class="stop"><div class="when">' + esc(fmt(result.at)) + '<small>Closed</small></div>' +
      '<div class="what"><h4>Nothing open at that hour</h4><p>' + esc(result.notes[0] || 'Pick an earlier time or another day.') + '</p></div></div></div>' +
      (rest ? '<p class="planner-note">' + esc(rest) + '</p>' : '') +
      '<p class="planner-note">Times use each restaurant\'s posted hours. Reserve to be sure.</p>';
  }

  function resultHtml(result, icsHref) {
    if (!result.dinner) return emptyHtml(result);
    let html = '<div class="itin">' + stopHtml(result.dinner);
    if (result.nightcap) html += walkHtml(result.walkMin) + stopHtml(result.nightcap);
    html += '</div>';

    html += '<div class="planner-actions">';
    if (icsHref) html += '<a class="btn btn-accent btn-sm" href="' + esc(icsHref) + '" download="danville-night.ics" data-plan-ics>Add to calendar<span class="btn-ico">' + ICON.calendar + '</span></a>';
    html += '<button class="btn btn-ghost btn-sm" type="button" data-plan-copy>Copy plan<span class="btn-ico">' + ICON.copy + '</span></button>';
    html += '<button class="btn btn-ghost btn-sm" type="button" data-plan-share>Share<span class="btn-ico">' + ICON.share + '</span></button>';
    html += '</div>';

    const extra = result.notes.filter(Boolean);
    if (extra.length) html += '<p class="planner-note">' + esc(extra.join(' ')) + '</p>';
    html += '<p class="planner-note">Times use each restaurant\'s posted hours. Reserve to be sure.</p>';
    return html;
  }

  // ---------- render ----------

  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  function announce(result) {
    try {
      if (typeof window.CustomEvent !== 'function') return;
      window.dispatchEvent(new window.CustomEvent('eat:plan', { detail: { plan: result, reduced: reduced() } }));
    } catch (e) { /* the event is decoration for motion.js */ }
  }

  function render(result, el) {
    if (!result) return '';
    let target = el;
    if (!target && typeof document !== 'undefined' && document.getElementById) target = document.getElementById('planner-result');
    if (!target) { announce(result); return ''; }

    const href = icsUrlFor(result, target);
    const html = resultHtml(result, href);
    target.innerHTML = html;

    const copyBtn = target.querySelector ? target.querySelector('[data-plan-copy]') : null;
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        copyText(planText(result)).then((ok) => { if (ok !== false) toast('Copied'); });
      });
    }

    const shareBtn = target.querySelector ? target.querySelector('[data-plan-share]') : null;
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = shareUrl(result);
        const text = planText(result);
        let shared = false;
        try {
          if (navigator && typeof navigator.share === 'function') {
            shared = true;
            navigator.share({ title: 'Plan my night', text: text, url: url }).catch(() => { /* the sheet was dismissed */ });
          }
        } catch (e) { shared = false; }
        if (!shared) copyText(url).then((ok) => { if (ok !== false) toast('Link copied'); });
      });
    }

    announce(result);
    return html;
  }

  // ---------- controls ----------

  function readQuery() {
    const out = {};
    let q = '';
    try { q = window.location && window.location.search ? String(window.location.search) : ''; } catch (e) { q = ''; }
    q.replace(/^\?/, '').split('&').forEach((pair) => {
      if (!pair) return;
      const i = pair.indexOf('=');
      let k = '';
      let v = '';
      try {
        k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' ')).trim();
        v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' ')).trim();
      } catch (e) { return; }
      if (k) out[k] = v;
    });
    return out;
  }

  function writeQuery(state) {
    try {
      if (!window.history || !window.history.replaceState || !window.location) return;
      const cur = readQuery();
      cur.t = state.time;
      cur.d = state.dayChip;
      if (state.mood) cur.m = state.mood; else delete cur.m;
      if (state.prefs.length) cur.p = state.prefs.join(','); else delete cur.p;
      const parts = [];
      Object.keys(cur).forEach((k) => {
        if (cur[k] === '' || cur[k] == null) return;
        parts.push(encodeURIComponent(k) + '=' + q(cur[k]));
      });
      window.history.replaceState(null, '', window.location.pathname + (parts.length ? '?' + parts.join('&') : '') + (window.location.hash || ''));
    } catch (e) { /* a locked down history is not a failure */ }
  }

  function learn(category) {
    try {
      if (!window.EatSearch || typeof window.EatSearch.learn !== 'function') return;
      const payload = { type: 'plan' };
      if (category) payload.category = category;
      window.EatSearch.learn(payload);
    } catch (e) { /* the model is optional */ }
  }

  function chipsIn(block, control) {
    const row = block.querySelector('[data-control="' + control + '"]');
    if (!row) return [];
    return Array.prototype.slice.call(row.querySelectorAll('[data-value]'));
  }

  function paintChips(block, state) {
    [['time', state.time], ['mood', state.mood], ['day', state.dayChip]].forEach((pair) => {
      chipsIn(block, pair[0]).forEach((chip) => {
        chip.setAttribute('aria-pressed', chip.dataset.value === pair[1] ? 'true' : 'false');
      });
    });
    chipsIn(block, 'prefs').forEach((chip) => {
      chip.setAttribute('aria-pressed', state.prefs.indexOf(chip.dataset.value) !== -1 ? 'true' : 'false');
    });
  }

  function labelRows(block) {
    Array.prototype.slice.call(block.querySelectorAll('[data-control]')).forEach((row) => {
      if (row.getAttribute('role')) return;
      row.setAttribute('role', 'group');
      const group = row.parentNode;
      const lbl = group && group.querySelector ? group.querySelector('.lbl') : null;
      const text = lbl ? clean(lbl.textContent) : row.getAttribute('data-control');
      if (text) row.setAttribute('aria-label', text);
    });
  }

  function resultElFor(block) {
    const scope = block.closest ? block.closest('.planner') : null;
    let el = scope && scope.querySelector ? scope.querySelector('.planner-result') : null;
    if (!el && typeof document !== 'undefined' && document.getElementById) el = document.getElementById('planner-result');
    return el;
  }

  function initialState(block) {
    const q = readQuery();
    const preset = block.getAttribute ? block.getAttribute('data-preset') : '';
    const timeChips = chipsIn(block, 'time').map((c) => c.dataset.value);
    let time = clean(q.t) || clean(preset) || '19:00';
    if (!/^\d{1,2}:\d{2}$/.test(time)) time = clean(preset);
    if (!/^\d{1,2}:\d{2}$/.test(time)) time = '19:00';
    if (timeChips.length && timeChips.indexOf(time) === -1 && !clean(q.t)) time = timeChips.indexOf(clean(preset)) !== -1 ? clean(preset) : timeChips[0];

    const mood = MOODS[clean(q.m).toLowerCase()] ? clean(q.m).toLowerCase() : '';

    const prefs = clean(q.p)
      .split(',')
      .map((p) => clean(p).toLowerCase())
      .filter((p) => !!PREFS[p]);

    let dayChip = clean(q.d).toLowerCase() || 'today';
    if (dayChip !== 'today' && DAYS.indexOf(dayChip) === -1) dayChip = 'today';
    if (dayChip !== 'today' && dayChip === today()) dayChip = 'today';

    return { time: time, mood: mood, prefs: prefs, dayChip: dayChip };
  }

  function run(block, state, el) {
    const result = plan({ time: state.time, mood: state.mood, prefs: state.prefs, day: state.dayChip });
    paintChips(block, state);
    render(result, el);
    return result;
  }

  function bind(block) {
    if (!block || block.getAttribute('data-planner-bound') === 'true') return;
    const el = resultElFor(block);
    if (!el) return;
    block.setAttribute('data-planner-bound', 'true');

    const state = initialState(block);
    labelRows(block);
    run(block, state, el);

    block.addEventListener('click', (e) => {
      try {
        const chip = e.target && e.target.closest ? e.target.closest('[data-value]') : null;
        if (!chip || !block.contains(chip)) return;
        const row = chip.closest('[data-control]');
        if (!row) return;
        const control = row.getAttribute('data-control');
        const value = chip.dataset.value;
        if (!value) return;
        e.preventDefault();

        if (control === 'prefs' || row.getAttribute('data-multi') === 'true') {
          const i = state.prefs.indexOf(value);
          if (i === -1) state.prefs.push(value); else state.prefs.splice(i, 1);
          learn(value);
        } else if (control === 'mood') {
          state.mood = state.mood === value ? '' : value;
          learn(state.mood || value);
        } else if (control === 'time') {
          state.time = value;
          learn(state.mood || state.prefs[0] || '');
        } else if (control === 'day') {
          state.dayChip = value;
          learn(state.mood || state.prefs[0] || '');
        } else {
          return;
        }

        writeQuery(state);
        run(block, state, el);
      } catch (err) { /* one bad chip must not take the page down */ }
    });
  }

  function init() {
    try {
      if (typeof document === 'undefined' || !document.querySelectorAll) return;
      Array.prototype.slice.call(document.querySelectorAll('[data-planner-controls]')).forEach(bind);
    } catch (e) { /* the planner is absent on most pages */ }
  }

  try {
    if (typeof document !== 'undefined' && document.readyState === 'loading' && document.addEventListener) {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  } catch (e) { /* nothing to bind */ }

  window.EatPlanner = { init: init, plan: plan, render: render };
})();
