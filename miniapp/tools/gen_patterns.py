# -*- coding: utf-8 -*-
"""生成主题涂鸦纹理（小动物花花草草）→ assets/patterns.ts
每套主题一张平铺瓦片：线稿风小猫/小兔/蝴蝶/小花/小草/太阳/爱心，低透明度
用法：python tools/gen_patterns.py（在 miniapp 目录下运行）
"""
import base64
import io
import math
import os

from PIL import Image, ImageDraw

TILE = 340
SS = 3
W = 3 * SS  # 线宽


def a(rgb, alpha=33):
    return (rgb[0], rgb[1], rgb[2], alpha)


# ==== 涂鸦元素（坐标为瓦片逻辑坐标，内部乘 SS） ====

def cat(d, x, y, r, c):
    s = SS
    x, y, r = x * s, y * s, r * s
    d.ellipse((x - r, y - r, x + r, y + r), outline=c, width=W)
    # 耳朵
    e = r * 0.62
    d.polygon([(x - r * 0.85, y - r * 0.45), (x - r * 0.45, y - r - e * 0.5), (x - r * 0.1, y - r * 0.82)], outline=c, width=W)
    d.polygon([(x + r * 0.85, y - r * 0.45), (x + r * 0.45, y - r - e * 0.5), (x + r * 0.1, y - r * 0.82)], outline=c, width=W)
    # 眼睛
    d.ellipse((x - r * 0.42 - 2 * s, y - 2 * s, x - r * 0.42 + 2 * s, y + 2 * s), fill=c)
    d.ellipse((x + r * 0.42 - 2 * s, y - 2 * s, x + r * 0.42 + 2 * s, y + 2 * s), fill=c)
    # 胡须
    for dy in (-3, 3):
        d.line((x - r - r * 0.5, y + dy * s, x - r * 1.05, y + dy * s * 0.6), fill=c, width=2 * s)
        d.line((x + r * 1.05, y + dy * s * 0.6, x + r + r * 0.5, y + dy * s), fill=c, width=2 * s)


def bunny(d, x, y, r, c):
    s = SS
    x, y, r = x * s, y * s, r * s
    d.ellipse((x - r, y - r, x + r, y + r), outline=c, width=W)
    # 长耳朵
    d.ellipse((x - r * 0.75, y - r * 2.4, x - r * 0.15, y - r * 0.7), outline=c, width=W)
    d.ellipse((x + r * 0.15, y - r * 2.4, x + r * 0.75, y - r * 0.7), outline=c, width=W)
    d.ellipse((x - r * 0.4 - 2 * s, y - 2 * s, x - r * 0.4 + 2 * s, y + 2 * s), fill=c)
    d.ellipse((x + r * 0.4 - 2 * s, y - 2 * s, x + r * 0.4 + 2 * s, y + 2 * s), fill=c)


def flower(d, x, y, r, c):
    """雏菊：中心点 + 6 片圆瓣"""
    s = SS
    x, y, r = x * s, y * s, r * s
    petal = r * 0.55
    for i in range(6):
        ang = math.pi / 3 * i
        px, py = x + math.cos(ang) * r, y + math.sin(ang) * r
        d.ellipse((px - petal, py - petal, px + petal, py + petal), outline=c, width=W)
    d.ellipse((x - r * 0.4, y - r * 0.4, x + r * 0.4, y + r * 0.4), fill=c)


def sprout(d, x, y, h, c):
    """小草芽：茎 + 两片叶"""
    s = SS
    x, y, h = x * s, y * s, h * s
    d.line((x, y, x, y - h), fill=c, width=W)
    d.arc((x - h * 0.9, y - h * 1.15, x, y - h * 0.25), start=270, end=60, fill=c, width=W)
    d.arc((x, y - h * 1.3, x + h * 0.9, y - h * 0.4), start=120, end=270, fill=c, width=W)


def butterfly(d, x, y, r, c):
    s = SS
    x, y, r = x * s, y * s, r * s
    d.line((x, y - r * 0.8, x, y + r * 0.8), fill=c, width=W)
    d.ellipse((x - r * 1.5, y - r, x - r * 0.15, y), outline=c, width=W)
    d.ellipse((x + r * 0.15, y - r, x + r * 1.5, y), outline=c, width=W)
    d.ellipse((x - r * 1.2, y + r * 0.05, x - r * 0.15, y + r * 0.85), outline=c, width=W)
    d.ellipse((x + r * 0.15, y + r * 0.05, x + r * 1.2, y + r * 0.85), outline=c, width=W)
    d.arc((x - r * 0.7, y - r * 1.5, x, y - r * 0.7), start=180, end=300, fill=c, width=2 * s)
    d.arc((x, y - r * 1.5, x + r * 0.7, y - r * 0.7), start=240, end=0, fill=c, width=2 * s)


def sun(d, x, y, r, c):
    s = SS
    x, y, r = x * s, y * s, r * s
    d.ellipse((x - r, y - r, x + r, y + r), outline=c, width=W)
    for i in range(8):
        ang = math.pi / 4 * i
        x1 = x + math.cos(ang) * r * 1.35
        y1 = y + math.sin(ang) * r * 1.35
        x2 = x + math.cos(ang) * r * 1.8
        y2 = y + math.sin(ang) * r * 1.8
        d.line((x1, y1, x2, y2), fill=c, width=W)


def heart(d, x, y, r, c):
    s = SS
    x, y, r = x * s, y * s, r * s
    d.arc((x - r, y - r, x, y), start=140, end=380, fill=c, width=W)
    d.arc((x, y - r, x + r, y), start=160, end=400, fill=c, width=W)
    d.line((x - r * 0.86, y - r * 0.10, x, y + r * 0.9), fill=c, width=W)
    d.line((x + r * 0.86, y - r * 0.10, x, y + r * 0.9), fill=c, width=W)


def sparkle(d, x, y, r, c):
    s = SS
    x, y, r = x * s, y * s, r * s
    d.line((x, y - r, x, y + r), fill=c, width=W)
    d.line((x - r, y, x + r, y), fill=c, width=W)


# ==== 主题palette（线稿色，含透明度） ====

THEMES = {
    'cream': [a((247, 148, 29)), a((255, 170, 60)), a((196, 154, 108))],
    'peach': [a((244, 114, 182)), a((255, 141, 161)), a((255, 189, 89))],
    'lavender': [a((155, 126, 245)), a((255, 158, 205)), a((126, 144, 245))],
    'sky': [a((78, 168, 255)), a((64, 201, 198)), a((140, 190, 255))],
    'green': [a((7, 193, 96), 28), a((255, 189, 89), 30), a((57, 217, 138), 28)],
}


def make_tile(colors) -> bytes:
    size = TILE * SS
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c1, c2, c3 = colors

    cat(d, 70, 78, 22, c1)
    flower(d, 210, 52, 13, c2)
    sprout(d, 300, 120, 26, c3)
    heart(d, 152, 148, 13, c2)
    butterfly(d, 258, 200, 16, c1)
    bunny(d, 78, 246, 18, c3)
    sun(d, 200, 300, 14, c2)
    sparkle(d, 300, 300, 8, c1)
    sparkle(d, 30, 170, 7, c2)
    flower(d, 150, 236, 9, c1)

    img = img.resize((TILE, TILE), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


BASES = {
    'cream': (255, 249, 242),
    'peach': (255, 247, 249),
    'lavender': (250, 248, 255),
    'sky': (245, 250, 255),
    'green': (244, 246, 245),
}


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    lines = [
        '/**',
        ' * 本文件由 tools/gen_patterns.py 生成，勿手改。',
        ' * 各主题的可爱涂鸦纹理瓦片（小猫/小兔/蝴蝶/花草），供背景平铺。',
        ' */',
        '',
        'export const patternBg: Record<string, string> = {',
    ]
    previews = []
    for theme_id, colors in THEMES.items():
        png = make_tile(colors)
        b64 = base64.b64encode(png).decode('ascii')
        print(f'{theme_id}: {len(png)} bytes')
        lines.append(f"  '{theme_id}': 'data:image/png;base64,{b64}',")
        # 预览
        tile = Image.open(io.BytesIO(png))
        pv = Image.new('RGB', (TILE * 2, TILE * 2), BASES[theme_id])
        for ox in (0, TILE):
            for oy in (0, TILE):
                pv.paste(tile, (ox, oy), tile)
        previews.append((theme_id, pv))
    lines.append('}')
    with open(os.path.join(out_dir, 'patterns.ts'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print('written: assets/patterns.ts')

    # 拼一张总预览
    board = Image.new('RGB', (TILE * 2 * len(previews), TILE * 2), (255, 255, 255))
    for i, (tid, pv) in enumerate(previews):
        board.paste(pv, (i * TILE * 2, 0))
    board.save(os.path.join(out_dir, 'patterns-preview.png'))
    print('preview: assets/patterns-preview.png')


if __name__ == '__main__':
    main()
