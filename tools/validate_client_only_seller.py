from pathlib import Path
import re

html = Path('seller.html').read_text(encoding='utf-8')
checks = {
    'client-only mode': 'const CLIENT_ONLY_MODE = true;' in html,
    'handoff payload': 'buildClientHandoffPayload' in html,
    'download bundle': 'downloadClientHandoff' in html,
    'destination handoff': 'clientPlatformUrl' in html,
    'no offline hard stop in client mode': 'if (!serverOnline && !CLIENT_ONLY_MODE)' in html,
    'server fallback retained': 'submitJobToServer' in html,
}
for name, ok in checks.items():
    if not ok:
        raise AssertionError(name)
blocks = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', html, re.S | re.I)
Path('/tmp/seller-client-only.js').write_text('\n\n'.join(blocks), encoding='utf-8')
print(checks)
print(f'inline_script_blocks={len(blocks)}')
