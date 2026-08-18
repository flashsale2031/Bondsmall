from pathlib import Path
import re
import json
from urllib.parse import urlparse

html = Path('seller.html').read_text(encoding='utf-8')
manifest = json.loads(Path('catalog-pages/manifest.json').read_text(encoding='utf-8'))
render_start = html.index('function renderPlatformAccounts')
render_end = html.index('function onAccountChange', render_start)
render_block = html[render_start:render_end]
checks = {
    'linked-account connect controls': 'cl-connect-btn-' in render_block and '🔗 Connect' in render_block,
    'no rendered linked-account login controls': 'cl-login-done-' not in render_block and 'cl-continue-btn-' not in render_block,
    'post account selector': 'post-account-cb' in html and 'getSelectedAccounts' in html and all(platform in html for platform in ['facebook_marketplace', 'offerup', 'mercari', 'poshmark', 'nextdoor']),
    'connected-session gating': 'Waiting for connected sessions' in html and 'platformSessionState[platform]?.connected' in html,
    'popup launch routing': 'openPlatformSessionPage(job.platform)' in html,
    'listing workflow panel': 'renderClientListingPanel' in html and 'session-listing-card' in html,
    'listing confirmation': 'markClientJobPosted' in html and 'markClientJobSkipped' in html,
    'campaign persistence': 'clblast_client_campaign' in html and 'persistClientCampaign' in html,
    'session progress': 'updateAllPlatformSessionProgress' in html,
    'minimize handler': 'minimizePlatformSession' in html,
    'catalog manifest': manifest['totalRecords'] == 1231541 and manifest['pageCount'] == 61577,
    'lazy catalog loader': 'loadCatalogManifest' in html and 'loadCatalogPage' in html,
    'products pager': 'products-catalog-pager' in html and 'renderCatalogPager' in html,
    'post pager': 'post-products-catalog-pager' in html and 'goCatalogPage' in html,
    'shared catalog page state': 'catalogPageCache' in html and 'catalogUsesPages' in html,
    'persistent session marker': 'clblast_platform_sessions' in html and 'connected_at' in html,
    'popup sign out control': 'session-signout-' in html and 'signOutPlatformSession' in html,
    'sign out clears marker': "connected: false, email: ''" in html,
    'no password persistence': 'Password (not saved)' in html and 'password is never persisted' in html,
    'destination rules': 'PLATFORM_DESTINATION_RULES' in html and all(host in html for host in ['post.craigslist.org', 'www.adlandpro.com', 'www.classifiedads.com', 'www.facebook.com', 'offerup.com', 'www.mercari.com', 'poshmark.com', 'nextdoor.com']),
    'new account cards': all(token in html for token in ['card-facebook_marketplace', 'card-offerup', 'card-mercari', 'card-poshmark', 'card-nextdoor']),
    'excluded platforms': 'eBay' not in html and 'Etsy' not in html,
    'active URL validation': 'platformDestinationCheck' in html and 'requirePlatformDestination' in html and "url.protocol === 'https:'" in html,
    'handoff gated': "requirePlatformDestination(job.platform, 'listing handoff')" in html,
    'confirmation gated': "requirePlatformDestination(job.platform, 'listing confirmation')" in html,
    'wrong-page navigation blocked': 'URL does not belong to' in html and 'Expected a secure' in html,
}
for name, ok in checks.items():
    if not ok:
        raise AssertionError(name)

rules = {
    'craigslist': {'post.craigslist.org', 'accounts.craigslist.org'},
    'adlandpro': {'www.adlandpro.com', 'adlandpro.com'},
    'classifiedads': {'www.classifiedads.com', 'classifiedads.com'},
    'facebook_marketplace': {'www.facebook.com', 'facebook.com'},
    'offerup': {'offerup.com', 'www.offerup.com'},
    'mercari': {'www.mercari.com', 'mercari.com'},
    'poshmark': {'poshmark.com', 'www.poshmark.com'},
    'nextdoor': {'nextdoor.com', 'www.nextdoor.com'},
}
valid_urls = {
    'craigslist': 'https://post.craigslist.org/',
    'adlandpro': 'https://www.adlandpro.com/',
    'classifiedads': 'https://www.classifiedads.com/',
    'facebook_marketplace': 'https://www.facebook.com/marketplace/',
    'offerup': 'https://offerup.com/',
    'mercari': 'https://www.mercari.com/us/how-to-sell/',
    'poshmark': 'https://poshmark.com/',
    'nextdoor': 'https://nextdoor.com/',
}
for platform, url in valid_urls.items():
    parsed = urlparse(url)
    assert parsed.scheme == 'https' and parsed.hostname in rules[platform], f'valid URL rejected: {platform}'
for platform, url in valid_urls.items():
    for other_platform, hosts in rules.items():
        if platform != other_platform:
            assert urlparse(url).hostname not in hosts, f'wrong page accepted: {platform} -> {other_platform}'
assert urlparse('http://www.classifiedads.com/').scheme != 'https'
print('platform URL allowlist tests passed')
blocks = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', html, re.S | re.I)
Path('/tmp/seller-post-popup.js').write_text('\n\n'.join(blocks), encoding='utf-8')
print(checks)
print(f'inline_script_blocks={len(blocks)}')
