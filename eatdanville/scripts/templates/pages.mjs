// Inner pages: After Dark, Industry, Partners, Map, Search.
import { esc, icon } from '../lib.mjs';
import { mapLegend, plannerBlock, formIndustry, formPartner, statusEl } from './parts.mjs';

export function afterDark({ site, restaurants, hero }) {
  return `
<section class="rhero" style="min-height:min(78dvh,720px)">
  <div class="hero-art"><img src="/${hero.afterdark}" alt="" fetchpriority="high" decoding="async"></div>
  <div class="container rhero-grid">
    <p class="eyebrow" style="color:#F4F5F7">${esc(site.hashtag)}</p>
    <h1>Danville after dark starts on this corner</h1>
    <p class="lede">Four kitchens within 250 feet. When dinner ends at one, the nightcap is across the street.</p>
    <div class="rhero-actions"><a class="btn btn-accent" href="#tonight">Tonight's board<span class="btn-ico">${icon('arrow-down', '')}</span></a><a class="btn btn-outline-paper" href="${site.instagram_url}" target="_blank" rel="noopener">Tag ${esc(site.hashtag)}<span class="btn-ico">${icon('instagram-logo', '')}</span></a></div>
  </div>
</section>

<section class="section" id="tonight">
  <div class="container split">
    <div class="reveal">
      <h2>Tonight on the corner</h2>
      <p class="lede" style="margin-top:1rem">Closing times come straight from each restaurant's posted hours and refresh every minute. When a bar outlives its kitchen, you see both.</p>
      <div class="tonight" data-tonight style="margin-top:1.5rem">
        <div class="tonight-head"><strong>Still open</strong><span data-tonight-date></span></div>
        ${restaurants.map((r) => `<div class="tonight-row tonight-row-light" data-tonight-row="${r.slug}"><div><div class="n"><a href="/r/${r.slug}/#late">${esc(r.name)}</a></div><div class="d" data-tonight-detail></div></div><div class="t" data-tonight-time>Hours</div></div>`).join('')}
      </div>
    </div>
    <div class="reveal stack" style="--stack:.75rem">
      ${restaurants.map((r) => `<a class="card" href="/r/${r.slug}/#late" style="display:grid;grid-template-columns:88px 1fr;gap:1rem;padding:.75rem;align-items:center">
        <span class="frame" style="width:88px;height:88px;border-radius:var(--r-in)"><img src="/${r.images.card || r.images.hero}" alt="" loading="lazy" decoding="async"></span>
        <span><span style="display:block;font-family:var(--font-display);font-weight:600;font-size:1.15rem;letter-spacing:-.01em">${esc(r.short)} after 8</span><span class="small muted">${esc(r.nightcap && r.nightcap.text ? r.nightcap.text : r.late_night.text)}</span></span>
      </a>`).join('')}
    </div>
  </div>
</section>

<section class="section" id="plan-section" style="padding-top:0">
  <div class="container">
    <div class="section-head reveal"><h2>Route the night</h2><p class="lede">Dinner at one, the last drink at another. Arrival at 8 is preset.</p></div>
    <div class="reveal">${plannerBlock(restaurants, { preset: '20:00' })}</div>
  </div>
</section>

<section class="section" id="social" style="padding-top:0">
  <div class="container">
    <div class="cta-block reveal">
      <div class="stack" style="--stack:1.25rem">
        <h2>Post the corner</h2>
        <p class="lede">Tag ${esc(site.hashtag)} and ${esc(site.hashtags[1])} on your nightcap, your dessert, your table. The partners repost their favorites and local media watches the tag.</p>
        <div class="hero-actions" style="justify-content:flex-start"><a class="btn btn-accent" href="${site.instagram_url}" target="_blank" rel="noopener">Open the tag<span class="btn-ico">${icon('instagram-logo', '')}</span></a></div>
      </div>
      <ul class="offer">
        ${restaurants.map((r) => `<li>${icon('instagram-logo', 'ico')}<span>${esc(r.name)}${r.instagram ? `: <a href="https://www.instagram.com/${esc(r.instagram)}/" target="_blank" rel="noopener" style="text-decoration:underline">@${esc(r.instagram)}</a>` : ''}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</section>`;
}

export function industry({ site, restaurants }) {
  return `
<section class="page-hero">
  <div class="container">
    <p class="eyebrow">Industry</p>
    <h1>Built for front of house and back of house</h1>
    <p class="lede">The four partners on the corner want your after-shift business, and they are willing to earn it. This is where the perks and the nights get posted.</p>
  </div>
</section>
<section class="section" style="padding-top:1rem">
  <div class="container split">
    <div class="reveal">
      <div class="perks" style="margin-top:0">
        <div class="perk"><span class="ico-wrap">${icon('beer-stein', '')}</span><div><h4>After-shift nights</h4><p>The staffs of Rancho, Incontro, Kaia's and Harvest cross the corner after close. Cooks, servers, bartenders and managers from anywhere in the valley are invited.</p></div></div>
        <div class="perk"><span class="ico-wrap">${icon('identification-badge', '')}</span><div><h4>Industry perks, posted as they go live</h4><p>Each restaurant sets its own deal and its own nights. Nothing is listed here until a partner confirms it, so what you see is real.</p></div></div>
        <div class="perk"><span class="ico-wrap">${icon('calendar-dots', '')}</span><div><h4>Late is the point</h4><p>The corner wants 8 to 10 PM to feel alive. Industry nights are how it starts.</p></div></div>
      </div>
      <div class="stack" style="margin-top:2rem;--stack:.6rem">
        <h3>Current perks</h3>
        ${restaurants.map((r) => `<div class="card" style="padding:1rem 1.2rem;display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center"><div><div style="font-weight:600">${esc(r.name)}</div><div class="small muted">${esc(r.industry && r.industry.text ? r.industry.text : 'Perk not posted yet. Join the list to hear first.')}</div></div>${statusEl(r, 'status small')}</div>`).join('')}
      </div>
    </div>
    <div class="reveal">${formIndustry(restaurants, '/industry/')}</div>
  </div>
</section>`;
}

export function partners({ site }) {
  return `
<section class="page-hero">
  <div class="container">
    <p class="eyebrow">Partners</p>
    <h1>Join the Danville Dining District</h1>
    <p class="lede">Four restaurants started it. The chamber, neighboring shops, local media and sponsors can build on it.</p>
  </div>
</section>
<section class="section" style="padding-top:1rem">
  <div class="container split">
    <div class="reveal">
      <div class="perks" style="margin-top:0">
        <div class="perk"><span class="ico-wrap">${icon('storefront', '')}</span><div><h4>Guest partner listing</h4><p>A page with hours, links and a pin on the district map. For Danville businesses that fit an evening on the corner: wine, dessert, a show, a shop that stays open late.</p></div></div>
        <div class="perk"><span class="ico-wrap">${icon('megaphone', '')}</span><div><h4>Sponsor placements</h4><p>A small number of placements on the home page and the After Dark page, sold by the partnership. Data-driven, so they render the moment they are confirmed.</p></div></div>
        <div class="perk"><span class="ico-wrap">${icon('calendar-star', '')}</span><div><h4>Event posts</h4><p>Industry nights, tastings, live music, chamber mixers: posted to the After Dark page and the industry list.</p></div></div>
        <div class="perk"><span class="ico-wrap">${icon('handshake', '')}</span><div><h4>Chamber and Town</h4><p>${esc(site.chamber.name)} runs the Oak Tree lighting, Oktoberfest and Fallfest on these blocks. The district is built to plug into them.</p></div></div>
      </div>
      <div class="stack" style="margin-top:2rem;--stack:.6rem">
        <h3>Who is already around the corner</h3>
        ${site.orgs.map((o) => `<a class="card" href="${esc(o.url)}" target="_blank" rel="noopener" style="padding:1rem 1.2rem;display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center"><span><span style="display:block;font-weight:600">${esc(o.name)}</span><span class="small muted">${esc(o.note)}</span></span>${icon('arrow-up-right', 'ico')}</a>`).join('')}
        ${site.media.slice(0, 4).map((o) => `<a class="card" href="${esc(o.url)}" target="_blank" rel="noopener" style="padding:1rem 1.2rem;display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center"><span><span style="display:block;font-weight:600">${esc(o.name)}</span><span class="small muted">${esc(o.handle)}, ${esc(o.note)}</span></span>${icon('arrow-up-right', 'ico')}</a>`).join('')}
      </div>
    </div>
    <div class="reveal">${formPartner('/partners/')}</div>
  </div>
</section>`;
}

export function mapPage({ site, restaurants }) {
  return `
<section class="page-hero" style="padding-bottom:1.5rem">
  <div class="container">
    <h1>The corner, mapped</h1>
    <p class="lede">${esc(site.corner.label)}, downtown Danville. Restaurants, free parking and the walk between them.</p>
  </div>
</section>
<section class="section map-page" style="padding-top:0">
  <div class="container map-split" style="grid-template-columns:minmax(280px,.6fr) 1.6fr">
    <div class="map-copy">
      ${mapLegend(restaurants, site)}
      <p class="small muted">${esc(site.street_parking)}</p>
      <div class="stack" style="--stack:.4rem">
        <h4>Parking</h4>
        ${site.parking.map((p) => `<button class="legend-row" type="button" data-pin="parking-${esc(p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}"><span class="pin alt">${icon('car-simple', '')}</span><span><span class="n">${esc(p.name)}</span><br><span class="d">${esc(p.note)}</span></span><span></span></button>`).join('')}
      </div>
    </div>
    <div class="map-frame shell"><div class="core"><div class="map" id="map-canvas" data-map data-zoom="17" data-full="true" aria-label="Map of the Danville Dining District"></div></div></div>
  </div>
</section>`;
}

export function searchPage() {
  return `
<section class="page-hero" style="padding-bottom:1rem">
  <div class="container">
    <h1>Search the corner</h1>
    <div class="search" data-search data-page style="margin-top:1.5rem">
      <form class="search-box" role="search" action="/search/" method="get">
        <span class="ico">${icon('magnifying-glass', '')}</span>
        <input class="search-input" type="search" name="q" autocomplete="off" spellcheck="false" placeholder="Try late night, brunch, tacos, tiki, private dining" aria-label="Search the district" aria-autocomplete="list" aria-controls="search-panel" aria-expanded="false" role="combobox">
        <button class="btn btn-accent search-submit" type="submit">Search<span class="btn-ico">${icon('arrow-right', '')}</span></button>
      </form>
      <div class="search-panel" id="search-panel" role="listbox" aria-label="Suggestions"></div>
    </div>
  </div>
</section>
<section class="section" style="padding-top:1rem">
  <div class="container">
    <div class="drawer-intro" id="results-intro"></div>
    <div class="stack" id="results" style="--stack:.75rem" aria-live="polite"></div>
  </div>
</section>`;
}
