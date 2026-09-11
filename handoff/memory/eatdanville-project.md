---
name: eatdanville-project
description: "eatdanville.com (Danville Dining District / South of Hartz) static directory site - goals, repo, SiteGround SSH, design decisions the client made, Flow MCP setup, open follow-ups"
metadata: 
  node_type: memory
  type: project
  originSessionId: e14e7714-7236-4059-ac98-ba1c7e160c4a
  modified: 2026-09-10T22:54:29.688Z
---

Project built 2026-09-10 for the user's client group: four restaurants on the corner of Hartz Ave and Church St in downtown Danville, CA (Rancho Cantina 501 Hartz, Incontro Ristorante 455 Hartz, Kaia's Island Kitchen & Tiki Bar 480 Hartz, Danville Harvest 500 Hartz) branded as the "Danville Dining District" / "South of Hartz". Goals: late-night 8-10 PM traffic (#danvilleafterdark), cross-visits (dinner at one, nightcap at another), industry nights, later chamber/guest partners and sponsor slots. Live at https://eatdanville.com since 2026-09-10.

- Repo: `C:\Users\Kenneth Rodas\Documents\GitHub\eatdanville` (git initialized, first commit made). Build `node scripts/build.mjs` -> `dist/`; deploy `bash scripts/deploy.sh`; preview `python -m http.server 4173 -d dist`; QA `node scripts/shot.mjs <url> <png> [w h] [--dark] [--full]` and `node scripts/qa-interact.mjs` (Playwright over the Brave CDP session on port 9222). Design contract `DESIGN.md` (palette section superseded by `src/css/tokens.css`), data schema `data/schema.md`, JS contracts `src/js/CONTRACTS.md`, research JSON in `data/research/`.
- Hosting: SiteGround, web root `~/www/eatdanville.com/public_html/`, PHP 8.2, form submissions stored in `~/www/eatdanville.com/private/eatdanville-submissions.jsonl` by `api/submit.php` (set `$NOTIFY_EMAIL` there to get emails). SSH: `ssh -i ~/.ssh/siteground_eatdanville -p 18765 u2455-bngunpajjhlx@gcam1304.siteground.biz`.
- Client design decisions (2026-09-10): rejected orange-on-charcoal (read as AI), rejected pasted object cutouts in the hero, rejected blur-on-focus. Approved direction: paper/ink with deep indigo accent, blue-hour navy After Dark theme (auto 8 PM to 4 AM), rotating real photos of the four restaurants behind a fully legible DANVILLE wordmark, street-address plates on cards, a schematic corner diagram. No workflows once the site was near done ("no workflows, hurry up").
- Images: only real photos from the restaurants' own sites (raw copies in `src/assets/img/<slug>/raw/`, manifest `data/research/images-manifest.json`, picks in `scripts/assign-images.py`). Google Flow generation exists (`scripts/flow-gen.mjs` over the Brave CDP session logged into flow.google.com, plus the google-flow-mcp clone at `C:\Users\Kenneth Rodas\Documents\GitHub\google-flow-mcp` with `.mcp.json` registered in the repo) but generated objects were dropped from the design; the client does not want generated places.
- Map: Leaflet with OpenStreetMap tiles plus CSS filters. The client's CARTO key (account ac_szq67ds7) did not clear the "API KEY REQUIRED" watermark through `?api_key=` on either cartocdn host; needs CARTO's current auth method before switching back.
- Open follow-ups: Harvest weekend closing time disputed across sources (site says weekends to 10, Google says 9:30; data uses 9:30 with a note); industry perks and sponsor slots are empty by design until partners confirm; `hello@eatdanville.com` mailbox must be created at SiteGround; image weights (dist/assets ~90 MB raw copies are NOT deployed, only web-sized files) could still be trimmed to WebP.

**Why:** the user will keep iterating on this site with the four partners and asked for everything to be reproducible.
**How to apply:** edit `data/*.json` for content, rebuild and deploy with the scripts above, keep the client's rejected patterns out, and follow [[agent-orchestration-rules]].
