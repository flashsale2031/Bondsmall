from pathlib import Path
p=Path(__file__).resolve().parents[1]/'catalog-pages/products-page-00112.js'
s=p.read_text(encoding='utf-8')
if s.rstrip().endswith(']]);'):
    s=s.rstrip()[:-4]+']);\n'
elif not s.rstrip().endswith(']);'):
    raise SystemExit('unexpected wrapper ending')
p.write_text(s,encoding='utf-8')
print(p)
