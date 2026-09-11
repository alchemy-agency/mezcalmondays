import { esc, icon, initials, TYPE_LABEL } from '../lib.mjs';

const TYPE_ICON = { restaurant: 'fork-knife', bar: 'martini', hotel: 'building', store: 'storefront' };

export function venueCard(v) {
  const feat = v.featured ? ' is-featured' : '';
  return `<a class="vcard${feat}" href="/bar/${esc(v.slug)}/" data-slug="${esc(v.slug)}">
    <div class="v-top">
      <span class="v-type">${esc(TYPE_LABEL[v.type] || 'Bar')}</span>
      <span class="v-mark">${esc(initials(v.name))}</span>
    </div>
    <div>
      <h3>${esc(v.name)}</h3>
      <p class="v-addr">${esc(v.city)}, ${esc(v.state)}</p>
    </div>
    <div class="v-foot">
      ${v.pours_bnaaa ? `<span class="v-pour">${icon('drop-half', 'ico')} Pours BNAAA</span>` : `<span class="v-pour">${icon('drop-half', 'ico')} Mezcal on menu</span>`}
      ${v.featured ? '<span class="badge">Featured</span>' : ''}
    </div>
  </a>`;
}

export function storeRow(s) {
  return `<a class="store-row" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" rel="noopener">
    <span><b>${esc(s.name)}</b><span>${esc(s.street)}, ${esc(s.city)}, ${esc(s.state)}</span></span>
    <span class="chip">${icon('navigation-arrow', 'ico')} Directions</span>
  </a>`;
}

export function searchBlock({ placeholder = 'Search a bar, a city, tacos, a paloma', page = false, autofocus = false } = {}) {
  return `<div class="search" data-search${page ? ' data-page' : ''}>
    <form class="search-box" role="search" action="/find/" method="get">
      <span class="ico">${icon('magnifying-glass', '')}</span>
      <input class="search-input" type="search" name="q" autocomplete="off" spellcheck="false"${autofocus ? ' autofocus' : ''} placeholder="${esc(placeholder)}" aria-label="Search Mezcal Monday" aria-autocomplete="list" aria-controls="search-panel" aria-expanded="false" role="combobox">
      <div class="search-actions"><button class="btn btn-accent btn-sm search-submit" type="submit">Search</button></div>
    </form>
    <div class="search-panel" id="search-panel" role="listbox" aria-label="Suggestions"></div>
  </div>`;
}

export function leaderboard(slot, sponsor) {
  if (!slot || !slot.enabled || !sponsor) return '';
  const mark = `<span class="b-mark">${esc(sponsor.short)}</span>`;
  return `<aside class="banner" aria-label="Sponsored">
    <div class="b-brand"><span class="b-tag">Sponsor</span>${mark}</div>
    <div class="b-copy"><strong>${esc(slot.headline)}</strong><span>${esc(slot.body)}</span></div>
    <a class="btn btn-accent btn-sm" href="${esc(slot.href)}"${slot.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(slot.cta)}</a>
  </aside>`;
}

export function featurePour(slot, sponsor) {
  if (!slot || !slot.enabled || !sponsor) return '';
  return `<aside class="feature-pour" aria-label="Featured pour">
    <div class="fp-head"><span>Featured pour</span><span>Sponsor</span></div>
    <div class="fp-logo"><span class="fp-wordmark">${esc(sponsor.short)}</span><span class="fp-tag">${esc(sponsor.tagline)}</span></div>
    <div class="fp-body">
      <h3>${esc(slot.headline)}</h3>
      <p>${esc(slot.body)}</p>
      <div class="btn-row">
        <a class="btn btn-paper" href="${esc(slot.href)}"${slot.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(slot.cta)}</a>
        ${slot.cta2 ? `<a class="btn btn-ghost" href="${esc(slot.href2)}" target="_blank" rel="noopener">${esc(slot.cta2)}</a>` : ''}
      </div>
    </div>
  </aside>`;
}
