from __future__ import annotations
import gzip, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Retail benchmark is rounded upward to a commercial .99 price; sale benchmark is rounded
# downward to a commercial .99 price. Evidence count is the number of usable comparable
# offers after excluding clear variant, pack-size, and currency mismatches.
PRICES = {
  1809: {'retail': 279.99, 'sale': 279.99, 'count': 1, 'confidence': 'low', 'note': 'Exact Tobin Sports Canyon Pro offer; one numeric comparable.'},
  1810: {'retail': 5.99, 'sale': 4.99, 'count': 2, 'confidence': 'medium-low', 'note': 'Pearl Milling syrup offers with size normalization; two usable numeric comparables.'},
  1811: {'retail': 39.99, 'sale': 32.99, 'count': 1, 'confidence': 'low', 'note': 'Exact Polare AirTag-slot holder official offer.'},
  1813: {'retail': 789.99, 'sale': 369.99, 'count': 4, 'confidence': 'medium-high', 'note': 'Four exact Sioux SSD10P7S retailer offers; max/min benchmark rule.'},
  1814: {'retail': 529.99, 'sale': 189.99, 'count': 3, 'confidence': 'medium', 'note': 'Three TOP2A antibody offers; size/application normalization remains limited.'},
  1817: {'retail': 19.99, 'sale': 12.99, 'count': 3, 'confidence': 'medium-low', 'note': 'Three whitening-foam comparable offers; GUATONG exact-brand offer not independently priced.'},
  1818: {'retail': 4899.99, 'sale': 4899.99, 'count': 4, 'confidence': 'medium-high', 'note': 'Four exact Pitch Pro 8121 offers clustered around $4,900.'},
  1821: {'retail': 14.99, 'sale': 10.99, 'count': 1, 'confidence': 'low', 'note': 'One exact BEZTAT 30mm 15-pack numeric offer; other results lacked price or differed in tip/pack.'},
  1823: {'retail': 18.99, 'sale': 6.99, 'count': 4, 'confidence': 'medium', 'note': 'Four flag-belt comparable offers; max/min benchmark rule.'},
  1824: {'retail': 409.99, 'sale': 59.99, 'count': 2, 'confidence': 'low', 'note': 'Two numeric 82–89 Camaro temperature-gauge offers; fit/cluster variation remains.'},
  1828: {'retail': 109.99, 'sale': 73.99, 'count': 4, 'confidence': 'medium-high', 'note': 'Four Turning Point Hub Kit 715 offers; max/min benchmark rule.'},
  1831: {'retail': 99.99, 'sale': 89.99, 'count': 2, 'confidence': 'low', 'note': 'Two numeric passive tilt-turn aluminum-window offers; dimensions/configuration not fully specified.'},
  1835: {'retail': 9.99, 'sale': 6.99, 'count': 3, 'confidence': 'medium', 'note': 'Three exact Meguiar G13616 16oz offers; max/min benchmark rule.'},
  1836: {'retail': 89.99, 'sale': 89.99, 'count': 1, 'confidence': 'low', 'note': 'One comparable OFFNOVA electric binding-machine offer; exact model confirmation limited.'},
  1837: {'retail': 13.99, 'sale': 4.99, 'count': 4, 'confidence': 'medium-low', 'note': 'Four exact DryLine 0.2 x 335-inch offers; pack-size normalization required.'},
  1838: {'retail': 21.99, 'sale': 9.99, 'count': 3, 'confidence': 'medium-low', 'note': 'Three comparable six-pack walking/cane-tip offers; fit and material vary.'},
}
# Deliberately excluded from price changes because no defensible USD comparable was found:
# 1826 Captain Cook (EUR-only), 1829 absent from page, 1830 Xiaomi model/currency mismatch.

changed=[]
for path in sorted((ROOT / 'catalog-pages').glob('products-page-*.json.gz')):
    with gzip.open(path, 'rt', encoding='utf-8') as stream: records=json.load(stream)
    dirty=False
    for p in records:
        pid=int(p.get('id',-1))
        if pid not in PRICES: continue
        cfg=PRICES[pid]
        old=(p.get('retail price'),p.get('sale price'))
        p['retail price']=cfg['retail']; p['sale price']=cfg['sale']
        p['price_pending']=False
        p['pricing_confidence']=cfg['confidence']
        p['pricing_comparable_count']=cfg['count']
        p['pricing_method']='tiered-competitive-max-retail-min-sale-rounded-99'
        p['pricing_note']=cfg['note']
        dirty=True
        changed.append({'id':pid,'name':p.get('name'),'old_retail':old[0],'old_sale':old[1],'new_retail':cfg['retail'],'new_sale':cfg['sale'],'comparable_count':cfg['count'],'confidence':cfg['confidence']})
    if dirty:
        tmp=path.with_suffix(path.suffix+'.tmp')
        with gzip.open(tmp,'wt',encoding='utf-8',compresslevel=9) as stream: json.dump(records,stream,ensure_ascii=False,separators=(',',':'))
        tmp.replace(path)
report={'policy':'4 competitors preferred, then 3, 2, 1; explicit confidence labels; USD/variant mismatches excluded','products_repriced':len(changed),'products_with_no_supported_change':[1822,1825,1826,1830],'records':changed}
(ROOT/'accessories-page10-tiered-pricing-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
