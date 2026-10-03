#!/usr/bin/env python3
"""Build local, white-background gold-coin gallery assets and localize products.js.

The authoritative gold-coin records live in products.js. This script reads the
existing product image sources, downloads/decodes them once during the build,
places each view on a white canvas, writes optimized WebP files under
assets/gold-coins/<id>/, and replaces the product's runtime image URLs with
same-origin local paths. Products with no verified image source are left
untouched rather than fabricating photography.
"""
from __future__ import annotations

import base64
import io
import json
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import cairosvg

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
PRODUCTS = ROOT / "products.js"
OUT = ROOT / "assets" / "gold-coins"
SOURCE_MANIFEST = ROOT / "gold-coin-source-images.json"
REMOTE_SOURCE_MANIFEST = "https://raw.githubusercontent.com/flashsale2031/Bondsmall/main/gold-coin-source-images.json"
UA = "BondsMall-GoldCoinAssetBuilder/1.0"
TIMEOUT = 8
MAX_WORKERS = 12


def load_source(value: str) -> Image.Image:
    if not value:
        raise ValueError("empty image source")

    is_svg = False
    if value.startswith("data:image/"):
        header, payload = value.split(",", 1)
        is_svg = header.startswith("data:image/svg+xml")
        raw = (
            base64.b64decode(payload)
            if ";base64" in header
            else urllib.parse.unquote_to_bytes(payload)
        )
    elif value.startswith(("http://", "https://")):
        req = urllib.request.Request(
            value,
            headers={
                "User-Agent": UA,
                "Accept": "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
            },
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            raw = response.read()
        content_type = response.headers.get("Content-Type", "")
        is_svg = "svg" in content_type.lower()
    else:
        # Catalog runtime paths may be root-relative ("/assets/...") or
        # repository-relative ("assets/..."). Normalize both to the checkout.
        path = ROOT / value.lstrip("/")
        if not path.exists():
            raise FileNotFoundError(value)
        raw = path.read_bytes()
        is_svg = path.suffix.lower() == ".svg"

    if is_svg:
        png = cairosvg.svg2png(bytestring=raw, output_width=1200, output_height=1200)
        return Image.open(io.BytesIO(png)).convert("RGBA")
    return Image.open(io.BytesIO(raw)).convert("RGBA")

def normalize(img: Image.Image, size: int = 1200) -> Image.Image:
    img = ImageOps.exif_transpose(img)
    img.thumbnail((size - 80, size - 80), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (size, size), "white")
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    canvas.paste(img, (x, y), img if img.mode == "RGBA" else None)
    return canvas


def is_gold_coin(product: dict) -> bool:
    name = str(product.get("name") or "").lower()
    category = str(product.get("category") or "").lower()
    return "gold coin" in name or ("gold" in name and category == "artandcollectibles")


def local_path(product_id: int, view: int) -> str:
    return f"assets/gold-coins/{product_id}/view-{view:02d}.webp"


def main() -> None:
    text = PRODUCTS.read_text(encoding="utf-8")
    start = text.find("[")
    # products.js is emitted as `window.products = [...]` and may end with
    # either `];` or a bare `]`; accept both forms so the asset job cannot
    # fail merely because a formatter removed the trailing semicolon.
    end = text.rfind("]")
    if start < 0 or end < start:
        raise RuntimeError("products.js does not contain the expected array")
    products = json.loads(text[start : end + 1])

    source_manifest = {}
    manifest_text = None
    if SOURCE_MANIFEST.exists():
        manifest_text = SOURCE_MANIFEST.read_text(encoding="utf-8")
    else:
        try:
            with urllib.request.urlopen(REMOTE_SOURCE_MANIFEST, timeout=TIMEOUT) as response:
                manifest_text = response.read().decode("utf-8")
        except Exception as exc:
            print(f"WARN source manifest could not be loaded locally or remotely: {exc}")
    if manifest_text:
        try:
            manifest = json.loads(manifest_text)
            source_manifest = manifest.get("products") or {}
        except Exception as exc:
            print(f"WARN source manifest is invalid: {exc}")

    generated = []
    skipped = []

    for product in products:
        if not isinstance(product, dict) or not is_gold_coin(product):
            continue

        product_id = int(product["id"])
        # Prefer the immutable pre-localization source manifest. This is
        # important because products.js is rewritten to local asset paths after
        # generation; without the manifest a later rebuild would normalize the
        # already-generated WebP files instead of the original source photography.
        manifest_entry = source_manifest.get(str(product_id), {})
        sources = [
            source for source in (manifest_entry.get("sources") or [])
            if isinstance(source, str) and source
        ]

        if not sources:
            main_source = product.get("image")
            if isinstance(main_source, list):
                main_source = main_source[0] if main_source else ""
            if isinstance(main_source, str) and main_source:
                sources.append(main_source)

            for source in product.get("images") or []:
                if isinstance(source, str) and source:
                    sources.append(source)

        if not sources:
            skipped.append(product_id)
            continue

        unique_sources = []
        for source in sources:
            if source not in unique_sources:
                unique_sources.append(source)
            if len(unique_sources) == 5:
                break

        target = OUT / str(product_id)
        target.mkdir(parents=True, exist_ok=True)

        rendered = [None] * len(unique_sources)
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            jobs = {
                pool.submit(load_source, source): index
                for index, source in enumerate(unique_sources, 1)
            }
            for future in as_completed(jobs):
                index = jobs[future]
                try:
                    rendered[index - 1] = normalize(future.result())
                except Exception as exc:
                    print(f"WARN id={product_id} source={index}: {exc}")
        rendered = [image for image in rendered if image is not None]

        if not rendered:
            skipped.append(product_id)
            continue

        while len(rendered) < 5:
            rendered.append(rendered[0].copy())

        paths = []
        for index, image in enumerate(rendered[:5], 1):
            path = target / f"view-{index:02d}.webp"
            image.save(path, "WEBP", quality=88, method=6)
            paths.append(local_path(product_id, index))

        product["image"] = paths[0]
        product["images"] = paths
        product["image_note"] = (
            "Bonds Mall local white-background product photography generated "
            "from catalog source images; runtime does not depend on external image hosts."
        )
        product["image_quality_status"] = "Local Bonds Mall generated asset"
        generated.append(product_id)

    PRODUCTS.write_text(
        "window.products = "
        + json.dumps(products, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"generated": generated, "skipped": skipped, "count": len(generated)}, indent=2))


if __name__ == "__main__":
    main()
