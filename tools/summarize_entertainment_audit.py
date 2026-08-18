import json
from pathlib import Path

for line in Path('/tmp/entertainment-first.jsonl').read_text(encoding='utf-8').splitlines():
    p = json.loads(line)
    print(f"{p['id']}\t{p['name']}\t{p['brand']}\t{p['dimensions']}\tgallery={p['images_count']}\t{p['image']}")
