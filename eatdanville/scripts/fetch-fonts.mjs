// Downloads latin-subset variable woff2 files from Google Fonts for self-hosting.
import fs from 'node:fs'; import path from 'node:path';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const families = [
  { q: 'Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800', name: 'BricolageGrotesque' },
  { q: 'Instrument+Sans:ital,wdth,wght@0,75..100,400..700;1,75..100,400..700', name: 'InstrumentSans' },
];
const out = path.resolve('src/assets/fonts'); fs.mkdirSync(out, { recursive: true });
let css = '';
for (const f of families) {
  const url = `https://fonts.googleapis.com/css2?family=${f.q}&display=swap`;
  const txt = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const blocks = txt.split('@font-face').slice(1);
  let i = 0;
  for (const b of blocks) {
    if (!/\/\* latin \*\//.test(b)) continue;
    const src = b.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const style = b.match(/font-style:\s*(\w+)/)?.[1] || 'normal';
    const weight = b.match(/font-weight:\s*([\d ]+)/)?.[1]?.trim() || '400';
    const stretch = b.match(/font-stretch:\s*([\d% ]+)/)?.[1]?.trim();
    if (!src) continue;
    const file = `${f.name}-${style}${i++ ? '-' + i : ''}.woff2`;
    const buf = Buffer.from(await (await fetch(src, { headers: { 'User-Agent': UA } })).arrayBuffer());
    fs.writeFileSync(path.join(out, file), buf);
    css += `@font-face{font-family:'${f.name.replace(/([a-z])([A-Z])/g, '$1 $2')}';font-style:${style};font-weight:${weight};${stretch ? `font-stretch:${stretch};` : ''}font-display:swap;src:url('../assets/fonts/${file}') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}\n`;
    console.log('saved', file, buf.length, 'bytes', weight, style, stretch || '');
  }
}
fs.writeFileSync('src/css/fonts.css', css);
console.log('wrote src/css/fonts.css');
