// Static site build: data/*.json + templates -> dist/
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SRC, DIST, readJSON, copyDir, writeFile, esc } from './lib.mjs';
import { shell } from './templates/shell.mjs';
import { home } from './templates/home.mjs';
import { restaurant } from './templates/restaurant.mjs';
import { afterDark, industry, partners, mapPage, searchPage } from './templates/pages.mjs';

const t0 = Date.now();
const site = readJSON('district.json');
const restaurants = readJSON('restaurants.json');
const categories = readJSON('categories.json');
const hero = readJSON('hero.json');
site.build = String(Math.floor(Date.now() / 1000)).slice(-6);

// Fill image fallbacks so no page ships a broken src.
for (const r of restaurants) {
  r.images = r.images || {};
  const fallback = `assets/img/${r.slug}/hero.jpg`;
  if (!r.images.hero) r.images.hero = fallback;
  if (!r.images.card) r.images.card = r.images.hero;
  r.images.gallery = (r.images.gallery || []).filter((g) => fs.existsSync(path.join(SRC, g)));
  for (const k of ['hero', 'card']) {
    if (!fs.existsSync(path.join(SRC, r.images[k]))) console.warn(`[warn] missing image for ${r.slug}: ${r.images[k]}`);
  }
}
for (const c of categories) if (!fs.existsSync(path.join(SRC, c.image))) console.warn(`[warn] missing category image: ${c.image}`);

// Reset dist
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// Assets, vendor, api
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
copyDir(path.join(SRC, 'vendor'), path.join(DIST, 'vendor'));
copyDir(path.join(ROOT, 'api'), path.join(DIST, 'api'));
copyDir(path.join(ROOT, 'public'), DIST);

// CSS bundle
const cssOrder = ['fonts', 'tokens', 'base', 'components'];
const css = cssOrder.map((n) => fs.readFileSync(path.join(SRC, 'css', `${n}.css`), 'utf8')).join('\n');
writeFile('css/site.css', css);

// JS: copy each module as-is (no bundler) + data
fs.mkdirSync(path.join(DIST, 'js'), { recursive: true });
for (const f of fs.readdirSync(path.join(SRC, 'js'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(SRC, 'js', f), path.join(DIST, 'js', f));
const publicData = {
  site: { brand: site.brand, name: site.name, alt: site.alt, hashtag: site.hashtag, url: site.url, corner: site.corner, parking: site.parking, landmarks: site.landmarks, walking_note: site.walking_note, sponsors: site.sponsors, map_tiles: { carto_key: (site.map_tiles && site.map_tiles.carto_key) || '' } },
  restaurants: restaurants.map((r) => ({
    slug: r.slug, name: r.name, short: r.short, initial: r.initial, cuisine: r.cuisine, description: r.description, price: r.price,
    address: r.address, phone: r.phone, phone_href: r.phone_href, website: r.website, menu_url: r.menu_url, reservation_url: r.reservation_url,
    reservation_platform: r.reservation_platform, order_url: r.order_url, private_dining_url: r.private_dining_url, catering_url: r.catering_url,
    delivery: r.delivery, instagram: r.instagram, google_maps: r.google_maps, lat: r.lat, lng: r.lng, hours: r.hours, bar_hours: r.bar_hours,
    hours_note: r.hours_note, happy_hour: r.happy_hour, late_night: r.late_night, services: r.services, service_notes: r.service_notes,
    dishes: r.dishes, drinks: r.drinks, desserts: r.desserts, nightcap: r.nightcap, industry: r.industry, tags: r.tags, images: r.images,
  })),
  categories,
};
writeFile('js/data.js', `window.EAT_DATA=${JSON.stringify(publicData)};`);

const ctx = { site, restaurants, categories, hero };
const pages = [];

function emit(pathname, title, body, extra = {}) {
  const page = { path: pathname, title, ...extra };
  const html = shell({ site, restaurants, page, body, scripts: extra.scripts || [], jsonld: extra.jsonld || [] });
  writeFile(pathname === '/' ? 'index.html' : `${pathname.replace(/^\//, '')}index.html`, html);
  pages.push({ path: pathname, image: extra.image });
}

const orgLd = {
  '@context': 'https://schema.org', '@type': 'Organization', name: site.name, alternateName: [site.alt, site.brand], url: site.url,
  description: site.description, email: site.contact_email,
  location: { '@type': 'Place', name: site.corner.label, geo: { '@type': 'GeoCoordinates', latitude: site.corner.lat, longitude: site.corner.lng }, address: { '@type': 'PostalAddress', addressLocality: 'Danville', addressRegion: 'CA', postalCode: '94526', addressCountry: 'US' } },
  member: restaurants.map((r) => ({ '@type': 'Restaurant', name: r.name, url: `${site.url}/r/${r.slug}/` })),
};

emit('/', '', home(ctx), {
  description: site.description, preload: `/${hero.slides[0].src}`, image: `/${hero.og || "assets/img/og.jpg"}`, map: true, heroDark: true,
  scripts: ['map', 'planner', 'motion'],
  jsonld: [orgLd, { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Danville Dining District restaurants', itemListElement: restaurants.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/r/${r.slug}/`, name: r.name })) }],
});

for (const r of restaurants) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'Restaurant', name: r.name, url: `${site.url}/r/${r.slug}/`, image: `${site.url}/${r.images.hero}`,
    servesCuisine: r.cuisine, priceRange: r.price, telephone: r.phone, menu: r.menu_url, acceptsReservations: r.reservation_url ? r.reservation_url : 'False',
    address: { '@type': 'PostalAddress', streetAddress: r.address, addressLocality: r.city, addressRegion: r.state, postalCode: r.zip, addressCountry: 'US' },
    geo: { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng },
    openingHoursSpecification: Object.entries(r.hours).flatMap(([d, ranges]) => ranges.map((rg) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }[d], opens: rg[0], closes: rg[1] }))),
    sameAs: [r.website, r.instagram ? `https://www.instagram.com/${r.instagram}/` : '', r.facebook, r.yelp].filter(Boolean),
  };
  emit(`/r/${r.slug}/`, r.name, restaurant({ ...ctx, r }), {
    description: `${r.name}, ${r.cuisine.toLowerCase()} at ${r.address} on the corner of ${site.corner.label} in downtown Danville. Hours, menu highlights, reservations, private dining, takeout and what to order after 8.`,
    image: `/${r.images.hero}`, preload: `/${r.images.hero}`, map: true, heroDark: true, scripts: ['map', 'motion'], jsonld: [ld], ogType: 'restaurant',
  });
}

emit('/after-dark/', 'After Dark', afterDark(ctx), { description: `${site.hashtag}: tonight's late board for the four restaurants on Hartz and Church, nightcap stops and a two-stop night planner.`, image: `/${hero.afterdark}`, preload: `/${hero.afterdark}`, heroDark: true, scripts: ['planner', 'motion'] });
emit('/industry/', 'Industry', industry(ctx), { description: 'Industry perks and after-shift nights for front of house and back of house on the Danville Dining District corner.', scripts: ['motion'] });
emit('/partners/', 'Partners', partners(ctx), { description: 'Guest listings, sponsor placements, event posts and chamber coordination for the Danville Dining District.', scripts: ['motion'] });
emit('/map/', 'Map', mapPage(ctx), { description: 'Map of the Danville Dining District: four restaurants, free parking lots and the walk between them at Hartz Ave and Church St.', map: true, scripts: ['map'] });
emit('/search/', 'Search', searchPage(ctx), { description: 'Search the Danville Dining District by meal, service, dish or drink.', scripts: [] });

// Sitemap, robots, 404
writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${site.url}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFile('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${site.url}/sitemap.xml\n`);
writeFile('404.html', shell({ site, restaurants, page: { path: '/404', title: 'Not found' }, body: `<section class="page-hero"><div class="container"><h1>That table is not set</h1><p class="lede">The page moved or never existed. The corner is still here.</p><div class="hero-actions" style="justify-content:flex-start;margin-top:1.5rem"><a class="btn btn-accent" href="/">Back to the district</a></div></div></section>` }));

console.log(`Built ${pages.length} pages in ${Date.now() - t0} ms -> dist/`);
