// Restaurant detail page.
import { esc, icon, fmtTime } from '../lib.mjs';
import { serviceChips, statusEl, actionBtns, hoursGroups, SERVICE_LABEL } from './parts.mjs';

const COURSE_TABS = [
  ['brunch', 'Brunch'], ['lunch', 'Lunch'], ['starter', 'Starters'], ['main', 'Mains'], ['dessert', 'Dessert'], ['drinks', 'Drinks'],
];

export function restaurant({ site, restaurants, r }) {
  const others = restaurants.filter((x) => x.slug !== r.slug);
  // Pair suggestion: the neighbor that stays open latest and has a nightcap.
  const pair = others.slice().sort((a, b) => latest(b) - latest(a))[0];

  const groups = {};
  for (const d of r.dishes || []) (groups[d.course] ||= []).push(d);
  if (r.drinks && r.drinks.length) groups.drinks = r.drinks.map((d) => ({ name: d.name, desc: d.desc, price: d.price }));
  const tabs = COURSE_TABS.filter(([k]) => groups[k] && groups[k].length);

  const menu = tabs.length ? `
    <div class="tabs" role="tablist" aria-label="Menu highlights">
      ${tabs.map(([k, label], i) => `<button class="tab" role="tab" type="button" id="tab-${k}" aria-controls="panel-${k}" aria-selected="${i === 0}" data-tab="${k}">${label}</button>`).join('')}
    </div>
    ${tabs.map(([k], i) => `<div class="tabpanel" role="tabpanel" id="panel-${k}" aria-labelledby="tab-${k}" data-panel="${k}"${i === 0 ? '' : ' hidden'}>
      <div class="menu-grid">${groups[k].map((d) => `<div class="card dish"><div class="top"><span class="n">${esc(d.name)}</span>${d.price ? `<span class="p">${esc(d.price)}</span>` : ''}</div>${d.desc ? `<p class="d">${esc(d.desc)}</p>` : ''}</div>`).join('')}</div>
    </div>`).join('')}
    <p class="small muted" style="margin-top:1rem">Highlights from the current menu. Prices and dishes change with the season. <a href="${esc(r.menu_url)}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600">Full menu on ${esc(hostname(r.menu_url))}</a>.</p>`
    : `<p class="lede">Menu highlights are on the way. <a href="${esc(r.menu_url || r.website)}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600">See the full menu</a>.</p>`;

  const info = [];
  if (r.services.private_dining) info.push(card('users-three', 'Private dining', r.service_notes.private_dining || 'Ask about rooms, patios and buyouts.', r.private_dining_url ? [['Inquire', r.private_dining_url]] : [['Call', r.phone_href]]));
  if (r.services.catering) info.push(card('basket', 'Catering', r.service_notes.catering || 'Platters and per-person menus.', r.catering_url ? [['Catering', r.catering_url]] : [['Call', r.phone_href]]));
  if (r.services.takeout || r.services.delivery) info.push(card('package', 'Takeout and delivery', [r.service_notes.takeout, r.service_notes.delivery].filter(Boolean).join('. ') || 'Order ahead.', [
    ...(r.order_url ? [['Order online', r.order_url]] : []),
    ...(r.delivery || []).filter((d) => d.platform !== 'Toast').map((d) => [d.platform, d.url]),
  ]));
  if (r.services.happy_hour && r.happy_hour && r.happy_hour.text) info.push(card('sun-horizon', 'Happy hour', r.happy_hour.text, []));
  if (r.services.brunch) info.push(card('coffee', 'Brunch', r.service_notes.brunch || 'Weekend brunch.', []));
  if (r.services.live_music) info.push(card('music-notes', 'Live music', r.service_notes.live_music || 'Live music nights.', []));
  if (r.services.kids_menu) info.push(card('baby', 'Kids', r.service_notes.kids_menu || 'Kids menu available.', []));
  if (r.services.secret_menu) info.push(card('eye-slash', 'Secret menu', r.service_notes.secret_menu || 'Off-menu items for followers.', r.instagram ? [['Instagram', `https://www.instagram.com/${r.instagram}/`]] : []));

  const gallery = (r.images.gallery || []).slice(0, 7);

  return `
<section class="rhero">
  <div class="hero-art"><img src="/${r.images.hero}" alt="" fetchpriority="high" decoding="async"></div>
  <div class="container rhero-grid">
    <div class="rcard-chips">${serviceChips(r, 5, 'chip chip-paper')}</div>
    <h1>${esc(r.name)}</h1>
    <p class="lede">${esc(r.cuisine)}. ${esc(r.address)}, on the corner of ${esc(site.corner.label)}.</p>
    ${statusEl(r)}
    <div class="rhero-actions">${actionBtns(r, { details: false, size: '' })}<a class="btn btn-outline-paper" href="${r.phone_href}">${esc(r.phone)}<span class="btn-ico">${icon('phone', '')}</span></a></div>
  </div>
</section>

<section class="section" id="about">
  <div class="container split">
    <div class="reveal">
      <h2>${esc(r.tagline || 'The room')}</h2>
      <p class="lede" style="margin-top:1rem">${esc(r.description)}</p>
    </div>
    <div class="reveal stack" style="--stack:1rem">
      <h3>Hours</h3>
      ${hoursGroups(r)}
      ${r.late_night && r.late_night.text ? `<div class="card" style="padding:1.1rem 1.2rem" id="late"><h4 style="display:flex;gap:.5rem;align-items:center">${icon('moon-stars', 'ico')} After 8</h4><p class="small muted" style="margin-top:.35rem">${esc(r.late_night.text)}</p></div>` : ''}
    </div>
  </div>
</section>

<section class="section" id="menu" style="padding-top:0">
  <div class="container">
    <div class="section-head reveal"><h2>What to order</h2></div>
    <div class="reveal" data-tabs>${menu}</div>
  </div>
</section>

${info.length ? `<section class="section" id="services" style="padding-top:0"><div class="container"><div class="info-grid reveal">${info.join('')}</div></div></section>` : ''}

${pair ? `<section class="section" id="pair" style="padding-top:0">
  <div class="container">
    <div class="shell reveal"><div class="core pair">
      <a class="frame" href="/r/${pair.slug}/"><img src="/${pair.images.card || pair.images.hero}" alt="${esc(pair.name)}" loading="lazy" decoding="async"></a>
      <div class="pair-body">
        <p class="eyebrow">${esc(site.hashtag)}</p>
        <h3>Then cross the corner to ${esc(pair.short)}</h3>
        <p class="muted">${esc(pair.nightcap && pair.nightcap.text ? pair.nightcap.text : `${pair.name} is a one-minute walk.`)}</p>
        <div class="hero-actions" style="justify-content:flex-start"><a class="btn btn-accent btn-sm" href="/#plan">Plan the night<span class="btn-ico">${icon('moon-stars', '')}</span></a><a class="btn btn-ghost btn-sm" href="/r/${pair.slug}/">${esc(pair.short)}<span class="btn-ico">${icon('arrow-right', '')}</span></a></div>
      </div>
    </div></div>
  </div>
</section>` : ''}

<section class="section" id="where" style="padding-top:0">
  <div class="container map-split">
    <div class="map-copy reveal">
      <h2>Where</h2>
      <p class="lede">${esc(r.address)}, Danville, CA ${esc(r.zip)}. ${esc(site.street_parking)}</p>
      <div class="hero-actions" style="justify-content:flex-start"><a class="btn btn-ghost btn-sm" href="${esc(r.google_maps)}" target="_blank" rel="noopener">Directions<span class="btn-ico">${icon('navigation-arrow', '')}</span></a><a class="btn btn-ghost btn-sm" href="/map/">District map<span class="btn-ico">${icon('map-trifold', '')}</span></a></div>
    </div>
    <div class="map-frame shell reveal"><div class="core"><div class="map" id="map-canvas" data-map data-focus="${r.slug}" data-zoom="18" aria-label="Map showing ${esc(r.name)}"></div></div></div>
  </div>
</section>

${gallery.length ? `<section class="section" id="gallery" style="padding-top:0"><div class="container"><div class="gallery reveal">${gallery.map((g) => `<div class="frame"><img src="/${g}" alt="${esc(r.name)}" loading="lazy" decoding="async"></div>`).join('')}</div></div></section>` : ''}
`;
}

function latest(r) {
  let best = 0;
  const tables = [r.hours, r.bar_hours].filter(Boolean);
  for (const t of tables) for (const d of Object.keys(t)) for (const range of t[d]) {
    const [h, m] = range[1].split(':').map(Number);
    const v = (h < 5 ? h + 24 : h) * 60 + m;
    if (v > best) best = v;
  }
  return best;
}

function hostname(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'their site'; } }

function card(ico, title, text, links) {
  return `<div class="card info"><h4>${icon(ico, 'ico')} ${esc(title)}</h4><p>${esc(text)}</p>${links.length ? `<div class="links">${links.map(([l, u]) => `<a class="chip" href="${esc(u)}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${esc(l)}</a>`).join('')}</div>` : ''}</div>`;
}
