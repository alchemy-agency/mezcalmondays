// Direct Google Flow image generation over CDP (Playwright), independent of the MCP's selectors.
// Usage: node scripts/flow-gen.mjs jobs.json [outDir]
//   jobs.json: [{ "name": "tiki", "prompt": "...", "ratio": "1:1", "model": "Nano Banana Pro", "count": 2 }]
// Requires the dedicated Brave/Chrome from google-flow-mcp/scripts/ensure-flow-chrome.ps1 (CDP 9222), logged in to Flow.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire('C:/Users/Kenneth Rodas/Documents/GitHub/google-flow-mcp/package.json');
const { chromium } = require('playwright');

const [jobsFile, outDirArg] = process.argv.slice(2);
const OUT = path.resolve(outDirArg || 'src/assets/img/flow');
fs.mkdirSync(OUT, { recursive: true });
const jobs = JSON.parse(fs.readFileSync(path.resolve(jobsFile), 'utf8'));

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
let page = ctx.pages().find((p) => p.url().includes('flow.google.com')) || ctx.pages()[0];
console.log('page', page.url());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureProject() {
  // After a generation Flow can drop into an /edit/<asset> view; go back to the project root.
  const m = page.url().match(/^(https:\/\/flow\.google\.com\/project\/[a-f0-9-]+)/);
  if (m && page.url() !== m[1] && page.url() !== `${m[1]}/`) {
    await page.goto(m[1], { waitUntil: 'domcontentloaded' });
    await sleep(3500);
  }
  if (!/flow\.google\.com\/project\//.test(page.url())) {
    await page.goto('https://flow.google.com/', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    // Dismiss changelog dialogs
    const gs = page.getByRole('button', { name: /get started|got it|close/i }).first();
    if (await gs.isVisible().catch(() => false)) await gs.click().catch(() => {});
    const np = page.getByText('New project', { exact: false }).first();
    await np.click();
    await page.waitForURL(/\/project\//, { timeout: 30000 });
    await sleep(3000);
  }
  await dismissDialogs();
}

async function dismissDialogs() {
  for (let i = 0; i < 3; i++) {
    const el = page.getByText(/^(get started|got it|ok|close|dismiss)$/i).first();
    if (await el.isVisible().catch(() => false)) { await el.click({ timeout: 5000 }).catch(() => {}); await sleep(600); continue; }
    const dlg = page.locator('dialog, [role="dialog"]').first();
    if (await dlg.isVisible().catch(() => false)) { await page.keyboard.press('Escape'); await sleep(500); continue; }
    break;
  }
}

async function snap(name) {
  try { await page.screenshot({ path: path.join(OUT, `debug-${name}.png`) }); } catch { /* ignore */ }
}

async function visibleImages() {
  return page.evaluate(() => Array.from(document.querySelectorAll('img'))
    .filter((i) => i.src && /^https?:/.test(i.src) && i.naturalWidth >= 256)
    .map((i) => ({ src: i.src, w: i.naturalWidth, h: i.naturalHeight })));
}

async function setSettings({ ratio, model, count }) {
  const trigger = page.locator('button[aria-label="Settings trigger"]').first();
  await trigger.click();
  await sleep(800);
  // Image mode
  const img = page.getByRole('button', { name: /^image$/i }).first();
  if (await img.isVisible().catch(() => false)) await img.click().catch(() => {});
  if (ratio) {
    const r = page.getByText(ratio, { exact: true }).first();
    if (await r.isVisible().catch(() => false)) await r.click(); else console.log('ratio label not found', ratio);
    await sleep(300);
  }
  if (model) {
    const sel = page.locator('button[aria-label="Select model family"]').first();
    if (await sel.isVisible().catch(() => false)) {
      const current = (await sel.textContent().catch(() => '')) || '';
      if (!current.includes(model)) {
        await sel.click(); await sleep(600);
        const opt = page.getByText(model, { exact: false }).last();
        if (await opt.isVisible().catch(() => false)) await opt.click(); else { console.log('model option not found', model); await page.keyboard.press('Escape'); }
        await sleep(400);
      }
    }
  }
  if (count) {
    const c = page.getByText(`x${count}`, { exact: true }).first();
    if (await c.isVisible().catch(() => false)) await c.click();
    await sleep(300);
  }
  await page.keyboard.press('Escape');
  await sleep(400);
}

async function fillPrompt(text) {
  const box = page.locator('div.ProseMirror[contenteditable="true"]').first();
  await box.waitFor({ state: 'visible', timeout: 20000 });
  await box.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await sleep(200);
  await box.type(text, { delay: 4 });
  await sleep(500);
}

async function generate(job) {
  const before = new Set((await visibleImages()).map((i) => i.src));
  const btn = page.locator('button[aria-label="Start generation"]').first();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await btn.click();
  console.log(`  submitted ${job.name}`);
  const t0 = Date.now();
  let fresh = [];
  while (Date.now() - t0 < 240000) {
    await sleep(4000);
    // Approve any credit/agent dialog
    const approve = page.getByRole('button', { name: /^(approve|accept|continue|generate)$/i }).first();
    if (await approve.isVisible().catch(() => false)) { await approve.click().catch(() => {}); console.log('  approved dialog'); }
    const imgs = await visibleImages();
    fresh = imgs.filter((i) => !before.has(i.src) && i.w >= 512);
    if (fresh.length >= (job.count || 1)) { await sleep(2500); fresh = (await visibleImages()).filter((i) => !before.has(i.src) && i.w >= 512); break; }
  }
  if (!fresh.length) {
    const txt = (await page.evaluate(() => document.body.innerText)).slice(-600);
    console.log('  no new images. page tail:', txt.replace(/\s+/g, ' '));
    return [];
  }
  // Give the second variant a moment to land, then dedupe by content hash.
  if ((job.count || 1) > 1) { await sleep(6000); fresh = (await visibleImages()).filter((i) => !before.has(i.src) && i.w >= 512); }
  const saved = [];
  const hashes = new Set();
  let n = 0;
  for (const img of fresh) {
    try {
      const res = await ctx.request.get(img.src, { timeout: 30000 });
      if (!res.ok()) { console.log('  fetch failed', res.status(), img.src.slice(0, 80)); continue; }
      const body = await res.body();
      const hash = createHash('md5').update(body).digest('hex');
      if (hashes.has(hash)) continue; hashes.add(hash);
      const ct = res.headers()['content-type'] || '';
      const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
      const file = path.join(OUT, `${job.name}-${++n}.${ext}`);
      fs.writeFileSync(file, body);
      saved.push(file);
      console.log(`  saved ${path.basename(file)} ${img.w}x${img.h}`);
    } catch (e) { console.log('  download error', e.message); }
  }
  return saved;
}

await ensureProject();
const results = [];
for (const job of jobs) {
  console.log(`\n### ${job.name} (${job.ratio || '16:9'}, ${job.model || 'default'}, x${job.count || 1})`);
  try {
    await ensureProject();
    await dismissDialogs();
    await setSettings(job).catch(async (e) => { console.log('  settings step failed:', e.message.split('\n')[0]); await snap(`${job.name}-settings`); await page.keyboard.press('Escape'); });
    await fillPrompt(`Generate an image now, without asking questions. Follow this description faithfully and add nothing else: ${job.prompt}`);
    const files = await generate(job);
    results.push({ name: job.name, files });
  } catch (e) {
    console.log('  ERROR', e.message.split('\n')[0]);
    await snap(`${job.name}-error`);
    results.push({ name: job.name, files: [], error: e.message.split('\n')[0] });
    try { await page.keyboard.press('Escape'); } catch { /* ignore */ }
  }
}
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log('\nDONE', results.map((r) => `${r.name}:${r.files.length}`).join(' '));
await browser.close();
