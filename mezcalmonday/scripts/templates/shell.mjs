// Page shell: head, nav, footer, toast, scripts. Every page renders through here.
import { esc, icon } from '../lib.mjs';

const THEME_BOOT = `(function(){var d=document.documentElement;d.classList.remove('no-js');try{var s=localStorage.getItem('mm.theme');var dark=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;d.dataset.theme=dark?'dark':'light';}catch(e){d.dataset.theme='light'}if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('reduced');})();`;

export const NAV_LINKS = [
  ['/find/', 'Find a bar'],
  ['/specials/', 'Monday specials'],
  ['/recipes/', 'Recipes'],
  ['/buy/', 'Where to buy'],
  ['/advertise/', 'Advertise'],
];

export const brandMark = (label = 'Mezcal Monday home') => `<a class="brand" href="/" aria-label="${label}"><span class="dot" aria-hidden="true"></span>Mezcal Monday</a>`;

export function nav(site, page) {
  const cur = (href) => page.path === href || (href !== '/' && page.path.startsWith(href)) ? ' aria-current="page"' : '';
  return `
<div class="nav-wrap">
  <nav class="nav" aria-label="Primary">
    ${brandMark()}
    <div class="nav-links">${NAV_LINKS.map(([h, l]) => `<a href="${h}"${cur(h)}>${l}</a>`).join('')}</div>
    <div class="nav-right">
      <button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Switch to the night theme">${icon('sun', 'ico sun')}${icon('moon-stars', 'ico moon')}</button>
      <a class="btn btn-accent btn-sm nav-cta" href="/add-your-bar/">Add your bar</a>
      <button class="icon-btn burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><span></span><span></span></button>
    </div>
  </nav>
</div>
<div class="menu" id="menu" aria-hidden="true">
  <div>
    <ul class="menu-primary">
      ${NAV_LINKS.map(([h, l]) => `<li><a href="${h}"${cur(h)}>${l}${icon('arrow-right')}</a></li>`).join('')}
      <li><a href="/add-your-bar/">Add your bar${icon('arrow-right')}</a></li>
    </ul>
  </div>
  <div class="menu-foot">
    <div class="meta"><a href="${esc(site.instagram_url)}" rel="noopener" target="_blank">${esc(site.hashtag)}</a><a href="mailto:${esc(site.contact_email)}">${esc(site.contact_email)}</a></div>
  </div>
</div>`;
}

export function footer(site, regions) {
  return `
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        ${brandMark()}
        <p class="about">The directory of bars and restaurants that pour mezcal, with Monday specials, a map, where to buy it and recipes.</p>
      </div>
      <div>
        <h4>Find</h4>
        <ul>
          <li><a href="/find/">Map finder</a></li>
          <li><a href="/specials/">Monday specials</a></li>
          <li><a href="/buy/">Where to buy</a></li>
          ${regions.slice(0, 4).map((r) => `<li><a href="/find/?region=${r.slug}">${esc(r.name)}</a></li>`).join('')}
        </ul>
      </div>
      <div>
        <h4>Drink</h4>
        <ul>
          <li><a href="/recipes/">Recipes</a></li>
          <li><a href="/recipes/mezcal-margarita/">Mezcal Margarita</a></li>
          <li><a href="/recipes/mezcaloma/">Mezcaloma</a></li>
          <li><a href="/recipes/how-to-drink-mezcal-neat/">Mezcal, neat</a></li>
        </ul>
      </div>
      <div>
        <h4>Work with us</h4>
        <ul>
          <li><a href="/add-your-bar/">Add your bar</a></li>
          <li><a href="/advertise/">Advertise</a></li>
          <li><a href="/about/">About</a></li>
          <li><a href="mailto:${esc(site.contact_email)}">${esc(site.contact_email)}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>Listings come from the bars and the brands that pour there. Specials change; ask the bar before you go. Please drink responsibly.</span>
      <span>${new Date().getFullYear()} Mezcal Monday</span>
    </div>
  </div>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

export function shell({ site, regions, page, body, scripts = [], jsonld = [], extraHead = '' }) {
  const title = page.title ? `${page.title} | ${site.brand}` : `${site.brand}: ${site.tagline}`;
  const desc = page.description || site.description;
  const url = `${site.url}${page.path}`;
  const image = page.image ? `${site.url}${page.image}` : `${site.url}/assets/img/og.png`;
  const js = ['theme', 'nav', 'search', 'app', ...scripts];
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#EEF1EA" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0C1B16" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:site_name" content="${esc(site.brand)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/Archivo-normal-2.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/Geist-normal.woff2" as="font" type="font/woff2" crossorigin>
<script>${THEME_BOOT}</script>
<link rel="stylesheet" href="/css/site.css?v=${site.build}">
${page.map ? '<link rel="stylesheet" href="/vendor/leaflet.css"><link rel="stylesheet" href="/vendor/MarkerCluster.css">' : ''}
${extraHead}
${jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body class="${page.bodyClass || ''}">
${nav(site, page)}
<main id="main">
${body}
</main>
${footer(site, regions)}
<script src="/js/data.js?v=${site.build}"></script>
${page.gsap ? '<script src="/vendor/gsap.min.js" defer></script><script src="/vendor/ScrollTrigger.min.js" defer></script>' : ''}
${page.map ? '<script src="/vendor/leaflet.js" defer></script><script src="/vendor/leaflet.markercluster.js" defer></script>' : ''}
${js.map((n) => `<script src="/js/${n}.js?v=${site.build}" defer></script>`).join('\n')}
</body>
</html>`;
}
