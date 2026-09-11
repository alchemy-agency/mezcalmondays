// Interaction QA over CDP: types into search, opens a category drawer, exercises the planner, checks the map, collects console errors.
// Usage: node scripts/qa-interact.mjs [baseUrl]
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Kenneth Rodas/Documents/GitHub/google-flow-mcp/package.json');
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:4173';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 160)}`); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await sleep(1200);

// 1. Predictive search
const input = page.locator('.hero .search-input');
await input.click();
await input.type('late night tacos', { delay: 30 });
await sleep(400);
const items = await page.locator('.hero .search-panel .search-item').allTextContents();
console.log('SEARCH "late night tacos" ->', items.slice(0, 6).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 70)));
await page.screenshot({ path: 'qa/qa-search.png' });
await input.fill('');
await input.type('tiki', { delay: 30 });
await sleep(400);
console.log('SEARCH "tiki" ->', (await page.locator('.hero .search-panel .search-item').allTextContents()).slice(0, 4).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 60)));
await page.keyboard.press('ArrowDown');
await sleep(100);
console.log('selected after ArrowDown:', await page.locator('.hero .search-item[aria-selected="true"]').count());
await page.keyboard.press('Escape');

// 2. Category drawer
await page.locator('[data-drawer-category="late-night"]').first().click();
await sleep(500);
console.log('DRAWER open:', await page.locator('#drawer.is-open').count(), 'results:', await page.locator('#drawer .result').count(), 'title:', await page.locator('#drawer-title').textContent());
await page.screenshot({ path: 'qa/qa-drawer.png' });
await page.keyboard.press('Escape');
await sleep(300);

// 3. Map
await page.locator('#map-canvas').scrollIntoViewIfNeeded();
await sleep(1500);
console.log('MAP leaflet container:', await page.locator('#map-canvas .leaflet-container').count(), 'pins:', await page.locator('#map-canvas .eat-pin').count(), 'walk labels:', await page.locator('#map-canvas .walk-label').count(), 'tiles:', await page.locator('#map-canvas img.leaflet-tile').count());
await page.locator('[data-pin="kaias"]').first().click();
await sleep(1200);
console.log('MAP popup after legend click:', await page.locator('#map-canvas .leaflet-popup').count());
await page.screenshot({ path: 'qa/qa-map.png' });

// 4. Planner
await page.locator('#plan').scrollIntoViewIfNeeded();
await sleep(800);
await page.locator('[data-control="time"] [data-value="20:00"]').click();
await page.locator('[data-control="mood"] [data-value="date"]').click();
await page.locator('[data-control="prefs"] [data-value="dessert"]').click();
await page.locator('[data-control="day"] [data-value="fri"]').click();
await sleep(500);
const stops = await page.locator('#planner-result .stop').allTextContents();
console.log('PLANNER stops:', stops.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 90)));
console.log('PLANNER actions:', await page.locator('#planner-result .planner-actions .btn').allTextContents());
await page.screenshot({ path: 'qa/qa-planner.png' });

// 5. Tonight board + status lines
console.log('STATUS lines:', (await page.locator('[data-status]').allTextContents()).slice(0, 4));
console.log('TONIGHT rows:', (await page.locator('[data-tonight-row] [data-tonight-time]').allTextContents()).slice(0, 4));

// 6. Search results page
await page.goto(`${base}/search/?q=private%20dining`, { waitUntil: 'networkidle' });
await sleep(800);
console.log('SEARCH PAGE intro:', (await page.locator('#results-intro').textContent() || '').trim().slice(0, 80), 'results:', await page.locator('#results .result').count());

// 7. Restaurant page tabs + map focus
await page.goto(`${base}/r/incontro/`, { waitUntil: 'networkidle' });
await sleep(1200);
await page.locator('[data-tab="dessert"]').click();
console.log('TABS dessert panel visible:', await page.locator('[data-panel="dessert"]:not([hidden])').count());
console.log('R-PAGE map pins:', await page.locator('#map-canvas .eat-pin').count(), 'popup open:', await page.locator('#map-canvas .leaflet-popup').count());

console.log('\nERRORS:', errors.length);
for (const e of errors.slice(0, 15)) console.log(' ', e);
await page.close();
await browser.close();
