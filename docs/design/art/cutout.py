"""Turns generated product photos (e.g. Nano Banana) into the site's cut-out seed images.

    python docs/design/art/cutout.py <folder>

Every image in <folder> named <product>-<n>.(png|jpg|jpeg|webp), e.g. red-lentils-1.jpg, should show one seed
(or a small group) on a plain, evenly lit background. The background colour is read from the image border,
removed by flood fill from the edges (so light areas inside the seed are kept), and soft shadows survive as
semi-transparent pixels. Output: src/assets/seeds/<product>-<n>.png, which the site picks up automatically
(src/lib/seeds.ts). Products: red-lentils, green-lentils, chickpeas, dried-peas, seedless-raisins, seeded-raisins.
Requires numpy and Pillow.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "src" / "assets" / "seeds"
NAME = re.compile(r"^([a-z-]+)-(\d+)\.(png|jpe?g|webp)$", re.I)
MAX_SIDE = 640
FLOOD_TOLERANCE = 38      # how far (0-255 per channel) the background may drift and still be flooded
SOFT = (6, 70)            # distance from the background colour that maps to alpha 0 .. 1 (seed rim)
SHADOW = np.array([38.0, 30.0, 22.0])   # colour shadows are rebuilt in


def cut(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGB")
    img.thumbnail((1600, 1600), Image.LANCZOS)
    rgb = np.asarray(img, np.float32)
    h, w, _ = rgb.shape

    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)

    # Background = pixels that are the background colour, or the background uniformly darkened (shadows),
    # and connected to the image border. Found by flood-filling a mask, so light areas inside a seed stay.
    d = rgb - bg
    shift = d.mean(axis=-1)
    chroma = np.abs(d - shift[..., None]).max(axis=-1)
    near_bg = np.abs(d).max(axis=-1) <= FLOOD_TOLERANCE
    shadowish = (chroma < 25) & (shift < 0) & (shift > -110)   # light-to-mid shadows; deep darks belong to the seed
    mask = Image.fromarray(((near_bg | shadowish) * 255).astype(np.uint8), "L").copy()  # copy: arrays map read-only
    step = max(1, min(w, h) // 24)
    starts = [(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)]
    starts += [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)]
    for xy in starts:
        if mask.getpixel(xy) == 255:
            ImageDraw.floodfill(mask, xy, 128)
    flooded = np.asarray(mask) == 128
    # Grow the region a little so the seed's antialiased rim is matted too.
    grown = np.asarray(Image.fromarray(flooded.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0

    # In the background region, two kinds of pixels remain:
    #  - shadows: the background, uniformly darker -> keep as a dark colour with partial alpha;
    #  - the seed's antialiased rim: tinted -> partial alpha, colour un-mixed from the background.
    tinted = np.clip((chroma - 6) / 10, 0, 1)

    shadow_a = np.clip(-shift / (bg.mean() - SHADOW.mean()), 0, 1)
    dist = np.abs(d).max(axis=-1)
    rim_a = np.clip((dist - SOFT[0]) / (SOFT[1] - SOFT[0]), 0, 1)
    a_bg = tinted * rim_a + (1 - tinted) * shadow_a
    rim_rgb = np.clip(bg + d / np.maximum(rim_a, 1e-3)[..., None], 0, 255)
    rgb_bg = tinted[..., None] * rim_rgb + (1 - tinted[..., None]) * SHADOW

    alpha = np.where(grown, a_bg, 1.0)
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), np.float32) / 255
    fg = np.where(grown[..., None], rgb_bg, rgb)

    out = Image.fromarray(np.dstack([fg, alpha * 255]).astype(np.uint8), "RGBA")
    bbox = out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        raise ValueError("nothing left after removing the background")
    pad = 8
    out = out.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)))
    out.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return out


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    done = 0
    for f in sorted(src.iterdir()):
        m = NAME.match(f.name)
        if not m:
            continue
        name = f"{m.group(1).lower()}-{int(m.group(2))}.png"
        try:
            cut(f).save(OUT / name, optimize=True)
            print(f"{f.name} -> src/assets/seeds/{name}")
            done += 1
        except Exception as e:  # keep going; report the file
            print(f"{f.name}: skipped ({e})")
    print(f"{done} image(s) written.")
