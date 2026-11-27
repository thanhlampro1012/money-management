"""Render the code-native wallet mark as opaque, antialiased home-screen icons.

Run with Python and Pillow: python scripts/generate-icons.py
The browser uses the generated PNG files; Pillow is not a runtime dependency.
"""
from pathlib import Path
from PIL import Image, ImageDraw

SCALE = 4
GREEN, IVORY, GOLD = '#13705c', '#f7f4e9', '#ebc97c'
im = Image.new('RGB', (512 * SCALE, 512 * SCALE), GREEN)
draw = ImageDraw.Draw(im)

def box(values):
    return tuple(round(v * SCALE) for v in values)

def line(points, fill, width):
    scaled = [(round(x * SCALE), round(y * SCALE)) for x, y in points]
    draw.line(scaled, fill=fill, width=width * SCALE, joint='curve')
    radius = width / 2
    for x, y in (points[0], points[-1]):
        draw.ellipse(box((x-radius, y-radius, x+radius, y+radius)), fill=fill)

draw.ellipse(box((230, 124, 336, 230)), fill=GOLD)
# A deliberately simple engraved coin, legible at home-screen sizes.
draw.arc(box((263, 151, 302, 182)), 75, 290, fill=GREEN, width=9*SCALE)
draw.arc(box((264, 177, 303, 208)), 255, 110, fill=GREEN, width=9*SCALE)
line([(283, 144), (283, 213)], GREEN, 9)
draw.rounded_rectangle(box((126, 195, 350, 250)), radius=21*SCALE, fill=IVORY)
draw.rounded_rectangle(box((126, 219, 390, 376)), radius=26*SCALE, fill=IVORY)
line([(148, 229), (348, 229)], GREEN, 9)
draw.rounded_rectangle(box((305, 264, 390, 329)), radius=15*SCALE, fill=GREEN)
draw.ellipse(box((324, 286, 344, 306)), fill=IVORY)

destination = Path(__file__).resolve().parents[1] / 'dist' / 'icons'
destination.mkdir(parents=True, exist_ok=True)
for filename, size in (
    ('apple-touch-icon.png', 180), ('icon-192.png', 192),
    ('icon-512.png', 512), ('maskable-512.png', 512),
):
    im.resize((size, size), Image.Resampling.LANCZOS).save(destination / filename, optimize=True)
    print(f'{filename}: {size} × {size}, opaque RGB')
