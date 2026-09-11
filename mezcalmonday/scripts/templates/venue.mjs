import { esc, icon, initials, TYPE_LABEL } from '../lib.mjs';
import { leaderboard, venueCard } from './parts.mjs';

export function venuePage({ site, v, venues, sponsors, region }) {
  const slot = sponsors.slots['bar-page-banner'];
  const sp = slot && sponsors.sponsors[slot.sponsor];
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`;
  const nearby = venues.filter((o) => o.slug !== v.slug).map((o) => ({ o, d: dist(v, o) })).sort((a, b) => a.d - b.d).slice(0, 3);
  const special = v.monday_special
    ? `<div class="vfact">${icon('tag', 'ico')}<div><b>Monday special</b><span>${esc(v.monday_special)}</span></div></div>`
    : `<div class="vfact">${icon('tag', 'ico')}<div><b>Monday special</b><span>Not confirmed yet. Ask the bar about Monday, or <a href="/add-your-bar/?bar=${esc(v.slug)}">tell us what they pour</a>.</span></div></div>`;
  return `
<section class="vhero">
  <div class="container">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/find/">Find a bar</a><span>/</span>${region ? `<a href="/find/?region=${esc(region.slug)}">${esc(region.name)}</a><span>/</span>` : ''}<span>${esc(v.city)}</span></nav>
    <div class="vhero-grid">
      <div class="vhero-copy">
        <span class="type">${esc(TYPE_LABEL[v.type] || 'Bar')}${v.featured ? ' <span class="badge">Featured</span>' : ''}</span>
        <h1>${esc(v.name)}</h1>
        <p class="addr">${esc(v.street)}, ${esc(v.city)}, ${esc(v.state)} ${esc(v.zip)}</p>
        ${v.description ? `<p class="lede">${esc(v.description)}</p>` : ''}
        <div class="btn-row">
          <a class="btn btn-accent" href="${dir}" target="_blank" rel="noopener">${icon('navigation-arrow', 'ico')} Directions</a>
          ${v.website ? `<a class="btn btn-ghost" href="${esc(v.website)}" target="_blank" rel="noopener">Website</a>` : ''}
          ${v.phone ? `<a class="btn btn-ghost" href="tel:${esc(v.phone.replace(/[^\d+]/g, ''))}">Call</a>` : ''}
          <button class="btn btn-ghost" type="button" data-share data-title="${esc(v.name)}">${icon('share-network', 'ico')} Share</button>
        </div>
      </div>
      <div class="vfacts">
        <div class="vfact">${icon('drop-half', 'ico')}<div><b>Mezcal on the menu</b><span>${v.pours_bnaaa ? 'Pours BNAAA Mezcal. Ask for it neat or in the house margarita.' : 'Yes'}</span></div></div>
        ${special}
        ${v.hours_note ? `<div class="vfact">${icon('clock', 'ico')}<div><b>Hours</b><span>${esc(v.hours_note)}</span></div></div>` : ''}
        <div class="vfact">${icon('map-pin', 'ico')}<div><b>${esc(v.city)}, ${esc(v.state_name)}</b><span>${nearby[0] ? `${fmtMi(nearby[0].d)} from ${esc(nearby[0].o.name)}` : ''}</span></div></div>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:clamp(2rem,4vw,3rem)">
  <div class="container" style="display:grid;gap:1.25rem">
    ${leaderboard(slot, sp)}
    <div class="vmap"><div class="map" data-map data-focus="${esc(v.slug)}" data-zoom="15" aria-label="Map showing ${esc(v.name)}"></div></div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <div class="section-head"><h2>Also pouring nearby</h2></div>
    <div class="nearby">${nearby.map(({ o }) => venueCard(o)).join('')}</div>
  </div>
</section>`;
}

function dist(a, b) {
  const R = 3958.8, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
const fmtMi = (d) => d < 0.2 ? 'Steps' : `${d < 10 ? d.toFixed(1) : Math.round(d)} mi`;
