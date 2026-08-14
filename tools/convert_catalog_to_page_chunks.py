import json
import os
import re
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SOURCE = REPO / 'catalog-parts'
OUTPUT = REPO / 'catalog-pages'
PAGE_SIZE = 20
EXPECTED_PARTS = 1232
EXPECTED_RECORDS = 1_231_539
EXPECTED_PAGES = 61_577

OUTPUT.mkdir(exist_ok=True)
existing = sorted(OUTPUT.glob('products-page-*.js'))
resume_records = len(existing) * PAGE_SIZE
page_number = len(existing) + 1
written_records = resume_records
seen_records = 0
page_records = []


def extract_objects(text):
    marker = 'window.products.push('
    cursor = 0
    while True:
        start_marker = text.find(marker, cursor)
        if start_marker < 0:
            return
        start = text.find('{', start_marker + len(marker))
        if start < 0:
            raise ValueError('push call without object')
        depth = 0
        in_string = False
        escaped = False
        quote = ''
        for i in range(start, len(text)):
            ch = text[i]
            if in_string:
                if escaped:
                    escaped = False
                elif ch == '\\':
                    escaped = True
                elif ch == quote:
                    in_string = False
                continue
            if ch in "'\"":
                in_string = True
                quote = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    raw = text[start:i + 1]
                    yield json.loads(raw)
                    cursor = i + 1
                    break
        else:
            raise ValueError('unterminated object')


def flush():
    global page_records, page_number
    if not page_records:
        return
    out = OUTPUT / f'products-page-{page_number:05d}.js'
    out.write_text(
        '// Bondsmall page-sized catalog chunk %d\nwindow.products = window.products || [];\nwindow.products.push(...%s);\n'
        % (page_number, json.dumps(page_records, separators=(',', ':'), ensure_ascii=False)),
        encoding='utf-8',
    )
    page_records = []
    page_number += 1

files = sorted(SOURCE.glob('products-part-*.js'))
if len(files) != EXPECTED_PARTS:
    raise RuntimeError(f'Expected {EXPECTED_PARTS} source chunks, found {len(files)}')

for part_no, file in enumerate(files, 1):
    text = file.read_text(encoding='utf-8')
    for record in extract_objects(text):
        if seen_records < resume_records:
            seen_records += 1
            continue
        seen_records += 1
        page_records.append(record)
        written_records += 1
        if len(page_records) == PAGE_SIZE:
            flush()
    del text
    if part_no % 100 == 0:
        print(f'processed {part_no}/{len(files)} source chunks; seen {seen_records}; pages {page_number - 1}', flush=True)
flush()

page_count = page_number - 1
manifest = {
    'totalRecords': written_records,
    'pageSize': PAGE_SIZE,
    'pageCount': page_count,
    'sourceParts': len(files),
    'firstPage': 'products-page-00001.js',
    'lastPage': f'products-page-{page_count:05d}.js',
}
(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps(manifest), flush=True)
if seen_records != EXPECTED_RECORDS:
    raise RuntimeError(f'Expected to see {EXPECTED_RECORDS}, saw {seen_records}')
if written_records != EXPECTED_RECORDS:
    raise RuntimeError(f'Expected to write {EXPECTED_RECORDS}, wrote {written_records}')
if page_count != EXPECTED_PAGES:
    raise RuntimeError(f'Expected {EXPECTED_PAGES} pages, wrote {page_count}')
