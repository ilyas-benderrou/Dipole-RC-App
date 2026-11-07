"""Convertit les illustrations générées (scripts/.cache/*.png) en WebP < 200 Ko dans public/images/.

    python scripts/process-images.py

Le fond blanc uni est rendu transparent pour les illustrations posées sur une bannière (toutes sauf hero-lab).
Nécessite Pillow (pip install pillow).
"""
import os
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', '.cache')
OUT = os.path.join(ROOT, 'public', 'images')
OPAQUE = {'hero-lab'}
WIDTHS = {'hero-lab': 1200, 'banner-3d': 720, 'trophy': 560, 'empty-lab': 520, 'capacitor': 520}


def remove_white_background(im: Image.Image, tol: int = 18) -> Image.Image:
    """Remplit depuis les bords les pixels presque blancs et les rend transparents."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque([(x, y) for x in (0, w - 1) for y in range(h)] + [(x, y) for y in (0, h - 1) for x in range(w)])
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b, a = px[x, y]
        if min(r, g, b) < 255 - tol:
            continue
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                q.append((nx, ny))
    return im


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for f in sorted(os.listdir(CACHE)):
        if not f.endswith('.png'):
            continue
        name = f[:-4]
        im = Image.open(os.path.join(CACHE, f))
        if name not in OPAQUE:
            im = remove_white_background(im)
        width = WIDTHS.get(name, 640)
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        dst = os.path.join(OUT, f'{name}.webp')
        quality = 82
        while True:
            im.save(dst, 'WEBP', quality=quality, method=6)
            if os.path.getsize(dst) < 200 * 1024 or quality <= 40:
                break
            quality -= 8
        print(f'{dst} : {os.path.getsize(dst) // 1024} Ko')


if __name__ == '__main__':
    main()
