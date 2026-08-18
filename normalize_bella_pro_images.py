from pathlib import Path
from PIL import Image

for name in ('246-bella-pro-air-fryer-1.jpg', '246-bella-pro-air-fryer-4.jpg'):
    path = Path('assets/manufacturer-images') / name
    with Image.open(path) as image:
        image.convert('RGB').save(path, format='JPEG', quality=94, optimize=True)
        print(f'converted={path}')
