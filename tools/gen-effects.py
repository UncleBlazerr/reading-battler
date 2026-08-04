#!/usr/bin/env python3
"""Generate original pixel-art spell effects for reading-battler.

Two kinds of art, per element (fire / ice / lightning):
  * a PROJECTILE orb — a chunky glowing ball with a comet tail (flies left→right)
  * an EXPLOSION sprite sheet (5 frames) that bursts on the enemy — flames for
    fire, shattering shards for ice, jagged arcs for lightning.

Style: chunky, bright, additive-looking (built from solid concentric colours, no
alpha, so it pops on the dark battle stage). Inspired by classic pixel fireball /
explosion / lightning art, but drawn from scratch with our own palette. Same
low-native-res → nearest-upscale approach as the sprite/room generators.

Run: python tools/gen-effects.py  ->  public/assets/fx/*.png
"""

from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw

SCALE = 4
ORB_W, ORB_H = 44, 26          # native orb size (facing right, tail on the left)
F = 48                         # native explosion frame size (square)
FRAMES = 5
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class _Rnd:
    def __init__(self, seed=1):
        self.s = (seed * 2654435761) & 0xFFFFFFFF

    def r(self):
        self.s = (1103515245 * self.s + 12345) & 0x7FFFFFFF
        return self.s / 0x7FFFFFFF

    def rng(self, a, b):
        return a + (b - a) * self.r()


def new(w, h):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def save(img, name):
    big = img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)
    out = f"{ROOT}/public/assets/fx/{name}.png"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    big.save(out)


def blob(d, cx, cy, rings):
    """Concentric filled circles, outer→inner, for a chunky glowing ball."""
    for r, c in rings:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)


# ---------------------------------------------------------------------------
# Palettes
# ---------------------------------------------------------------------------
FIRE = dict(edge=(214, 54, 32, 255), mid=(255, 138, 30, 255), hot=(255, 210, 84, 255),
            core=(255, 250, 224, 255), ember=(150, 40, 24, 255))
ICE = dict(edge=(40, 96, 196, 255), mid=(88, 190, 250, 255), hot=(180, 236, 255, 255),
           core=(244, 252, 255, 255), ember=(120, 170, 220, 255))
BOLT = dict(edge=(120, 60, 210, 255), mid=(168, 96, 240, 255), hot=(150, 224, 255, 255),
            core=(244, 244, 255, 255), ember=(90, 60, 160, 255))
# Energy — toxic-lime plasma (dark green core, bright lime crackle).
ENERGY = dict(edge=(46, 120, 44, 255), mid=(108, 196, 66, 255), hot=(176, 236, 92, 255),
              core=(226, 255, 178, 255), ember=(38, 92, 34, 255))


# ---------------------------------------------------------------------------
# Projectile orbs
# ---------------------------------------------------------------------------
def orb_fire():
    img, d = new(ORB_W, ORB_H)
    cx, cy = 30, 13
    # comet tail (flame streaks to the left)
    d.polygon([(cx, 4), (cx, 22), (2, 13)], fill=FIRE["edge"])
    d.polygon([(cx, 7), (cx, 19), (7, 13)], fill=FIRE["mid"])
    d.polygon([(cx, 10), (cx, 16), (14, 13)], fill=FIRE["hot"])
    blob(d, cx, cy, [(12, FIRE["edge"]), (10, FIRE["mid"]), (7, FIRE["hot"]), (4, FIRE["core"])])
    for (ex, ey) in [(6, 8), (10, 18), (3, 15)]:
        d.point((ex, ey), fill=FIRE["hot"])
    save(img, "orb-fire")


def orb_ice():
    img, d = new(ORB_W, ORB_H)
    cx, cy = 30, 13
    # frost trail
    d.polygon([(cx, 6), (cx, 20), (4, 13)], fill=ICE["edge"])
    d.polygon([(cx, 9), (cx, 17), (12, 13)], fill=ICE["mid"])
    # crystal shard pointing right
    d.polygon([(43, 13), (26, 4), (14, 13), (26, 22)], fill=ICE["edge"])
    d.polygon([(40, 13), (27, 7), (20, 13), (27, 19)], fill=ICE["mid"])
    d.polygon([(35, 13), (28, 10), (25, 13), (28, 16)], fill=ICE["hot"])
    d.ellipse([29, 11, 33, 15], fill=ICE["core"])
    for (sx, sy) in [(8, 9), (5, 16), (13, 6)]:
        d.point((sx, sy), fill=ICE["hot"])
    save(img, "orb-ice")


def orb_lightning():
    img, d = new(ORB_W, ORB_H)
    cx, cy = 30, 13
    # jagged bolt tail
    d.line([(cx, 13), (22, 8), (16, 17), (8, 11), (2, 14)], fill=BOLT["hot"], width=2)
    d.line([(cx, 13), (22, 8), (16, 17), (8, 11), (2, 14)], fill=BOLT["core"], width=1)
    # crackling ball
    blob(d, cx, cy, [(11, BOLT["edge"]), (9, BOLT["mid"]), (6, BOLT["hot"]), (3, BOLT["core"])])
    # spark spikes around the ball
    for ang in range(0, 360, 45):
        a = math.radians(ang)
        x1, y1 = cx + math.cos(a) * 10, cy + math.sin(a) * 10
        x2, y2 = cx + math.cos(a) * 15, cy + math.sin(a) * 15
        d.line([(x1, y1), (x2, y2)], fill=BOLT["hot"], width=1)
    save(img, "orb-lightning")


def orb_energy():
    img, d = new(ORB_W, ORB_H)
    cx, cy = 30, 13
    p = ENERGY
    # plasma comet tail (green streaks + a wisp of crackle)
    d.polygon([(cx, 5), (cx, 21), (2, 13)], fill=p["edge"])
    d.polygon([(cx, 8), (cx, 18), (8, 13)], fill=p["mid"])
    d.line([(cx, 13), (20, 9), (13, 16), (5, 12)], fill=p["hot"], width=1)
    # crackling plasma ball
    blob(d, cx, cy, [(12, p["edge"]), (10, p["mid"]), (6, p["hot"]), (3, p["core"])])
    # dense spark spikes all around
    for ang in range(0, 360, 30):
        a = math.radians(ang)
        x1, y1 = cx + math.cos(a) * 11, cy + math.sin(a) * 11
        x2, y2 = cx + math.cos(a) * 15.5, cy + math.sin(a) * 15.5
        d.line([(x1, y1), (x2, y2)], fill=p["hot"], width=1)
    for (ex, ey) in [(24, 6), (34, 19), (26, 20), (36, 8)]:
        d.point((ex, ey), fill=p["core"])
    save(img, "orb-energy")


# ---------------------------------------------------------------------------
# Explosion sprite sheets (5 frames laid out horizontally)
# ---------------------------------------------------------------------------
def flame_spikes(d, cx, cy, n, r0, r1, cols, seed, taper=3):
    rnd = _Rnd(seed)
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.rng(-0.2, 0.2)
        bx, by = cx + math.cos(a) * r0, cy + math.sin(a) * r0
        tx, ty = cx + math.cos(a) * r1, cy + math.sin(a) * r1
        perp = a + math.pi / 2
        w = taper
        for col, ww in cols:
            d.polygon([(bx + math.cos(perp) * ww, by + math.sin(perp) * ww),
                       (bx - math.cos(perp) * ww, by - math.sin(perp) * ww),
                       (tx, ty)], fill=col)


def bolt_spikes(d, cx, cy, n, r0, r1, col, seed, width=1):
    rnd = _Rnd(seed)
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.rng(-0.15, 0.15)
        pts = [(cx + math.cos(a) * r0, cy + math.sin(a) * r0)]
        steps = 3
        for s in range(1, steps + 1):
            rr = r0 + (r1 - r0) * s / steps
            aa = a + rnd.rng(-0.5, 0.5)
            pts.append((cx + math.cos(aa) * rr, cy + math.sin(aa) * rr))
        d.line(pts, fill=col, width=width)


def sheet(name, draw_frame):
    img, d = new(F * FRAMES, F)
    for i in range(FRAMES):
        draw_frame(d, F * i + F // 2, F // 2, i)
    save(img, name)


def boom_fire():
    def frame(d, cx, cy, i):
        p = FIRE
        if i == 0:
            blob(d, cx, cy, [(7, p["hot"]), (4, p["core"])])
        elif i == 1:
            flame_spikes(d, cx, cy, 9, 8, 15, [(p["edge"], 4), (p["mid"], 2)], 11)
            blob(d, cx, cy, [(11, p["mid"]), (7, p["hot"]), (4, p["core"])])
        elif i == 2:
            flame_spikes(d, cx, cy, 11, 10, 22, [(p["edge"], 5), (p["mid"], 3), (p["hot"], 1)], 22)
            blob(d, cx, cy, [(13, p["edge"]), (10, p["mid"]), (6, p["hot"]), (3, p["core"])])
        elif i == 3:
            flame_spikes(d, cx, cy, 11, 12, 23, [(p["edge"], 3), (p["mid"], 1)], 33)
            blob(d, cx, cy, [(11, p["ember"]), (8, p["edge"]), (4, p["mid"])])
            _embers(d, cx, cy, 14, 22, p["hot"], 7)
        else:
            blob(d, cx, cy, [(7, p["ember"])])
            _embers(d, cx, cy, 10, 22, p["edge"], 9)
    sheet("boom-fire", frame)


def boom_ice():
    def frame(d, cx, cy, i):
        p = ICE
        if i == 0:
            blob(d, cx, cy, [(7, p["hot"]), (4, p["core"])])
        elif i == 1:
            flame_spikes(d, cx, cy, 8, 8, 16, [(p["edge"], 3), (p["hot"], 1)], 5, taper=2)
            blob(d, cx, cy, [(9, p["mid"]), (5, p["core"])])
        elif i == 2:
            flame_spikes(d, cx, cy, 10, 9, 22, [(p["edge"], 3), (p["mid"], 1)], 9, taper=2)
            blob(d, cx, cy, [(8, p["mid"]), (4, p["core"])])
            _embers(d, cx, cy, 12, 22, p["hot"], 8)
        elif i == 3:
            flame_spikes(d, cx, cy, 10, 13, 23, [(p["mid"], 2)], 13, taper=1)
            _embers(d, cx, cy, 8, 23, p["hot"], 12)
        else:
            _embers(d, cx, cy, 6, 22, p["mid"], 10)
    sheet("boom-ice", frame)


def boom_lightning():
    def frame(d, cx, cy, i):
        p = BOLT
        if i == 0:
            blob(d, cx, cy, [(7, p["hot"]), (4, p["core"])])
        elif i == 1:
            bolt_spikes(d, cx, cy, 7, 6, 16, p["hot"], 3, width=2)
            blob(d, cx, cy, [(8, p["mid"]), (4, p["core"])])
        elif i == 2:
            bolt_spikes(d, cx, cy, 8, 6, 23, p["mid"], 7, width=2)
            bolt_spikes(d, cx, cy, 8, 6, 20, p["hot"], 13, width=1)
            blob(d, cx, cy, [(7, p["mid"]), (3, p["core"])])
            _embers(d, cx, cy, 12, 22, p["hot"], 8)
        elif i == 3:
            bolt_spikes(d, cx, cy, 8, 8, 23, p["hot"], 17, width=1)
            _embers(d, cx, cy, 10, 22, p["core"], 10)
        else:
            _embers(d, cx, cy, 6, 22, p["mid"], 9)
    sheet("boom-lightning", frame)


def boom_energy():
    """A green plasma burst — spiky flames plus crackling lime arcs."""
    def frame(d, cx, cy, i):
        p = ENERGY
        if i == 0:
            blob(d, cx, cy, [(7, p["hot"]), (4, p["core"])])
        elif i == 1:
            flame_spikes(d, cx, cy, 10, 8, 15, [(p["edge"], 4), (p["mid"], 2)], 4, taper=2)
            blob(d, cx, cy, [(11, p["mid"]), (6, p["hot"]), (3, p["core"])])
        elif i == 2:
            flame_spikes(d, cx, cy, 12, 10, 22, [(p["edge"], 4), (p["mid"], 2), (p["hot"], 1)], 8, taper=3)
            bolt_spikes(d, cx, cy, 8, 8, 21, p["hot"], 14, width=1)
            blob(d, cx, cy, [(12, p["edge"]), (9, p["mid"]), (5, p["hot"]), (2, p["core"])])
        elif i == 3:
            flame_spikes(d, cx, cy, 12, 12, 23, [(p["edge"], 2), (p["mid"], 1)], 12, taper=1)
            bolt_spikes(d, cx, cy, 8, 10, 23, p["hot"], 18, width=1)
            blob(d, cx, cy, [(9, p["ember"]), (5, p["mid"])])
            _embers(d, cx, cy, 14, 22, p["hot"], 7)
        else:
            blob(d, cx, cy, [(6, p["ember"])])
            _embers(d, cx, cy, 8, 22, p["mid"], 9)
    sheet("boom-energy", frame)


def _embers(d, cx, cy, r0, r1, col, seed):
    rnd = _Rnd(seed)
    for _ in range(10):
        a = rnd.rng(0, 2 * math.pi)
        rr = rnd.rng(r0, r1)
        d.point((cx + math.cos(a) * rr, cy + math.sin(a) * rr), fill=col)


# ---------------------------------------------------------------------------
def preview():
    names = ["orb-fire", "orb-ice", "orb-lightning", "orb-energy",
             "boom-fire", "boom-ice", "boom-lightning", "boom-energy"]
    imgs = [Image.open(f"{ROOT}/public/assets/fx/{n}.png") for n in names]
    pad = 12
    bg = (24, 24, 32, 255)
    w = max(i.width for i in imgs) + pad * 2
    h = sum(i.height for i in imgs) + pad * (len(imgs) + 1)
    sheet_img = Image.new("RGBA", (w, h), bg)
    y = pad
    for i in imgs:
        sheet_img.alpha_composite(i, (pad, y))
        y += i.height + pad
    sheet_img.convert("RGB").save(f"{ROOT}/tools/_fx-preview.png")
    print("preview -> tools/_fx-preview.png")


if __name__ == "__main__":
    orb_fire(); orb_ice(); orb_lightning(); orb_energy()
    boom_fire(); boom_ice(); boom_lightning(); boom_energy()
    preview()
    print("done")
