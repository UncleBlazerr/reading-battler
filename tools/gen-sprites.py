#!/usr/bin/env python3
"""Generate original chunky pixel-art sprites for reading-battler.

Style goal: the "sticker" pixel-art look — cute chibi proportions, a limited
palette, and a thick pale outline hugging the whole silhouette. Inspired by the
reference sheets the user supplied, but every character here is drawn from
scratch with different designs and palettes so nothing is traced or copied.

How it works:
  * Each sprite is drawn on a small native canvas (a few dozen px) using plain
    rectangles / ellipses / single pixels — that low resolution *is* the pixel
    art.
  * We then auto-add a 1px outline around the whole silhouette (this becomes a
    thick, chunky border once upscaled) and nearest-neighbour upscale by SCALE.

Run: python tools/gen-sprites.py
Outputs PNGs into public/assets/{player,enemy}/.
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

SCALE = 8  # native px -> display px (nearest neighbour keeps edges crisp)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Palettes (RGBA). Two "sticker" outline colours: warm cream for the hero,
# pale cyan for the goblin — matching the good-guy / bad-guy split.
# ---------------------------------------------------------------------------
T = (0, 0, 0, 0)  # transparent

HERO_OUTLINE = (247, 236, 214, 255)   # warm cream
GOBLIN_OUTLINE = (196, 240, 246, 255)  # pale cyan

P = {
    # skin
    "skin": (235, 178, 132, 255),
    "skin_sh": (198, 133, 92, 255),
    # hair (auburn) — differs from the brown-haired refs
    "hair": (206, 92, 34, 255),
    "hair_sh": (156, 58, 20, 255),
    # tunic (plum + lavender stripe) — differs from the green/yellow refs
    "tunic": (120, 74, 168, 255),
    "tunic_sh": (86, 50, 124, 255),
    "stripe": (183, 143, 214, 255),
    # trousers (denim)
    "pants": (63, 111, 176, 255),
    "pants_sh": (44, 79, 128, 255),
    # boots
    "boot": (99, 63, 38, 255),
    "boot_sh": (71, 43, 24, 255),
    # spellbook
    "book": (44, 158, 143, 255),
    "book_sh": (28, 112, 102, 255),
    "page": (242, 234, 210, 255),
    # magic glow
    "glow": (120, 240, 255, 255),
    "glow2": (208, 252, 255, 255),
    # face
    "eye": (54, 34, 24, 255),
    "mouth": (120, 58, 40, 255),
    "cheek": (232, 132, 120, 200),
    "white": (255, 255, 255, 255),
}

G = {
    "body": (35, 122, 120, 255),
    "body_sh": (22, 84, 84, 255),
    "belly": (86, 180, 170, 255),
    "belly_sh": (54, 140, 132, 255),
    "ear_in": (30, 70, 74, 255),
    "horn": (208, 236, 236, 255),
    "horn_sh": (150, 196, 200, 255),
    "eye_glow": (150, 244, 255, 255),
    "eye_core": (255, 255, 255, 255),
    "pupil": (10, 40, 46, 255),
    "fang": (240, 248, 244, 255),
    "mouth": (14, 44, 44, 255),
    "claw": (214, 240, 240, 255),
    "spot": (24, 92, 92, 255),
}


# Ink Wraith — a floating indigo specter (drippy liquid body, hollow glowing eyes).
IW_OUTLINE = (206, 216, 248, 255)
IW = {
    "ink": (74, 70, 140, 255),
    "ink_lt": (112, 108, 192, 255),
    "ink_dk": (44, 40, 92, 255),
    "glow": (150, 190, 255, 255),
    "core": (232, 240, 255, 255),
    "pupil": (28, 24, 66, 255),
}

# Bookworm Beetle — a squat sickly-green bug (hard chitin shell, mandibles, legs).
BB_OUTLINE = (200, 240, 214, 255)
BB = {
    "shell": (108, 158, 62, 255),
    "shell_dk": (74, 112, 42, 255),
    "shell_lt": (158, 202, 94, 255),
    "head": (68, 92, 46, 255),
    "leg": (52, 74, 36, 255),
    "eye": (150, 240, 255, 255),
    "eye_dk": (18, 58, 58, 255),
    "mand": (228, 238, 202, 255),
    "rune": (212, 250, 212, 255),
}

# Grimoire Golem — the level-10 boss: a hulking stone guardian built around a
# giant spellbook with a glowing arcane core and floating rune glyphs.
GG_OUTLINE = (196, 240, 246, 255)
GG = {
    "stone": (110, 122, 152, 255),
    "stone_dk": (74, 84, 112, 255),
    "stone_dk2": (50, 58, 84, 255),
    "stone_lt": (154, 166, 194, 255),
    "page": (238, 232, 208, 255),
    "page_sh": (198, 190, 162, 255),
    "glow": (140, 236, 255, 255),
    "glow2": (216, 250, 255, 255),
    "violet": (176, 138, 240, 255),
    "eye": (150, 244, 255, 255),
}


class Canvas:
    """Tiny drawing surface with pixel-friendly helpers."""

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.img = Image.new("RGBA", (w, h), T)
        self.d = ImageDraw.Draw(self.img)

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.img.putpixel((int(x), int(y)), c)

    def rect(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=c)

    def ell(self, x0, y0, x1, y1, c):
        self.d.ellipse([x0, y0, x1, y1], fill=c)

    def hline(self, x0, x1, y, c):
        self.d.line([x0, y, x1, y], fill=c)

    def vline(self, x, y0, y1, c):
        self.d.line([x, y0, x, y1], fill=c)


def add_outline(img: Image.Image, color) -> Image.Image:
    """Wrap the whole silhouette in a 1px outline (8-connected)."""
    w, h = img.size
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            # transparent pixel: paint if it touches any opaque neighbour
            touch = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] != 0:
                        touch = True
                        break
                if touch:
                    break
            if touch:
                dst[x, y] = color
    return out


def finish(cv: Canvas, outline, path: str):
    img = add_outline(cv.img, outline)
    img = img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    return img


# ---------------------------------------------------------------------------
# HERO — a young "word mage" who casts spells by reading. Faces RIGHT (toward
# the enemy). 46 x 58 native.
# ---------------------------------------------------------------------------
HW, HH = 46, 58


def hero_base(pose: str) -> Canvas:
    cv = Canvas(HW, HH)
    cx = 22

    # ---- legs & boots ----
    # slight stance; boots point right
    cv.rect(15, 44, 21, 52, P["pants"])       # left leg
    cv.rect(25, 44, 31, 52, P["pants"])       # right leg
    cv.rect(15, 50, 21, 51, P["pants_sh"])
    cv.rect(25, 50, 31, 51, P["pants_sh"])
    cv.rect(14, 52, 23, 55, P["boot"])        # left boot
    cv.rect(24, 52, 34, 55, P["boot"])        # right boot (toe forward)
    cv.rect(14, 55, 23, 55, P["boot_sh"])
    cv.rect(24, 55, 34, 55, P["boot_sh"])

    # ---- tunic / body ----
    cv.rect(12, 27, 32, 45, P["tunic"])
    cv.ell(11, 24, 33, 32, P["tunic"])        # rounded shoulders
    cv.rect(12, 41, 32, 45, P["tunic_sh"])    # hem shadow
    # lavender stripes across the chest (the classic sweater motif, our colours)
    cv.hline(12, 32, 33, P["stripe"])
    cv.hline(12, 32, 37, P["stripe"])
    cv.hline(12, 32, 34, P["tunic_sh"])
    cv.hline(12, 32, 38, P["tunic_sh"])

    # ---- head ----
    cv.ell(10, 6, 34, 28, P["skin"])          # face
    cv.rect(14, 25, 30, 28, P["skin_sh"])     # soft chin shade (subtle, low)

    # ---- hair: rounded dome, swept back, with a forelock ----
    cv.ell(7, 2, 37, 22, P["hair"])           # full hair mass
    cv.ell(11, 11, 33, 30, P["skin"])         # carve the face open again
    cv.rect(11, 12, 33, 13, P["skin"])        # flatten the hairline a touch
    cv.ell(8, 3, 36, 13, P["hair_sh"])        # top shade crescent
    cv.ell(9, 4, 35, 12, P["hair"])           # lit hair over the shade
    # side sweep flicking off the back (right)
    cv.px(34, 9, P["hair"]); cv.px(35, 10, P["hair"]); cv.px(36, 12, P["hair"])
    cv.px(35, 13, P["hair"]); cv.px(34, 15, P["hair"])
    # forelock dipping onto the forehead
    cv.px(15, 12, P["hair"]); cv.px(16, 13, P["hair"]); cv.px(17, 12, P["hair"])
    cv.px(18, 13, P["hair"]); cv.px(16, 14, P["hair"])

    # ---- face (facing right → features nudged right of centre) ----
    # eyes
    cv.rect(20, 15, 21, 18, P["eye"])
    cv.rect(27, 15, 28, 18, P["eye"])
    cv.px(20, 15, P["white"]); cv.px(27, 15, P["white"])
    # brows peeking under the forelock
    cv.px(19, 14, P["hair_sh"]); cv.px(28, 14, P["hair_sh"])
    # cheeks
    cv.px(18, 20, P["cheek"]); cv.px(19, 20, P["cheek"])
    cv.px(29, 20, P["cheek"]); cv.px(30, 20, P["cheek"])

    return cv


def hero_idle(path):
    cv = hero_base("idle")
    # calm smile
    cv.hline(22, 27, 21, P["mouth"])
    cv.px(21, 20, P["mouth"]); cv.px(28, 20, P["mouth"])
    # arms down; front (right) hand holds a closed book at the side
    cv.rect(9, 29, 13, 40, P["tunic"])        # back arm
    cv.rect(9, 38, 13, 40, P["tunic_sh"])
    cv.rect(31, 29, 35, 38, P["tunic"])       # front arm
    cv.rect(30, 36, 36, 39, P["skin"])        # hand
    # closed spellbook held out front, cover facing the enemy
    cv.rect(32, 33, 43, 46, P["book"])
    cv.rect(40, 33, 43, 46, P["book_sh"])     # spine edge / thickness
    cv.vline(34, 34, 45, P["page"])           # page block
    cv.px(37, 38, P["glow"]); cv.px(38, 40, P["glow"])  # faint rune on the cover
    finish(cv, HERO_OUTLINE, path)


def hero_attack(path):
    cv = hero_base("attack")
    # determined open mouth
    cv.rect(23, 20, 27, 22, P["mouth"])
    cv.rect(24, 21, 26, 22, (180, 90, 70, 255))
    # back arm braced low
    cv.rect(9, 30, 13, 41, P["tunic"])
    cv.rect(9, 39, 13, 41, P["tunic_sh"])
    # front arm thrust UP holding the open, glowing book
    cv.rect(30, 20, 34, 31, P["tunic"])       # raised upper arm
    cv.rect(31, 15, 35, 22, P["skin"])        # forearm/hand up
    # open spellbook above the hand
    cv.rect(28, 6, 42, 16, P["book"])
    cv.vline(35, 6, 16, P["book_sh"])         # spine
    cv.rect(29, 7, 34, 15, P["page"])         # left page
    cv.rect(36, 7, 41, 15, P["page"])         # right page
    # magic charging off the pages
    for (gx, gy) in [(35, 4), (33, 3), (37, 3), (35, 2), (31, 5), (39, 5)]:
        cv.px(gx, gy, P["glow"])
    cv.px(35, 1, P["glow2"]); cv.px(35, 5, P["glow2"])
    cv.rect(34, 9, 36, 13, P["glow"])         # glow between the pages
    finish(cv, HERO_OUTLINE, path)


def hero_cheer(path):
    cv = hero_base("cheer")
    # big happy smile + curved-up eyes
    cv.hline(21, 28, 21, P["mouth"])
    cv.px(20, 20, P["mouth"]); cv.px(29, 20, P["mouth"])
    cv.px(20, 17, P["skin_sh"]); cv.px(28, 17, P["skin_sh"])
    # both arms up
    cv.rect(6, 16, 11, 30, P["tunic"])        # back arm up
    cv.rect(6, 12, 11, 18, P["skin"])         # back hand
    cv.rect(33, 16, 38, 30, P["tunic"])       # front arm up
    cv.rect(33, 12, 38, 18, P["skin"])        # front hand
    # book raised triumphantly in the front hand, glowing
    cv.rect(31, 4, 41, 13, P["book"])
    cv.vline(36, 4, 13, P["book_sh"])
    cv.rect(32, 5, 35, 12, P["page"])
    cv.rect(37, 5, 40, 12, P["page"])
    for (gx, gy) in [(36, 2), (34, 1), (38, 1), (30, 4), (42, 4)]:
        cv.px(gx, gy, P["glow"])
    finish(cv, HERO_OUTLINE, path)


# ---------------------------------------------------------------------------
# ENEMY — the "Word Goblin": a chunky teal imp with big ears, glowing eyes and
# a fanged grin. Faces LEFT (toward the hero). 54 x 50 native. Idle only; the
# game tints it red and wobbles it on hits.
# ---------------------------------------------------------------------------
GW, GH = 54, 50


def goblin(path):
    cv = Canvas(GW, GH)
    cx = 27

    # ---- feet ----
    cv.rect(16, 42, 24, 47, G["body"])
    cv.rect(30, 42, 38, 47, G["body"])
    cv.rect(16, 46, 24, 47, G["body_sh"])
    cv.rect(30, 46, 38, 47, G["body_sh"])
    cv.px(15, 46, G["claw"]); cv.px(23, 46, G["claw"])
    cv.px(29, 46, G["claw"]); cv.px(37, 46, G["claw"])

    # ---- big pointed ears ----
    # left ear
    cv.d.polygon([(11, 20), (2, 6), (17, 15)], fill=G["body"])
    cv.d.polygon([(12, 19), (6, 10), (16, 16)], fill=G["ear_in"])
    # right ear
    cv.d.polygon([(43, 20), (52, 6), (37, 15)], fill=G["body"])
    cv.d.polygon([(42, 19), (48, 10), (38, 16)], fill=G["ear_in"])

    # ---- body / head (one rounded blob, chibi) ----
    cv.ell(9, 8, 45, 44, G["body"])
    cv.rect(9, 26, 45, 42, G["body"])
    cv.ell(9, 30, 45, 46, G["body"])
    # shading down the right side
    cv.ell(30, 10, 47, 44, G["body_sh"])
    cv.ell(10, 8, 44, 42, G["body"])          # restore front
    # belly patch
    cv.ell(17, 26, 37, 45, G["belly"])
    cv.ell(17, 34, 37, 46, G["belly_sh"])
    # a couple of darker spots for texture
    cv.px(14, 16, G["spot"]); cv.px(40, 20, G["spot"]); cv.px(12, 30, G["spot"])

    # ---- little arms ----
    cv.rect(6, 26, 11, 36, G["body"])
    cv.rect(43, 26, 48, 36, G["body"])
    cv.px(6, 36, G["claw"]); cv.px(8, 37, G["claw"]); cv.px(10, 36, G["claw"])
    cv.px(43, 36, G["claw"]); cv.px(45, 37, G["claw"]); cv.px(47, 36, G["claw"])

    # ---- small brow horns ----
    cv.d.polygon([(18, 10), (16, 3), (22, 9)], fill=G["horn"])
    cv.d.polygon([(36, 10), (38, 3), (32, 9)], fill=G["horn"])
    cv.px(17, 8, G["horn_sh"]); cv.px(37, 8, G["horn_sh"])

    # ---- big glowing eyes ----
    for ex in (19, 35):
        cv.ell(ex - 5, 14, ex + 5, 24, G["eye_glow"])
        cv.ell(ex - 4, 15, ex + 4, 23, G["eye_core"])
    # pupils drift toward the hero (left)
    cv.ell(15, 17, 19, 22, G["pupil"])
    cv.ell(31, 17, 35, 22, G["pupil"])
    cv.px(16, 18, G["eye_core"]); cv.px(32, 18, G["eye_core"])  # glints

    # ---- fanged grin ----
    cv.d.arc([16, 24, 38, 38], start=10, end=170, fill=G["mouth"], width=2)
    cv.rect(18, 30, 36, 33, G["mouth"])
    # fangs poking up
    cv.d.polygon([(21, 30), (23, 30), (22, 34)], fill=G["fang"])
    cv.d.polygon([(31, 30), (33, 30), (32, 34)], fill=G["fang"])

    finish(cv, GOBLIN_OUTLINE, path)


# ---------------------------------------------------------------------------
# ENEMY — "Ink Wraith": a FLOATING indigo specter. No legs; a drippy liquid
# body with hollow glowing eyes. Totally different silhouette from the goblin.
# Faces LEFT. 48 x 56 native.
# ---------------------------------------------------------------------------
def ink_wraith(path):
    cv = Canvas(48, 56)
    b, bl, bd = IW["ink"], IW["ink_lt"], IW["ink_dk"]

    # drippy tendrils hanging off the bottom (drawn first, behind the body)
    for tx, tip in [(13, 55), (24, 56), (35, 52)]:
        cv.d.polygon([(tx - 4, 34), (tx + 4, 34), (tx, tip)], fill=b)
        cv.ell(tx - 3, tip - 6, tx + 3, tip, b)

    # main body — a rounded blob of ink
    cv.ell(6, 4, 42, 42, b)
    cv.rect(6, 22, 42, 38, b)
    cv.ell(26, 6, 44, 42, bd)                 # right-side shade
    cv.ell(6, 4, 40, 40, b)                   # restore lit front
    cv.ell(11, 9, 27, 24, bl)                 # top-left highlight

    # hollow glowing eyes (facing left), angry inward slant
    for ex, off in [(17, 1), (30, -1)]:
        cv.ell(ex - 5, 15, ex + 5, 26, IW["glow"])
        cv.ell(ex - 3, 17, ex + 3, 24, IW["core"])
        cv.ell(ex - 2 + off, 19, ex + 1 + off, 23, IW["pupil"])
    # menacing brows slanting toward the centre
    cv.d.line([(12, 12), (21, 17)], fill=bd, width=2)
    cv.d.line([(35, 12), (26, 17)], fill=bd, width=2)
    # small jagged mouth
    cv.d.line([(19, 31), (22, 33)], fill=bd, width=1)
    cv.d.line([(22, 33), (25, 31)], fill=bd, width=1)
    cv.d.line([(25, 31), (28, 33)], fill=bd, width=1)
    # a few floating ink flecks
    cv.px(4, 20, bl); cv.px(44, 27, bl); cv.px(41, 12, b); cv.px(6, 33, b)

    finish(cv, IW_OUTLINE, path)


# ---------------------------------------------------------------------------
# ENEMY — "Bookworm Beetle": a SQUAT, WIDE bug with a hard chitin shell,
# mandibles, antennae and six little legs. Faces LEFT. 56 x 42 native.
# ---------------------------------------------------------------------------
def bookworm_beetle(path):
    cv = Canvas(56, 42)

    # six little legs (behind the shell)
    for lx in (18, 28, 38):
        cv.d.line([(lx, 30), (lx - 4, 40)], fill=BB["leg"], width=2)
        cv.d.line([(lx + 3, 30), (lx + 7, 40)], fill=BB["leg"], width=2)

    # carapace dome (hard chitin)
    cv.ell(12, 5, 52, 36, BB["shell"])
    cv.ell(12, 18, 52, 40, BB["shell"])
    cv.ell(31, 9, 52, 38, BB["shell_dk"])     # lower-right shade
    cv.ell(12, 5, 50, 34, BB["shell"])        # restore lit front
    cv.ell(18, 8, 33, 18, BB["shell_lt"])     # top-left gloss
    cv.vline(32, 7, 34, BB["shell_dk"])       # wing-case seam
    # a rune/letter glyph stamped on the shell (a chunky "T")
    cv.rect(36, 15, 45, 17, BB["rune"])
    cv.rect(39, 15, 41, 25, BB["rune"])

    # head at the left with eyes, mandibles, antennae (on top)
    cv.ell(3, 17, 16, 33, BB["head"])
    cv.d.polygon([(4, 22), (-2, 19), (4, 25)], fill=BB["mand"])
    cv.d.polygon([(4, 28), (-2, 31), (4, 25)], fill=BB["mand"])
    cv.d.line([(9, 17), (3, 7)], fill=BB["leg"], width=2); cv.px(2, 6, BB["eye"])
    cv.d.line([(13, 16), (13, 5)], fill=BB["leg"], width=2); cv.px(13, 4, BB["eye"])
    cv.ell(5, 21, 10, 26, BB["eye"]); cv.px(6, 22, BB["eye_dk"])
    cv.ell(9, 25, 13, 29, BB["eye"]); cv.px(10, 26, BB["eye_dk"])

    finish(cv, BB_OUTLINE, path)


# ---------------------------------------------------------------------------
# BOSS (level 10) — "Grimoire Golem": a HULKING stone guardian built around a
# giant spellbook, with a glowing arcane core, a stone head + crown, blocky
# fists, and floating rune glyphs orbiting it. Faces LEFT. 96 x 84 native —
# much bigger and bulkier than any regular enemy.
# ---------------------------------------------------------------------------
def grimoire_golem(path):
    cv = Canvas(96, 84)
    s, sd, sd2, sl = GG["stone"], GG["stone_dk"], GG["stone_dk2"], GG["stone_lt"]

    def block(x0, y0, x1, y1):
        """A stone block with a lit top edge and a shaded bottom/right."""
        cv.rect(x0, y0, x1, y1, s)
        cv.hline(x0, x1, y0, sl)
        cv.hline(x0, x1, y1, sd2)
        cv.vline(x1, y0, y1, sd)

    # legs + feet
    block(28, 62, 42, 82); block(54, 62, 68, 82)
    block(25, 78, 45, 83); block(51, 78, 71, 83)

    # big arms and fists on each side
    block(4, 30, 20, 56); block(1, 52, 23, 68)     # left arm + fist
    block(76, 30, 92, 56); block(73, 52, 95, 68)   # right arm + fist
    cv.rect(6, 58, 9, 66, sd2); cv.rect(84, 58, 87, 66, sd2)  # knuckle grooves

    # torso: the giant book
    block(14, 30, 82, 66)
    cv.rect(20, 34, 76, 62, sd)                     # inset cover
    # open pages forming a V, with a dark spine down the middle
    cv.d.polygon([(48, 36), (30, 38), (32, 60), (48, 58)], fill=GG["page"])
    cv.d.polygon([(48, 36), (66, 38), (64, 60), (48, 58)], fill=GG["page"])
    cv.d.polygon([(30, 38), (34, 40), (35, 58), (32, 60)], fill=GG["page_sh"])
    cv.d.polygon([(66, 38), (62, 40), (61, 58), (64, 60)], fill=GG["page_sh"])
    cv.vline(48, 36, 58, GG["page_sh"])
    # faint text lines on the pages
    for py in (43, 47, 51):
        cv.hline(34, 45, py, GG["page_sh"]); cv.hline(51, 62, py, GG["page_sh"])
    # arcane core blazing out of the spine
    cv.d.polygon([(48, 40), (54, 48), (48, 58), (42, 48)], fill=GG["violet"])
    cv.d.polygon([(48, 43), (52, 48), (48, 55), (44, 48)], fill=GG["glow"])
    cv.px(48, 48, GG["glow2"])
    for gy in (38, 60):
        cv.px(48, gy, GG["glow"])
    cv.px(40, 48, GG["glow"]); cv.px(56, 48, GG["glow"])

    # head block sitting on the book, with a jagged stone crown
    block(36, 12, 60, 32)
    for hx in (37, 43, 48, 53, 59):
        cv.d.polygon([(hx - 3, 12), (hx, 4), (hx + 3, 12)], fill=sl)
    cv.px(48, 6, GG["glow"])                        # gem in the crown
    # glowing eye slits (facing left)
    cv.rect(40, 20, 46, 23, GG["eye"]); cv.rect(50, 20, 56, 23, GG["eye"])
    cv.px(41, 21, GG["glow2"]); cv.px(51, 21, GG["glow2"])
    # cracks in the stone
    cv.d.line([(24, 44), (30, 52)], fill=sd2, width=1)
    cv.d.line([(70, 40), (74, 50)], fill=sd2, width=1)

    # floating rune glyphs orbiting the boss (its signature)
    for (rx, ry) in [(8, 12), (88, 18), (18, 4), (78, 6), (92, 40)]:
        cv.rect(rx - 1, ry - 1, rx + 1, ry + 1, GG["glow"])
        cv.px(rx, ry, GG["glow2"])

    finish(cv, GG_OUTLINE, path)


# ---------------------------------------------------------------------------
def preview():
    """Compose a single sheet so all sprites can be eyeballed together."""
    files = [
        f"{ROOT}/public/assets/player/idle.png",
        f"{ROOT}/public/assets/player/attack.png",
        f"{ROOT}/public/assets/player/cheer.png",
        f"{ROOT}/public/assets/enemy/word-goblin.png",
        f"{ROOT}/public/assets/enemy/ink-wraith.png",
        f"{ROOT}/public/assets/enemy/bookworm-beetle.png",
        f"{ROOT}/public/assets/enemy/grimoire-golem.png",
    ]
    imgs = [Image.open(f) for f in files]
    pad = 24
    bg = (20, 22, 30, 255)
    sheet_w = sum(i.width for i in imgs) + pad * (len(imgs) + 1)
    sheet_h = max(i.height for i in imgs) + pad * 2
    sheet = Image.new("RGBA", (sheet_w, sheet_h), bg)
    x = pad
    for i in imgs:
        sheet.alpha_composite(i, (x, sheet_h - pad - i.height))
        x += i.width + pad
    out = f"{ROOT}/tools/_sprite-preview.png"
    sheet.save(out)
    print("preview ->", out)


if __name__ == "__main__":
    hero_idle(f"{ROOT}/public/assets/player/idle.png")
    hero_attack(f"{ROOT}/public/assets/player/attack.png")
    hero_cheer(f"{ROOT}/public/assets/player/cheer.png")
    goblin(f"{ROOT}/public/assets/enemy/word-goblin.png")
    ink_wraith(f"{ROOT}/public/assets/enemy/ink-wraith.png")
    bookworm_beetle(f"{ROOT}/public/assets/enemy/bookworm-beetle.png")
    grimoire_golem(f"{ROOT}/public/assets/enemy/grimoire-golem.png")
    preview()
    print("done")
