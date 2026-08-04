#!/usr/bin/env python3
"""Generate original pixel-art castle-room backgrounds for reading-battler.

The player climbs a castle: every level is a different room, and the rooms shift
theme/palette as you ascend so it feels like moving deeper into a new wing —
ending in a boss lair. These are drawn from scratch (inspired by moody
limited-palette castle pixel art, never traced) and share the game's chunky look.

How it works, mirroring tools/gen-sprites.py:
  * Draw on a small native canvas (240x160) with flat shapes — that low res *is*
    the pixel art — then nearest-upscale by SCALE (x4) to the 960x640 battle
    canvas.
  * A library of primitives (brick wall, arch window, torch, floor, vignette…)
    is shared; each room composes them with its own palette + decoration.
  * The lower-centre "stage" is kept calm and mid-dark on purpose so the
    combatants, HP bar, quest banner and word cards stay readable on top.

Run: python tools/gen-backgrounds.py  -> public/assets/bg/<slug>.png
"""

from __future__ import annotations

import os
import math
from PIL import Image, ImageDraw

SCALE = 4
NW, NH = 240, 160          # native size; *4 = 960x640 (the battle canvas)
FLOOR_Y = 108              # native y where the floor starts (=432 display = GROUND)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------------------
# Canvas + primitives
# ---------------------------------------------------------------------------
class BG:
    def __init__(self):
        self.img = Image.new("RGBA", (NW, NH), (0, 0, 0, 255))
        self.d = ImageDraw.Draw(self.img, "RGBA")

    # -- low-level -----------------------------------------------------------
    def rect(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=c)

    def vgrad(self, x0, y0, x1, y1, top, bot):
        """Vertical gradient band."""
        h = max(1, y1 - y0)
        for i in range(h):
            t = i / h
            c = tuple(round(top[k] + (bot[k] - top[k]) * t) for k in range(3))
            self.d.line([(x0, y0 + i), (x1, y0 + i)], fill=(*c, 255))

    def _acomp(self, draw_fn):
        """Alpha-composite a translucent draw onto the base. ImageDraw in RGBA
        mode *replaces* pixels (alpha included) rather than blending, so any
        translucent effect must go through its own layer and be composited."""
        layer = Image.new("RGBA", (NW, NH), (0, 0, 0, 0))
        draw_fn(ImageDraw.Draw(layer, "RGBA"))
        self.img = Image.alpha_composite(self.img, layer)
        self.d = ImageDraw.Draw(self.img, "RGBA")

    def overlay(self, x0, y0, x1, y1, c):
        """Translucent rectangle (c includes alpha), properly blended."""
        self._acomp(lambda ld: ld.rectangle([x0, y0, x1, y1], fill=c))

    # -- castle pieces -------------------------------------------------------
    def brick_wall(self, x0, y0, x1, y1, base, dark, light, mortar, bh=8, bw=16):
        """A blocky brick wall with staggered courses."""
        self.rect(x0, y0, x1, y1, base)
        row = 0
        y = y0
        while y < y1:
            off = 0 if row % 2 == 0 else bw // 2
            x = x0 - off
            while x < x1:
                # mortar seams
                self.d.line([(x, y), (x, min(y + bh, y1))], fill=mortar)
                x += bw
            self.d.line([(x0, y), (x1, y)], fill=mortar)       # course line
            self.d.line([(x0, y + 1), (x1, y + 1)], fill=light)  # lit top of course
            row += 1
            y += bh
        # ambient shade down the sides for depth
        self.overlay(x0, y0, x0 + 20, y1, (*dark[:3], 90))
        self.overlay(x1 - 20, y0, x1, y1, (*dark[:3], 90))

    def arch_window(self, cx, top, w, h, frame, glass_top, glass_bot, lit=False):
        """A rounded-top arched window with a two-tone glass fill."""
        x0, x1 = cx - w // 2, cx + w // 2
        # frame
        self.d.rectangle([x0 - 2, top, x1 + 2, top + h], fill=frame)
        self.d.pieslice([x0 - 2, top - w // 2 - 2, x1 + 2, top + w // 2 + 2],
                        180, 360, fill=frame)
        # glass
        self.vgrad(x0, top, x1, top + h, glass_top, glass_bot)
        self.d.pieslice([x0, top - w // 2, x1, top + w // 2], 180, 360, fill=glass_top)
        # mullions
        self.d.line([(cx, top - w // 2), (cx, top + h)], fill=frame)
        self.d.line([(x0, top + h // 2), (x1, top + h // 2)], fill=frame)
        if lit:
            self.overlay(x0, top, x1, top + h, (255, 230, 150, 40))

    def torch(self, x, y, glow=(255, 150, 60), flame=(255, 200, 90)):
        """Wall torch: bracket, flame, and a small soft warm glow."""
        # soft glow halo (small, properly blended)
        for r, a in [(13, 26), (9, 46), (5, 80)]:
            self._acomp(lambda ld, r=r, a=a: ld.ellipse(
                [x - r, y - r, x + r, y + r], fill=(*glow[:3], a)))
        # bracket
        self.rect(x - 1, y + 3, x + 1, y + 11, (60, 52, 44, 255))
        # flame
        self.d.polygon([(x - 3, y + 4), (x + 3, y + 4), (x, y - 6)], fill=glow)
        self.d.polygon([(x - 2, y + 3), (x + 2, y + 3), (x, y - 2)], fill=flame)
        self.d.point((x, y), fill=(255, 245, 210, 255))

    def floor(self, base, dark, light, y=FLOOR_Y, seams=True):
        """Stone floor with a little perspective + a lit path receding to the wall."""
        self.rect(0, y, NW, NH, base)
        # receding lit path (trapezoid) to add depth toward the back wall
        self.d.polygon([(NW // 2 - 10, y), (NW // 2 + 10, y),
                        (NW // 2 + 46, NH), (NW // 2 - 46, NH)], fill=light)
        if seams:
            # horizontal flag-stone bands, darker toward the front (bottom)
            b = y
            step = 8
            k = 0
            while b < NH:
                shade = dark if k % 2 == 0 else base
                self.d.line([(0, b), (NW, b)], fill=shade)
                b += step
                step += 3      # bands grow toward the viewer (perspective)
                k += 1
        # front edge darkening so word cards / sprites read on top
        self.overlay(0, NH - 40, NW, NH, (0, 0, 0, 70))
        # contact shadow line where wall meets floor
        self.overlay(0, y - 2, NW, y + 1, (0, 0, 0, 80))

    def vignette(self, corner=150):
        """Darken the edges (and, gently, the very top) to focus the stage."""
        def draw(ld):
            for i in range(28):
                a = int(corner * (1 - i / 28))
                ld.rectangle([i, i, NW - 1 - i, NH - 1 - i], outline=(0, 0, 0, a // 6))
            ld.rectangle([0, 0, NW, 16], fill=(0, 0, 0, 60))  # top mood band
        self._acomp(draw)

    def stars(self, x0, y0, x1, y1, color=(150, 200, 255), n=40, seed=1):
        rnd = _Rnd(seed)
        for _ in range(n):
            sx = x0 + rnd.rand() * (x1 - x0)
            sy = y0 + rnd.rand() * (y1 - y0)
            b = rnd.rand()
            c = tuple(min(255, round(color[k] * (0.5 + b * 0.5))) for k in range(3))
            if b > 0.8:  # a few plus-shaped sparkles
                self.d.point((sx, sy - 1), fill=(*c, 255))
                self.d.point((sx, sy + 1), fill=(*c, 255))
                self.d.point((sx - 1, sy), fill=(*c, 255))
                self.d.point((sx + 1, sy), fill=(*c, 255))
            self.d.point((sx, sy), fill=(*c, 255))

    def save(self, slug):
        out = f"{ROOT}/public/assets/bg/{slug}.png"
        os.makedirs(os.path.dirname(out), exist_ok=True)
        big = self.img.resize((NW * SCALE, NH * SCALE), Image.NEAREST)
        big.convert("RGB").save(out)
        return big


class _Rnd:
    """Tiny deterministic RNG so previews are stable run-to-run."""
    def __init__(self, seed=1):
        self.s = seed * 2654435761 & 0xFFFFFFFF

    def rand(self):
        self.s = (1103515245 * self.s + 12345) & 0x7FFFFFFF
        return self.s / 0x7FFFFFFF


# ---------------------------------------------------------------------------
# Rooms — each returns a saved image. Consistent castle language, distinct
# theme + palette so climbing feels like moving through the castle.
# ---------------------------------------------------------------------------
def room_gatehouse():
    """Level 1 vibe: cool blue dusk entrance — portcullis + torches."""
    cv = BG()
    cv.vgrad(0, 0, NW, FLOOR_Y, (34, 42, 74), (58, 70, 108))          # dusk sky over the gate
    cv.brick_wall(0, 24, NW, FLOOR_Y, (60, 66, 88), (40, 46, 66), (86, 94, 120), (34, 38, 54))
    # crenellations along the wall top
    for x in range(4, NW, 20):
        cv.rect(x, 18, x + 10, 26, (60, 66, 88, 255))
    # central gate arch with a portcullis
    gx0, gx1 = NW // 2 - 26, NW // 2 + 26
    cv.d.rectangle([gx0, 52, gx1, FLOOR_Y], fill=(22, 24, 36, 255))
    cv.d.pieslice([gx0, 30, gx1, 74], 180, 360, fill=(22, 24, 36, 255))
    for x in range(gx0 + 4, gx1, 8):
        cv.d.line([(x, 52), (x, FLOOR_Y - 4)], fill=(70, 76, 96, 255))
    for yy in range(58, FLOOR_Y - 4, 10):
        cv.d.line([(gx0 + 2, yy), (gx1 - 2, yy)], fill=(70, 76, 96, 255))
    cv.torch(30, 66); cv.torch(NW - 30, 66)
    cv.floor((46, 50, 66), (30, 32, 44), (66, 72, 92))
    cv.vignette()
    return cv.save("room-gatehouse")


def room_hall():
    """Great Hall: warm torchlit stone, tall arched windows, hanging banners."""
    cv = BG()
    cv.vgrad(0, 0, NW, FLOOR_Y, (46, 32, 40), (74, 48, 42))
    cv.brick_wall(0, 20, NW, FLOOR_Y, (92, 70, 58), (62, 46, 38), (122, 94, 74), (48, 34, 30))
    for cx in (60, NW - 60):
        cv.arch_window(cx, 34, 22, 46, (58, 42, 34), (120, 150, 200), (40, 60, 110), lit=True)
    # hanging banners with a simple emblem
    for bx, col in [(NW // 2 - 44, (150, 60, 60)), (NW // 2 + 44, (60, 90, 150))]:
        cv.rect(bx - 6, 22, bx + 6, 78, (*col, 255))
        cv.rect(bx - 6, 22, bx + 6, 26, (30, 24, 22, 255))
        cv.d.polygon([(bx - 6, 78), (bx + 6, 78), (bx, 86)], fill=(*col, 255))
        cv.rect(bx - 2, 44, bx + 2, 52, (230, 200, 120, 255))  # emblem
    # side pillars
    for px in (18, NW - 18):
        cv.rect(px - 6, 20, px + 6, FLOOR_Y, (78, 60, 50, 255))
        cv.rect(px + 4, 20, px + 6, FLOOR_Y, (52, 40, 34, 255))
    cv.torch(40, 64); cv.torch(NW - 40, 64)
    cv.floor((74, 56, 46), (48, 34, 28), (104, 80, 64))
    cv.vignette()
    return cv.save("room-hall")


def room_library():
    """Archive/Library (fits the reading theme): shelves of glowing book spines."""
    cv = BG()
    cv.vgrad(0, 0, NW, FLOOR_Y, (40, 34, 28), (64, 52, 38))
    cv.brick_wall(0, 16, NW, FLOOR_Y, (74, 60, 46), (52, 42, 32), (100, 82, 62), (40, 32, 24))
    spine_cols = [(150, 70, 60), (70, 110, 150), (90, 140, 90), (170, 140, 70),
                  (130, 90, 150), (90, 120, 170)]
    rnd = _Rnd(7)
    # two big bookcases flanking a central darker alcove
    for bx0, bx1 in [(8, 92), (NW - 92, NW - 8)]:
        cv.rect(bx0, 20, bx1, FLOOR_Y - 4, (44, 34, 26, 255))       # case backing
        for shelf_y in range(26, FLOOR_Y - 8, 16):
            cv.rect(bx0 + 2, shelf_y + 11, bx1 - 2, shelf_y + 13, (32, 24, 18, 255))
            x = bx0 + 3
            while x < bx1 - 3:
                w = 2 + int(rnd.rand() * 3)
                h = 8 + int(rnd.rand() * 3)
                col = spine_cols[int(rnd.rand() * len(spine_cols))]
                cv.rect(x, shelf_y + 12 - h, x + w, shelf_y + 12, (*col, 255))
                cv.d.point((x, shelf_y + 12 - h), fill=(255, 240, 200, 120))  # gilt
                x += w + 1
    # central candle-lit reading nook
    cv.arch_window(NW // 2, 30, 26, 44, (52, 40, 30), (60, 46, 34), (30, 24, 18))
    cv.torch(NW // 2 - 54, 60, glow=(255, 170, 70)); cv.torch(NW // 2 + 54, 60, glow=(255, 170, 70))
    cv.floor((70, 56, 42), (46, 34, 26), (98, 78, 58))
    cv.vignette()
    return cv.save("room-library")


def room_dungeon():
    """Dungeon/Catacomb: cold damp green stone, barred window, chains."""
    cv = BG()
    cv.vgrad(0, 0, NW, FLOOR_Y, (18, 28, 26), (30, 44, 40))
    cv.brick_wall(0, 14, NW, FLOOR_Y, (52, 64, 56), (34, 44, 40), (74, 88, 78), (26, 34, 30), bh=10, bw=18)
    # barred window with cold moonlight
    wx = NW // 2
    cv.rect(wx - 20, 26, wx + 20, 60, (60, 78, 96, 255))
    for x in range(wx - 18, wx + 20, 6):
        cv.rect(x, 26, x + 1, 60, (24, 30, 34, 255))
    cv.rect(wx - 22, 24, wx + 22, 27, (40, 50, 46, 255))
    # hanging chains
    for chx in (36, NW - 36):
        for yy in range(18, 70, 4):
            cv.d.ellipse([chx - 2, yy, chx + 2, yy + 4], outline=(70, 80, 74, 255))
        cv.d.ellipse([chx - 4, 68, chx + 4, 78], outline=(70, 80, 74, 255))   # shackle
    # moss patches + water stains
    rnd = _Rnd(3)
    def moss(ld):
        for _ in range(30):
            mx, my = int(rnd.rand() * NW), 20 + int(rnd.rand() * (FLOOR_Y - 24))
            ld.point((mx, my), fill=(70, 100, 70, 160))
    cv._acomp(moss)
    cv.floor((44, 54, 48), (28, 36, 32), (62, 76, 66))
    cv.overlay(0, FLOOR_Y, NW, NH, (20, 40, 30, 40))   # damp sheen
    cv.vignette(corner=190)
    return cv.save("room-dungeon")


def room_tower():
    """Tower stairwell: night sky window with a moon + stars, cool indigo, stairs."""
    cv = BG()
    cv.rect(0, 0, NW, FLOOR_Y, (20, 22, 44, 255))
    cv.brick_wall(0, 12, NW, FLOOR_Y, (48, 50, 78), (32, 34, 56), (72, 74, 104), (26, 28, 46))
    # tall window onto the night
    wx = NW // 2
    cv.rect(wx - 24, 18, wx + 24, 86, (30, 34, 40, 255))       # frame
    cv.vgrad(wx - 21, 20, wx + 21, 84, (18, 22, 46), (40, 46, 82))
    cv.d.pieslice([wx - 21, 4, wx + 21, 40], 180, 360, fill=(18, 22, 46, 255))
    cv.stars(wx - 20, 22, wx + 20, 70, color=(170, 200, 255), n=26, seed=5)
    cv.d.ellipse([wx + 6, 26, wx + 18, 38], fill=(220, 225, 210, 255))       # moon
    cv.d.ellipse([wx + 9, 28, wx + 14, 33], fill=(196, 202, 188, 255))       # crater shade
    cv.d.line([(wx, 20), (wx, 84)], fill=(30, 34, 40, 255))    # mullion
    cv.d.line([(wx - 21, 50), (wx + 21, 50)], fill=(30, 34, 40, 255))
    # spiral stair steps climbing off to the right
    for i in range(8):
        sx = NW - 70 + i * 8
        sy = FLOOR_Y - 6 - i * 9
        cv.rect(sx, sy, sx + 26, sy + 6, (56, 58, 88, 255))
        cv.rect(sx, sy, sx + 26, sy + 1, (84, 86, 118, 255))
        cv.rect(sx, sy + 5, sx + 26, sy + 6, (34, 36, 58, 255))
    cv.torch(34, 60, glow=(120, 160, 255), flame=(180, 210, 255))   # cold blue torch
    cv.floor((46, 48, 74), (30, 32, 52), (68, 70, 100))
    cv.vignette()
    return cv.save("room-tower")


def room_chapel():
    """Chapel: solemn violet, tall pointed stained-glass windows."""
    cv = BG()
    cv.vgrad(0, 0, NW, FLOOR_Y, (36, 26, 52), (58, 40, 78))
    cv.brick_wall(0, 14, NW, FLOOR_Y, (72, 58, 92), (50, 40, 66), (100, 82, 126), (40, 32, 52))
    glass = [(200, 80, 90), (90, 140, 200), (230, 200, 90), (110, 180, 120), (170, 110, 200)]
    rnd = _Rnd(11)
    # three pointed lancet windows
    for cx in (NW // 2 - 60, NW // 2, NW // 2 + 60):
        x0, x1, top, h = cx - 12, cx + 12, 26, 60
        cv.d.rectangle([x0 - 2, top, x1 + 2, top + h], fill=(40, 30, 52, 255))
        cv.d.polygon([(x0 - 2, top), (x1 + 2, top), (cx, top - 18)], fill=(40, 30, 52, 255))
        # coloured panes
        for yy in range(top, top + h, 8):
            for xx in range(x0, x1, 8):
                col = glass[int(rnd.rand() * len(glass))]
                cv.rect(xx, yy, xx + 7, yy + 7, (*col, 255))
        cv.d.polygon([(x0, top), (x1, top), (cx, top - 15)],
                     fill=glass[int(rnd.rand() * len(glass))] + (255,))
        cv.d.line([(cx, top - 15), (cx, top + h)], fill=(40, 30, 52, 255))
        # soft light spilling below
        cv.overlay(x0 - 4, top + h, x1 + 4, FLOOR_Y, (200, 160, 220, 26))
    cv.torch(28, 58, glow=(200, 130, 230), flame=(235, 200, 250))
    cv.torch(NW - 28, 58, glow=(200, 130, 230), flame=(235, 200, 250))
    cv.floor((66, 54, 84), (44, 34, 58), (94, 78, 116))
    cv.vignette()
    return cv.save("room-chapel")


def room_throne_boss():
    """BOSS LAIR (level 10): the throne / arcane sanctum. Grand, menacing —
    crimson + arcane cyan, a great throne under a glowing rune arch and braziers."""
    cv = BG()
    cv.vgrad(0, 0, NW, FLOOR_Y, (30, 16, 24), (66, 22, 30))          # blood-red gloom
    cv.brick_wall(0, 10, NW, FLOOR_Y, (70, 48, 54), (46, 30, 36), (100, 70, 78), (34, 22, 28), bh=10, bw=20)
    # towering arched alcove behind the throne, lit by an arcane glow
    ax0, ax1 = NW // 2 - 40, NW // 2 + 40
    cv.rect(ax0, 30, ax1, FLOOR_Y, (26, 14, 22, 255))
    cv.d.pieslice([ax0, 0, ax1, 60], 180, 360, fill=(26, 14, 22, 255))
    for r, a in [(46, 40), (34, 60), (22, 90)]:                       # arcane rune glow
        cv._acomp(lambda ld, r=r, a=a: ld.ellipse(
            [NW // 2 - r, 40 - r, NW // 2 + r, 40 + r], fill=(90, 220, 255, a)))
    cv.d.polygon([(NW // 2, 20), (NW // 2 + 12, 40), (NW // 2, 60), (NW // 2 - 12, 40)],
                 fill=(150, 240, 255, 255))
    cv.d.polygon([(NW // 2, 28), (NW // 2 + 6, 40), (NW // 2, 52), (NW // 2 - 6, 40)],
                 fill=(220, 250, 255, 255))
    # the throne
    tx = NW // 2
    cv.rect(tx - 18, 58, tx + 18, FLOOR_Y + 6, (40, 26, 32, 255))
    cv.rect(tx - 14, 66, tx + 14, FLOOR_Y, (58, 40, 46, 255))
    for hx in (tx - 20, tx - 8, tx + 6, tx + 18):                     # spiky throne crown
        cv.d.polygon([(hx - 3, 58), (hx, 44), (hx + 3, 58)], fill=(150, 120, 70, 255))
    cv.rect(tx - 3, 62, tx + 3, 74, (150, 240, 255, 255))            # a gem in the throne
    # braziers with tall arcane-tinted flames
    for bx in (36, NW - 36):
        cv.rect(bx - 5, 78, bx + 5, 96, (44, 30, 34, 255))
        cv.rect(bx - 7, 76, bx + 7, 80, (60, 42, 46, 255))
        cv.torch(bx, 70, glow=(120, 220, 255), flame=(200, 245, 255))
    # a long throne carpet leading in
    cv.d.polygon([(NW // 2 - 12, FLOOR_Y), (NW // 2 + 12, FLOOR_Y),
                  (NW // 2 + 40, NH), (NW // 2 - 40, NH)], fill=(120, 40, 46, 255))
    cv.d.polygon([(NW // 2 - 4, FLOOR_Y), (NW // 2 + 4, FLOOR_Y),
                  (NW // 2 + 20, NH), (NW // 2 - 20, NH)], fill=(150, 120, 70, 255))
    cv.floor((58, 40, 44), (38, 24, 28), (84, 60, 64), seams=True)
    # redraw carpet over floor seams
    cv.d.polygon([(NW // 2 - 12, FLOOR_Y), (NW // 2 + 12, FLOOR_Y),
                  (NW // 2 + 40, NH), (NW // 2 - 40, NH)], fill=(120, 40, 46, 255))
    cv.d.polygon([(NW // 2 - 5, FLOOR_Y), (NW // 2 + 5, FLOOR_Y),
                  (NW // 2 + 22, NH), (NW // 2 - 22, NH)], fill=(150, 120, 70, 255))
    cv.overlay(0, FLOOR_Y - 2, NW, NH, (60, 0, 10, 30))
    cv.vignette(corner=200)
    return cv.save("room-throne")


def screen_transition():
    """Loading/transition art: a distant castle on a starry night, shown between
    rooms while the next level loads. Undertale-ish silhouette; no floor needed."""
    cv = BG()
    cv.vgrad(0, 0, NW, NH, (6, 8, 20), (14, 16, 34))
    cv.stars(0, 0, NW, 118, color=(120, 190, 255), n=90, seed=9)
    # a soft moon
    cv.d.ellipse([NW - 52, 16, NW - 24, 44], fill=(60, 90, 150, 90))
    cv.d.ellipse([NW - 50, 18, NW - 26, 42], fill=(150, 190, 240, 255))
    # distant castle silhouette on a hill
    hy = 118
    cv.d.ellipse([NW // 2 - 70, hy - 6, NW // 2 + 70, NH], fill=(18, 22, 40, 255))
    base = (36, 44, 78, 255)
    cx = NW // 2
    cv.rect(cx - 44, hy - 34, cx + 44, hy, base)                    # keep
    for tx in (cx - 44, cx - 16, cx + 12, cx + 40):                 # towers
        cv.rect(tx - 6, hy - 50, tx + 6, hy, base)
        cv.d.polygon([(tx - 8, hy - 50), (tx + 8, hy - 50), (tx, hy - 62)], fill=(70, 130, 170, 255))
    for x in range(cx - 44, cx + 44, 10):                           # crenellations
        cv.rect(x, hy - 38, x + 5, hy - 34, base)
    cv.rect(cx - 6, hy - 20, cx + 6, hy, (12, 16, 30, 255))         # gate
    for wx, wy in [(cx - 30, hy - 22), (cx + 26, hy - 22), (cx, hy - 40)]:
        cv.rect(wx, wy, wx + 3, wy + 4, (255, 200, 110, 255))       # lit windows
    cv.overlay(0, 0, NW, NH, (0, 0, 0, 40))
    cv.vignette(corner=160)
    return cv.save("screen-transition")


def screen_map():
    """World-map loading art: a storybook overland that climbs from the grassy
    lowlands (bottom-left) up past mountains to the castle/tower (top-right).
    The winding path of level nodes + the walking hero are drawn on top in the
    TransitionScene, so this is just the terrain. Original, chunky-flat style."""
    cv = BG()

    def tree(x, y, s=1.0):
        w = int(8 * s)
        cv.rect(x - 1, y, x + 1, y + int(6 * s), (86, 62, 40, 255))          # trunk
        cv.d.ellipse([x - w, y - int(12 * s), x + w, y + 2], (46, 108, 54, 255))
        cv.d.ellipse([x - w, y - int(12 * s), x + w - 3, y - 2], (66, 140, 68, 255))
        cv.d.ellipse([x - w + 2, y - int(11 * s), x + w - 6, y - 5], (96, 176, 92, 255))

    def hill(y0, y1, back, front):
        cv.vgrad(0, y0, NW, y1, back, front)

    # --- sky + distant peaks ---
    cv.vgrad(0, 0, NW, 74, (122, 170, 214), (186, 210, 224))
    for i in range(5):                                                       # soft clouds
        cx, cy = 20 + i * 52, 12 + (i % 2) * 10
        cv.d.ellipse([cx, cy, cx + 26, cy + 8], (230, 238, 244, 255))
        cv.d.ellipse([cx + 12, cy - 4, cx + 38, cy + 6], (230, 238, 244, 255))
    # far mountain range
    for mx, mh, col in [(30, 40, (120, 128, 150)), (95, 52, (104, 112, 138)),
                        (150, 46, (120, 128, 150)), (205, 58, (98, 108, 134))]:
        cv.d.polygon([(mx - 34, 82), (mx, 82 - mh), (mx + 34, 82)], fill=(*col, 255))
        cv.d.polygon([(mx - 10, 82 - mh + 12), (mx, 82 - mh), (mx + 10, 82 - mh + 12)],
                     fill=(226, 232, 240, 255))                              # snow cap

    # --- rolling green land ---
    cv.rect(0, 74, NW, NH, (58, 126, 60, 255))   # base fill so there are no gaps
    hill(66, 110, (74, 150, 74), (58, 128, 60))
    cv.d.ellipse([-40, 92, 150, 220], (86, 164, 84, 255))                    # lit knoll (left)
    cv.d.ellipse([120, 104, 320, 240], (66, 138, 66, 255))                   # shaded knoll (right)
    hill(120, NH, (60, 128, 60), (44, 104, 48))                             # foreground grass
    # scattered rocks + tufts
    rnd = _Rnd(21)
    for _ in range(22):
        gx, gy = int(rnd.rand() * NW), 96 + int(rnd.rand() * (NH - 100))
        cv.d.ellipse([gx, gy, gx + 3, gy + 2], (52, 116, 54, 255))

    # --- craggy mountainside on the right, rising to the tower ---
    cv.d.polygon([(150, NH), (180, 60), (240, 30), (240, NH)], fill=(96, 92, 108, 255))
    cv.d.polygon([(168, NH), (196, 66), (240, 46), (240, NH)], fill=(120, 116, 132, 255))
    cv.d.polygon([(150, NH), (176, 74), (196, 96), (176, NH)], fill=(80, 78, 96, 255))
    for _ in range(16):                                                      # rocky speckle
        rx, ry = 158 + int(rnd.rand() * 78), 60 + int(rnd.rand() * 90)
        cv.d.point((rx, ry), fill=(150, 146, 160, 160))

    # --- the castle / tower at the summit (top-right) ---
    tx, ty = 206, 42
    stone, stone_lt, stone_dk = (150, 150, 164, 255), (188, 188, 200, 255), (108, 108, 126, 255)
    cv.rect(tx - 12, ty, tx + 12, ty + 26, stone)                            # keep
    cv.rect(tx + 8, ty, tx + 12, ty + 26, stone_dk)
    for cxx in range(tx - 12, tx + 12, 6):                                   # crenellations
        cv.rect(cxx, ty - 4, cxx + 3, ty, stone)
    cv.rect(tx - 6, ty - 18, tx + 6, ty, stone_lt)                           # tall tower
    cv.d.polygon([(tx - 8, ty - 18), (tx + 8, ty - 18), (tx, ty - 30)], fill=(184, 74, 66, 255))  # red roof
    cv.rect(tx + 1, ty - 34, tx + 2, ty - 30, (200, 90, 80, 255))            # flagpole
    cv.d.polygon([(tx + 2, ty - 34), (tx + 9, ty - 32), (tx + 2, ty - 30)], fill=(230, 200, 90, 255))
    cv.rect(tx - 2, ty + 14, tx + 2, ty + 26, (60, 44, 40, 255))            # gate
    for wx, wy in [(tx - 8, ty + 6), (tx + 5, ty + 6), (tx - 2, ty - 12)]:
        cv.rect(wx, wy, wx + 2, wy + 3, (255, 214, 120, 255))               # lit windows

    # a few trees dotted along the lowlands
    for (tx2, ty2, s) in [(24, 132, 1.2), (60, 150, 1.0), (100, 120, 0.9),
                          (18, 108, 0.8), (128, 150, 1.1), (86, 138, 0.8)]:
        tree(tx2, ty2, s)

    cv.overlay(0, 0, NW, 12, (0, 0, 0, 40))
    cv.vignette(corner=120)
    return cv.save("screen-map")


# ---------------------------------------------------------------------------
def preview():
    slugs = ["room-gatehouse", "room-hall", "room-library", "room-dungeon",
             "room-tower", "room-chapel", "room-throne", "screen-transition",
             "screen-map"]
    imgs = [Image.open(f"{ROOT}/public/assets/bg/{s}.png") for s in slugs]
    pad = 16
    cols = 2
    cw = imgs[0].width // 2   # half-size thumbnails for the sheet
    ch = imgs[0].height // 2
    rows = (len(imgs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cw + pad * (cols + 1), rows * ch + pad * (rows + 1)), (10, 10, 14))
    for i, im in enumerate(imgs):
        th = im.resize((cw, ch), Image.NEAREST)
        r, c = divmod(i, cols)
        sheet.paste(th, (pad + c * (cw + pad), pad + r * (ch + pad)))
    out = f"{ROOT}/tools/_bg-preview.png"
    sheet.save(out)
    print("preview ->", out)


if __name__ == "__main__":
    room_gatehouse()
    room_hall()
    room_library()
    room_dungeon()
    room_tower()
    room_chapel()
    room_throne_boss()
    screen_transition()
    screen_map()
    preview()
    print("done")
