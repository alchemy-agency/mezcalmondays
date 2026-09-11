import { esc, icon } from '../lib.mjs';
import { searchBlock, leaderboard, venueCard, storeRow } from './parts.mjs';

export function findPage({ site, venues, categories, sponsors, regions }) {
  const slotL = sponsors.slots['leaderboard'], slotS = sponsors.slots['finder-sidebar'];
  const spL = slotL && sponsors.sponsors[slotL.sponsor], spS = slotS && sponsors.sponsors[slotS.sponsor];
  const cats = categories.filter((c) => ['special', 'cocktails', 'restaurant', 'bar', 'hotel'].includes(c.filter));
  return `
<section class="page-hero">
  <div class="container finder" data-finder>
    <h1>Find a bar</h1>
    <div class="finder-tools">
      ${searchBlock({ placeholder: 'Search a bar, a city or a drink', page: true })}
      <div class="finder-filters" role="group" aria-label="Filters">
        <button class="chip chip-accent" type="button" data-near>${icon('crosshair', 'ico')} Near me</button>
        <span class="sep" aria-hidden="true"></span>
        ${regions.map((r) => `<button class="chip" type="button" data-region="${esc(r.slug)}" aria-pressed="false">${esc(r.name)}</button>`).join('')}
        <span class="sep" aria-hidden="true"></span>
        ${cats.map((c) => `<button class="chip" type="button" data-cat="${esc(c.filter)}" aria-pressed="false">${esc(c.name)}</button>`).join('')}
        <button class="chip" type="button" data-clear hidden>${icon('x', 'ico')} Clear</button>
      </div>
    </div>
    <div class="finder-layout">
      <div class="finder-map"><div class="map" data-map data-full="true" aria-label="Map of bars that pour mezcal"></div></div>
      <aside class="finder-side">
        ${slotS && slotS.enabled ? `<div class="side-ad" aria-label="Sponsored"><span class="b-tag">Sponsor</span><span class="b-mark">${esc(spS.short)}</span><h4>${esc(slotS.headline)}</h4><p>${esc(slotS.body)}</p><a class="btn btn-paper btn-sm" href="${esc(slotS.href)}" target="_blank" rel="noopener">${esc(slotS.cta)}</a></div>` : ''}
      </aside>
      <div class="finder-results">
        <div class="finder-count"><span><b data-count>${venues.length}</b> <span data-count-label>places pour mezcal</span></span><span class="small" data-sort-note></span></div>
        <div class="results-grid" id="results">${venues.map(venueCard).join('')}</div>
        <div class="empty" id="results-empty" hidden><h3>Nothing here yet</h3><p>No bar matches that. Try a nearby city, or <a href="/add-your-bar/">tell us who is missing</a>.</p></div>
      </div>
    </div>
  </div>
</section>`;
}

export function specialsPage({ venues, sponsors }) {
  const confirmed = venues.filter((v) => v.monday_special);
  const slot = sponsors.slots['leaderboard']; const sp = slot && sponsors.sponsors[slot.sponsor];
  return `
<section class="page-hero">
  <div class="container">
    <h1>Monday specials</h1>
    <p class="lede">Bars with a confirmed mezcal deal on Mondays. Every listing here comes straight from the bar. Nothing is guessed.</p>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="container" style="display:grid;gap:1.5rem">
    ${leaderboard(slot, sp)}
    ${confirmed.length ? `<div class="special-list">${confirmed.map((v) => `<a class="vcard" href="/bar/${esc(v.slug)}/"><div class="v-top"><span class="v-type">${esc(v.city)}, ${esc(v.state)}</span><span class="badge">Monday</span></div><div><h3>${esc(v.name)}</h3><p class="v-addr">${esc(v.monday_special)}</p></div><div class="v-foot"><span class="v-pour">${icon('drop-half', 'ico')} Pours BNAAA</span></div></a>`).join('')}</div>`
    : `<div class="empty"><h3>Specials are being confirmed</h3><p>${venues.length} bars in the directory pour mezcal on Mondays. We are asking each one what they do with the price. Run one of them? Post your special below and it goes live the same day.</p><a class="btn btn-accent" href="/add-your-bar/">Post a Monday special</a></div>`}
    <div class="note">Every bar in the <a href="/find/">finder</a> has mezcal on the menu on Mondays. A special is a price or a pour the bar has told us about. Ask at the bar to be sure.</div>
  </div>
</section>`;
}

export function buyPage({ stores, online, sponsors, site }) {
  const byState = {};
  for (const s of stores) (byState[s.state_name] ||= []).push(s);
  const slot = sponsors.slots['finder-sidebar']; const sp = slot && sponsors.sponsors[slot.sponsor];
  return `
<section class="page-hero">
  <div class="container">
    <h1>Where to buy mezcal</h1>
    <p class="lede">${stores.length} bottle shops that stock BNAAA Mezcal, plus three ways to get it delivered.</p>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="container" style="display:grid;gap:2rem">
    <div class="online-grid">${online.map((o) => `<a class="online-card" href="${esc(o.url)}" target="_blank" rel="noopener"><span><b>${esc(o.short)}</b><span>${esc(o.note)}</span></span><span class="btn btn-accent btn-sm">Buy online ${icon('arrow-up-right', '')}</span></a>`).join('')}</div>
    <div class="map-hero"><div class="map" data-map data-stores="true" data-full="true" aria-label="Map of bottle shops"></div></div>
    <div>
      ${Object.entries(byState).map(([st, list]) => `<h2 class="state-head">${esc(st)}</h2><div class="store-list">${list.map(storeRow).join('')}</div>`).join('')}
    </div>
  </div>
</section>`;
}

export function recipesPage({ recipes, sponsors }) {
  const slot = sponsors.slots['recipe-sponsor']; const sp = slot && sponsors.sponsors[slot.sponsor];
  return `
<section class="page-hero">
  <div class="container">
    <h1>Mezcal recipes</h1>
    <p class="lede">${recipes.length} drinks worth a Monday. Classics with the tequila swapped, two modern classics, and the neat pour.</p>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="container" style="display:grid;gap:1.5rem">
    <div class="recipe-grid">${recipes.map((r) => `<a class="rcard" href="/recipes/${esc(r.slug)}/">${r.img ? `<img class="rcard-img" src="/${esc(r.img)}" alt="${esc(r.name)}" loading="lazy">` : ''}<span class="kicker">${esc(r.kicker)}</span><h3>${esc(r.name)}</h3><p class="small">${esc(r.intro)}</p><div class="spec"><span>${esc(r.glass)}</span><span>${esc(r.method)}</span><span>${esc(r.time)}</span><span>${esc(r.difficulty)}</span></div></a>`).join('')}</div>
    ${leaderboard(slot, sp)}
  </div>
</section>`;
}

export function recipePage({ r, recipes, sponsors }) {
  const slot = sponsors.slots['recipe-sponsor']; const sp = slot && sponsors.sponsors[slot.sponsor];
  const more = recipes.filter((x) => x.slug !== r.slug).slice(0, 3);
  const ing = (s) => esc(s).replace(/BNAAA Mezcal/g, '<em>BNAAA Mezcal</em>');
  return `
<section class="page-hero">
  <div class="container recipe-page">
    <nav class="crumbs small" aria-label="Breadcrumb"><a href="/recipes/">Recipes</a> / ${esc(r.name)}</nav>
    <div class="recipe-hero">
      <span class="kicker muted">${esc(r.kicker)}</span>
      <h1>${esc(r.name)}</h1>
      <p class="lede">${esc(r.intro)}</p>
      <div class="spec"><span><b>Glass</b>${esc(r.glass)}</span><span><b>Method</b>${esc(r.method)}</span><span><b>Time</b>${esc(r.time)}</span><span><b>Serves</b>${r.serves}</span><span><b>Level</b>${esc(r.difficulty)}</span></div>
    </div>
    <div class="recipe-body">
      <div>
        <h2 style="font-size:1.4rem;margin-bottom:0.8rem">Ingredients</h2>
        <ul class="ingredients">${r.ingredients.map((i) => `<li>${ing(i)}</li>`).join('')}</ul>
        ${sp ? `<p class="small" style="margin-top:0.8rem">Made with <a href="${esc(sp.shop_url)}" target="_blank" rel="noopener">${esc(sp.name)}</a>, the mezcal in every recipe here.</p>` : ''}
      </div>
      <div style="display:grid;gap:1.5rem">
        <div><h2 style="font-size:1.4rem;margin-bottom:1rem">Method</h2><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
        <div class="tip"><b>Tip.</b> ${esc(r.tip)}</div>
        <div class="btn-row"><button class="btn btn-ghost" type="button" data-copy-recipe>${icon('copy', 'ico')} Copy recipe</button><button class="btn btn-ghost" type="button" data-share data-title="${esc(r.name)}">${icon('share-network', 'ico')} Share</button></div>
      </div>
    </div>
    ${leaderboard(slot, sp)}
    <div>
      <div class="section-head"><h2>More to make</h2></div>
      <div class="recipe-grid">${more.map((x) => `<a class="rcard" href="/recipes/${esc(x.slug)}/"><span class="kicker">${esc(x.kicker)}</span><h3>${esc(x.name)}</h3><div class="spec"><span>${esc(x.method)}</span><span>${esc(x.time)}</span></div></a>`).join('')}</div>
    </div>
  </div>
</section>`;
}

export function advertisePage({ ads, sponsors, site }) {
  const cur = sponsors.sponsors.bnaaa;
  return `
<section class="page-hero">
  <div class="container">
    <h1>Advertise on Mezcal Monday</h1>
    <p class="lede">People come here on a Monday looking for one thing. Put your mezcal, your bar or your event in front of them.</p>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="container" style="display:grid;gap:2.5rem">
    <div class="placements">${ads.placements.map((p) => `<div class="placement${p.premium ? ' premium' : ''}"><div class="p-top"><h3>${esc(p.name)}</h3>${p.premium ? `<span class="badge">${icon('star', 'ico')} Premium</span>` : ''}</div><p>${esc(p.where)}</p><span class="p-size">${esc(p.size)}</span><span class="p-price">${p.price ? esc(p.price) : 'Ask for pricing'}</span></div>`).join('')}</div>
    <div class="ad-split">
      <div style="display:grid;gap:1.25rem">
        <div class="section-head" style="margin:0"><h2>Who you reach</h2></div>
        <div class="facts">${ads.audience.map((a) => `<div class="fact"><span>${esc(a.label)}</span><b>${esc(a.value)}</b></div>`).join('')}</div>
        <p class="small">Premium placements are currently held by ${esc(cur.name)}. Other placements are open. Featured listings are sold per bar, per month.</p>
      </div>
      ${form('advertise', 'Request the rate card', [
        ['company', 'Brand or business', 'text', true],
        ['name', 'Your name', 'text', true],
        ['email', 'Email', 'email', true],
        ['placement', 'Placement you are interested in', 'select', false, ads.placements.map((p) => p.name).concat(['Not sure yet'])],
        ['message', 'Anything else', 'textarea', false],
      ])}
    </div>
  </div>
</section>`;
}

export function addBarPage({ venues }) {
  return `
<section class="page-hero">
  <div class="container">
    <h1>Add your bar</h1>
    <p class="lede">Free listing for any bar or restaurant that pours mezcal. Tell us what you do on Mondays and it goes on the map.</p>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="container ad-split">
    ${form('listing', 'Send the listing', [
      ['bar', 'Bar or restaurant', 'text', true],
      ['address', 'Street address, city, state', 'text', true],
      ['name', 'Your name', 'text', true],
      ['email', 'Email', 'email', true],
      ['special', 'Monday special (price, pour, hours)', 'text', false],
      ['mezcals', 'Mezcals on the menu', 'textarea', false],
    ])}
    <div class="prose">
      <h2>What happens next</h2>
      <p>We check the address, add the pin and publish the page. If you gave us a Monday special it shows on the Specials page and on your profile with the date we confirmed it.</p>
      <h2>Already listed?</h2>
      <p>Use the same form to update a special, add your hours or a website. Mention the bar name and we will match it to the existing page.</p>
      <h2>Pour BNAAA?</h2>
      <p>Bars that carry BNAAA Mezcal are added automatically from the distributor list. If yours is missing, send it through here.</p>
    </div>
  </div>
</section>`;
}

export function aboutPage({ venues, stores, site }) {
  return `
<section class="page-hero">
  <div class="container">
    <h1>About Mezcal Monday</h1>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="container prose">
    <p class="lede">Taco Tuesday has a website. Mezcal Monday did not. So here it is: a directory of the bars and restaurants that pour mezcal, what they do on Mondays, where to buy a bottle and how to mix it at home.</p>
    <p>The directory started with the ${venues.length} bars and restaurants and ${stores.length} shops that carry BNAAA Mezcal, a mezcal from Oaxaca that sponsors the site. Any bar that pours mezcal can list here for free. Any mezcal brand can advertise.</p>
    <h2>How listings work</h2>
    <p>Addresses and pins come from the bars and from distributor lists. Monday specials are only published when the bar has told us. If a listing is wrong, <a href="mailto:${esc(site.contact_email)}">email us</a> and we fix it.</p>
    <h2>Drink well</h2>
    <p>Mezcal is usually 40 to 55 percent alcohol. Sip it. Eat something. Get a ride home on Monday night like any other night.</p>
  </div>
</section>`;
}

export function searchPage() {
  return `
<section class="page-hero">
  <div class="container" style="display:grid;gap:1.5rem">
    <h1>Search</h1>
    ${searchBlock({ page: true, autofocus: true })}
    <p class="small" id="results-intro"></p>
    <div class="results-grid" id="results"></div>
  </div>
</section>`;
}

function form(type, submit, fields) {
  const f = fields.map(([n, label, kind, req, opts]) => {
    let input;
    if (kind === 'textarea') input = `<textarea id="f-${n}" name="${n}"${req ? ' required' : ''}></textarea>`;
    else if (kind === 'select') input = `<select id="f-${n}" name="${n}">${opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
    else input = `<input id="f-${n}" name="${n}" type="${kind}"${req ? ' required' : ''}${kind === 'email' ? ' autocomplete="email"' : ''}>`;
    return `<div class="field"><label for="f-${n}">${label}${req ? '' : ' <span class="muted">(optional)</span>'}</label>${input}<span class="err">Please fill this in.</span></div>`;
  }).join('');
  return `<form class="form" data-form action="/api/submit.php" method="post" novalidate>
    <input type="hidden" name="type" value="${type}">
    <label class="hp" aria-hidden="true">Leave empty<input type="text" name="website_url" tabindex="-1" autocomplete="off"></label>
    ${f}
    <div class="form-foot"><button class="btn btn-accent" type="submit">${submit}</button><span class="form-status" role="status"></span></div>
  </form>`;
}
