// Static site build: data/*.json + templates -> dist/
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SRC, DIST, readJSON, copyDir, writeFile, icon, regionOf } from './lib.mjs';
import { shell } from './templates/shell.mjs';
import { home } from './templates/home.mjs';
import { venuePage } from './templates/venue.mjs';
import { findPage, specialsPage, buyPage, recipesPage, recipePage, advertisePage, addBarPage, aboutPage, searchPage } from './templates/pages.mjs';

const t0 = Date.now();
const site = readJSON('site.json');
const venues = readJSON('venues.json');
const stores = readJSON('stores.json');
const online = readJSON('online.json');
const categories = readJSON('categories.json');
const recipes = readJSON('recipes.json');
const ads = readJSON('ads.json');
const sponsors = readJSON('sponsors.json');
const regions = site.regions;
const RECIPE_BRAND_IMG = { 'mezcal-margarita': 'assets/img/brand/recipe-margarita.png', 'mezcaloma': 'assets/img/brand/recipe-mezcaloma.png', 'mezcal-carajillo': 'assets/img/brand/recipe-carajillo.png' };
for (const r of recipes) { const own = path.join(SRC, r.image || ''); const brand = RECIPE_BRAND_IMG[r.slug]; r.img = r.image && fs.existsSync(own) ? r.image : brand && fs.existsSync(path.join(SRC, brand)) ? brand : ''; }
site.build = String(Math.floor(Date.now() / 1000)).slice(-6);

// Optional enrichment from the harvest workflow (data/bnaaa-pages/pages.json)
const harvest = path.join(ROOT, 'data', 'bnaaa-pages', 'pages.json');
if (fs.existsSync(harvest)) {
  const pages = JSON.parse(fs.readFileSync(harvest, 'utf8'));
  for (const v of venues) { const p = pages.find((x) => x.slug === v.slug || (x.venue_slug === v.slug)); if (p) { v.bnaaa_page = p.url; if (p.description && !v.description) v.description = p.description; } }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
copyDir(path.join(SRC, 'vendor'), path.join(DIST, 'vendor'));
copyDir(path.join(ROOT, 'api'), path.join(DIST, 'api'));
copyDir(path.join(ROOT, 'public'), DIST);

const css = ['fonts', 'tokens', 'base', 'components'].map((n) => fs.readFileSync(path.join(SRC, 'css', `${n}.css`), 'utf8')).join('\n');
writeFile('css/site.css', css);
fs.mkdirSync(path.join(DIST, 'js'), { recursive: true });
for (const f of fs.readdirSync(path.join(SRC, 'js'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(SRC, 'js', f), path.join(DIST, 'js', f));

const icons = {};
for (const n of ['storefront', 'crosshair', 'map-pin', 'cooking-pot', 'magnifying-glass', 'arrow-right', 'clock-counter-clockwise']) icons[n] = icon(n, '');
const publicData = {
  site: { brand: site.brand, url: site.url, map_tiles: site.map_tiles, default_center: site.default_center },
  regions, categories, icons,
  venues: venues.map((v) => ({ slug: v.slug, name: v.name, type: v.type, street: v.street, city: v.city, state: v.state, state_name: v.state_name, lat: v.lat, lng: v.lng, featured: !!v.featured, monday_special: v.monday_special, pours_bnaaa: v.pours_bnaaa, tags: v.tags })),
  stores: stores.map((s) => ({ slug: s.slug, name: s.name, street: s.street, city: s.city, state: s.state, state_name: s.state_name, lat: s.lat, lng: s.lng })),
  recipes: recipes.map((r) => ({ slug: r.slug, name: r.name, kicker: r.kicker, tags: r.tags })),
};
writeFile('js/data.js', `window.MM_DATA=${JSON.stringify(publicData)};`);

const ctx = { site, venues, stores, online, categories, recipes, ads, sponsors, regions };
const pages = [];
function emit(pathname, title, body, extra = {}) {
  const page = { path: pathname, title, ...extra };
  writeFile(pathname === '/' ? 'index.html' : `${pathname.replace(/^\//, '')}index.html`, shell({ site, regions, page, body, scripts: extra.scripts || [], jsonld: extra.jsonld || [] }));
  pages.push({ path: pathname });
}

const orgLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: site.brand, url: site.url, description: site.description, potentialAction: { '@type': 'SearchAction', target: `${site.url}/find/?q={search_term_string}`, 'query-input': 'required name=search_term_string' } };

emit('/', '', home(ctx), { description: site.description, gsap: true, scripts: ['motion'], jsonld: [orgLd, { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Bars that pour mezcal', itemListElement: venues.map((v, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/bar/${v.slug}/`, name: v.name })) }] });
emit('/find/', 'Find a bar', findPage(ctx), { description: `Map and list of ${venues.length} bars and restaurants that pour mezcal, filtered by city, cocktails, restaurants or Monday specials.`, map: true, scripts: ['map', 'finder'] });
emit('/specials/', 'Monday specials', specialsPage(ctx), { description: 'Confirmed mezcal specials on Mondays, straight from the bars.' });
emit('/buy/', 'Where to buy', buyPage(ctx), { description: `Where to buy BNAAA Mezcal: ${stores.length} bottle shops on the map plus online delivery.`, map: true, scripts: ['map'] });
emit('/recipes/', 'Recipes', recipesPage(ctx), { description: `${recipes.length} mezcal cocktail recipes: margarita, mezcaloma, carajillo, Oaxaca old fashioned, negroni and more.` });
for (const r of recipes) {
  const ld = { '@context': 'https://schema.org', '@type': 'Recipe', name: r.name, description: r.intro, recipeIngredient: r.ingredients, recipeInstructions: r.steps.map((s) => ({ '@type': 'HowToStep', text: s })), recipeYield: `${r.serves} drink`, recipeCategory: 'Cocktail', keywords: r.tags.join(', '), author: { '@type': 'Organization', name: site.brand } };
  emit(`/recipes/${r.slug}/`, r.name, recipePage({ ...ctx, r }), { description: r.intro, jsonld: [ld], ogType: 'article' });
}
for (const v of venues) {
  const region = regionOf(v, regions);
  const ld = { '@context': 'https://schema.org', '@type': v.type === 'hotel' ? 'BarOrPub' : v.type === 'bar' ? 'BarOrPub' : 'Restaurant', name: v.name, url: `${site.url}/bar/${v.slug}/`, address: { '@type': 'PostalAddress', streetAddress: v.street, addressLocality: v.city, addressRegion: v.state, postalCode: v.zip, addressCountry: 'US' }, geo: { '@type': 'GeoCoordinates', latitude: v.lat, longitude: v.lng }, servesCuisine: v.type === 'restaurant' ? undefined : undefined };
  if (v.website) ld.sameAs = [v.website]; if (v.phone) ld.telephone = v.phone;
  emit(`/bar/${v.slug}/`, v.name, venuePage({ ...ctx, v, region }), { description: `${v.name} in ${v.city}, ${v.state_name} pours mezcal. Address, directions, Monday special and nearby bars on Mezcal Monday.`, map: true, scripts: ['map'], jsonld: [ld] });
}
emit('/advertise/', 'Advertise', advertisePage(ctx), { description: 'Banner ads, featured listings and premium placements on Mezcal Monday for mezcal brands, bars and events.' });
emit('/add-your-bar/', 'Add your bar', addBarPage(ctx), { description: 'List your bar or restaurant on Mezcal Monday for free and post your Monday special.' });
emit('/about/', 'About', aboutPage(ctx), { description: 'What Mezcal Monday is, where the listings come from and who sponsors it.' });
emit('/search/', 'Search', searchPage(ctx), { description: 'Search Mezcal Monday by bar, city or drink.' });

writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${site.url}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFile('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${site.url}/sitemap.xml\n`);
writeFile('404.html', shell({ site, regions, page: { path: '/404', title: 'Not found' }, body: `<section class="page-hero"><div class="container"><h1>No pour here</h1><p class="lede">That page moved or never existed. The map is still open.</p><div class="btn-row" style="margin-top:1.5rem"><a class="btn btn-accent" href="/find/">Find a bar</a><a class="btn btn-ghost" href="/">Home</a></div></div></section>` }));
console.log(`Built ${pages.length} pages in ${Date.now() - t0} ms -> dist/`);
