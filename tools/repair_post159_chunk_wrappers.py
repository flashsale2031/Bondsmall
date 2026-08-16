from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
fixed=[]
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    text=path.read_text(encoding='utf-8')
    if text.rstrip().endswith(']]);'):
        text=text.rstrip()[:-4]+']);\n'
        path.write_text(text,encoding='utf-8'); fixed.append(path.name)
print({'fixed_chunks':len(fixed),'chunks':fixed})
