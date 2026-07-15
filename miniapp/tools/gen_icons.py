# -*- coding: utf-8 -*-
"""生成小程序图标：logo.png（App 头像）+ tabBar 四组图标（灰/品牌色两态）
用法：python tools/gen_icons.py（在 miniapp 目录下运行）
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
BRAND = (78, 110, 245)      # #4E6EF5
BRAND2 = (122, 90, 248)     # #7A5AF8
GRAY = (156, 163, 175)      # #9CA3AF
GOLD = (255, 201, 77)       # #FFC94D
GOLD_DARK = (244, 169, 37)

SS = 4  # 超采样倍数


def gradient(w, h, c1, c2):
    """对角线性渐变：低分辨率插值后放大，够平滑"""
    base = Image.new("RGB", (64, 64))
    px = base.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))
    return base.resize((w, h), Image.BILINEAR)


def rounded_mask(w, h, radius):
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    return mask


def make_logo():
    size = 512 * SS
    img = gradient(size, size, BRAND, BRAND2).convert("RGBA")
    draw = ImageDraw.Draw(img)
    s = SS  # 512 坐标系 → 画布坐标

    white = (255, 255, 255, 255)
    # 麦克风胶囊
    draw.rounded_rectangle((196 * s, 96 * s, 316 * s, 292 * s), radius=60 * s, fill=white)
    # 拾音架（下半圆弧）
    draw.arc((156 * s, 120 * s, 356 * s, 344 * s), start=15, end=165, fill=white, width=26 * s)
    # 立杆与底座
    draw.rounded_rectangle((244 * s, 336 * s, 268 * s, 396 * s), radius=12 * s, fill=white)
    draw.rounded_rectangle((186 * s, 396 * s, 326 * s, 422 * s), radius=13 * s, fill=white)
    # 金币（记账属性）
    cx, cy, r = 368 * s, 372 * s, 78 * s
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GOLD, outline=GOLD_DARK, width=10 * s)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 96 * s)
    except OSError:
        font = ImageFont.load_default()
    draw.text((cx, cy - 4 * s), "¥", font=font, fill=(138, 90, 0), anchor="mm")

    # 圆角裁切
    mask = rounded_mask(size, size, 115 * s)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    out.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "logo.png"))
    print("logo.png")


def icon_canvas():
    return Image.new("RGBA", (324, 324), (0, 0, 0, 0))


def draw_list(color):
    img = icon_canvas()
    d = ImageDraw.Draw(img)
    for y, w in ((64, 220), (147, 220), (230, 136)):
        d.rounded_rectangle((52, y, 52 + w, y + 30), radius=15, fill=color)
    d.ellipse((236, 230, 266, 260), fill=color)
    return img


def draw_budget(color):
    img = icon_canvas()
    d = ImageDraw.Draw(img)
    # 仪表盘：开口圆环 + 指针
    d.arc((56, 56, 268, 268), start=120, end=60, fill=color, width=28)
    d.line((162, 162, 226, 110), fill=color, width=22)
    d.ellipse((142, 142, 182, 182), fill=color)
    return img


def draw_assets(color):
    img = icon_canvas()
    d = ImageDraw.Draw(img)
    # 银行：山形屋顶 + 三根柱 + 底座
    d.polygon([(162, 36), (44, 108), (280, 108)], outline=color, width=22)
    for x in (72, 149, 226):
        d.rounded_rectangle((x, 136, x + 26, 240), radius=13, fill=color)
    d.rounded_rectangle((44, 262, 280, 292), radius=15, fill=color)
    return img


def draw_stats(color):
    img = icon_canvas()
    d = ImageDraw.Draw(img)
    # 饼图：圆环 + 抽离的四分之一
    d.arc((52, 52, 272, 272), start=5, end=275, fill=color, width=28)
    d.pieslice((80, 80, 244, 244), start=285, end=355, fill=color)
    return img


def make_tabbar():
    shapes = {"list": draw_list, "budget": draw_budget, "assets": draw_assets, "stats": draw_stats}
    for name, fn in shapes.items():
        fn(GRAY).resize((81, 81), Image.LANCZOS).save(os.path.join(OUT, f"{name}.png"))
        fn(BRAND).resize((81, 81), Image.LANCZOS).save(os.path.join(OUT, f"{name}-active.png"))
        print(f"{name}.png / {name}-active.png")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    make_logo()
    make_tabbar()
    print("done")
