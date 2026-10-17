"""Renders the site's seed illustrations: single cut-out seeds with soft shadows on transparency.

    python docs/design/art/seeds.py          -> src/assets/seeds/<product>-<n>.png

Each seed is a height map shaded with a simple light model (diffuse + specular), so the set is our own artwork:
no stock photos, nothing to license. Re-run after changing a recipe; output is deterministic (fixed seeds).
Requires numpy and Pillow.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "src" / "assets" / "seeds"
SIZE = 512          # output size
SS = 2              # supersampling factor
N = SIZE * SS
LIGHT = np.array([-0.45, -0.6, 0.66])
LIGHT /= np.linalg.norm(LIGHT)
HALF = LIGHT + np.array([0.0, 0.0, 1.0])
HALF /= np.linalg.norm(HALF)


def value_noise(rng: np.random.Generator, cells: int, size: int = N, stretch: float = 1.0, angle: float = 0.0) -> np.ndarray:
    """Smooth noise in [-1, 1]: a random grid upscaled with bicubic filtering.
    stretch > 1 elongates the features along x (before rotating by `angle` radians)."""
    cy = max(2, cells)
    cx = max(2, int(round(cells / stretch)))
    grid = rng.uniform(0, 255, (cy, cx)).astype(np.uint8)
    big = int(size * 1.5)
    img = Image.fromarray(grid, "L").resize((big, big), Image.BICUBIC)
    if angle:
        img = img.rotate(math.degrees(-angle), resample=Image.BICUBIC)
    off = (big - size) // 2
    img = img.crop((off, off, off + size, off + size))
    return np.asarray(img, dtype=np.float32) / 127.5 - 1.0


def fbm(rng: np.random.Generator, base: int, octaves: int = 4, stretch: float = 1.0, angle: float = 0.0) -> np.ndarray:
    total = np.zeros((N, N), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        total += amp * value_noise(rng, base * 2**o, stretch=stretch, angle=angle)
        norm += amp
        amp *= 0.5
    return total / norm


def hex_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


def render(recipe: dict, seed: int) -> Image.Image:
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    cx = cy = N / 2
    rot = rng.uniform(0, 2 * math.pi)
    scale = recipe["radius"] * N * rng.uniform(0.94, 1.04)
    dx, dy = (xx - cx) / scale, (yy - cy) / scale
    # Rotate into the seed's own frame.
    u = dx * math.cos(rot) + dy * math.sin(rot)
    v = -dx * math.sin(rot) + dy * math.cos(rot)
    a, b = recipe["axes"]
    b *= rng.uniform(*recipe.get("tilt", (1.0, 1.0)))   # seen slightly from the side
    theta = np.arctan2(v / b, u / a)
    dist = np.sqrt((u / a) ** 2 + (v / b) ** 2)

    # Outline: ellipse with a few low harmonics, plus optional bumps (chickpea beak).
    outline = np.ones_like(theta)
    for k in range(2, 6):
        outline += recipe["wobble"] / k * rng.uniform(-1, 1) * np.cos(k * theta + rng.uniform(0, 2 * math.pi))
    for angle, amp, width in recipe.get("bumps", []):
        d = np.angle(np.exp(1j * (theta - angle)))
        outline += amp * np.exp(-(d / width) ** 2)
    d = dist / outline                      # 0 at centre, 1 at the edge
    px = scale * min(a, b)                  # pixels per unit, for antialiasing
    alpha = np.clip((1.0 - d) * px / 1.6, 0, 1)

    inside = np.clip(1.0 - d, 0, 1)
    h = recipe["profile"](np.clip(d, 0, 1)) * recipe["height"]
    if recipe.get("wrinkles"):
        w = recipe["wrinkles"]
        n1 = fbm(rng, w["cells"], 4, stretch=w.get("stretch", 1.0), angle=rot)
        ridged = 1.0 - np.abs(n1)                 # sharp creases
        h = h + w["depth"] * (ridged ** 2) * inside ** 0.5
    if recipe.get("dimples"):
        h = h + recipe["dimples"] * fbm(rng, 6, 3) * inside
    if recipe.get("grain"):
        h = h + recipe["grain"] * value_noise(rng, 140) * inside
    h = h * (d < 1.02)

    gy, gx = np.gradient(h * scale / SS)
    nx, ny, nz = -gx, -gy, np.ones_like(h)
    norm = np.sqrt(nx**2 + ny**2 + nz**2)
    nx, ny, nz = nx / norm, ny / norm, nz / norm
    diffuse = np.clip(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0, 1)
    spec = np.clip(nx * HALF[0] + ny * HALF[1] + nz * HALF[2], 0, 1) ** recipe["shine"] * recipe["gloss"]

    # Colour: two tones mixed by smooth noise, optional speckles, darker rim.
    c1, c2 = hex_rgb(recipe["colors"][0]), hex_rgb(recipe["colors"][1])
    mix = np.clip(0.5 + 0.6 * fbm(rng, recipe.get("mottle", 5), 3), 0, 1)[..., None]
    base = c1 * (1 - mix) + c2 * mix
    if recipe.get("speckle"):
        sp = recipe["speckle"]
        spots = value_noise(rng, sp["cells"]) > sp["threshold"]
        spots = np.asarray(Image.fromarray((spots * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(SS)), np.float32) / 255
        base = base * (1 - spots[..., None] * sp["strength"])
    rim = (recipe.get("rim", 0.25) * np.clip(d, 0, 1) ** 3)[..., None]
    light = (0.42 + 0.68 * diffuse)[..., None]
    if recipe.get("glow"):
        # Light passing through (raisins): the side away from the light glows warmer near the rim.
        back = np.clip(-(nx * LIGHT[0] + ny * LIGHT[1]), 0, 1) * inside ** 0.3
        base = base + recipe["glow"] * back[..., None] * hex_rgb(recipe["colors"][0])
    rgb = base * light * (1 - rim) + spec[..., None]
    rgb = np.clip(rgb, 0, 1)

    seed_img = Image.fromarray((np.dstack([rgb, alpha]) * 255).astype(np.uint8), "RGBA")

    # Soft contact shadow, offset away from the light.
    shadow_a = Image.fromarray((alpha * 255 * 0.34).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(N * 0.022))
    shadow = Image.new("RGBA", (N, N), (58, 44, 30, 0))
    shadow.putalpha(shadow_a)
    canvas = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    off = int(N * 0.028)
    canvas.alpha_composite(shadow, (off, int(off * 1.3)))
    canvas.alpha_composite(seed_img)
    out = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    # Crop to the seed and its shadow, so a seed's rendered width is the width the page asks for.
    x0, y0, x1, y1 = out.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
    pad = 6
    return out.crop((max(0, x0 - pad), max(0, y0 - pad), min(SIZE, x1 + pad), min(SIZE, y1 + pad)))


dome = lambda d: np.sqrt(np.clip(1 - d**2, 0, 1))
lens = lambda d: np.clip(1 - d**2, 0, 1) ** 0.75
flat = lambda d: np.clip(1 - d**5, 0, 1) ** 0.45

RECIPES = {
    "red-lentils": dict(radius=0.2, axes=(1.0, 0.94), tilt=(0.72, 1.0), wobble=0.035, profile=flat, height=0.2,
                        colors=("#E8844A", "#D46A33"), mottle=5, shine=14, gloss=0.06, rim=0.14, grain=0.0015),
    "green-lentils": dict(radius=0.24, axes=(1.0, 0.95), tilt=(0.7, 1.0), wobble=0.025, profile=lens, height=0.3,
                          colors=("#A39A5C", "#7C7543"), mottle=8, shine=22, gloss=0.06, rim=0.16, grain=0.004,
                          speckle=dict(cells=170, threshold=0.5, strength=0.18)),
    "chickpeas": dict(radius=0.27, axes=(1.0, 0.9), tilt=(0.9, 1.0), wobble=0.05, profile=dome, height=0.9,
                      bumps=[(0.75, 0.2, 0.25)], colors=("#E6CB9C", "#CBA772"), mottle=5, grain=0.008,
                      shine=14, gloss=0.07, rim=0.22, wrinkles=dict(cells=6, depth=0.045)),
    "dried-peas": dict(radius=0.21, axes=(1.0, 0.95), tilt=(0.92, 1.0), wobble=0.04, profile=dome, height=0.9,
                       colors=("#DCC473", "#C0A24C"), mottle=6, shine=16, gloss=0.06, rim=0.2, dimples=0.05,
                       grain=0.01, wrinkles=dict(cells=9, depth=0.02)),
    "seedless-raisins": dict(radius=0.23, axes=(1.0, 0.66), tilt=(0.9, 1.0), wobble=0.11, profile=dome, height=0.45,
                             colors=("#B9803A", "#6E3F1C"), mottle=6, shine=24, gloss=0.13, rim=0.3, glow=0.35,
                             wrinkles=dict(cells=13, depth=0.13, stretch=1.7)),
    "seeded-raisins": dict(radius=0.3, axes=(1.0, 0.72), tilt=(0.9, 1.0), wobble=0.07, profile=dome, height=0.6,
                           colors=("#70302A", "#3A1815"), mottle=4, shine=34, gloss=0.24, rim=0.3, glow=0.2,
                           wrinkles=dict(cells=11, depth=0.09, stretch=2.2)),
}
VARIANTS = 4

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (name, recipe) in enumerate(RECIPES.items()):
        for n in range(1, VARIANTS + 1):
            render(recipe, seed=1000 * (i + 1) + n).save(OUT / f"{name}-{n}.png", optimize=True)
            print(f"{name}-{n}.png")
