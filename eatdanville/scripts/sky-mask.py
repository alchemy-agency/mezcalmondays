"""Split a photo into background + foreground-with-sky-removed so a headline can sit in the sky behind trees and buildings.
Usage: python scripts/sky-mask.py <in.jpg> <out-fg.png> [--hue-lo 190] [--hue-hi 250] [--sat 0.25] [--val 0.18] [--feather 3]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

args = sys.argv[1:]
src, dst = args[0], args[1]
opt = {"hue-lo": 190, "hue-hi": 250, "sat": 0.25, "val": 0.18, "feather": 3}
for i in range(2, len(args), 2):
    opt[args[i][2:]] = float(args[i + 1])

im = Image.open(src).convert("RGB")
hsv = np.asarray(im.convert("HSV")).astype(np.float32)
h = hsv[..., 0] * 360.0 / 255.0
s = hsv[..., 1] / 255.0
v = hsv[..., 2] / 255.0
sky = (h >= opt["hue-lo"]) & (h <= opt["hue-hi"]) & (s >= opt["sat"]) & (v >= opt["val"])
mask = Image.fromarray((sky * 255).astype(np.uint8))
# clean: close small holes in the sky, remove small sky islands inside foliage
mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(3))
mask = mask.filter(ImageFilter.GaussianBlur(opt["feather"]))
alpha = Image.eval(mask, lambda p: 255 - p)  # foreground alpha = not sky
fg = im.copy()
fg.putalpha(alpha)
fg.save(dst, optimize=True)
cover = float(np.asarray(mask).mean() / 255.0)
print(f"saved {dst} size={im.size} sky_coverage={cover:.2%}")
