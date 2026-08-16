import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAT = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)
BASELINES = {
    "fashion_jewelry": {"retail": 99.99, "sale": 49.99, "luxury": "$100-$1,000", "generic": "$15-$100", "sources": ["https://www.forbes.com/sites/forbes-personal-shopper/article/best-online-jewelry-store/", "https://www.nordstrom.com/browse/women/jewelry/necklaces/lariat-necklaces?filterByMaterial=14k-gold"]},
    "fine_jewelry": {"retail": 999.99, "sale": 399.99, "luxury": "$500-$6,500+", "generic": "$50-$300", "sources": ["https://www.forbes.com/sites/forbes-personal-shopper/article/best-online-jewelry-store/", "https://www.nordstrom.com/browse/women/jewelry/necklaces/lariat-necklaces?filterByMaterial=14k-gold"]},
    "bags_watches_shoes": {"retail": 299.99, "sale": 149.99, "luxury": "$300-$3,000", "generic": "$30-$200", "sources": ["https://www.nordstrom.com/", "https://www.walmart.com/"]},
    "fashion_accessories_apparel": {"retail": 99.99, "sale": 49.99, "luxury": "$100-$1,000", "generic": "$15-$100", "sources": ["https://www.nordstrom.com/", "https://www.walmart.com/"]},
    "parts_adapters": {"retail": 79.99, "sale": 29.99, "luxury": "$50-$200", "generic": "$10-$60", "sources": ["https://www.bestbuy.com/", "https://www.walmart.com/"]},
    "premium_electronics": {"retail": 999.99, "sale": 499.99, "luxury": "$1,000-$3,000", "generic": "$100-$800", "sources": ["https://openbrand.com/newsroom/blog/consumer-electronics-market-top-brands-retailers-retail-sales-data-trends", "https://www.bestbuy.com/"]},
    "small_electronics": {"retail": 199.99, "sale": 79.99, "luxury": "$150-$500", "generic": "$20-$100", "sources": ["https://openbrand.com/newsroom/blog/consumer-electronics-market-top-brands-retailers-retail-sales-data-trends", "https://www.bestbuy.com/"]},
    "major_appliances": {"retail": 1999.99, "sale": 999.99, "luxury": "$2,500-$8,500+", "generic": "$600-$2,000", "sources": ["https://auroracirc.com/collections/all-appliances", "https://www.standardtvandappliance.com/luxury-appliances"]},
    "small_appliances": {"retail": 499.99, "sale": 199.99, "luxury": "$400-$1,300", "generic": "$50-$300", "sources": ["https://auroracirc.com/collections/all-appliances", "https://www.bestbuy.com/"]},
    "collectibles": {"retail": 499.99, "sale": 199.99, "luxury": "$500-$3,000", "generic": "$50-$500", "sources": ["https://www.entertainmentearth.com/", "https://www.walmart.com/"]},
    "decor_prints_games": {"retail": 99.99, "sale": 49.99, "luxury": "$100-$500", "generic": "$15-$100", "sources": ["https://www.entertainmentearth.com/", "https://www.walmart.com/"]},
}

def choose(product):
    text = (str(product.get("name", "")) + " " + str(product.get("category", ""))).lower()
    if any(k in text for k in ["diamond", "14k", "18k", "gold", "platinum", "fine jewelry", "gemstone"]):
        return "fine_jewelry"
    if any(k in text for k in ["jewelry", "necklace", "earring", "bracelet", "ring", "pendant", "brooch"]):
        return "fashion_jewelry"
    if any(k in text for k in ["handbag", "purse", "wallet", "watch", "shoes", "shoe", "boots", "sneaker"]):
        return "bags_watches_shoes"
    if any(k in text for k in ["dress", "shirt", "jacket", "coat", "pants", "jeans", "apparel", "clothing", "scarf", "hat", "belt", "tie"]):
        return "fashion_accessories_apparel"
    if any(k in text for k in ["adapter", "cable", "charger", "replacement", "filter", "cartridge", "part", "battery"]):
        return "parts_adapters"
    if any(k in text for k in ["refrigerator", "freezer", "range", "oven", "washer", "dryer", "dishwasher", "cooktop", "stove", "hood", "wine cooler"]):
        return "major_appliances"
    if any(k in text for k in ["appliance", "blender", "mixer", "toaster", "coffee", "kettle", "iron", "vacuum", "air fryer", "knife"]):
        return "small_appliances"
    if any(k in text for k in ["diamond", "limited edition", "collectible", "statue", "sculpture", "figurine", "action figure", "comic", "trading card"]):
        return "collectibles"
    if any(k in text for k in ["laptop", "computer", "phone", "tablet", "camera", "printer", "monitor", "television", " tv ", "console"]):
        return "premium_electronics"
    if any(k in text for k in ["headphone", "headset", "speaker", "keyboard", "mouse", "webcam", "controller", "earbud", "bluetooth", "electronic"]):
        return "small_electronics"
    if any(k in text for k in ["toy", "game", "puzzle", "monopoly", "doll", "poster", "print", "wall art", "decor", "ornament", "candle", "sculpture"]):
        return "decor_prints_games"
    return "decor_prints_games"

updated = []
by_segment = Counter()
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = path.read_text(encoding="utf-8")
    match = PAT.search(text)
    if not match:
        continue
    products = json.loads("[" + match.group(1) + "]")
    dirty = False
    for product in products:
        pid = int(product.get("id", 0))
        if pid <= 180:
            continue
        try:
            retail = float(product.get("retail price"))
            sale = float(product.get("sale price"))
            has_valid_price = retail > 0 and sale > 0
        except (TypeError, ValueError):
            has_valid_price = False
        if has_valid_price:
            continue
        segment = choose(product)
        band = BASELINES[segment]
        product["retail price"] = band["retail"]
        product["sale price"] = band["sale"]
        product["price_currency"] = "USD"
        product["price_is_estimate"] = True
        product["price_estimate_type"] = "category-luxury-to-generic-baseline"
        product["price_estimate_segment"] = segment
        product["luxury_comparable_range"] = band["luxury"]
        product["generic_comparable_range"] = band["generic"]
        product["price_estimate_sources"] = band["sources"]
        product["price_estimate_note"] = "Category-level approximation selected by user; align landing page and checkout before treating as verified Merchant Center pricing."
        updated.append({"id": pid, "segment": segment, "retail_price": band["retail"], "sale_price": band["sale"]})
        by_segment[segment] += 1
        dirty = True
    if dirty:
        payload = json.dumps(products, ensure_ascii=False, separators=(",", ":"))
        path.write_text("// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(..." + payload + ");\n", encoding="utf-8")

report = {"policy": "Category-level luxury-to-generic baseline; $.99 endings; existing numeric prices preserved.", "updated_count": len(updated), "by_segment": dict(by_segment), "sample": updated[:100]}
(ROOT / "category-price-estimate-apply-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"updated_count": len(updated), "by_segment": dict(by_segment)}))
