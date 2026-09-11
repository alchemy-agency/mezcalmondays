# Data schema (single source of truth for the site)

All pages, search, map and planner read from these files. Never invent values; leave a field empty ("" / [] / null) when unknown.

## data/restaurants.json (array)
```json
{
  "slug": "rancho-cantina",
  "name": "Rancho Cantina",
  "short": "Rancho",
  "initial": "R",
  "cuisine": "Mexican cantina and tequila bar",
  "tagline": "",
  "description": "2-4 factual sentences.",
  "price": "$$",
  "address": "500 Hartz Ave", "city": "Danville", "state": "CA", "zip": "94526",
  "phone": "(925) 000-0000", "phone_href": "tel:+19250000000",
  "website": "https://...", "menu_url": "", "reservation_url": "", "reservation_platform": "OpenTable",
  "order_url": "", "private_dining_url": "", "catering_url": "",
  "delivery": [{ "platform": "DoorDash", "url": "https://..." }],
  "instagram": "handle_without_at", "facebook": "https://...", "yelp": "", "google_maps": "",
  "lat": 37.8, "lng": -121.99,
  "hours": { "mon": [["11:30","21:00"]], "tue": [], "wed": [], "thu": [], "fri": [], "sat": [], "sun": [] },
  "bar_hours": null,
  "hours_note": "Bar stays open later on weekends.",
  "happy_hour": { "text": "Tue to Fri 3 to 6 PM", "days": ["tue","wed","thu","fri"], "start": "15:00", "end": "18:00" },
  "late_night": { "text": "What is available after 8 PM: nightcap cocktails, dessert, bar menu." },
  "services": {
    "brunch": false, "lunch": true, "dinner": true, "late_night": true,
    "private_dining": true, "catering": false, "takeout": true, "delivery": true,
    "secret_menu": false, "industry_specials": false, "happy_hour": true, "full_bar": true,
    "patio": true, "live_music": false, "reservations": true, "kids_menu": false, "dog_friendly": false
  },
  "service_notes": { "brunch": "Sat and Sun 10 to 2", "private_dining": "Back room seats 40" },
  "dishes": [{ "name": "", "desc": "", "price": "$18", "course": "starter|main|dessert|brunch|lunch" }],
  "drinks": [{ "name": "", "desc": "", "price": "$14" }],
  "desserts": ["Churros"],
  "nightcap": { "text": "Suggested last stop: mezcal flight and churros at the bar.", "items": ["Churros", "Mezcal flight"] },
  "industry": { "text": "" },
  "tags": ["tacos", "tequila", "margaritas"],
  "images": { "hero": "assets/img/rancho-cantina/hero.jpg", "card": "assets/img/rancho-cantina/card.jpg", "gallery": ["..."], "logo": "" },
  "sources": ["https://..."]
}
```
Hours use 24h "HH:MM" strings in local time; a range ending after midnight uses "01:00" style and is treated as next-day. `[]` means closed that day. `bar_hours` has the same shape when the bar outlives the kitchen.

## data/categories.json (array, exactly 10)
```json
{ "slug": "late-night", "name": "Late Night", "alt": "Nightcap", "blurb": "One sentence.", "keywords": ["nightcap", "after dinner", "last call"], "service": "late_night", "image": "assets/img/categories/late-night.jpg", "span": 4 }
```
`service` maps the category to the boolean key in `restaurant.services`.

## data/district.json (object)
```json
{
  "name": "Danville Dining District", "alt": "South of Hartz", "hashtag": "#danvilleafterdark",
  "corner": { "label": "Hartz Ave and ...", "lat": 0, "lng": 0 },
  "parking": [{ "name": "", "address": "", "lat": 0, "lng": 0, "note": "" }],
  "landmarks": [{ "name": "", "type": "", "lat": 0, "lng": 0, "note": "" }],
  "competitor_zone": { "where": "", "description": "" },
  "chamber": { "name": "", "url": "", "contact": "" },
  "orgs": [], "events": [], "media": [], "hashtags": [],
  "sponsors": [ { "name": "", "url": "", "image": "", "placement": "home-strip|after-dark|footer" } ],
  "sources": []
}
```
