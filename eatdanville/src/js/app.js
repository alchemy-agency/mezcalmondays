/* App glue: live status lines, tonight board, category drawer, forms, tabs, toasts, click tracking for the on-device model. */
(function () {
  const D = window.EAT_DATA || { restaurants: [], categories: [], site: {} };
  const H = window.EatHours;
  const bySlug = Object.fromEntries(D.restaurants.map((r) => [r.slug, r]));
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2800);
  }
  window.EatToast = toast;

  // ---------- Live status lines ----------
  function paintStatus() {
    if (!H) return;
    const at = H.now();
    $$('[data-status]').forEach((el) => {
      const r = bySlug[el.dataset.status]; if (!r) return;
      const line = H.statusLine(r, at);
      const k = H.status(r.hours, at);
      const b = r.bar_hours ? H.status(r.bar_hours, at) : null;
      el.textContent = line;
      el.classList.toggle('is-open', !!(k.open || (b && b.open)));
      el.classList.toggle('is-soon', !!(k.open && k.closingSoon && !(b && b.open && b.closes > k.closes)));
    });
    $$('[data-status-short]').forEach((el) => {
      const r = bySlug[el.dataset.statusShort]; if (!r) return;
      const c = H.closesTonight(r);
      el.textContent = c === null ? 'Closed today' : `Until ${H.fmt(c)}`;
    });
    paintTonight(at);
  }

  // ---------- Tonight board ----------
  function paintTonight(at) {
    const boards = $$('[data-tonight]'); if (!boards.length || !H) return;
    at = at || H.now();
    const rows = H.tonight(D.restaurants, at.day);
    const label = at.date.toLocaleDateString(undefined, { weekday: 'long' });
    boards.forEach((board) => {
      const d = $('[data-tonight-date]', board); if (d) d.textContent = label;
      rows.forEach((row) => {
        const el = $(`[data-tonight-row="${row.slug}"]`, board); if (!el) return;
        const r = bySlug[row.slug];
        const time = $('[data-tonight-time]', el); const det = $('[data-tonight-detail]', el);
        const stillOpen = row.closes !== null && row.closes > at.minutes;
        el.classList.toggle('is-closed', !stillOpen);
        if (time) time.textContent = row.closes === null ? 'Closed' : (stillOpen ? H.fmt(row.closes) : `Closed at ${H.fmt(row.closes)}`);
        if (det) {
          if (row.closes === null) det.textContent = r.hours_note && /closed/i.test(r.hours_note) ? r.hours_note : 'Closed tonight';
          else if (row.barCloses && row.kitchenCloses && row.barCloses > row.kitchenCloses) det.textContent = `Kitchen ${H.fmt(row.kitchenCloses)}, bar ${H.fmt(row.barCloses)}`;
          else det.textContent = row.past10 ? 'Kitchen and bar past 10' : row.past9 ? 'Open past 9' : row.past8 ? 'Open past 8' : 'Early night';
        }
      });
    });
  }

  paintStatus();
  setInterval(paintStatus, 60 * 1000);

  // ---------- Directory drawer (category results) ----------
  const drawer = $('#drawer');
  function openDrawer(title, intro, itemsHtml) {
    if (!drawer) return;
    $('#drawer-title').textContent = title;
    $('#drawer-body').innerHTML = `<p class="drawer-intro">${intro}</p>${itemsHtml}`;
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
    const first = $('#drawer-body a, #drawer-body button'); first && first.focus({ preventScroll: true });
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
    if (location.hash.startsWith('#c=')) history.replaceState(null, '', location.pathname + location.search);
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-drawer-close]')) closeDrawer();
    const cat = e.target.closest('[data-drawer-category]');
    if (cat) { e.preventDefault(); showCategory(cat.dataset.drawerCategory); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  function resultCard(r, why, extraChips) {
    const status = H ? H.statusLine(r) : '';
    return `<a class="result" href="/r/${r.slug}/" data-track="result" data-slug="${r.slug}">
      <span class="thumb"><img src="/${r.images.card || r.images.hero}" alt="" loading="lazy"></span>
      <span><h4>${esc(r.name)}</h4><p class="why">${esc(why)}</p><span class="meta"><span class="chip chip-live">${esc(status)}</span>${(extraChips || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</span></span>
    </a>`;
  }

  function showCategory(slug) {
    const c = D.categories.find((x) => x.slug === slug); if (!c) return;
    const hits = D.restaurants.filter((r) => r.services && r.services[c.service]);
    // Rank with the on-device model if present.
    const ranked = window.EatSearch && window.EatSearch.rank ? window.EatSearch.rank(hits, { category: c.service }) : hits;
    let html = ranked.map((r) => resultCard(r, r.service_notes && r.service_notes[c.service] ? r.service_notes[c.service] : r.cuisine, [])).join('');
    if (!hits.length) {
      html = `<div class="card" style="padding:1.25rem"><h4>Not posted yet</h4><p class="small muted" style="margin-top:.4rem">None of the four lists ${esc(c.name.toLowerCase())} right now. ${c.slug === 'industry-specials' ? 'The partners are building it. <a href="/industry/" style="color:var(--accent);font-weight:600">Join the industry list</a> to hear first.' : c.slug === 'secret-menu' ? 'Follow the restaurants on Instagram, where off-menu items get announced.' : 'Check back, the directory updates as the restaurants post it.'}</p></div>`;
    }
    openDrawer(c.name, `${esc(c.blurb)} ${hits.length ? `${hits.length} of 4 on the corner.` : ''}`, html);
    if (window.EatSearch && window.EatSearch.learn) window.EatSearch.learn({ type: 'category', category: c.service });
    history.replaceState(null, '', `#c=${slug}`);
  }
  if (location.hash.startsWith('#c=')) showCategory(location.hash.slice(3));
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#c=')) showCategory(location.hash.slice(3)); });
  window.EatDrawer = { open: openDrawer, close: closeDrawer, resultCard, showCategory };

  // ---------- Click learning ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-track]');
    if (t && window.EatSearch && window.EatSearch.learn) window.EatSearch.learn({ type: t.dataset.track, restaurant: t.dataset.slug });
  });

  // ---------- Tabs ----------
  $$('[data-tabs]').forEach((wrap) => {
    wrap.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]'); if (!tab) return;
      $$('[data-tab]', wrap).forEach((t) => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'));
      $$('[data-panel]', wrap).forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    });
  });

  // ---------- Forms ----------
  $$('form[data-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('.form-msg', form);
      let ok = true;
      $$('.field', form).forEach((f) => {
        const input = $('input, select, textarea', f); if (!input) return;
        const bad = input.required && (!input.value.trim() || (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)));
        f.classList.toggle('is-invalid', !!bad); if (bad) ok = false;
      });
      const consent = $('input[name="consent"]', form);
      if (consent && consent.required && !consent.checked) { ok = false; toast('Please tick the consent box'); }
      if (!ok) return;
      const btn = $('button[type="submit"]', form); btn.disabled = true;
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) });
        const j = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
        if (res.ok && j.ok) {
          msg.textContent = data.type === 'industry' ? 'You are on the list. First message lands when a perk or a night goes live.' : 'Sent. The partnership will reply from hello@eatdanville.com.';
          msg.classList.add('is-on'); form.reset(); toast('Sent');
        } else {
          msg.textContent = j.error || 'Something went wrong. Email hello@eatdanville.com instead.'; msg.classList.add('is-on');
          if (j.field) { const f = $(`[name="${j.field}"]`, form); f && f.closest('.field') && f.closest('.field').classList.add('is-invalid'); }
        }
      } catch (err) {
        msg.textContent = 'No connection. Email hello@eatdanville.com instead.'; msg.classList.add('is-on');
      } finally { btn.disabled = false; }
    });
  });

  // ---------- On phones, bring the hero search up to the top when it takes focus so the suggestions have room ----------
  $$('.hero .search-input').forEach((input) => {
    input.addEventListener('focus', () => {
      if (window.innerWidth >= 900) return;
      const box = input.closest('.search') || input;
      const top = box.getBoundingClientRect().top + window.scrollY - 84;
      if (Math.abs(window.scrollY - top) > 8) window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ---------- Legend rows focus map pins ----------
  document.addEventListener('click', (e) => {
    const row = e.target.closest('[data-pin]'); if (!row) return;
    $$('[data-pin]').forEach((x) => x.classList.toggle('is-active', x === row));
    if (window.EatMap && window.EatMap.focus) window.EatMap.focus(row.dataset.pin);
  });
})();
