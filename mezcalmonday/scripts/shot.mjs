// QA screenshots + console error capture. Usage: node scripts/shot.mjs (server on :4174)
import { createRequire } from 'node:module';
const require = createRequire('/tmp/claude-0/-home-user-mezcalmondays/5ccd905d-6a89-5a83-b4e6-83fe95edc345/scratchpad/pw/package.json');
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:4174';
const pages = ['/', '/find/', '/bar/rancho-cantina/', '/recipes/', '/recipes/mezcal-margarita/', '/buy/', '/advertise/', '/specials/', '/add-your-bar/'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'mobile']]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await ctx.addInitScript((t) => { try { localStorage.setItem('mm.theme', t); } catch (e) {} }, theme);
    await ctx.route(/tile\.openstreetmap\.org/, (r) => r.abort());
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag}/${theme} ${page.url()} ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${tag}/${theme} ${page.url()} PAGEERROR ${e.message}`));
    for (const p of pages) {
      await page.goto(base + p, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(700);
      const name = `qa/${tag}-${theme}${p.replace(/\//g, '_') || '_home'}.png`;
      await page.screenshot({ path: name, fullPage: tag === 'desk' && (p === '/' || p === '/find/') });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (sw) errors.push(`${tag}/${theme} ${p} HORIZONTAL OVERFLOW`);
    }
    await ctx.close();
  }
}
// Interaction: search suggestions on home
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/tile\.openstreetmap\.org/, (r) => r.abort());
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`interact PAGEERROR ${e.message}`));
await page.goto(base + '/', { waitUntil: 'load' });
await page.click('.search-input'); await page.keyboard.type('veg');
await page.waitForTimeout(300);
await page.screenshot({ path: 'qa/interact-search.png' });
const n = await page.$$eval('.search-item', (a) => a.length);
console.log('suggestions for "veg":', n);
await page.goto(base + '/find/?region=las-vegas', { waitUntil: 'load' });
await page.waitForTimeout(500);
console.log('vegas count:', await page.$eval('[data-count]', (e) => e.textContent));
await page.click('[data-cat="bar"]'); await page.waitForTimeout(300);
console.log('vegas bars:', await page.$eval('[data-count]', (e) => e.textContent), await page.$eval('[data-count-label]', (e) => e.textContent));
await page.screenshot({ path: 'qa/interact-finder.png' });
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
