"""Image pipeline for eatdanville.com.

Commands:
  python scripts/images.py fetch <manifest.json>   download research images listed as [{slug, url, kind, name}] into src/assets/img/<slug>/raw/
  python scripts/images.py cutout <in.png> <out.png> [--pad 24]   remove background with rembg, trim, pad, save PNG
  python scripts/images.py web <in> <out.jpg> [--w 1800] [--q 82]  resize + JPEG encode for the web
  python scripts/images.py og <in> <out.jpg>                        1200x630 crop for Open Graph
"""
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"


def fetch(manifest):
    items = json.loads(Path(manifest).read_text(encoding="utf-8"))
    ok = 0
    for it in items:
        slug = it["slug"]
        out_dir = ROOT / "src" / "assets" / "img" / slug / "raw"
        out_dir.mkdir(parents=True, exist_ok=True)
        name = it.get("name") or f"{it.get('kind','img')}-{ok+1}"
        try:
            req = urllib.request.Request(it["url"], headers={"User-Agent": UA, "Accept": "image/*,*/*"})
            data = urllib.request.urlopen(req, timeout=30).read()
            im = Image.open(io.BytesIO(data))
            im = ImageOps.exif_transpose(im)
            w, h = im.size
            if w < 500 or h < 350:
                print(f"skip small {w}x{h}: {it['url'][:90]}")
                continue
            ext = "png" if im.mode in ("RGBA", "LA") else "jpg"
            path = out_dir / f"{name}.{ext}"
            (im.convert("RGB") if ext == "jpg" else im).save(path, quality=95)
            ok += 1
            print(f"saved {slug}/raw/{path.name} {w}x{h}")
        except Exception as e:  # noqa: BLE001
            print(f"fail {it['url'][:90]}: {e}")
    print(f"{ok} images saved")


def cutout(src, dst, pad=24):
    from rembg import remove, new_session

    im = Image.open(src).convert("RGBA")
    session = new_session("isnet-general-use")
    out = remove(im, session=session, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=10, alpha_matting_erode_size=10)
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    canvas = Image.new("RGBA", (out.width + pad * 2, out.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(out, (pad, pad), out)
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, optimize=True)
    print(f"cutout {dst} {canvas.width}x{canvas.height}")


def web(src, dst, w=1800, q=82):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
    print(f"web {dst} {im.width}x{im.height} {os.path.getsize(dst)//1024}KB")


def og(src, dst):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im = ImageOps.fit(im, (1200, 630), Image.LANCZOS, centering=(0.5, 0.5))
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=85, optimize=True)
    print(f"og {dst}")


if __name__ == "__main__":
    cmd, *args = sys.argv[1:]
    kw = {}
    pos = []
    i = 0
    while i < len(args):
        if args[i].startswith("--"):
            kw[args[i][2:]] = int(args[i + 1]); i += 2
        else:
            pos.append(args[i]); i += 1
    {"fetch": fetch, "cutout": cutout, "web": web, "og": og}[cmd](*pos, **kw)
