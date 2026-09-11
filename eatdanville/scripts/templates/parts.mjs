// Reusable fragments shared by several pages.
import { esc, icon, groupHours } from '../lib.mjs';

export const SERVICE_LABEL = {
  brunch: 'Brunch', lunch: 'Lunch', dinner: 'Dinner', late_night: 'Late night', private_dining: 'Private dining',
  catering: 'Catering', takeout: 'Takeout', delivery: 'Delivery', secret_menu: 'Secret menu', industry_specials: 'Industry specials',
  happy_hour: 'Happy hour', full_bar: 'Full bar', patio: 'Patio', live_music: 'Live music', reservations: 'Reservations', kids_menu: 'Kids menu', dog_friendly: 'Dog friendly',
};

const CHIP_PRIORITY = ['late_night', 'happy_hour', 'brunch', 'private_dining', 'patio', 'catering', 'live_music', 'lunch', 'takeout', 'delivery', 'industry_specials', 'secret_menu'];

export function serviceChips(r, max = 4, cls = 'chip') {
  const keys = CHIP_PRIORITY.filter((k) => r.services && r.services[k]).slice(0, max);
  return keys.map((k) => `<a class="${cls}" href="/#c=${k.replace('_', '-')}" data-category="${k}">${esc(SERVICE_LABEL[k])}</a>`).join('');
}

export function statusEl(r, cls = 'status') {
  return `<span class="${cls}" data-status="${r.slug}" aria-live="polite">${esc(r.hours_note || 'Hours')}</span>`;
}

export function actionBtns(r, { details = true, size = 'btn-sm' } = {}) {
  const out = [];
  if (r.reservation_url) out.push(`<a class="btn btn-accent ${size}" href="${esc(r.reservation_url)}" target="_blank" rel="noopener" data-track="reserve" data-slug="${r.slug}">Reserve<span class="btn-ico">${icon('calendar-check', '')}</span></a>`);
  if (r.menu_url) out.push(`<a class="btn btn-ghost ${size}" href="${esc(r.menu_url)}" target="_blank" rel="noopener" data-track="menu" data-slug="${r.slug}">Menu<span class="btn-ico">${icon('fork-knife', '')}</span></a>`);
  if (details) out.push(`<a class="btn btn-ghost ${size}" href="/r/${r.slug}/" data-track="details" data-slug="${r.slug}">Details<span class="btn-ico">${icon('arrow-right', '')}</span></a>`);
  else if (r.website) out.push(`<a class="btn btn-ghost ${size}" href="${esc(r.website)}" target="_blank" rel="noopener">Website<span class="btn-ico">${icon('arrow-up-right', '')}</span></a>`);
  return out.join('');
}

export function hoursGroups(r) {
  const groups = groupHours(r.hours);
  return `<div class="hours-groups">${groups.map((g) => `<div class="card hours-group"><div class="lbl">${esc(g.label)}</div><div class="t">${esc(g.text)}</div></div>`).join('')}</div>
  ${r.bar_hours ? `<p class="small muted" style="margin-top:.75rem">Bar: ${groupHours(r.bar_hours).map((g) => `${esc(g.label)} ${esc(g.text)}`).join('. ')}.</p>` : ''}
  ${r.hours_note ? `<p class="small muted" style="margin-top:.5rem">${esc(r.hours_note)}</p>` : ''}`;
}

export function formIndustry(restaurants, page) {
  return `
<form class="shell form-wrap" data-form="industry" action="/api/submit.php" method="post" novalidate>
  <div class="core form">
    <input type="hidden" name="type" value="industry">
    <input type="hidden" name="page" value="${esc(page)}">
    <label class="honey" aria-hidden="true">Leave this empty <input type="text" name="website_url" tabindex="-1" autocomplete="off"></label>
    <div class="row">
      <div class="field"><label for="ind-name">Your name</label><input class="input" id="ind-name" name="name" type="text" autocomplete="name" required><span class="error">Enter your name</span></div>
      <div class="field"><label for="ind-role">Role</label><select class="select" id="ind-role" name="role"><option value="front-of-house">Front of house</option><option value="back-of-house">Back of house</option><option value="bar">Bar</option><option value="management">Management</option></select></div>
    </div>
    <div class="field"><label for="ind-restaurant">Where you work</label><input class="input" id="ind-restaurant" name="restaurant" type="text" list="restaurant-list" placeholder="Restaurant or bar" required><datalist id="restaurant-list">${restaurants.map((r) => `<option value="${esc(r.name)}">`).join('')}</datalist><span class="error">Tell us where you work</span></div>
    <div class="field"><label for="ind-email">Email</label><input class="input" id="ind-email" name="email" type="email" autocomplete="email" inputmode="email" required><span class="help">One text or email when an industry night or a new perk goes live.</span><span class="error">Enter a valid email</span></div>
    <label class="consent"><input type="checkbox" name="consent" value="1" required> I work in food and beverage and want industry updates from Eat Danville.</label>
    <div class="form-msg" role="status"></div>
    <button class="btn btn-accent" type="submit">Join the industry list<span class="btn-ico">${icon('arrow-right', '')}</span></button>
  </div>
</form>`;
}

export function formPartner(page) {
  return `
<form class="shell form-wrap" data-form="partner" action="/api/submit.php" method="post" novalidate>
  <div class="core form">
    <input type="hidden" name="type" value="partner">
    <input type="hidden" name="page" value="${esc(page)}">
    <label class="honey" aria-hidden="true">Leave this empty <input type="text" name="website_url" tabindex="-1" autocomplete="off"></label>
    <div class="row">
      <div class="field"><label for="p-business">Business or organization</label><input class="input" id="p-business" name="business" type="text" autocomplete="organization" required><span class="error">Enter your business name</span></div>
      <div class="field"><label for="p-name">Contact name</label><input class="input" id="p-name" name="name" type="text" autocomplete="name"></div>
    </div>
    <div class="row">
      <div class="field"><label for="p-email">Email</label><input class="input" id="p-email" name="email" type="email" autocomplete="email" inputmode="email" required><span class="error">Enter a valid email</span></div>
      <div class="field"><label for="p-interest">I want to</label><select class="select" id="p-interest" name="interest"><option value="listing">Get listed as a guest partner</option><option value="banner">Sponsor a placement</option><option value="event">Post an event</option><option value="chamber">Coordinate as the chamber or the town</option><option value="media">Cover the district as media</option></select></div>
    </div>
    <div class="field"><label for="p-message">Anything else</label><textarea class="textarea" id="p-message" name="message" rows="3" placeholder="What you have in mind, timing, budget if any."></textarea></div>
    <div class="form-msg" role="status"></div>
    <button class="btn btn-accent" type="submit">Send the inquiry<span class="btn-ico">${icon('paper-plane-tilt', '')}</span></button>
  </div>
</form>`;
}

export function mapLegend(restaurants, district, { showToggles = true } = {}) {
  return `
<div class="legend" role="list">
  ${restaurants.map((r, i) => `<button class="legend-row" type="button" role="listitem" data-pin="${r.slug}"><span class="pin">${esc(r.initial)}</span><span><span class="n">${esc(r.name)}</span><br><span class="d">${esc(r.address)}</span></span><span class="w" data-status-short="${r.slug}"></span></button>`).join('')}
</div>
${showToggles ? `<div class="map-toggles">
  <button class="chip" type="button" data-layer="parking" aria-pressed="true">${icon('car-simple', '')} Parking</button>
  <button class="chip" type="button" data-layer="landmarks" aria-pressed="false">${icon('map-pin', '')} Landmarks</button>
  <button class="chip" type="button" data-layer="loop" aria-pressed="true">${icon('path', '')} The loop</button>
</div>` : ''}`;
}

// Schematic of the intersection: Hartz Ave runs top to bottom, Church St left to right. Odd addresses sit on the west side, even on the east.
export function cornerDiagram(restaurants) {
  const by = Object.fromEntries(restaurants.map((r) => [r.slug, r]));
  const blocks = [
    { r: by.incontro, x: 14, y: 14 },   // north-west
    { r: by.kaias, x: 176, y: 14 },     // north-east
    { r: by['rancho-cantina'], x: 14, y: 176 }, // south-west
    { r: by.harvest, x: 176, y: 176 },  // south-east
  ].filter((b) => b.r);
  return `<svg class="corner-diagram" viewBox="0 0 320 320" role="img" aria-label="Diagram of the four restaurants around the corner of Hartz Avenue and Church Street">
    <rect class="street" x="140" y="0" width="40" height="320"/>
    <rect class="street" x="0" y="140" width="320" height="40"/>
    <path class="street-edge" d="M140 0V140H0M180 0V140H320M140 320V180H0M180 320V180H320"/>
    <text class="street-name" transform="translate(163 100) rotate(-90)" text-anchor="middle">Hartz Ave</text>
    <text class="street-name" x="250" y="163" text-anchor="middle">Church St</text>
    <text class="north" x="160" y="12" text-anchor="middle">N</text>
    ${blocks.map((b) => `<g transform="translate(${b.x} ${b.y})">
      <rect class="block" x="0" y="0" width="130" height="130" rx="10"/>
      <text class="initial" x="16" y="52">${esc(b.r.initial)}</text>
      <text class="addr" x="16" y="94">${esc(b.r.address)}</text>
      <text class="name" x="16" y="112">${esc(b.r.short)}</text>
    </g>`).join('')}
  </svg>`;
}

export function plannerBlock(restaurants, { preset = '19:00' } = {}) {
  return `
<div class="shell" id="plan">
  <div class="core planner">
    <div class="planner-controls" data-planner-controls data-preset="${preset}">
      <div><h3>Plan my night</h3><p class="small muted" style="margin-top:.35rem">Two stops, one corner. Pick a time and a mood, we route the evening.</p></div>
      <div class="control-group"><span class="lbl">Arriving at</span><div class="chip-row" data-control="time">
        <button class="chip" type="button" data-value="18:00">6 PM</button>
        <button class="chip" type="button" data-value="19:00">7 PM</button>
        <button class="chip" type="button" data-value="20:00">8 PM</button>
        <button class="chip" type="button" data-value="21:00">9 PM</button>
      </div></div>
      <div class="control-group"><span class="lbl">Tonight is</span><div class="chip-row" data-control="mood">
        <button class="chip" type="button" data-value="date">Date night</button>
        <button class="chip" type="button" data-value="group">A group</button>
        <button class="chip" type="button" data-value="solo">Solo at the bar</button>
        <button class="chip" type="button" data-value="show">After a show</button>
      </div></div>
      <div class="control-group"><span class="lbl">In the mood for</span><div class="chip-row" data-control="prefs" data-multi="true">
        <button class="chip" type="button" data-value="cocktails">Cocktails</button>
        <button class="chip" type="button" data-value="dessert">Dessert</button>
        <button class="chip" type="button" data-value="tequila">Tequila and mezcal</button>
        <button class="chip" type="button" data-value="wine">Wine</button>
        <button class="chip" type="button" data-value="tiki">Tiki</button>
        <button class="chip" type="button" data-value="patio">Patio</button>
      </div></div>
      <div class="control-group"><span class="lbl">Day</span><div class="chip-row" data-control="day">
        <button class="chip" type="button" data-value="today">Tonight</button>
        <button class="chip" type="button" data-value="fri">Friday</button>
        <button class="chip" type="button" data-value="sat">Saturday</button>
      </div></div>
    </div>
    <div class="planner-result" id="planner-result" aria-live="polite">
      <div class="itin">
        ${restaurants.slice(0, 2).map((r, i) => `<div class="stop"><div class="when">${i === 0 ? '7 PM' : '9 PM'}<small>${i === 0 ? 'Dinner' : 'Nightcap'}</small></div><div class="what"><h4>${esc(r.name)}</h4><p>${esc(r.cuisine)}</p></div></div>`).join('')}
      </div>
      <p class="planner-note">Turn on JavaScript to route the evening around tonight's hours.</p>
    </div>
  </div>
</div>`;
}
