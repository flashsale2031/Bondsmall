#!/usr/bin/env python3
"""Generate Google Merchant Center assets from the site's products.js catalog."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
DOMAIN = "https://www.bondsmall.com"
PRODUCTS_JS = ROOT / "products.js"

CATEGORY_MAP = {
    "men": "Apparel & Accessories > Clothing",
    "women": "Apparel & Accessories > Clothing",
    "accessories": "Apparel & Accessories > Clothing Accessories",
    "artandcollectibles": "Arts & Entertainment > Hobbies & Creative Arts > Collectibles",
    "electronics": "Electronics",
    "entertainment": "Arts & Entertainment",
    "homeandappliances": "Home & Garden",
    "jewelry": "Apparel & Accessories > Jewelry",
}


def load_products() -> list[dict]:
    source = PRODUCTS_JS.read_text(encoding="utf-8")
    source = re.sub(r"^\s*var\s+products\s*=\s*", "", source, count=1)
    source = re.sub(r";\s*$", "", source)
    products = json.loads(source)
    if not isinstance(products, list):
        raise ValueError("products.js must contain an array")
    return products


def text(value: object, fallback: str = "") -> str:
    return str(value or fallback).strip()


def product_id(product: dict, index: int) -> str:
    raw = text(product.get("sku")) or f"BM-{int(product.get('id', index)):04d}"
    return re.sub(r"[^A-Za-z0-9._-]", "-", raw)[:50]


def title(product: dict) -> str:
    return text(product.get("name") or product.get("title"), "Bonds Mall product")[:150]


def description(product: dict) -> str:
    value = re.sub(r"\\s+", " ", text(product.get("description"), title(product)))
    return value[:5000]


def image_list(product: dict) -> list[str]:
    values = product.get("images") or product.get("image") or []
    if isinstance(values, str):
        values = [values]
    result = []
    for value in values:
        url = text(value)
        if url.startswith("//"):
            url = "https:" + url
        if url.startswith(("http://", "https://")) and url not in result:
            result.append(url)
    return result


def price(product: dict) -> float:
    return float(product.get("retail price") or product.get("price") or 0)


def sale_price(product: dict) -> float | None:
    raw = product.get("sale price")
    if raw in (None, ""):
        return None
    value = float(raw)
    return value if value > 0 and value < price(product) else None


def availability(product: dict) -> str:
    inventory = product.get("inventory")
    if inventory is not None and float(inventory) <= 0:
        return "out of stock"
    return "in stock"


def brand(product: dict) -> str:
    specs = product.get("specifications") or {}
    return text(specs.get("brand"), "Unbranded")


def xml(value: object) -> str:
    return html.escape(text(value), quote=False)


def make_feed(products: list[dict]) -> str:
    items = []
    for index, product in enumerate(products, 1):
        if product.get("price_pending") or product.get("merchant_ready") is False:
            continue
        pid = product_id(product, index)
        images = image_list(product)
        if not images:
            continue
        landing = f"{DOMAIN}/product.html?id={quote(pid)}"
        sale = sale_price(product)
        tags = [
            f"<g:id>{xml(pid)}</g:id>",
            f"<g:title>{xml(title(product))}</g:title>",
            f"<g:description>{xml(description(product))}</g:description>",
            f"<link>{xml(landing)}</link>",
            f"<g:image_link>{xml(images[0])}</g:image_link>",
            *[f"<g:additional_image_link>{xml(url)}</g:additional_image_link>" for url in images[1:10]],
            f"<g:availability>{availability(product)}</g:availability>",
            f"<g:condition>{text(product.get('condition'), 'new').lower()}</g:condition>",
            f"<g:price>{price(product):.2f} USD</g:price>",
            *([f"<g:sale_price>{sale:.2f} USD</g:sale_price>"] if sale is not None else []),
            f"<g:brand>{xml(brand(product))}</g:brand>",
            f"<g:product_type>{xml(text(product.get('productType') or product.get('category'), 'General'))}</g:product_type>",
            f"<g:google_product_category>{xml(CATEGORY_MAP.get(text(product.get('category')).lower(), 'Shopping > General'))}</g:google_product_category>",
            f"<g:identifier_exists>no</g:identifier_exists>",
        ]
        specs = product.get("specifications") or {}
        if specs.get("color_options"):
            tags.append(f"<g:color>{xml(specs['color_options'])}</g:color>")
        if product.get("gender"):
            tags.append(f"<g:gender>{xml(product['gender']).lower()}</g:gender>")
        if product.get("age_group"):
            tags.append(f"<g:age_group>{xml(product['age_group']).lower()}</g:age_group>")
        items.append("    <item>\n      " + "\n      ".join(tags) + "\n    </item>")
    return """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Bonds Mall product feed</title>
    <link>https://www.bondsmall.com/</link>
    <description>Product data for Bonds Mall</description>
%s
  </channel>
</rss>
""" % "\n".join(items)


def make_sitemap(products: list[dict]) -> str:
    urls = [f"{DOMAIN}/", f"{DOMAIN}/shipping-policy.html", f"{DOMAIN}/return-policy.html", f"{DOMAIN}/contact.html", f"{DOMAIN}/privacy-policy.html", f"{DOMAIN}/terms.html"]
    for index, product in enumerate(products, 1):
        if image_list(product) and not product.get("price_pending") and product.get("merchant_ready") is not False:
            urls.append(f"{DOMAIN}/product.html?id={quote(product_id(product, index))}")
    body = "\n".join(f"  <url><loc>{html.escape(url)}</loc></url>" for url in urls)
    return f"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{body}\n</urlset>\n"


def main() -> None:
    products = load_products()
    (ROOT / "google-shopping-feed.xml").write_text(make_feed(products), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(make_sitemap(products), encoding="utf-8")
    report = {
        "catalog_products": len(products),
        "feed_products": sum(bool(image_list(p)) for p in products),
        "products_without_images": [product_id(p, i) for i, p in enumerate(products, 1) if not image_list(p)],
        "products_pending_price_or_store_url": [product_id(p, i) for i, p in enumerate(products, 1) if p.get("price_pending") or p.get("merchant_ready") is False],
        "products_without_brand": [product_id(p, i) for i, p in enumerate(products, 1) if brand(p) == "Unbranded"],
        "products_without_gtin_or_mpn": [product_id(p, i) for i, p in enumerate(products, 1) if not (p.get("gtin") or p.get("mpn"))],
        "note": "Do not claim authenticity, ownership, availability, shipping cost, or product identifiers unless verified by the merchant.",
    }
    (ROOT / "merchant-feed-validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
