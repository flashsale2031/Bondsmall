import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "catalog-category-index.js"
text = path.read_text(encoding="utf-8")
start = text.find("{")
end = text.rfind("}")
index = json.loads(text[start : end + 1])
categories = index.get("categories", index)
entry = categories.get("entertainment", {})
chunks = entry.get("chunks", [])
print(json.dumps({"count": entry.get("count"), "chunk_count": len(chunks), "first_chunks": chunks[:12], "last_chunks": chunks[-12:]}, indent=2))
