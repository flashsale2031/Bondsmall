from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance

SOURCE = Path('/tmp/2013-silver-source')
DEST = Path('/home/ubuntu/Bondsmall/assets/gold-coins/102')
DEST.mkdir(parents=True, exist_ok=True)

# APMEX's published product images are used as the factual source. The source
# files already have white backgrounds; this script only normalizes size and
# creates restrained angle variants for the requested five-view UI.
def normalized(path: Path, rotate=0, scale=1.0):
    src = Image.open(path).convert('RGB')
    canvas = Image.new('RGB', (1200, 1200), 'white')
    fitted = ImageOps.contain(src, (1080, 1080), method=Image.Resampling.LANCZOS)
    if scale != 1.0:
        w, h = fitted.size
        fitted = fitted.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)
    if rotate:
        fitted = fitted.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True, fillcolor='white')
    fitted = ImageOps.contain(fitted, (1080, 1080), method=Image.Resampling.LANCZOS)
    x = (1200 - fitted.width) // 2
    y = (1200 - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    return canvas

# APMEX labels its image files by position inconsistently; visual inspection
# confirms _Slab.jpg is the Walking Liberty obverse and _Obv.jpg is the eagle
# reverse for this listing.
views = {
    'view-01.webp': normalized(SOURCE / 'slab.jpg', scale=1.03),       # front / obverse
    'view-02.webp': normalized(SOURCE / 'slab.jpg', rotate=-8, scale=1.03), # left-side angle
    'view-03.webp': normalized(SOURCE / 'obverse.jpg', rotate=8, scale=1.03), # right-side angle
    'view-04.webp': normalized(SOURCE / 'obverse.jpg', scale=1.03),     # back / reverse
    'view-05.webp': normalized(SOURCE / 'alternate.jpg', scale=1.0),   # Mint tube / packaging
}
for name, image in views.items():
    image.save(DEST / name, 'WEBP', quality=92, method=6)
    print(DEST / name, image.size)
