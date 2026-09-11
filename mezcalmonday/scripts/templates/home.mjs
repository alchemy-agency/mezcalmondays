import { esc, icon } from '../lib.mjs';
import { searchBlock, featurePour, leaderboard, venueCard } from './parts.mjs';

export function home({ site, venues, stores, categories, recipes, sponsors, regions }) {
  const s = (slug) => sponsors.slots[slug];
  const sp = (slot) => slot && sponsors.sponsors[slot.sponsor];
  const featured = venues.filter((v) => v.featured);
  const mondayCount = venues.filter((v) => v.monday_special).length;
  const nVenues = venues.length, nStores = stores.length;

  const quick = [
    ['/find/', 'Map finder', 'map-trifold'],
    ['/find/?cat=cocktails', 'Cocktail bars', 'martini'],
    ['/specials/', 'Monday specials', 'tag'],
    ['/recipes/', 'Recipes', 'cooking-pot'],
  ];

  const cells = regions.map((r, i) => {
    const n = venues.filter((v) => matchRegion(v, r)).length;
    const spans = ['ink s4', 'tint s2', 's2', 's4', 'tint s3', 's3'];
    const cls = 'cell ' + (spans[i] || 's2');
    return `<a class="${cls}" href="/find/?region=${esc(r.slug)}" data-reveal>
      <span class="n">${n}<small>${n === 1 ? 'spot' : 'spots'}</small></span>
      <h3>${esc(r.name)}</h3>
      <p>${esc(r.blurb)}</p>
    </a>`;
  }).join('');

  const sample = (featured.length ? featured : venues).slice(0, 8);

  const featRecipe = recipes.find((r) => r.featured) || recipes[0];
  const recRows = recipes.filter((r) => r.slug !== featRecipe.slug).slice(0, 6).map((r) => `
    <a class="recipe-row" href="/recipes/${esc(r.slug)}/">
      <span><b>${esc(r.name)}</b><span>${esc(r.kicker)}</span></span>
      ${icon('arrow-right')}
    </a>`).join('');

  return `
<section class="hero">
  <div class="container">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="day">${icon('calendar-dots')}It is <b data-today>Monday</b>. <span data-open-note>Time for mezcal.</span></p>
        <h1>Where to drink <em>mezcal</em> this Monday.</h1>
        <p class="lede">${nVenues} bars and restaurants that pour it. Monday deals, a map of who is near you, and recipes for home.</p>
        <div class="hero-search">
          ${searchBlock({ placeholder: 'Search a bar, a city or a drink' })}
          <div class="hero-quick">${quick.map(([h, l, ic]) => `<a class="chip" href="${h}">${icon(ic, 'ico')} ${l}</a>`).join('')}</div>
        </div>
      </div>
      ${featurePour(s('featured-pour'), sp(s('featured-pour')))}
    </div>
  </div>
</section>

<div class="container">${leaderboard(s('leaderboard'), sp(s('leaderboard')))}</div>

<section class="section" id="regions">
  <div class="container">
    <div class="section-head">
      <h2>Pick a city, find a pour</h2>
      <p class="lede">Mezcal Monday covers six markets so far, from the Strip to the Cape. More going up as bars sign on.</p>
    </div>
    <div class="bento">${cells}</div>
  </div>
</section>

<section class="section" id="near">
  <div class="container">
    <div class="section-head-row">
      <div class="section-head"><h2>${featured.length ? 'Featured this Monday' : 'On the map'}</h2><p class="lede">Bars and restaurants pouring mezcal right now. Open the finder to sort by your city or a cocktail.</p></div>
      <a class="btn btn-ghost" href="/find/">Open the finder ${icon('arrow-right', 'ico')}</a>
    </div>
    <div class="rail">${sample.map(venueCard).join('')}</div>
  </div>
</section>


<section class="section" id="recipes">
  <div class="container">
    <div class="section-head-row">
      <div class="section-head"><h2>Make it at home</h2><p class="lede">If you cannot get out, pour your own. Start here.</p></div>
      <a class="btn btn-ghost" href="/recipes/">All recipes ${icon('arrow-right', 'ico')}</a>
    </div>
    <div class="recipes-split">
      <a class="recipe-feature" href="/recipes/${esc(featRecipe.slug)}/" data-reveal>
        ${featRecipe.img ? `<img class="rfeat-img" src="/${esc(featRecipe.img)}" alt="${esc(featRecipe.name)}" loading="lazy">` : ''}
        <span class="kicker">${esc(featRecipe.kicker)}</span>
        <div><h3>${esc(featRecipe.name)}</h3><p>${esc(featRecipe.intro)}</p></div>
        <div class="spec"><span>${esc(featRecipe.glass)}</span><span>${esc(featRecipe.method)}</span><span>${esc(featRecipe.time)}</span></div>
        <span class="btn btn-paper">See the recipe ${icon('arrow-right', '')}</span>
      </a>
      <div class="recipe-list">${recRows}</div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="cta-band" data-reveal>
      <div>
        <h2>Run a bar? Sell a mezcal?</h2>
        <p>List your bar for free, or put your brand in front of people searching for a pour. Monday is the busiest search day.</p>
      </div>
      <div class="btn-row">
        <a class="btn" href="/add-your-bar/">Add your bar</a>
        <a class="btn btn-ghost" href="/advertise/">Advertise</a>
      </div>
    </div>
  </div>
</section>`;
}

function matchRegion(v, r) {
  if (r.match.state !== v.state) return false;
  if (!r.match.cities) return true;
  return r.match.cities.includes(v.city);
}
