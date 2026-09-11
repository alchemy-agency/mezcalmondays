"""Assign researched photos to restaurants, categories and hero slots; resize for the web; update data JSON.
Selections reference indexes in data/research/images-manifest.json (per slug, in manifest order).
Usage: python scripts/assign-images.py
"""
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / "data/research/images-manifest.json").read_text(encoding="utf-8"))
by = {}
for x in manifest:
    by.setdefault(x["slug"], []).append(x)

# slug -> {hero: idx, card: idx, gallery: [idx...]}
PICKS = {
    "rancho-cantina": {"hero": 24, "card": 6, "gallery": [9, 3, 1, 11, 13, 10, 25]},
    "kaias": {"hero": 1, "card": 12, "gallery": [3, 4, 8, 10, 20, 22, 24]},
    "harvest": {"hero": 1, "card": 12, "gallery": [7, 3, 18, 13, 22, 5, 0]},
    "incontro": {"hero": 7, "card": 13, "gallery": [0, 4, 9, 15, 24, 25, 20]},
}
# category slug -> (restaurant slug, idx) using real photos; generated fallbacks are swapped in by scripts/place-generated.py
CATEGORY_PICKS = {
    "late-night": ("harvest", 18),
    "dinner": ("rancho-cantina", 7),
    "brunch": ("harvest", 4),
    "lunch": ("kaias", 11),
    "secret-menu": ("kaias", 22),
    "private-dining": ("incontro", 4),
    "takeout": ("rancho-cantina", 10),
    "delivery": ("kaias", 9),
    "catering": ("incontro", 28),
    "industry": ("rancho-cantina", 3),
}
HERO_BACKGROUND = ("harvest", 1)        # real blue-hour photo of the corner building at Hartz and Church
AFTER_DARK = ("harvest", 7)             # the Harvest bar at night
OG = ("incontro", 7)


def web(src, dst, w=1800, q=82, fit=None):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    if fit:
        im = ImageOps.fit(im, fit, Image.LANCZOS, centering=(0.5, 0.5))
    elif im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
    return dst


def pick(slug, idx):
    return Path(by[slug][idx]["file"])


restaurants = json.loads((ROOT / "data/restaurants.json").read_text(encoding="utf-8"))
for r in restaurants:
    p = PICKS[r["slug"]]
    base = ROOT / "src/assets/img" / r["slug"]
    web(pick(r["slug"], p["hero"]), base / "hero.jpg", w=2000, q=80)
    web(pick(r["slug"], p["card"]), base / "card.jpg", w=1400, q=82)
    gallery = []
    for i, idx in enumerate(p["gallery"], 1):
        web(pick(r["slug"], idx), base / f"g{i}.jpg", w=1400, q=80)
        gallery.append(f"assets/img/{r['slug']}/g{i}.jpg")
    r["images"] = {"hero": f"assets/img/{r['slug']}/hero.jpg", "card": f"assets/img/{r['slug']}/card.jpg", "gallery": gallery, "logo": ""}
    print(r["slug"], "hero", by[r["slug"]][p["hero"]]["desc"][:60])
(ROOT / "data/restaurants.json").write_text(json.dumps(restaurants, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

for cat, (slug, idx) in CATEGORY_PICKS.items():
    web(pick(slug, idx), ROOT / "src/assets/img/categories" / f"{cat}.jpg", w=1200, q=80)

web(pick(*HERO_BACKGROUND), ROOT / "src/assets/img/hero/corner-night.jpg", w=2400, q=80)
web(pick(*AFTER_DARK), ROOT / "src/assets/img/hero/after-dark.jpg", w=2000, q=80)
web(pick(*OG), ROOT / "src/assets/img/og.jpg", fit=(1200, 630), q=85)
print("done")
