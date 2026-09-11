// Page shell: head, nav, footer, drawer, scripts. Every page renders through here.
import { esc, icon } from '../lib.mjs';

const THEME_BOOT = `(function(){var d=document.documentElement;d.classList.remove('no-js');try{var s=localStorage.getItem('eat.theme');var h=new Date().getHours();var n=h>=20||h<4;var dark=s?s==='dark':(n||matchMedia('(prefers-color-scheme: dark)').matches);d.dataset.theme=dark?'dark':'light';}catch(e){d.dataset.theme='light'}if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('reduced');})();`;

export function nav(site, page, restaurants) {
  const links = [
    ['/#the-four', 'The Corner'],
    ['/map/', 'Map'],
    ['/after-dark/', 'After Dark'],
    ['/industry/', 'Industry'],
    ['/partners/', 'Partners'],
  ];
  const a = (href, label) => `<a href="${href}"${page.path === href ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
<div class="nav-wrap">
  <nav class="nav" aria-label="Primary">
    <a class="brand" href="/" aria-label="Eat Danville home">EAT<em>DANVILLE</em></a>
    <div class="nav-links">${links.map(([h, l]) => a(h, l)).join('')}</div>
    <div class="nav-right">
      <button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Turn on After Dark theme">${icon('sun', 'sun')}${icon('moon-stars', 'moon')}</button>
      <a class="btn btn-accent btn-sm nav-cta" href="/#plan">Plan my night<span class="btn-ico">${icon('arrow-right', '')}</span></a>
      <button class="icon-btn burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><span></span><span></span></button>
    </div>
  </nav>
</div>
<div class="menu" id="menu" aria-hidden="true">
  <div>
    <ul class="menu-primary">
      ${links.map(([h, l]) => `<li><a href="${h}"${page.path === h ? ' aria-current="page"' : ''}>${l}${icon('arrow-right', 'ico')}</a></li>`).join('')}
    </ul>
    <div class="menu-four">
      <div class="lbl">The four</div>
      <ul>${(restaurants || []).map((r) => `<li><a href="/r/${r.slug}/"><b>${esc(r.address.split(' ')[0])}</b>${esc(r.short)}</a></li>`).join('')}</ul>
    </div>
  </div>
  <div class="menu-foot">
    <a class="btn btn-accent" href="/#plan">Plan my night<span class="btn-ico">${icon('moon-stars', '')}</span></a>
    <div class="meta"><a href="${site.instagram_url}" rel="noopener" target="_blank">${esc(site.hashtag)}</a><a href="mailto:${esc(site.contact_email)}">${esc(site.contact_email)}</a></div>
  </div>
</div>`;
}

export function footer(site, restaurants) {
  return `
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="brand" href="/">EAT<em>DANVILLE</em></a>
        <p class="addr">${esc(site.name)}, ${esc(site.alt)}. Four restaurants on the corner of ${esc(site.corner.label)}, downtown Danville, California.</p>
        <div class="tags">${site.hashtags.slice(0, 3).map((h) => `<a class="chip" href="https://www.instagram.com/explore/tags/${esc(h.replace('#', ''))}/" rel="noopener" target="_blank">${esc(h)}</a>`).join('')}</div>
      </div>
      <div>
        <h4>The four</h4>
        <ul>${restaurants.map((r) => `<li><a href="/r/${r.slug}/">${esc(r.name)}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h4>Explore</h4>
        <ul>
          <li><a href="/#categories">Directory</a></li>
          <li><a href="/map/">Map and parking</a></li>
          <li><a href="/after-dark/">After Dark</a></li>
          <li><a href="/#plan">Plan my night</a></li>
        </ul>
      </div>
      <div>
        <h4>Join</h4>
        <ul>
          <li><a href="/industry/">Industry program</a></li>
          <li><a href="/partners/">Partners and sponsors</a></li>
          <li><a href="mailto:${esc(site.contact_email)}">${esc(site.contact_email)}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>A partnership of four restaurants on one corner. Hours and menus come from each restaurant and can change. Confirm with the restaurant for private events.</span>
      <span>${new Date().getFullYear()} Eat Danville</span>
    </div>
  </div>
</footer>`;
}

export function drawer() {
  return `
<div class="drawer" id="drawer" aria-hidden="true" role="dialog" aria-labelledby="drawer-title">
  <div class="drawer-scrim" data-drawer-close></div>
  <div class="drawer-panel">
    <div class="drawer-head">
      <h3 id="drawer-title">Directory</h3>
      <button class="icon-btn" type="button" data-drawer-close aria-label="Close">${icon('x', '')}</button>
    </div>
    <div class="drawer-body" id="drawer-body"></div>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

export function shell({ site, restaurants, page, body, scripts = [], jsonld = [], extraHead = '' }) {
  const title = page.title ? `${page.title} | ${site.brand}` : `${site.brand}: ${site.name}`;
  const desc = page.description || site.description;
  const url = `${site.url}${page.path}`;
  const image = page.image ? `${site.url}${page.image}` : `${site.url}/assets/img/og.jpg`;
  const js = ['hours', 'theme', 'nav', 'search', 'app', ...scripts];
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" id="theme-color" content="${page.heroDark ? '#0B1020' : '#F4F4F2'}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Eat Danville">
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
<link rel="preload" href="/assets/fonts/BricolageGrotesque-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/InstrumentSans-normal-2.woff2" as="font" type="font/woff2" crossorigin>
${page.preload ? `<link rel="preload" as="image" href="${esc(page.preload)}" fetchpriority="high">` : ''}
<script>${THEME_BOOT}</script>
<link rel="stylesheet" href="/css/site.css?v=${site.build}">
${page.map ? '<link rel="stylesheet" href="/vendor/leaflet.css">' : ''}
${extraHead}
${jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body class="${page.bodyClass || ''}">
${nav(site, page, restaurants)}
<main id="main">
${body}
</main>
${footer(site, restaurants)}
${drawer()}
<script src="/js/data.js?v=${site.build}"></script>
<script src="/vendor/gsap.min.js" defer></script>
<script src="/vendor/ScrollTrigger.min.js" defer></script>
${page.map ? '<script src="/vendor/leaflet.js" defer></script>' : ''}
${js.map((n) => `<script src="/js/${n}.js?v=${site.build}" defer></script>`).join('\n')}
</body>
</html>`;
}
