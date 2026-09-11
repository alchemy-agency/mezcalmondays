// Shared build helpers: HTML escaping, Phosphor icon inlining, hours utilities, page shell.
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

export const attr = esc;

export const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));

// Phosphor icon (regular weight) inlined as SVG. Names match the files in @phosphor-icons/core/assets/regular.
const iconCache = new Map();
export function icon(name, cls = 'ico') {
  if (!iconCache.has(name)) {
    const file = path.join(ROOT, 'node_modules', '@phosphor-icons', 'core', 'assets', 'regular', `${name}.svg`);
    if (!fs.existsSync(file)) throw new Error(`Unknown Phosphor icon: ${name}`);
    let svg = fs.readFileSync(file, 'utf8')
      .replace(/<\?xml[^>]*>/, '')
      .replace(/\s(width|height)="[^"]*"/g, '')
      .replace('<svg', '<svg aria-hidden="true" focusable="false" fill="currentColor"');
    iconCache.set(name, svg.trim());
  }
  const svg = iconCache.get(name);
  return cls ? `<span class="${cls}">${svg}</span>` : svg;
}

export const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Hours helpers (shared shape with src/js/hours.js)
export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_LABEL = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
export const DAY_SHORT = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

export function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const hh = ((h + 11) % 12) + 1;
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  return m ? `${hh}:${String(m).padStart(2, '0')} ${ampm}` : `${hh} ${ampm}`;
}

export function fmtRange(r) {
  return `${fmtTime(r[0])} to ${fmtTime(r[1])}`;
}

// Groups consecutive days with identical hours into chunks like "Mon to Thu".
export function groupHours(hours) {
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const key = (d) => JSON.stringify(hours[d] || []);
  const groups = [];
  for (const d of order) {
    const last = groups[groups.length - 1];
    if (last && last.key === key(d)) { last.days.push(d); continue; }
    groups.push({ key: key(d), days: [d], ranges: hours[d] || [] });
  }
  return groups.map((g) => ({
    label: g.days.length === 1 ? DAY_SHORT[g.days[0]] : `${DAY_SHORT[g.days[0]]} to ${DAY_SHORT[g.days[g.days.length - 1]]}`,
    text: g.ranges.length ? g.ranges.map(fmtRange).join(', ') : 'Closed',
    ranges: g.ranges,
  }));
}

export function latestClose(hours) {
  let best = null;
  for (const d of DAYS) for (const r of hours[d] || []) {
    const [h, m] = r[1].split(':').map(Number);
    const v = (h < 5 ? h + 24 : h) * 60 + m;
    if (!best || v > best.v) best = { v, t: r[1], day: d };
  }
  return best;
}

export function copyDir(src, dest) {
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

export function fileHash(file) {
  const st = fs.statSync(file);
  return Math.floor(st.mtimeMs).toString(36);
}
