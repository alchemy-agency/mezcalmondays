// Home page: hero (typographic cutout + predictive search), categories bento, the four (sticky stack), map, planner, after dark, industry, partners.
import { esc, icon } from '../lib.mjs';
import { serviceChips, statusEl, actionBtns, mapLegend, plannerBlock, formIndustry, cornerDiagram } from './parts.mjs';

export function home({ site, restaurants, categories, hero }) {
  const byService = (key) => restaurants.filter((r) => r.services && r.services[key]).length;

  const bento = categories.map((c) => {
    const n = byService(c.service);
    if (c.slug === 'industry-specials') {
      return `<a class="cell cell-industry s${c.span}" href="/industry/" data-category="${c.service}">
        <img src="/${c.image}" alt="" loading="lazy" decoding="async">
        <div class="cell-body"><div><h3>${esc(c.name)}</h3><p>${esc(c.blurb)}</p></div><span class="btn btn-paper btn-sm">Join the list<span class="btn-ico">${icon('arrow-right', '')}</span></span></div>
      </a>`;
    }
    return `<a class="cell s${c.span}" href="/#c=${c.slug}" data-category="${c.service}" data-drawer-category="${c.slug}">
      <img src="/${c.image}" alt="" loading="lazy" decoding="async">
      <span class="count" aria-label="${n} of 4 restaurants">${n}/4</span>
      <div class="cell-body"><h3>${esc(c.name)}</h3><span class="alt">${esc(c.alt)}</span></div>
    </a>`;
  }).join('');

  const stack = restaurants.map((r, i) => `
    <article class="rcard" data-slug="${r.slug}" data-rcard>
      <div class="container"><div class="rcard-inner">
        <div class="rcard-media"><img src="/${r.images.card || r.images.hero}" alt="${esc(r.name)}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async"><span class="rcard-num" aria-hidden="true">${esc(r.address.split(' ')[0])}<small>Hartz</small></span></div>
        <div class="rcard-body">
          <div>
            <h3>${esc(r.name)}</h3>
            <p class="cuisine">${esc(r.cuisine)}</p>
          </div>
          ${statusEl(r)}
          <p class="desc">${esc(r.description.split('. ').slice(0, 2).join('. '))}${r.description.includes('. ') ? '.' : ''}</p>
          <div class="rcard-chips">${serviceChips(r, 4)}</div>
          <div class="rcard-actions">${actionBtns(r)}</div>
        </div>
      </div></div>
    </article>`).join('');

  const nightcaps = restaurants.filter((r) => r.nightcap && r.nightcap.items && r.nightcap.items.length).slice(0, 4).map((r) => `
    <a class="nightcap" href="/r/${r.slug}/#late"><div class="n">${esc(r.short)}</div><div class="d">${esc(r.nightcap.items.slice(0, 2).join(', '))}</div></a>`).join('');

  return `
<section class="hero" id="top">
  <div class="hero-slides" data-hero-slides aria-hidden="true">
    ${hero.slides.map((s, i) => `<div class="hero-slide${i === 0 ? ' is-on' : ''}" data-name="${esc(s.name)}"><img src="/${s.src}" alt="" style="object-position:${esc(s.focus)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>`).join('')}
  </div>
  <div class="hero-mark" data-hero-word>
    <h1 class="hero-word display" aria-label="Danville Dining District">DANVILLE</h1>
    <div class="hero-rule"><span>South of Hartz</span><span class="hero-slide-name" data-hero-slide-name>${esc(hero.slides[0].name)}</span></div>
  </div>
  <div class="container hero-content">
    <p class="lede" data-hero-in>Four kitchens on the corner of Hartz and Church. Dinner at one, a nightcap and dessert at the next.</p>
    <div class="search" data-search data-hero-in>
      <form class="search-box" role="search" action="/search/" method="get">
        <span class="ico">${icon('magnifying-glass', '')}</span>
        <input class="search-input" type="search" name="q" autocomplete="off" spellcheck="false" placeholder="Search late night, brunch, tacos, tiki, private dining" aria-label="Search the district" aria-autocomplete="list" aria-controls="search-panel" aria-expanded="false" role="combobox">
        <button class="btn btn-accent search-submit" type="submit">Search<span class="btn-ico">${icon('arrow-right', '')}</span></button>
      </form>
      <div class="search-panel" id="search-panel" role="listbox" aria-label="Suggestions"></div>
    </div>
    <div class="hero-actions" data-hero-in>
      <a class="btn btn-outline-paper" href="#plan">Plan my night<span class="btn-ico">${icon('moon-stars', '')}</span></a>
    </div>
  </div>
</section>

<div class="blur-target">
<section class="section" id="categories">
  <div class="container">
    <div class="section-head reveal">
      <h2>Search by how you eat</h2>
      <p class="lede">Ten ways in. Every tile shows how many of the four do it, and the results learn from what you tap.</p>
    </div>
    <div class="bento reveal">${bento}</div>
  </div>
</section>

<section class="section" id="the-four" style="padding-top:0">
  <div class="container"><div class="section-head reveal">
    <h2>Four kitchens, one corner</h2>
    <p class="lede">Hartz and Church, downtown Danville. Every pairing is under a one-minute walk.</p>
  </div></div>
  <div class="stack-wrap" data-stack>${stack}</div>
</section>

<section class="section" id="map">
  <div class="container map-split">
    <div class="map-copy">
      <div class="reveal">
        <h2>The corner</h2>
        <p class="lede">${esc(site.walking_note)}</p>
      </div>
      <div class="reveal">${cornerDiagram(restaurants)}</div>
      <div class="reveal">${mapLegend(restaurants, site)}</div>
      <p class="small muted reveal">${esc(site.street_parking)} <a href="/map/" style="color:var(--accent);font-weight:600">Open the full map</a>.</p>
    </div>
    <div class="map-frame shell reveal"><div class="core"><div class="map" id="map-canvas" data-map data-zoom="17" aria-label="Map of the Danville Dining District"></div></div></div>
  </div>
</section>

<section class="section" id="plan-section">
  <div class="container">
    <div class="section-head reveal">
      <h2>Two stops, one night</h2>
      <p class="lede">Pick a time and a mood. We route dinner and the nightcap around tonight's real hours.</p>
    </div>
    <div class="reveal">${plannerBlock(restaurants)}</div>
  </div>
</section>

<section class="section" id="after-dark">
  <div class="container">
    <div class="dark-band reveal">
      <div class="band-art"><img src="/${hero.afterdark}" alt="" loading="lazy" decoding="async"></div>
      <div class="dark-band-inner">
        <div class="stack" style="--stack:1.25rem">
          <p class="eyebrow">${esc(site.hashtag)}</p>
          <h2>After dinner, cross the street.</h2>
          <p class="lede">The corner stays up past 8. Nightcaps, dessert and the bar after the kitchen, updated live from each restaurant's hours.</p>
          <div class="nightcaps">${nightcaps}</div>
          <div class="hero-actions" style="justify-content:flex-start">
            <a class="btn btn-outline-paper" href="/after-dark/">See After Dark<span class="btn-ico">${icon('arrow-right', '')}</span></a>
            <a class="btn btn-outline-paper" href="${site.instagram_url}" target="_blank" rel="noopener">Tag ${esc(site.hashtag)}<span class="btn-ico">${icon('instagram-logo', '')}</span></a>
          </div>
        </div>
        <div class="tonight" data-tonight>
          <div class="tonight-head"><strong>Tonight on the corner</strong><span data-tonight-date></span></div>
          ${restaurants.map((r) => `<div class="tonight-row" data-tonight-row="${r.slug}"><div><div class="n">${esc(r.name)}</div><div class="d" data-tonight-detail></div></div><div class="t" data-tonight-time>Hours</div></div>`).join('')}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" id="industry">
  <div class="container split">
    <div class="reveal">
      <h2>For the people who work the floor</h2>
      <p class="lede">Front of house, back of house, bar: the four partners are building industry perks and after-shift nights on the corner. Get on the list and hear first.</p>
      <div class="perks">
        <div class="perk"><span class="ico-wrap">${icon('beer-stein', '')}</span><div><h4>After-shift nights</h4><p>The staffs of the four cross the corner after close. You are invited.</p></div></div>
        <div class="perk"><span class="ico-wrap">${icon('identification-badge', '')}</span><div><h4>Industry perks</h4><p>Show a pay stub or a shift shirt. Each restaurant posts its own deal here as it goes live.</p></div></div>
        <div class="perk"><span class="ico-wrap">${icon('bell-ringing', '')}</span><div><h4>One message, no spam</h4><p>A text or email when a new perk or an industry night lands. Nothing else.</p></div></div>
      </div>
    </div>
    <div class="reveal">${formIndustry(restaurants, '/')}</div>
  </div>
</section>

<section class="section" id="partners" style="padding-top:0">
  <div class="container">
    <div class="cta-block reveal">
      <div class="stack" style="--stack:1.25rem">
        <h2>Bring your business to the corner</h2>
        <p class="lede">Chamber, neighbors, shops, sponsors, local media: the district has room for guest partners and a few placements.</p>
        <div class="hero-actions" style="justify-content:flex-start"><a class="btn btn-accent" href="/partners/">Become a partner<span class="btn-ico">${icon('arrow-right', '')}</span></a></div>
      </div>
      <ul class="offer">
        <li>${icon('check-circle', 'ico')}<span>A guest listing with hours, links and a pin on the district map</span></li>
        <li>${icon('check-circle', 'ico')}<span>Event posts on the After Dark page and in the industry list</span></li>
        <li>${icon('check-circle', 'ico')}<span>Sponsor placements on the home page and After Dark, sold by the partnership</span></li>
        <li>${icon('check-circle', 'ico')}<span>Co-op media buys around ${esc(site.hashtag)}</span></li>
      </ul>
    </div>
  </div>
</section>
</div>`;
}
