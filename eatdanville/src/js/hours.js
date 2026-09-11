/* EatHours: shared opening-hours logic (kitchen and bar), time-aware status lines and the "tonight" board.
   Hours shape: { mon: [["11:30","21:00"]], ... } in local 24h time. A close time earlier than its open time means after midnight. */
(function () {
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const LABEL = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

  const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };

  function fmt(t) {
    const m = typeof t === 'number' ? ((t % 1440) + 1440) % 1440 : toMin(t);
    const h = Math.floor(m / 60), mm = m % 60;
    const hh = ((h + 11) % 12) + 1;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return mm ? `${hh}:${String(mm).padStart(2, '0')} ${ampm}` : `${hh} ${ampm}`;
  }

  function now() {
    const d = new Date();
    return { day: DAYS[d.getDay()], minutes: d.getHours() * 60 + d.getMinutes(), date: d };
  }

  // Expands a day's ranges into absolute minute spans relative to that day's midnight (close may exceed 1440).
  function spans(hours, day) {
    return (hours && hours[day] ? hours[day] : []).map((r) => {
      const o = toMin(r[0]); let c = toMin(r[1]);
      if (c <= o) c += 1440;
      return { open: o, close: c };
    });
  }

  // Status at a given moment for one hours table.
  function status(hours, at) {
    at = at || now();
    const dayIdx = DAYS.indexOf(at.day);
    const yesterday = DAYS[(dayIdx + 6) % 7];
    // A span from yesterday may still be running past midnight.
    for (const s of spans(hours, yesterday)) {
      if (s.close > 1440 && at.minutes < s.close - 1440) return { open: true, closes: s.close - 1440, closingSoon: (s.close - 1440 - at.minutes) <= 45 };
    }
    let next = null;
    for (const s of spans(hours, at.day)) {
      if (at.minutes >= s.open && at.minutes < s.close) return { open: true, closes: s.close % 1440, closingSoon: (s.close - at.minutes) <= 45 };
      if (at.minutes < s.open && (next === null || s.open < next)) next = s.open;
    }
    if (next !== null) return { open: false, opens: next, today: true };
    for (let i = 1; i <= 7; i++) {
      const d = DAYS[(dayIdx + i) % 7];
      const sp = spans(hours, d);
      if (sp.length) return { open: false, opens: sp[0].open, day: d, inDays: i };
    }
    return { open: false, none: true };
  }

  // Human line for a restaurant with kitchen hours and optional bar hours.
  function statusLine(r, at) {
    at = at || now();
    const k = status(r.hours, at);
    const b = r.bar_hours ? status(r.bar_hours, at) : null;
    if (k.open) {
      if (b && b.open && b.closes !== k.closes && b.closes > k.closes) return `Kitchen until ${fmt(k.closes)}, bar until ${fmt(b.closes)}`;
      return k.closingSoon ? `Closing soon, kitchen until ${fmt(k.closes)}` : `Open until ${fmt(k.closes)}`;
    }
    if (b && b.open) return `Bar open until ${fmt(b.closes)}, kitchen closed`;
    if (k.none) return 'Hours not posted';
    if (k.today) return `Opens at ${fmt(k.opens)} today`;
    if (k.inDays === 1) return `Opens tomorrow at ${fmt(k.opens)}`;
    return `Opens ${LABEL[k.day]} at ${fmt(k.opens)}`;
  }

  function isOpen(r, at) {
    at = at || now();
    return status(r.hours, at).open || (r.bar_hours ? status(r.bar_hours, at).open : false);
  }

  // Latest closing minute today (kitchen or bar), or null if closed today.
  function closesTonight(r, day) {
    day = day || now().day;
    let latest = null;
    for (const s of spans(r.hours, day).concat(r.bar_hours ? spans(r.bar_hours, day) : [])) {
      if (latest === null || s.close > latest) latest = s.close;
    }
    return latest;
  }

  // True when the place is still open at the given hour (24h, e.g. 21 for 9 PM) on the given day.
  function openPast(r, hour, day) {
    const c = closesTonight(r, day);
    return c !== null && c > hour * 60;
  }

  // Board of tonight's availability for a list of restaurants.
  function tonight(list, day) {
    day = day || now().day;
    return list.map((r) => {
      const c = closesTonight(r, day);
      const kitchen = spans(r.hours, day);
      const bar = r.bar_hours ? spans(r.bar_hours, day) : [];
      return {
        slug: r.slug, name: r.name, closes: c, closesText: c === null ? 'Closed tonight' : `Until ${fmt(c)}`,
        kitchenCloses: kitchen.length ? Math.max.apply(null, kitchen.map((s) => s.close)) : null,
        barCloses: bar.length ? Math.max.apply(null, bar.map((s) => s.close)) : null,
        past8: c !== null && c > 20 * 60, past9: c !== null && c > 21 * 60, past10: c !== null && c > 22 * 60,
      };
    });
  }

  // Daypart of a moment: brunch, lunch, afternoon, dinner, late.
  function daypart(at) {
    at = at || now();
    const h = at.minutes / 60;
    if (h < 11) return (at.day === 'sat' || at.day === 'sun') ? 'brunch' : 'morning';
    if (h < 14.5) return (at.day === 'sat' || at.day === 'sun') ? 'brunch' : 'lunch';
    if (h < 17) return 'afternoon';
    if (h < 20) return 'dinner';
    if (h < 24) return 'late';
    return 'late';
  }

  window.EatHours = { DAYS, LABEL, toMin, fmt, now, spans, status, statusLine, isOpen, closesTonight, openPast, tonight, daypart };
})();
