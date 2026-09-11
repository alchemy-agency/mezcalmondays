# Data schema

- `site.json`: brand, url, contact, `regions[]` (slug, name, blurb, center, zoom, match {state, cities[]}) used for the finder chips and city pages, `map_tiles.carto_key` (empty = OpenStreetMap tiles).
- `venues.json`: one object per bar or restaurant. `slug`, `name`, `kind` ("bar"), `street`, `city`, `state`, `state_name`, `zip`, `address`, `lat`, `lng`, `type` (restaurant | bar | hotel | ""), `pours_bnaaa` (bool), `mezcal_on_menu` (bool), `monday_special` (string or null), `special_status` ("confirmed" | "unconfirmed"), `website`, `phone`, `instagram`, `hours_note`, `description`, `tags[]`, `featured` (bool, paid Featured listing), `bnaaa_page` (URL of the partner landing page on bnaaamezcal.com, filled by the harvest workflow).
- `stores.json`: bottle shops, same address fields, `kind` "store".
- `online.json`: online retailers (name, url, logo).
- `recipes.json`: slug, name, kicker, intro, glass, method, time, serves, difficulty, ingredients[], steps[], tip, tags[], image, featured.
- `categories.json`: the search categories (slug, name, blurb, filter, keywords[]).
- `ads.json`: placements for sale (slug, name, where, size, price, premium) and audience facts.
- `sponsors.json`: sponsors and which one fills each placement slot with headline, body, cta, href.

Rules: never invent a special. `monday_special` stays null until a bar confirms it; the site then shows "Ask the bar about Monday" instead. `hours_note` is free text and is only shown when present.
