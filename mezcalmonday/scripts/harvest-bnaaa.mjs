// Fetches BNAAA partner landing pages + brand assets with headless Chromium (passes the SiteGround JS check).
// Writes data/bnaaa-pages/<slug>.html, data/bnaaa-pages/pages.json and src/assets/img/brand/*. Sets venues[].bnaaa_page.
// Run by .github/workflows/harvest-bnaaa.yml, or locally: npm i --no-save playwright && node scripts/harvest-bnaaa.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const venues = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/venues.json'), 'utf8'));
const want = (process.env.SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const slugs = want.length ? want : venues.map((v) => v.slug);
const outDir = path.join(ROOT, 'data/bnaaa-pages'); fs.mkdirSync(outDir, { recursive: true });
const imgDir = path.join(ROOT, 'src/assets/img/brand'); fs.mkdirSync(imgDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36' });
const page = await ctx.newPage();
async function settle() { for (let i = 0; i < 15 && /sgcaptcha/.test(page.url()); i++) await page.waitForTimeout(2000); await page.waitForTimeout(1200); }
await page.goto('https://bnaaamezcal.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await settle();
const brand = {
  'bnaaa-logo.svg': 'https://bnaaamezcal.com/wp-content/uploads/2025/02/evzzhl5hy6im6ylkxe4.svg',
  'bnaaa-logo.png': 'https://bnaaamezcal.com/wp-content/uploads/2025/02/evzzhl5hy6im6ylkxe4.png',
  'recipe-margarita.png': 'https://bnaaamezcal.com/wp-content/uploads/2026/09/BNAAA_Classic_Mezcal_Margarita-1.png',
  'recipe-carajillo.png': 'https://bnaaamezcal.com/wp-content/uploads/2026/09/The_Carajillo-1.png',
  'recipe-mezcaloma.png': 'https://bnaaamezcal.com/wp-content/uploads/2026/09/The_Mezcaloma-1.png',
  'award-tsm-gold-2026.png': 'https://bnaaamezcal.com/wp-content/uploads/2026/08/TSM_Award_Gold_26_B-2-1.png',
};
for (const [name, url] of Object.entries(brand)) {
  try { const r = await ctx.request.get(url); const ct = r.headers()['content-type'] || ''; if (r.ok() && !/text\/html/.test(ct)) { fs.writeFileSync(path.join(imgDir, name), await r.body()); console.log('saved', name); } else console.log('skip', name, r.status(), ct); } catch (e) { console.log('fail', name, e.message); }
}
const index = [];
for (const slug of slugs) {
  const url = `https://bnaaamezcal.com/${slug}/`;
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await settle();
    const status = res ? res.status() : 0; const title = await page.title();
    if (status === 404 || /not found/i.test(title) || /sgcaptcha/.test(page.url())) { console.log('none', slug, status); continue; }
    const html = await page.content();
    const desc = await page.$eval('meta[name="description"]', (m) => m.content).catch(() => '');
    fs.writeFileSync(path.join(outDir, `${slug}.html`), html);
    index.push({ slug, venue_slug: slug, url, title, description: desc });
    const v = venues.find((x) => x.slug === slug); if (v) v.bnaaa_page = url;
    console.log('saved', slug, title);
  } catch (e) { console.log('fail', slug, e.message); }
}
fs.writeFileSync(path.join(outDir, 'pages.json'), JSON.stringify(index, null, 1));
fs.writeFileSync(path.join(ROOT, 'data/venues.json'), JSON.stringify(venues, null, 1));
await browser.close();
console.log(`harvested ${index.length} pages`);
