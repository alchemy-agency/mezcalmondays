// Shared build helpers: escaping, Phosphor icon inlining, slugs, region matching, file utilities.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const SRC = path.join(ROOT, 'src');
export const DIST = path.join(ROOT, 'dist');
export const DATA = path.join(ROOT, 'data');

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));

const iconCache = new Map();
export function icon(name, cls = 'ico') {
  if (!iconCache.has(name)) {
    const file = path.join(ROOT, 'node_modules', '@phosphor-icons', 'core', 'assets', 'regular', `${name}.svg`);
    if (!fs.existsSync(file)) throw new Error(`Unknown Phosphor icon: ${name}`);
    const svg = fs.readFileSync(file, 'utf8')
      .replace(/<\?xml[^>]*>/, '')
      .replace(/\s(width|height)="[^"]*"/g, '')
      .replace('<svg', '<svg aria-hidden="true" focusable="false" fill="currentColor"');
    iconCache.set(name, svg.trim());
  }
  const svg = iconCache.get(name);
  return cls ? `<span class="${cls}">${svg}</span>` : svg;
}

export const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function regionOf(v, regions) {
  for (const r of regions) {
    const m = r.match;
    if (m.state !== v.state) continue;
    if (!m.cities || m.cities.includes(v.city)) return r;
  }
  return null;
}

export const initials = (name) => name.replace(/^(the|a|an)\s+/i, '').split(/\s+/).filter((w) => /^[a-z0-9]/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export const TYPE_LABEL = { restaurant: 'Restaurant', bar: 'Bar', hotel: 'Hotel and casino', store: 'Bottle shop' };

export function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

export function writeFile(rel, content) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export const exists = (rel) => fs.existsSync(path.join(SRC, rel));
