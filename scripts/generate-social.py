"""Instagram / Facebook post images in the website's look.

For every product with a brochure (src/data/brochures.json): a square
1080 x 1080 feed post and a portrait 1080 x 1350 post, plus one square
"the range" post. Uses the website product art (public/products) and the
brand colours. Output goes to output/social (not committed); run manually
with the codex Python (Pillow).
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'src/data/brochures.json').read_text(encoding='utf-8'))
OUT = ROOT / 'output/social'
OUT.mkdir(parents=True, exist_ok=True)

INK, PAPER, LIME, FLARE, MUTED = '#191817', '#f2efe6', '#c6f24e', '#d52200', '#625f56'
FONTS = Path('C:/Windows/Fonts')
def font(name, size): return ImageFont.truetype(str(FONTS / name), size)
DISPLAY, BOLD, BODY = 'ARIALNB.TTF', 'arialbd.ttf', 'arial.ttf'
LOGO = Image.open(ROOT / 'public/og/logo.png').convert('RGBA')

# One short, supported fact per product for the lime stat chip.
STAT = {
    'octa-x-95-ethanol': '95% ETHANOL · 25 L / 210 L',
    'octa-m-methanol': '99.9% METHANOL · 25 L / 210 L',
    'octa-boost': '5 L TREATS 15-30 L OF 95',
    'octa-shot': '500 mL TREATS 50-250 L',
    'octa-torque': '500 mL TREATS 100 L DIESEL',
}

def fit(draw, text, name, max_size, width):
    size = max_size
    while size > 20 and draw.textlength(text, font=font(name, size)) > width:
        size -= 2
    return font(name, size)

def wrap(draw, text, f, width):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=f) <= width: line = trial
        else: lines.append(line); line = word
    return lines + [line] if line else lines

def frame(w, h, kicker):
    im = Image.new('RGB', (w, h), PAPER)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, 14], fill=LIME)
    logo = LOGO.resize((240, int(240 * LOGO.height / LOGO.width)))
    im.paste(logo, (64, 52), logo)
    f = font(BOLD, 24)
    d.text((w - 64, 78), kicker.upper(), font=f, fill=FLARE, anchor='ra')
    return im, d

def band(im, d, w, h):
    top = h - 150
    d.rectangle([0, top, w, h], fill=INK)
    d.rectangle([0, top, w, top + 8], fill=LIME)
    d.text((64, top + 40), 'ORDER: +27 64 507 3615', font=font(DISPLAY, 40), fill=PAPER)
    d.text((64, top + 92), 'octa-boost.com', font=font(BOLD, 26), fill=LIME)
    d.text((w - 64, top + 46), 'FUEL THE', font=font(DISPLAY, 34), fill=PAPER, anchor='ra')
    d.text((w - 64, top + 84), 'ADDICTION', font=font(DISPLAY, 34), fill=LIME, anchor='ra')

def art(im, d, slug, x, y, size):
    d.rectangle([x - 12, y - 12, x + size + 12, y + size + 12], fill=LIME)
    pic = Image.open(ROOT / f'public/products/{slug}.png').convert('RGBA').resize((size, size), Image.LANCZOS)
    im.paste(pic, (x, y), pic)

def chip(d, text, x, y, max_w):
    f = fit(d, text, DISPLAY, 40, max_w - 40)
    w = d.textlength(text, font=f) + 40
    d.rectangle([x, y, x + w, y + 64], fill=INK)
    d.text((x + 20, y + 32), text, font=f, fill=LIME, anchor='lm')

def square(b):
    w = h = 1080
    im, d = frame(w, h, b['kicker'])
    f = fit(d, b['name'], DISPLAY, 150, w - 128)
    d.text((64, 150), b['name'], font=f, fill=INK)
    size = 430
    art(im, d, b['slug'], w - 64 - size, 360, size)
    left = w - 128 - size - 40
    hf = font(BOLD, 40)
    y = 372
    for line in wrap(d, b['headline'], hf, left):
        d.text((64, y), line, font=hf, fill=INK); y += 50
    y += 18
    for item in b['pros'][:3]:
        d.rectangle([64, y + 12, 76, y + 24], fill=FLARE)
        for k, line in enumerate(wrap(d, item, font(BODY, 27), left - 30)):
            d.text((92, y + k * 34), line, font=font(BODY, 27), fill=INK)
        y += 34 * len(wrap(d, item, font(BODY, 27), left - 30)) + 12
    chip(d, STAT[b['slug']], 64, 820, w - 128)
    band(im, d, w, h)
    im.save(OUT / f"{b['slug']}-square.png")

def portrait(b):
    w, h = 1080, 1350
    im, d = frame(w, h, b['kicker'])
    f = fit(d, b['name'], DISPLAY, 160, w - 128)
    d.text((64, 150), b['name'], font=f, fill=INK)
    size = 560
    art(im, d, b['slug'], (w - size) // 2, 360, size)
    hf = font(BOLD, 42)
    y = 970
    for line in wrap(d, b['headline'], hf, w - 128):
        d.text((64, y), line, font=hf, fill=INK); y += 52
    chip(d, STAT[b['slug']], 64, y + 22, w - 128)
    band(im, d, w, h)
    im.save(OUT / f"{b['slug']}-portrait.png")

def range_post():
    w = h = 1080
    im, d = frame(w, h, 'Fuels & additives')
    d.text((64, 150), 'THE OCTA RANGE', font=fit(d, 'THE OCTA RANGE', DISPLAY, 140, w - 128), fill=INK)
    size, gap = 240, 40
    for i, b in enumerate(DATA[:5]):
        col, row = (i % 3, i // 3)
        x = (w - 3 * size - 2 * gap) // 2 + col * (size + gap) + ((size + gap) // 2 if row else 0)
        y = 310 + row * (size + 70)
        pic = Image.open(ROOT / f"public/products/{b['slug']}.png").convert('RGBA').resize((size, size), Image.LANCZOS)
        d.rectangle([x - 6, y - 6, x + size + 6, y + size + 6], fill=LIME)
        im.paste(pic, (x, y), pic)
        d.text((x, y + size + 14), b['name'], font=font(DISPLAY, 30), fill=INK)
    band(im, d, w, h)
    im.save(OUT / 'octa-range-square.png')

for b in DATA:
    square(b); portrait(b)
range_post()
print('\n'.join(sorted(p.name for p in OUT.glob('*.png'))))
