// Full-page screenshots for visual QA via the Brave/Chrome CDP session (port 9222).
// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [--full] [--dark|--light] [--scroll N]
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Kenneth Rodas/Documents/GitHub/google-flow-mcp/package.json');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
const [url, out, w = '1440', h = '900'] = pos;
const scrollIdx = args.indexOf('--scroll');
const scrollTo = scrollIdx >= 0 ? Number(args[scrollIdx + 1]) : 0;

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await page.setViewportSize({ width: Number(w), height: Number(h) });
if (flags.has('--dark') || flags.has('--light')) {
  await page.addInitScript((t) => { try { localStorage.setItem('eat.theme', t); } catch (e) { /* ignore */ } }, flags.has('--dark') ? 'dark' : 'light');
}
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
if (scrollTo) { await page.evaluate((y) => window.scrollTo(0, y), scrollTo); await page.waitForTimeout(1200); }
if (flags.has('--full')) {
  // Trigger all scroll reveals before a full-page capture.
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}
await page.screenshot({ path: out, fullPage: flags.has('--full') });
console.log('saved', out, 'errors:', errors.length);
for (const e of errors.slice(0, 20)) console.log('  ', e.slice(0, 160));
await page.close();
await browser.close();
