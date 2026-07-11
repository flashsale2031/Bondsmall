# Windows cp1252 fix -- must be first thing that runs
import sys

"""
craigslist.py -- CLBlast Craigslist automation
LOCAL PC VERSION (Windows) -- Fixed for Chrome 149 / undetected-chromedriver crash

ROOT FIX: Chrome crashes immediately on Windows with undetected-chromedriver when:
  1. uc.Chrome() is passed options that conflict with uc's internal patching
  2. version_main mismatch causes uc to download wrong chromedriver
  3. --single-process flag crashes Chrome on Windows (Linux-only flag)
  4. headless=new conflicts with uc's headless handling on Windows

FIXES APPLIED:
  1. Removed --single-process (crashes Chrome on Windows)
  2. undetected-chromedriver: pass version_main correctly, no headless param
  3. use_headed = True always on Windows (no Xvfb needed)
  4. Fallback to stock webdriver.Chrome if uc fails
  5. complete_images_step: s=editimage -> s=images (image upload fix)
  6. Edit page deadline: 15s -> 35s
  7. City dropdown: two-step click logic from Railway version
"""

import re
import time
import json
import os
import random
import shutil
import subprocess
import threading
import tempfile
import urllib.request
import requests
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

try:
    from twocaptcha import TwoCaptcha
    CAPTCHA_SOLVER_AVAILABLE = True
except ImportError:
    CAPTCHA_SOLVER_AVAILABLE = False

TWO_CAPTCHA_API_KEY = ""
LISTINGS_JSON       = "posted_listings.json"
GMAIL_EMAIL    = ""
GMAIL_PASSWORD = ""
CL_PASSWORD    = ""
_cl_logged_in: bool = False
CL_CITY        = ""
CL_ZIP         = ""
CL_SUBAREA     = ""
IS_FAST_MODE   = True

JOB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clb_job.json")

def _load_job():
    """Read the per-run job config that the server writes (clb_job.json).
    Contains email, password, gmail_app_password, two_captcha_key, city,
    zip_code, city_name/state/subarea and the chosen products. No env vars."""
    try:
        if os.path.exists(JOB_FILE):
            with open(JOB_FILE, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                return data
    except Exception as e:
        print(f"  [job] Could not read clb_job.json: {e}")
    return {}

def _load_account_data():
    """Load first saved CL account from accounts.json directly."""
    accounts_json = os.path.join(os.path.dirname(os.path.abspath(__file__)), "accounts.json")
    try:
        with open(accounts_json, encoding="utf-8") as f:
            data = json.load(f)
        accounts = data.get("craigslist", [])
        for acc in accounts:
            if acc.get("isSaved") and acc.get("email") and acc.get("password"):
                return acc
        if accounts:
            return accounts[0]
    except Exception as e:
        print(f"  [accounts] Could not load accounts.json: {e}")
    return {}

# On Windows local PC, IS_RAILWAY is always False
IS_RAILWAY = (
    bool(os.environ.get("RAILWAY_ENVIRONMENT")) or
    bool(os.environ.get("RAILWAY_SERVICE_NAME")) or
    any(os.path.exists(p) for p in ["/usr/bin/chromium", "/usr/bin/chromium-browser"])
)

CATEGORY_MAPPING = {
    "antiques": (1, "antiques"), "appliances": (2, "appliances"),
    "art": (3, "arts & crafts"), "paintings": (3, "arts & crafts"),
    "atvs": (4, None), "automotive": (5, "auto parts"), "auto parts": (5, "auto parts"),
    "tires": (6, "auto wheels & tires"), "boats": (13, "boats"),
    "books": (14, "books & magazines"), "business": (15, "business/commercial"),
    "cars": (16, "cars & trucks"), "trucks": (16, "cars & trucks"),
    "phones": (18, "cell phones"), "cell phones": (18, "cell phones"),
    "fashion": (19, "clothing & accessories"),
    "collectibles": (20, "collectibles"), "coins": (20, "collectibles"),
    "computers": (22, "computers"), "laptops": (22, "computers"),
    "electronics": (23, "electronics"), "cameras": (23, "electronics"),
    "furniture": (26, "furniture"),
    "miscellaneous": (28, "general for sale"),
    "health": (29, "health and beauty"), "beauty": (29, "health and beauty"),
    "household": (31, "household items"),
    "jewelry": (32, "jewelry"), "watches": (32, "jewelry"),
    "motorcycles": (35, "motorcycles/scooters"),
    "instruments": (36, "musical instruments"),
    "sports": (39, "sporting goods"), "sporting goods": (39, "sporting goods"),
    "tickets": (40, "tickets"), "tools": (41, "tools"),
    "toys": (42, "toys & games"), "video games": (44, "video gaming"),
    "men": (19, "clothing & accessories"), "women": (19, "clothing & accessories"),
    "accessories": (19, "clothing & accessories"),
    "artandcollectibles": (20, "collectibles"),
    "art and collectibles": (20, "collectibles"),
    "homeandappliances": (31, "household items"),
    "home and appliances": (31, "household items"),
    "entertainment": (44, "video gaming"),
}

def get_category_ul_value(category_name):
    key = category_name.lower().strip().replace(" ", "")
    for k in CATEGORY_MAPPING:
        if k.replace(" ", "") == key:
            return CATEGORY_MAPPING[k][0]
    key_spaced = category_name.lower().strip()
    for k in CATEGORY_MAPPING:
        if k in key_spaced or key_spaced in k:
            return CATEGORY_MAPPING[k][0]
    return CATEGORY_MAPPING["miscellaneous"][0]

posted_listings: dict = {}
_listings_lock = threading.Lock()

def _load_existing_listings():
    global posted_listings
    if not os.path.exists(LISTINGS_JSON):
        return
    try:
        with open(LISTINGS_JSON) as f:
            data = json.load(f)
        for k, v in data.items():
            if k not in posted_listings:
                entry = dict(v)
                try:
                    entry["post_time"] = datetime.fromisoformat(v["post_time"])
                except Exception:
                    entry["post_time"] = datetime.now()
                posted_listings[k] = entry
        print(f"  Loaded {len(data)} existing listing(s) from disk.")
    except Exception as e:
        print(f"  Could not load existing listings: {e}")

def _save_listings():
    serialisable = {}
    for k, v in posted_listings.items():
        entry = dict(v)
        pt = v["post_time"]
        entry["post_time"] = pt.isoformat() if isinstance(pt, datetime) else str(pt)
        serialisable[k] = entry
    tmp_path = LISTINGS_JSON + ".tmp"
    with _listings_lock:
        with open(tmp_path, "w") as f:
            json.dump(serialisable, f, indent=2)
        os.replace(tmp_path, LISTINGS_JSON)

def _find_binary(names, fallback_paths):
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    for name in names:
        try:
            r = subprocess.run(["where", name], capture_output=True, text=True, timeout=3)
            p = r.stdout.strip().split("\n")[0].strip()
            if p and os.path.exists(p):
                return p
        except Exception:
            pass
    for p in fallback_paths:
        if os.path.exists(p):
            return p
    return None

def _ensure_xvfb():
    # No Xvfb on Windows -- skip entirely
    pass

_FINGERPRINTS = [
    {
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Safari/537.36",
        "platform": "Win32", "vendor": "Google Inc.", "lang": "en-US",
        "screen": (1920, 1080), "tz": "America/Los_Angeles",
    },
    {
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.122 Safari/537.36",
        "platform": "Win32", "vendor": "Google Inc.", "lang": "en-US",
        "screen": (1366, 768), "tz": "America/New_York",
    },
    {
        "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Safari/537.36",
        "platform": "MacIntel", "vendor": "Google Inc.", "lang": "en-US",
        "screen": (2560, 1600), "tz": "America/Chicago",
    },
]

_FINGERPRINT_JS = """
(function() {{
    Object.defineProperty(navigator, 'webdriver',   {{get: () => undefined}});
    Object.defineProperty(navigator, 'platform',    {{get: () => '{platform}'}});
    Object.defineProperty(navigator, 'vendor',      {{get: () => '{vendor}'}});
    Object.defineProperty(navigator, 'language',    {{get: () => '{lang}'}});
    Object.defineProperty(navigator, 'languages',   {{get: () => ['{lang}', 'en']}});
    Object.defineProperty(navigator, 'hardwareConcurrency', {{get: () => 8}});
    Object.defineProperty(navigator, 'deviceMemory',        {{get: () => 8}});
    Object.defineProperty(navigator, 'maxTouchPoints',      {{get: () => 0}});
    Object.defineProperty(screen, 'width',       {{get: () => {sw}}});
    Object.defineProperty(screen, 'height',      {{get: () => {sh}}});
    Object.defineProperty(screen, 'availWidth',  {{get: () => {sw}}});
    Object.defineProperty(screen, 'availHeight', {{get: () => {sh} - 40}});
    Object.defineProperty(screen, 'colorDepth',  {{get: () => 24}});
    Object.defineProperty(screen, 'pixelDepth',  {{get: () => 24}});
    if (!window.chrome) {{
        window.chrome = {{
            app: {{}},
            runtime: {{
                onConnect: {{addListener: function(){{}}}},
                onMessage: {{addListener: function(){{}}}}
            }},
        }};
    }}
    const getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(p) {{
        if (p === 37445) return 'Intel Inc.';
        if (p === 37446) return 'Intel Iris OpenGL Engine';
        return getParam.call(this, p);
    }};
}})();
"""

_GEO_URL_PATTERNS = [
    "suggest", "postal", "geo", "location", "zip", "area",
    "geoCode", "geocode", "postcode",
]

def _start_cdp_network_capture(driver):
    driver._cl_geo_responses = []
    driver._cl_network_request_map = {}
    try:
        driver.execute_cdp_cmd("Network.enable", {})
        print("  [CDP] Network capture enabled")
    except Exception as e:
        print(f"  [CDP] Could not enable Network domain: {e}")
        return

    _NETWORK_SPY_JS = """
(function() {
    if (window._clNetworkSpyInstalled) return 'already-installed';
    window._clNetworkSpyInstalled = true;
    window._clCapturedGeoResponses = [];
    window._clAllNetworkCalls = [];
    var GEO_PATTERNS = ['suggest','postal','geo','location','zip','area','geocode','postcode'];
    function looksLikeGeo(url) {
        if (!url) return false;
        var u = url.toLowerCase();
        for (var i = 0; i < GEO_PATTERNS.length; i++) {
            if (u.indexOf(GEO_PATTERNS[i]) !== -1) return true;
        }
        return false;
    }
    var OrigXHR = window.XMLHttpRequest;
    function SpyXHR() {
        var xhr = new OrigXHR();
        var _url = '', _method = '';
        var origOpen = xhr.open.bind(xhr);
        var origSend = xhr.send.bind(xhr);
        xhr.open = function(method, url) { _method = method; _url = url || ''; return origOpen(method, url); };
        xhr.send = function(body) {
            var captureUrl = _url;
            var origRSC = xhr.onreadystatechange;
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    var entry = { type: 'xhr', url: captureUrl, status: xhr.status, responseText: xhr.responseText || '' };
                    window._clAllNetworkCalls.push(entry);
                    if (looksLikeGeo(captureUrl)) { window._clCapturedGeoResponses.push(entry); window._clLastGeoResponse = entry; }
                }
                if (origRSC) origRSC.apply(this, arguments);
            };
            return origSend(body);
        };
        return xhr;
    }
    for (var k in OrigXHR) { try { SpyXHR[k] = OrigXHR[k]; } catch(e) {} }
    SpyXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = SpyXHR;
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        var p = origFetch.apply(this, arguments);
        p.then(function(resp) {
            resp.clone().text().then(function(text) {
                var entry = { type: 'fetch', url: url, status: resp.status, responseText: text || '' };
                window._clAllNetworkCalls.push(entry);
                if (looksLikeGeo(url)) { window._clCapturedGeoResponses.push(entry); window._clLastGeoResponse = entry; }
            }).catch(function(){});
        }).catch(function(){});
        return p;
    };
    return 'spy-installed';
})();
"""
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",
                               {"source": _NETWORK_SPY_JS})
        print("  [CDP] Network spy script registered for new documents")
    except Exception as e:
        print(f"  [CDP] Could not register network spy: {e}")


def _install_network_spy_now(driver):
    _NETWORK_SPY_JS = """
(function() {
    if (window._clNetworkSpyInstalled) return 'already-installed';
    window._clNetworkSpyInstalled = true;
    window._clCapturedGeoResponses = [];
    window._clAllNetworkCalls = [];
    var GEO_PATTERNS = ['suggest','postal','geo','location','zip','area','geocode','postcode'];
    function looksLikeGeo(url) {
        if (!url) return false;
        var u = url.toLowerCase();
        for (var i = 0; i < GEO_PATTERNS.length; i++) {
            if (u.indexOf(GEO_PATTERNS[i]) !== -1) return true;
        }
        return false;
    }
    var OrigXHR = window.XMLHttpRequest;
    function SpyXHR() {
        var xhr = new OrigXHR();
        var _url = '', _method = '';
        var origOpen = xhr.open.bind(xhr);
        var origSend = xhr.send.bind(xhr);
        xhr.open = function(method, url) { _method = method; _url = url || ''; return origOpen(method, url); };
        xhr.send = function(body) {
            var captureUrl = _url;
            var origRSC = xhr.onreadystatechange;
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    var entry = { type: 'xhr', url: captureUrl, status: xhr.status, responseText: xhr.responseText || '' };
                    window._clAllNetworkCalls.push(entry);
                    if (looksLikeGeo(captureUrl)) { window._clCapturedGeoResponses.push(entry); window._clLastGeoResponse = entry; }
                }
                if (origRSC) origRSC.apply(this, arguments);
            };
            return origSend(body);
        };
        return xhr;
    }
    for (var k in OrigXHR) { try { SpyXHR[k] = OrigXHR[k]; } catch(e) {} }
    SpyXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = SpyXHR;
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        var p = origFetch.apply(this, arguments);
        p.then(function(resp) {
            resp.clone().text().then(function(text) {
                var entry = { type: 'fetch', url: url, status: resp.status, responseText: text || '' };
                window._clAllNetworkCalls.push(entry);
                if (looksLikeGeo(url)) { window._clCapturedGeoResponses.push(entry); window._clLastGeoResponse = entry; }
            }).catch(function(){});
        }).catch(function(){});
        return p;
    };
    return 'spy-installed';
})();
"""
    result = driver.execute_script(_NETWORK_SPY_JS)
    print(f"  [CDP] Network spy (live install): {result}")


def _get_geo_responses(driver):
    try:
        responses = driver.execute_script("return window._clCapturedGeoResponses || [];")
        all_calls = driver.execute_script("return (window._clAllNetworkCalls || []).slice(-20);")
        return responses, all_calls
    except Exception:
        return [], []


def _inject_geo_hidden_fields(driver, geo_response_text, zip_str):
    if not geo_response_text:
        return False
    injected = {}
    try:
        data = json.loads(geo_response_text)
        if isinstance(data, list) and data:
            data = data[0]
        if isinstance(data, dict):
            for key, val in data.items():
                if isinstance(val, (str, int, float)) and val:
                    injected[key] = str(val)
    except Exception:
        pass
    if not injected:
        print("  [GEO] Response parsed but no injectable fields found")
        return False
    print(f"  [GEO] Injecting fields from geo response: {list(injected.keys())}")
    inject_js = """
(function(fields) {
    var form = document.getElementById('postingForm');
    if (!form) return {ok: false, reason: 'no-form'};
    var injected = [];
    for (var name in fields) {
        var val = fields[name];
        var existing = form.querySelector('[name="' + name + '"]');
        if (existing) {
            var old = existing.value;
            existing.value = val;
            existing.setAttribute('value', val);
            injected.push('updated:' + name + '=' + val + '(was:' + old + ')');
        } else {
            var inp = document.createElement('input');
            inp.type = 'hidden';
            inp.name = name;
            inp.value = val;
            form.appendChild(inp);
            injected.push('added:' + name + '=' + val);
        }
    }
    return {ok: true, injected: injected};
})(arguments[0]);
"""
    result = driver.execute_script(inject_js, injected)
    print(f"  [GEO] Injection result: {result}")
    return bool(result and result.get("ok"))


def _fetch_cl_geo_direct(driver, zip_str, city="Los Angeles", state="CA"):
    cookies = {}
    try:
        for cookie in driver.get_cookies():
            cookies[cookie["name"]] = cookie["value"]
    except Exception as e:
        print(f"  [GEO-direct] Could not get cookies: {e}")
    headers = {
        "User-Agent": driver.execute_script("return navigator.userAgent;"),
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": driver.current_url,
        "Origin": "https://post.craigslist.org",
    }
    city_slug = CL_CITY.lower().replace(" ", "").replace("-", "")
    candidate_urls = [
        f"https://post.craigslist.org/suggest?fieldname=postal&typing={zip_str}",
        f"https://{city_slug}.craigslist.org/suggest?fieldname=postal&typing={zip_str}",
        f"https://post.craigslist.org/suggest?fieldname=postal_code&typing={zip_str}",
        f"https://post.craigslist.org/geo?q={zip_str}",
        f"https://{city_slug}.craigslist.org/geo?q={zip_str}",
        f"https://post.craigslist.org/c/sss?s=geo&q={zip_str}",
    ]
    for url in candidate_urls:
        try:
            resp = requests.get(url, headers=headers, cookies=cookies, timeout=8, allow_redirects=True)
            print(f"  [GEO-direct] {url} -> {resp.status_code} ({len(resp.text)} bytes)")
            if resp.status_code == 200 and resp.text.strip():
                print(f"  [GEO-direct] Response: {resp.text[:300]}")
                return resp.text, url
        except Exception as e:
            print(f"  [GEO-direct] {url} failed: {e}")
    print("  [GEO-direct] No successful geo response from any endpoint")
    return None, None


def _trigger_real_geo_lookup(driver, zip_str):
    trigger_js = """
(function(zipVal) {
    var postalEl = document.querySelector('[name="postal"]') ||
                   document.querySelector('[name="postal_code"]') ||
                   document.querySelector('#postal_code') ||
                   document.querySelector('#postal');
    if (!postalEl || !window.jQuery) return {ok: false, reason: 'no-postal-or-jquery'};
    var jq = jQuery(postalEl);
    var acData = jq.data('ui-autocomplete') || jq.data('autocomplete');
    if (!acData || !acData.options || !acData.options.source)
        return {ok: false, reason: 'no-autocomplete-instance'};
    var sourceFn = acData.options.source;
    if (typeof sourceFn !== 'function')
        return {ok: false, reason: 'source-not-function'};
    window._clGeoLookupTriggered = false;
    window._clGeoLookupResponse = null;
    try {
        sourceFn.call(acData, {term: zipVal}, function(items) {
            window._clGeoLookupTriggered = true;
            window._clGeoLookupResponse = items;
        });
        return {ok: true, reason: 'source-called'};
    } catch(e) {
        return {ok: false, reason: 'source-call-error', error: e.message};
    }
})(arguments[0]);
"""
    result = driver.execute_script(trigger_js, zip_str)
    print(f"  [GEO-trigger] Direct source call result: {result}")
    if result and result.get("ok"):
        try:
            WebDriverWait(driver, 8).until(
                lambda d: d.execute_script("return !!window._clGeoLookupTriggered;"))
            items = driver.execute_script("return window._clGeoLookupResponse;")
            print(f"  [GEO-trigger] Got {len(items) if items else 0} items from source")
            return items
        except TimeoutException:
            print("  [GEO-trigger] Source callback timed out")
    return None


def _drain_perf_log(driver):
    try:
        entries = driver.get_log("performance")
    except Exception:
        return []
    events = []
    for entry in entries:
        try:
            msg = json.loads(entry["message"])
            event = msg.get("message", {})
            events.append((event.get("method", ""), event.get("params", {})))
        except Exception:
            pass
    return events


def _profile_dir_for(profile_key):
    """Return a stable Chrome profile directory for the given key (e.g. email)."""
    import hashlib
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chrome_profiles")
    safe = hashlib.md5((profile_key or "default").encode()).hexdigest()[:12]
    path = os.path.join(base, safe)
    os.makedirs(path, exist_ok=True)
    return path


def make_driver(proxy_url=None, profile_key=None):
    from selenium.webdriver.chrome.service import Service as ChromeService
    os.environ["SE_MANAGER_PATH"] = ""
    os.environ["WDM_SKIP_DOWNLOAD"] = "1"

    # On Windows local PC: always headed (no Xvfb needed)
    use_headed = True
    print("  [driver] Windows local PC -- headed mode")

    if not proxy_url:
        proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")

    fp = random.choice(_FINGERPRINTS)
    sw, sh = fp["screen"]
    print(f"  [driver] Fingerprint: {fp['ua'][:60]}...")

    options = webdriver.ChromeOptions()

    # NOTE: --single-process is REMOVED -- crashes Chrome on Windows
    # NOTE: --headless=new is NOT added -- we want headed on local PC
    chrome_args = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        f"--window-size={sw},{sh}",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--ignore-certificate-errors",
        "--disable-extensions",
        "--mute-audio",
        "--no-first-run",
        "--shm-size=256m",
        "--disable-features=AutofillServerCommunication,IsolateOrigins,site-per-process",
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--disable-web-security",
        "--allow-running-insecure-content",
        "--enable-javascript",
        "--enable-local-storage",
        f"--lang={fp['lang']}",
        "--disable-popup-blocking",
        "--disable-translate",
        "--disable-default-apps",
        "--disable-sync",
        "--metrics-recording-only",
        "--no-report-upload",
        "--remote-debugging-port=0",
        "--disable-background-networking",
        "--disable-client-side-phishing-detection",
        "--remote-allow-origins=*",
    ]

    for arg in chrome_args:
        options.add_argument(arg)

    if proxy_url:
        options.add_argument(f"--proxy-server={proxy_url}")
        options.add_argument("--proxy-bypass-list=localhost,127.0.0.1")

    # Always use a STABLE, persistent profile dir next to the server (never a
    # temp dir). This is what keeps the manual-login session/cookies alive so
    # we don't re-login, and it opens "where the server is running" instead of
    # a throwaway temp Chrome profile.
    profile_dir = _profile_dir_for(profile_key or "manual_session")
    options.add_argument(f"--user-data-dir={profile_dir}")
    options.add_argument(f"--user-agent={fp['ua']}")

    options.add_experimental_option("prefs", {
        "credentials_enable_service": False,
        "profile.password_manager_enabled": False,
        "autofill.profile_enabled": False,
        "autofill.credit_card_enabled": False,
        "intl.accept_languages": fp["lang"],
    })

    # Required for CDP performance log (geo capture)
    options.set_capability("goog:loggingPrefs", {"performance": "ALL"})

    # Remove stale wdm lock file if present (Windows-specific crash cause)
    lock_path = os.path.expanduser(r"~\.wdm\.wdm-lock-chromedriver-win64")
    if os.path.exists(lock_path):
        try:
            os.remove(lock_path)
            print("  [driver] Removed stale wdm lock file")
        except Exception:
            pass

    # Get chromedriver path
    chromedriver_bin = None
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        chromedriver_bin = ChromeDriverManager().install()
        print(f"  [driver] chromedriver: {chromedriver_bin}")
    except Exception as wdm_err:
        raise RuntimeError(f"chromedriver not found and auto-install failed: {wdm_err}")

    service = ChromeService(executable_path=chromedriver_bin)

    # Auto-detect installed Chrome version for undetected-chromedriver
    _uc_version = None
    chrome_locations = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
    ]
    chrome_exe = None
    for loc in chrome_locations:
        if os.path.exists(loc):
            chrome_exe = loc
            break
    if not chrome_exe:
        chrome_exe = shutil.which("chrome") or shutil.which("google-chrome")

    if chrome_exe:
        try:
            _ver_out = subprocess.check_output(
                [chrome_exe, "--version"],
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            ).decode().strip()
            _m = re.search(r"(\d+)\.\d+\.\d+", _ver_out)
            if _m:
                _uc_version = int(_m.group(1))
                print(f"  [driver] Detected Chrome major version: {_uc_version}")
        except Exception as ve:
            print(f"  [driver] Could not detect Chrome version: {ve}")

    # Try undetected-chromedriver first
    driver = None
    try:
        import undetected_chromedriver as uc

        uc_kwargs = dict(
            options=options,
            driver_executable_path=chromedriver_bin,
            use_subprocess=True,
            # NO headless param -- let options control it
            # NO browser_executable_path unless we found chrome_exe
        )
        if chrome_exe:
            uc_kwargs["browser_executable_path"] = chrome_exe
        if _uc_version:
            uc_kwargs["version_main"] = _uc_version

        driver = uc.Chrome(**uc_kwargs)
        print("  [driver] Using undetected-chromedriver [OK]")
    except Exception as uc_err:
        print(f"  [driver] undetected-chromedriver failed: {uc_err}")
        print("  [driver] Falling back to stock webdriver.Chrome...")
        try:
            # Re-create options without experimental options that may conflict
            options2 = webdriver.ChromeOptions()
            for arg in chrome_args:
                options2.add_argument(arg)
            options2.add_argument(f"--user-data-dir={profile_dir}")
            options2.add_argument(f"--user-agent={fp['ua']}")
            options2.set_capability("goog:loggingPrefs", {"performance": "ALL"})
            options2.add_experimental_option("excludeSwitches", ["enable-automation"])
            options2.add_experimental_option("useAutomationExtension", False)
            options2.add_experimental_option("prefs", {
                "credentials_enable_service": False,
                "profile.password_manager_enabled": False,
                "autofill.profile_enabled": False,
                "autofill.credit_card_enabled": False,
                "intl.accept_languages": fp["lang"],
            })
            if proxy_url:
                options2.add_argument(f"--proxy-server={proxy_url}")
                options2.add_argument("--proxy-bypass-list=localhost,127.0.0.1")
            driver = webdriver.Chrome(service=service, options=options2)
            print("  [driver] Stock Chrome launched [OK]")
        except Exception as stock_err:
            raise RuntimeError(f"Both uc and stock Chrome failed. uc: {uc_err} | stock: {stock_err}")

    # Inject fingerprint
    fingerprint_js = _FINGERPRINT_JS.format(
        platform=fp["platform"], vendor=fp["vendor"], lang=fp["lang"],
        sw=sw, sh=sh,
    )
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": fingerprint_js})
    except Exception:
        pass

    try:
        driver.execute_cdp_cmd("Network.enable", {})
        driver.execute_cdp_cmd("Network.setExtraHTTPHeaders", {"headers": {
            "Accept-Language": f"{fp['lang']},en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
        }})
    except Exception:
        pass

    _start_cdp_network_capture(driver)

    _FORM_INTERCEPT_JS = """
(function() {
    window._clNativeSubmitPayloads = [];
    function _captureForm(form, via) {
        try {
            var fd = new FormData(form);
            var pairs = [];
            fd.forEach(function(v, k) { pairs.push(k + '=' + String(v).substring(0, 200)); });
            window._clNativeSubmitPayloads.push({
                action: form.action, method: form.method,
                via: via, body: pairs.join('&')
            });
        } catch(e) {}
    }
    var origSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
        _captureForm(this, 'submit');
        return origSubmit.call(this);
    };
    if (HTMLFormElement.prototype.requestSubmit) {
        var origRS = HTMLFormElement.prototype.requestSubmit;
        HTMLFormElement.prototype.requestSubmit = function(btn) {
            _captureForm(this, 'requestSubmit');
            return origRS.call(this, btn);
        };
    }
})();
"""
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",
                               {"source": _FORM_INTERCEPT_JS})
    except Exception:
        pass

    return driver


def monitor_login_and_save_cookies(driver, cookie_path="cookies.pkl"):
    """Background monitoring thread that saves cookies immediately when manual login completes."""
    import pickle
    def _monitor():
        print("  [monitor] Background cookie monitor initialized.")
        while True:
            try:
                # Check if driver is still active
                driver.title
            except Exception:
                break
                
            try:
                # Check if we are logged in
                src = driver.page_source.lower()
                is_logged_in = ('log out' in src or
                                'accounts.craigslist.org/logout' in src or
                                'logged in as' in src)
                if is_logged_in:
                    cookies = driver.get_cookies()
                    if cookies:
                        with open(cookie_path, "wb") as f:
                            pickle.dump(cookies, f)
                        print(f"  [monitor] Session detected! Successfully saved cookies to: {cookie_path}")
                        break
            except Exception:
                pass
            time.sleep(2.0)
    threading.Thread(target=_monitor, daemon=True).start()


def open_login_window(email, proxy_url=None):
    """Open a headed Chrome with the account's persistent profile at the CL login page.
    The user logs in manually; cookies persist to the profile dir for future reuse."""
    driver = make_driver(proxy_url=proxy_url, profile_key=email)
    driver.get("https://accounts.craigslist.org/login")
    monitor_login_and_save_cookies(driver, "cookies.pkl")
    return driver


def human_delay(lo=0.8, hi=2.5):
    time.sleep(random.uniform(lo, hi))


def safe_click(driver, element):
    human_delay(0.3, 0.6)
    try:
        ActionChains(driver).move_to_element(element).pause(
            random.uniform(0.2, 0.5)).click().perform()
    except Exception:
        driver.execute_script("arguments[0].click();", element)
    human_delay(0.3, 0.6)


def handle_captcha_if_present(driver):
    try:
        driver.find_element(By.CSS_SELECTOR, "iframe[src*='recaptcha']")
        if CAPTCHA_SOLVER_AVAILABLE:
            try:
                iframe = driver.find_element(By.CSS_SELECTOR, "iframe[src*='recaptcha']")
                sitekey = [p.split("=")[1] for p in iframe.get_attribute("src").split("&") if "k=" in p][0]
                solver = TwoCaptcha(TWO_CAPTCHA_API_KEY)
                result = solver.recaptcha(sitekey=sitekey, url=driver.current_url)
                driver.execute_script(
                    "document.getElementById('g-recaptcha-response').innerHTML=arguments[0];",
                    result["code"])
                print("  CAPTCHA solved [OK]")
            except Exception as e:
                print(f"  CAPTCHA solve failed: {e}")
    except NoSuchElementException:
        pass
    if "Just a moment" in driver.title:
        print("  Cloudflare -- waiting 8s...")
        time.sleep(8)


def _is_cl_logged_in(driver):
    try:
        src = driver.page_source
        return ('log out' in src.lower() or
                'accounts.craigslist.org/logout' in src or
                'logged in as' in src.lower())
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────
# Cookie persistence + one-time MANUAL login.
#
# Flow the user wants:
#   * First time the server runs -> a real Chrome window opens (persistent
#     profile, NOT a temp dir), the human logs in to Craigslist by hand,
#     we detect the logged-in state, then dump cookies to cookies.json.
#   * Every later run -> the persistent profile already carries the session,
#     and we also re-inject cookies.json as a belt-and-braces fallback, so
#     no automated re-login is attempted.
# ─────────────────────────────────────────────────────────────────────────

def _cookies_path(email=None):
    base = os.path.dirname(os.path.abspath(__file__))
    if email:
        import hashlib
        safe = hashlib.md5(email.encode()).hexdigest()[:12]
        return os.path.join(base, f"cl_cookies_{safe}.json")
    return os.path.join(base, "cl_cookies.json")


def save_cookies(driver, email=None):
    try:
        cookies = driver.get_cookies()
        path = _cookies_path(email)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cookies, f, indent=2)
        print(f"  [cookies] Saved {len(cookies)} cookie(s) -> {os.path.basename(path)}")
        return True
    except Exception as e:
        print(f"  [cookies] Save failed: {e}")
        return False


def load_cookies(driver, email=None):
    path = _cookies_path(email)
    if not os.path.exists(path):
        return False
    try:
        with open(path, encoding="utf-8") as f:
            cookies = json.load(f)
        # Selenium needs to be on the right domain before add_cookie().
        driver.get("https://accounts.craigslist.org/")
        human_delay(1, 2)
        injected = 0
        for c in cookies:
            c.pop("sameSite", None)          # some drivers reject this key
            if "expiry" in c and isinstance(c["expiry"], float):
                c["expiry"] = int(c["expiry"])
            try:
                driver.add_cookie(c)
                injected += 1
            except Exception:
                continue
        print(f"  [cookies] Injected {injected}/{len(cookies)} cookie(s) from disk")
        return injected > 0
    except Exception as e:
        print(f"  [cookies] Load failed: {e}")
        return False


def manual_login(driver, email=None, timeout_minutes=10, poll_seconds=5):
    """Open the login page and WAIT for the human to log in by hand.
    Returns True once we detect a logged-in session (then saves cookies)."""
    print("\n" + "=" * 60)
    print("  MANUAL LOGIN REQUIRED")
    print("  A Chrome window is open. Please log in to Craigslist by hand")
    print("  (email + password + any emailed code). This is a ONE-TIME step;")
    print("  the session is saved so future runs skip login.")
    print("=" * 60 + "\n")

    try:
        driver.get("https://accounts.craigslist.org/login/home")
    except Exception:
        pass
    human_delay(2, 3)

    deadline = time.time() + timeout_minutes * 60
    while time.time() < deadline:
        if _is_cl_logged_in(driver):
            print("  [manual-login] [OK] Detected logged-in session!")
            save_cookies(driver, email)
            return True
        remaining = int(deadline - time.time())
        print(f"  [manual-login] Waiting for you to log in... ({remaining}s left)")
        time.sleep(poll_seconds)

    print("  [manual-login] [FAIL] Timed out waiting for manual login.")
    return False


def ensure_logged_in(driver, email, allow_manual=True,
                     manual_timeout_minutes=10):
    """Guarantee a live CL session WITHOUT auto-typing credentials.
    Order: (1) reuse persistent profile session, (2) inject saved cookies,
    (3) fall back to a one-time manual login window."""
    try:
        driver.get("https://accounts.craigslist.org/login/home")
        human_delay(2, 3)
        if _is_cl_logged_in(driver):
            print("  [session] [OK] Persistent profile already logged in.")
            save_cookies(driver, email)  # refresh on disk
            return True
    except Exception:
        pass

    if load_cookies(driver, email):
        driver.get("https://accounts.craigslist.org/login/home")
        human_delay(2, 3)
        if _is_cl_logged_in(driver):
            print("  [session] [OK] Logged in via saved cookies.")
            return True

    if allow_manual:
        return manual_login(driver, email, timeout_minutes=manual_timeout_minutes)

    print("  [session] [WARN] Not logged in and manual login disabled.")
    return False


def craigslist_login(driver, email):
    try:
        driver.get("https://accounts.craigslist.org/login/home")
        time.sleep(2)
        if _is_cl_logged_in(driver):
            print("[OK] Already logged in to CL -- skipping login")
            return True
    except Exception:
        pass

    cl_password = CL_PASSWORD.strip()

    print(f"  [login] Going to CL login page...")
    driver.get("https://accounts.craigslist.org/login")
    human_delay(2, 3)
    handle_captcha_if_present(driver)

    try:
        email_field = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "inputEmailHandle")))
        email_field.clear()
        for ch in email:
            email_field.send_keys(ch)
            time.sleep(random.uniform(0.05, 0.10))
        print(f"  [login] [OK] Email filled: {email}")
        time.sleep(0.5)

        pwd_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR,
                "input[type='password'], input[name='password'], "
                "input[id='inputPassword'], input[name='passwd']")))
        pwd_field.clear()
        for ch in cl_password:
            pwd_field.send_keys(ch)
            time.sleep(random.uniform(0.04, 0.09))
        print(f"  [login] [OK] Password filled")
        time.sleep(0.5)

        login_btn = None
        for btn in driver.find_elements(By.CSS_SELECTOR, "button, input[type='submit']"):
            txt = (btn.text or btn.get_attribute("value") or "").strip().lower()
            if txt in ("log in", "login", "sign in", "signin"):
                login_btn = btn
                print(f"  [login] Found button by text: '{btn.text or btn.get_attribute('value')}'")
                break

        if not login_btn:
            all_btns = driver.find_elements(By.CSS_SELECTOR,
                "button[type='submit'], input[type='submit'], button")
            if all_btns:
                login_btn = all_btns[-1]
                print(f"  [login] Using last button: '{login_btn.text}'")

        if not login_btn:
            print("  [login] [FAIL] Could not find Log in button!")
            return False

        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", login_btn)
        time.sleep(0.3)
        driver.execute_script("arguments[0].click();", login_btn)
        print("  [login] [OK] Log in button clicked!")
        time.sleep(4)
        handle_captcha_if_present(driver)

    except TimeoutException as e:
        print(f"  [login] [FAIL] Field not found: {e}")
        return False
    except Exception as e:
        print(f"  [login] [FAIL] Error: {e}")
        return False

    current_url = driver.current_url
    print(f"  [login] URL after login click: {current_url}")

    if _is_cl_logged_in(driver):
        print("  [login] [OK] Logged in to Craigslist!")
        return True

    time.sleep(2)
    if _is_cl_logged_in(driver):
        print("  [login] [OK] Logged in!")
        return True

    page_src = driver.page_source.lower()
    if "invalid" in page_src or "incorrect" in page_src or "wrong" in page_src:
        print("  [login] [FAIL] Wrong password -- check CL_PASSWORD env var")
        return False

    try:
        otp_input = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR,
                "input[name='otp'], input[type='number'][maxlength='6']")))
        print("  [login] OTP required -- fetching from Gmail...")
        gmail_pw = (GMAIL_PASSWORD or "").strip()
        if not gmail_pw:
            print("  [login] [FAIL] CL wants an emailed code but no Gmail app "
                  "password was provided -- cannot auto-read it. Set "
                  "'gmail_app_password' for this account.")
            return False
        otp = _get_otp_from_gmail_imap(email, gmail_pw)
        if otp:
            otp_input.clear()
            otp_input.send_keys(otp)
            otp_input.send_keys(Keys.RETURN)
            time.sleep(3)
            if _is_cl_logged_in(driver):
                print("  [login] [OK] Logged in via OTP!")
                return True
    except TimeoutException:
        pass

    print(f"  [login] [WARN] Login status unclear -- proceeding. URL: {driver.current_url}")
    return "accounts.craigslist.org" not in driver.current_url or _is_cl_logged_in(driver)


def _get_otp_from_gmail_imap(cl_email, gmail_password, timeout_minutes=3):
    import re as _re
    deadline = time.time() + timeout_minutes * 60
    while time.time() < deadline:
        try:
            import imaplib, email as email_lib
            mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
            mail.login(cl_email, gmail_password)
            mail.select("inbox")
            status, data = mail.search(None, '(FROM "robot@craigslist.org")')
            uids = data[0].split() if status == "OK" and data[0] else []
            if uids:
                _, msg_data = mail.fetch(uids[-1], "(RFC822)")
                mail.logout()
                msg = email_lib.message_from_bytes(msg_data[0][1])
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            try:
                                body += part.get_payload(decode=True).decode(
                                    part.get_content_charset() or "utf-8", errors="replace")
                            except Exception:
                                pass
                else:
                    try:
                        body = msg.get_payload(decode=True).decode(
                            msg.get_content_charset() or "utf-8", errors="replace")
                    except Exception:
                        pass
                codes = _re.findall(r'\b(\d{6})\b', body)
                if codes:
                    print(f"  [imap-otp] Found OTP: {codes[0]}")
                    return codes[0]
            else:
                mail.logout()
            time.sleep(8)
        except Exception as e:
            print(f"  [imap-otp] Error: {e}")
            time.sleep(10)
    return None


def _get_cl_magic_link_from_imap(cl_email, gmail_password, timeout_minutes=5):
    CL_LINK = re.compile(
        r'https?://(?:accounts\.craigslist\.org|[a-z]+\.craigslist\.org)/\S{10,}',
        re.IGNORECASE)
    deadline = time.time() + timeout_minutes * 60
    while time.time() < deadline:
        try:
            import imaplib, email as email_lib
            mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
            mail.login(cl_email, gmail_password)
            mail.select("inbox")
            status, data = mail.search(None, '(FROM "robot@craigslist.org")')
            uids = data[0].split() if status == "OK" and data[0] else []
            if uids:
                _, msg_data = mail.fetch(uids[-1], "(RFC822)")
                mail.logout()
                import email as email_lib
                msg = email_lib.message_from_bytes(msg_data[0][1])
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() in ("text/plain", "text/html"):
                            try:
                                body += part.get_payload(decode=True).decode(
                                    part.get_content_charset() or "utf-8", errors="replace")
                            except Exception:
                                pass
                else:
                    try:
                        body = msg.get_payload(decode=True).decode(
                            msg.get_content_charset() or "utf-8", errors="replace")
                    except Exception:
                        pass
                matches = CL_LINK.findall(body)
                if matches:
                    url = max(matches, key=len)
                    print(f"  [imap-magic] [OK] Found: {url[:80]}")
                    return url
            else:
                mail.logout()
            time.sleep(8)
        except Exception as e:
            print(f"  [imap-magic] Error: {e}")
            time.sleep(10)
    return None


def click_relocation_if_needed(driver, ad_name):
    try:
        btn = WebDriverWait(driver, 6).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "#relocationButton")))
        safe_click(driver, btn)
        local_btn = WebDriverWait(driver, 6).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "#localAreaButton")))
        safe_click(driver, local_btn)
        print("  Relocation handled [OK]")
    except TimeoutException:
        pass


def _wait_for_cl_js_init(driver, timeout=20):
    print("  [init] Waiting for CL form JS to initialize...")
    try:
        WebDriverWait(driver, timeout).until(lambda d: d.execute_script("""
            try {
                var form = document.getElementById('postingForm');
                if (!form) return false;
                if (!window.jQuery) return false;
                var jqForm = jQuery(form);
                if (jqForm.data('validator')) return true;
                if (window.cl && window.cl.postingProcess) return true;
                return jQuery('#postingForm').length > 0;
            } catch(e) { return false; }
        """))
        print("  [init] CL form JS ready [OK]")
    except TimeoutException:
        print("  [init] Timeout waiting for CL JS -- proceeding anyway")
    time.sleep(1.5)


def _find_field(driver, selectors, timeout=8):
    for sel in selectors:
        try:
            el = WebDriverWait(driver, timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, sel)))
            if el.is_displayed():
                return el
        except Exception:
            continue
    return None


def _cdp_type(driver, element, value):
    value = str(value).strip()
    if not value:
        return
    driver.execute_script("""
        var el = arguments[0];
        var setter = Object.getOwnPropertyDescriptor(
            el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            'value'
        ).set;
        setter.call(el, '');
        el.removeAttribute('data-autofilled');
        el.removeAttribute('autofilled');
        el.focus();
    """, element)
    time.sleep(0.2)
    element.send_keys(value)
    driver.execute_script("""
        var el = arguments[0];
        el.removeAttribute('data-autofilled');
        el.removeAttribute('autofilled');
        ['input','change','keyup','blur'].forEach(function(e){
            el.dispatchEvent(new Event(e, {bubbles:true, cancelable:true}));
        });
    """, element)
    time.sleep(0.2)


_ZIP_PATCH_JS = """
var zipVal = arguments[0];
var results = [];
try {
    if (window.jQuery) {
        var origSerializeArray = jQuery.fn.serializeArray;
        jQuery.fn.serializeArray = function() {
            var result = origSerializeArray.call(this);
            var hasPostal = false;
            for (var i = 0; i < result.length; i++) {
                if (result[i].name === 'postal' || result[i].name === 'postal_code') {
                    result[i].value = zipVal; hasPostal = true;
                }
            }
            if (!hasPostal) result.push({name: 'postal', value: zipVal});
            return result;
        };
        var origSerialize = jQuery.fn.serialize;
        jQuery.fn.serialize = function() {
            var s = origSerialize.call(this);
            s = s.replace(/postal=[^&]*/g, 'postal=' + encodeURIComponent(zipVal));
            s = s.replace(/postal_code=[^&]*/g, 'postal_code=' + encodeURIComponent(zipVal));
            if (s.indexOf('postal=') === -1) s += (s ? '&' : '') + 'postal=' + encodeURIComponent(zipVal);
            return s;
        };
        results.push('serializer-patched');
        window._clSerializerPatched = true;
    } else { results.push('no-jquery'); }
} catch(e) { results.push('serializer-err:' + e.message); }
try {
    var OrigFormData = window.FormData;
    function PatchedFormData(form) {
        var fd = form ? new OrigFormData(form) : new OrigFormData();
        if (form) {
            try { fd.set('postal', zipVal); } catch(e) {}
            try { fd.set('postal_code', zipVal); } catch(e) {}
        }
        var origAppend = fd.append.bind(fd);
        fd.append = function(name, value) {
            if (name === 'postal' || name === 'postal_code') value = zipVal;
            return origAppend(name, value);
        };
        if (fd.set) {
            var origSet = fd.set.bind(fd);
            fd.set = function(name, value) {
                if (name === 'postal' || name === 'postal_code') value = zipVal;
                return origSet(name, value);
            };
        }
        return fd;
    }
    PatchedFormData.prototype = OrigFormData.prototype;
    window.FormData = PatchedFormData;
    results.push('formdata-patched');
} catch(e) { results.push('formdata-err:' + e.message); }
try {
    setTimeout(function() {
        try {
            var postalEl = document.querySelector('[name="postal"]') ||
                           document.querySelector('[name="postal_code"]') ||
                           document.querySelector('#postal_code') ||
                           document.querySelector('#postal');
            if (!postalEl || !window.jQuery) return;
            var jq = jQuery(postalEl);
            if (!jq.data('ui-autocomplete') && !jq.data('autocomplete')) {
                jq.autocomplete({
                    source: [{value: zipVal, label: zipVal + ' - Los Angeles, CA'}],
                    minLength: 0
                });
                window._clZipWidgetCreated = true;
            }
            var selectEvent = jQuery.Event('autocompleteselect');
            selectEvent.item = {value: zipVal, label: zipVal + ' - Los Angeles, CA'};
            jq.trigger(selectEvent);
            jq.trigger(jQuery.Event('autocompletechange'), {item: {value: zipVal}});
            window._clZipAutoconfirmed = true;
        } catch(e2) { window._clZipWidgetErr = e2.message; }
    }, 2500);
    results.push('autocomplete-timer-set');
} catch(e) { results.push('autocomplete-timer-err:' + e.message); }
window._clZipPatchInstalled = true;
window._clZipPatchResults = results;
return results.join(',');
"""

_VALIDATOR_NUKE_JS = """
var zipVal = arguments[0];
var results = [];
try {
    var postalEl = document.querySelector('[name="postal"]') ||
                   document.querySelector('[name="postal_code"]') ||
                   document.querySelector('#postal_code') ||
                   document.querySelector('#postal');
    if (!postalEl) return ['no-postal-el'];
    var nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(postalEl, zipVal);
    postalEl.setAttribute('value', zipVal);
    results.push('dom-set:' + postalEl.value);
    if (window.jQuery) {
        var jq = jQuery(postalEl);
        try { jq.rules('remove'); results.push('rules-removed'); } catch(e) {}
        var form = document.getElementById('postingForm');
        if (form) {
            var validator = jQuery(form).data('validator');
            if (validator) {
                if (validator.settings && validator.settings.rules) {
                    delete validator.settings.rules['postal'];
                    delete validator.settings.rules['postal_code'];
                    results.push('validator-rules-deleted');
                }
                validator.successList = validator.successList || [];
                if (validator.successList.indexOf(postalEl) === -1) validator.successList.push(postalEl);
                results.push('added-to-success-list');
                try { validator.resetElements([postalEl]); results.push('element-reset'); } catch(e) {}
                if (jQuery.validator && jQuery.validator.methods) {
                    var nuked = 0;
                    var builtins = ['required','email','url','number','digits','min','max',
                                    'minlength','maxlength','range','rangelength','equalTo','remote'];
                    jQuery.each(jQuery.validator.methods, function(name, fn) {
                        if (builtins.indexOf(name) !== -1) return;
                        var orig = fn;
                        jQuery.validator.methods[name] = function(value, element, param) {
                            if (element === postalEl) return true;
                            return orig.call(this, value, element, param);
                        };
                        nuked++;
                    });
                    results.push('custom-methods-nuked:' + nuked);
                }
            } else { results.push('no-validator-instance'); }
        }
        jq.removeClass('error invalid required')
          .removeAttr('aria-invalid').removeAttr('aria-required').removeAttr('aria-describedby');
        jQuery('label[for="postal_code"].error,label[for="postal"].error,#postal_code-error,#postal-error').remove();
        jQuery('.err li').filter(function() {
            return jQuery(this).text().toLowerCase().indexOf('zip') !== -1 ||
                   jQuery(this).text().toLowerCase().indexOf('postal') !== -1;
        }).remove();
        results.push('error-ui-cleared');
        jq.val(zipVal)
          .trigger(jQuery.Event('focus',  {bubbles: true}))
          .trigger(jQuery.Event('input',  {bubbles: true}))
          .trigger(jQuery.Event('change', {bubbles: true}))
          .trigger(jQuery.Event('blur',   {bubbles: true}));
        results.push('events-fired');
    } else { results.push('no-jquery-for-validator-nuke'); }
} catch(e) { results.push('nuke-exception:' + e.message); }
return results;
"""


def _fill_zip_with_network_intercept(driver, zip_field, zip_str):
    try:
        driver.get_log("performance")
        print("  [ZIP] Perf log drained")
    except Exception as e:
        print(f"  [ZIP] Perf log drain failed: {e}")
    time.sleep(0.2)

    _install_network_spy_now(driver)
    time.sleep(0.2)

    patch_result = driver.execute_script(_ZIP_PATCH_JS, zip_str)
    print(f"  [ZIP] Patch install: {patch_result}")
    time.sleep(0.3)

    driver.execute_script(
        "arguments[0].scrollIntoView({block:'center', inline:'nearest'});", zip_field)
    time.sleep(0.4)

    try:
        ActionChains(driver)\
            .move_to_element(zip_field)\
            .pause(random.uniform(0.2, 0.4))\
            .triple_click(zip_field)\
            .pause(0.15)\
            .send_keys_to_element(zip_field, Keys.DELETE)\
            .pause(0.2)\
            .perform()
    except Exception:
        ActionChains(driver).move_to_element(zip_field).click().perform()
        time.sleep(0.2)
        zip_field.send_keys(Keys.CONTROL + "a")
        time.sleep(0.1)
        zip_field.send_keys(Keys.DELETE)
    time.sleep(0.3)

    if not driver.execute_script("return document.activeElement===arguments[0];", zip_field):
        ActionChains(driver).click(zip_field).perform()
        time.sleep(0.3)

    print(f"  [ZIP] Typing '{zip_str}' with real ActionChains key events...")
    for i, ch in enumerate(zip_str):
        ActionChains(driver)\
            .key_down(ch, zip_field)\
            .pause(random.uniform(0.03, 0.06))\
            .key_up(ch, zip_field)\
            .perform()
        time.sleep(random.uniform(0.13, 0.22))
        if i == 2:
            print("  [ZIP] 3-digit pause (3.5s)...")
            time.sleep(3.5)
            ac_state = driver.execute_script("""
                var el = document.querySelector('[name="postal"]') ||
                         document.querySelector('[name="postal_code"]');
                if (!el || !window.jQuery) return {err: 'no-el-or-jquery'};
                var ac = jQuery(el).data('ui-autocomplete') || jQuery(el).data('autocomplete');
                if (!ac) return {err: 'no-ac-instance'};
                return {minLength: ac.options.minLength, delay: ac.options.delay,
                        term: ac.term, pending: ac.pending, sourceType: typeof ac.options.source};
            """)
            print(f"  [ZIP] CL autocomplete state: {ac_state}")

    time.sleep(2.5)

    dropdown_visible = driver.execute_script("""
        var menus = document.querySelectorAll('.ui-autocomplete, .ui-menu, [role="listbox"]');
        for (var i = 0; i < menus.length; i++) {
            var rect = menus[i].getBoundingClientRect();
            var lis = menus[i].querySelectorAll('li');
            if (lis.length > 0 && rect.height > 0) {
                return {found: true, id: menus[i].id, items: lis.length,
                        firstText: lis[0].textContent.trim().substring(0, 60)};
            }
        }
        return {found: false};
    """)
    print(f"  [ZIP] Dropdown visible: {dropdown_visible}")

    suggestion_clicked = False
    token_before = driver.execute_script(
        "return (function(){var inputs=document.querySelectorAll('input[type=hidden]');"
        "for(var i=0;i<inputs.length;i++){if(inputs[i].name==='cryptedStepCheck')return inputs[i].value;}"
        "return null;})();")

    if dropdown_visible.get('found'):
        print("  [ZIP] Dropdown found -- selecting with ArrowDown + Enter...")
        try:
            zip_field = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR,
                    "[name='postal'], [name='postal_code'], #postal_code, #postal")))
            driver.execute_script("arguments[0].focus();", zip_field)
            time.sleep(0.4)
            zip_field.send_keys(Keys.ARROW_DOWN)
            time.sleep(0.8)
            zip_field.send_keys(Keys.RETURN)
            time.sleep(1.0)

            driver.execute_script("""
                var z = arguments[0];
                fetch('/suggest?fieldname=postal&typing=' + z, {
                    credentials: 'same-origin',
                    headers: {'X-Requested-With': 'XMLHttpRequest'}
                }).then(function(r){ return r.text(); })
                  .then(function(d){ window._clGeoFetchResponse = d; })
                  .catch(function(e){ window._clGeoFetchErr = e.message; });
            """, zip_str)
            time.sleep(2.0)
            suggestion_clicked = True
            print("  [ZIP] ArrowDown + Enter sent [OK]")

            fix_result = driver.execute_script("""
                var zipVal = arguments[0];
                var results = [];
                var postalEl = document.querySelector('[name=postal]') ||
                               document.querySelector('[name=postal_code]');
                if (!postalEl) return ['no-postal'];
                postalEl.removeAttribute('data-autofilled');
                postalEl.setAttribute('data-autofilled', 'false');
                postalEl.removeAttribute('readonly');
                var jq = jQuery(postalEl);
                var ac = jq.data('ui-autocomplete') || jq.data('autocomplete');
                if (ac) {
                    var matchItem = {value: zipVal, label: zipVal + ' - Los Angeles, CA'};
                    try { ac._trigger('select', null, {item: matchItem}); results.push('_trigger-select-called'); }
                    catch(e) { results.push('_trigger-err:' + e.message); }
                } else { results.push('no-ac-widget'); }
                var nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(postalEl, zipVal);
                postalEl.setAttribute('value', zipVal);
                postalEl.setAttribute('data-confirmed', 'true');
                postalEl.removeAttribute('data-autofilled');
                ['focus','input','keyup','change','blur'].forEach(function(evName) {
                    postalEl.dispatchEvent(new Event(evName, {bubbles: true, cancelable: true}));
                });
                if (window.jQuery) jQuery(postalEl).val(zipVal).trigger('focus').trigger('input').trigger('change').trigger('blur');
                results.push('events-fired');
                var form = document.getElementById('postingForm');
                if (form && window.jQuery) {
                    var validator = jQuery(form).data('validator');
                    if (validator) {
                        var successList = validator.successList || [];
                        if (successList.indexOf(postalEl) === -1) successList.push(postalEl);
                        validator.successList = successList;
                        if (validator.settings && validator.settings.rules) {
                            delete validator.settings.rules['postal'];
                            delete validator.settings.rules['postal_code'];
                        }
                        try { validator.resetElements([postalEl]); } catch(e) {}
                        results.push('validator-cleared');
                    }
                    jQuery('label[for="postal"].error, #postal-error, label[for="postal_code"].error').remove();
                    jQuery(postalEl).removeClass('error').removeAttr('aria-invalid');
                }
                return results;
            """, zip_str)
            print(f"  [ZIP] Root cause fix result: {fix_result}")
            time.sleep(0.5)

            token_after = driver.execute_script(
                "return (function(){var inputs=document.querySelectorAll('input[type=hidden]');"
                "for(var i=0;i<inputs.length;i++){if(inputs[i].name==='cryptedStepCheck')return inputs[i].value;}"
                "return null;})();")
            if token_after and token_before and token_after != token_before:
                print("  [ZIP] [OK] cryptedStepCheck ROTATED -- CL confirmed the ZIP!")
            else:
                print("  [ZIP] [WARN] cryptedStepCheck did NOT rotate")
        except Exception as e:
            print(f"  [ZIP] ArrowDown+Enter failed: {e}")
            suggestion_clicked = False
    else:
        print("  [ZIP] No dropdown appeared")

    if not suggestion_clicked:
        print("  [ZIP] Falling back to Tab blur")
        try:
            fresh_zip = driver.find_element(By.CSS_SELECTOR,
                "[name='postal'], [name='postal_code'], #postal_code, #postal")
            fresh_zip.send_keys(Keys.TAB)
        except Exception:
            driver.execute_script(
                "var el=document.querySelector('[name=postal],[name=postal_code]');if(el)el.blur();")
        time.sleep(2.0)

    print("  [ZIP] Waiting for AJAX after ZIP entry...")
    try:
        WebDriverWait(driver, 10).until(
            lambda d: d.execute_script("return typeof jQuery==='undefined' || jQuery.active===0"))
        print("  [ZIP] AJAX complete [OK]")
    except Exception:
        print("  [ZIP] AJAX wait timed out")
    time.sleep(1.5)

    # CDP perf log -- geo capture
    print("  [ZIP] Polling CDP perf log for geo response...")
    geo_body = None
    geo_url_found = None
    GEO_PATTERNS = ["suggest", "postal", "geo", "location", "geocode", "postcode", "zip", "area"]
    request_id_map = {}
    deadline = time.time() + 6
    while time.time() < deadline:
        try:
            entries = driver.get_log("performance")
        except Exception:
            entries = []
        for entry in entries:
            try:
                msg = json.loads(entry["message"])
                event = msg.get("message", {})
                method = event.get("method", "")
                params = event.get("params", {})
                if method == "Network.requestWillBeSent":
                    rid = params.get("requestId", "")
                    url = params.get("request", {}).get("url", "")
                    if rid:
                        request_id_map[rid] = url
                elif method == "Network.responseReceived":
                    rid = params.get("requestId", "")
                    url = (params.get("response", {}).get("url", "") or request_id_map.get(rid, ""))
                    if any(p in url.lower() for p in GEO_PATTERNS):
                        print(f"  [CDP-perf] Geo response received: {url}")
                        try:
                            body_resp = driver.execute_cdp_cmd("Network.getResponseBody", {"requestId": rid})
                            geo_body = body_resp.get("body", "")
                            geo_url_found = url
                            print(f"  [CDP-perf] Body ({len(geo_body)} bytes): {geo_body[:300]}")
                        except Exception as e:
                            print(f"  [CDP-perf] getResponseBody failed: {e}")
            except Exception:
                pass
        if geo_body is not None:
            break
        time.sleep(0.35)

    geo_injected = False
    if geo_body and geo_body.strip() not in ("", "[]"):
        print(f"  [GEO] [OK] Real geo response captured: {geo_url_found}")
        geo_injected = _inject_geo_hidden_fields(driver, geo_body, zip_str)
    else:
        print("  [GEO] CDP perf log: no geo response captured")

    if not geo_injected:
        js_responses, js_calls = _get_geo_responses(driver)
        print(f"  [GEO] JS spy: {len(js_responses)} geo, {len(js_calls)} total calls")
        if js_responses:
            for resp in js_responses:
                if _inject_geo_hidden_fields(driver, resp.get("responseText", ""), zip_str):
                    geo_injected = True
                    break

    if not geo_injected:
        print("  [GEO] Falling back to direct Python geo request...")
        geo_text, geo_url = _fetch_cl_geo_direct(driver, zip_str)
        if geo_text and geo_text.strip() not in ("", "[]"):
            _inject_geo_hidden_fields(driver, geo_text, zip_str)
        else:
            print("  [GEO] [WARN] No geo response from any method")

    zip_field = _find_field(driver, [
        "[name='postal']", "[name='postal_code']", "input#postal_code", "input#postal",
    ]) or zip_field

    actual = (zip_field.get_attribute("value") or "") if zip_field else ""
    if actual != zip_str and zip_field:
        print(f"  [ZIP] Force-setting to '{zip_str}'")
        driver.execute_script("""
            var el = arguments[0], v = arguments[1];
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
            el.setAttribute('value', v);
            if (window.jQuery) jQuery(el).val(v).trigger('input').trigger('change');
        """, zip_field, zip_str)
        time.sleep(0.3)

    actual = (zip_field.get_attribute("value") or "") if zip_field else zip_str
    print(f"  [OK] [ZIP] = '{actual}'")
    return zip_field


def fill_and_submit_with_wire(driver, product, zip_code, city_name, cl_email):
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "postingForm")))
    except TimeoutException:
        print("  [FAIL] postingForm not found")
        return None

    handle_captcha_if_present(driver)
    _wait_for_cl_js_init(driver)

    try:
        initial_state = driver.execute_script("""
            var r = {};
            document.querySelectorAll('input[type=hidden]').forEach(function(e) {
                r[e.name || e.id || '?'] = (e.value || '').substring(0, 70);
            });
            var postal = document.querySelector('[name=postal],[name=postal_code]');
            r['_postal_preload'] = postal ? postal.value : '';
            r['_postal_readonly'] = postal ? (postal.readOnly || postal.disabled || false) : null;
            return r;
        """)
        print(f"  [EDIT-DIAG] cryptedStepCheck at load: {initial_state.get('cryptedStepCheck','MISSING')[:60]}")
        print(f"  [EDIT-DIAG] postal at load: '{initial_state.get('_postal_preload','')}'")
    except Exception as _e_diag:
        print(f"  [EDIT-DIAG] failed: {_e_diag}")

    title = (product.get("title") or product.get("name") or "Quality Item For Sale").strip()
    _base_desc = (product.get("description") or (
        f"{title} in excellent condition. Well maintained and ready for a new home. "
        "Priced to sell. Local pickup preferred. Message for details.")).strip()
    _product_url = (product.get("url") or product.get("product_url") or product.get("link") or "").strip()
    description = _base_desc + ("\n\nOrder this product:\n" + _product_url if _product_url else "")
    _pr = str(product.get("price", "")).strip().replace("$", "").replace(",", "").replace("Rs", "").strip()
    try:
        price = str(round(float(_pr))) if _pr else "10"
    except Exception:
        price = "10"

    print(f"  [fill] title='{title[:50]}' price={price} zip={zip_code} city={city_name}")

    # Title
    title_field = _find_field(driver, ["[name='PostingTitle']", "input#PostingTitle", "input#title"])
    if title_field:
        _cdp_type(driver, title_field, title)
        print(f"  [OK] [title] = '{(title_field.get_attribute('value') or '')[:60]}'")
    else:
        print("  [FAIL] [title] field not found!")
        return None
    time.sleep(random.uniform(0.4, 0.7))

    # Price
    price_field = _find_field(driver, ["[name='price']", "[name='AskingPrice']", "[name='AskPrice']", "input#price"])
    if price_field:
        _cdp_type(driver, price_field, price)
        print(f"  [OK] [price] = '{price_field.get_attribute('value') or ''}'")
    else:
        print("  [WARN] [price] field not found")
    time.sleep(random.uniform(0.3, 0.6))

    # City
    city_field = _find_field(driver, ["[name='geographic_area']", "input#geographic_area", "[name='city']"])
    if city_field and city_name:
        _cdp_type(driver, city_field, city_name)
        print(f"  [OK] [city] = '{city_field.get_attribute('value') or ''}'")
    time.sleep(random.uniform(0.3, 0.5))

    # ZIP -- use full network-intercept method (same as Railway) to trigger CL's geo validation
    if zip_code:
        zip_str = str(zip_code).strip()
        zip_field = _find_field(driver, [
            "[name='postal']", "[name='postal_code']", "input#postal_code", "input#postal",
        ])
        if zip_field:
            zip_field = _fill_zip_with_network_intercept(driver, zip_field, zip_str)
        else:
            print("  [WARN] [ZIP] field not found")

    # Description
    desc_field = _find_field(driver, ["[name='PostingBody']", "textarea#PostingBody", "textarea#description"])
    if desc_field:
        _cdp_type(driver, desc_field, description)
        print(f"  [OK] [description] = '{(desc_field.get_attribute('value') or '')[:40]}'")
    else:
        print("  [FAIL] [description] field not found!")
        return None
    time.sleep(random.uniform(0.4, 0.7))

    # Email
    try:
        email_el = driver.find_element(By.CSS_SELECTOR, "[name='FromEMail']")
        if not email_el.get_attribute("disabled") and not email_el.get_attribute("readOnly"):
            if cl_email:
                _cdp_type(driver, email_el, cl_email)
                print(f"  [OK] [email] = '{cl_email}'")
        else:
            print("  [email] Pre-filled by account")
    except Exception:
        pass
    time.sleep(random.uniform(0.4, 0.6))

    try:
        WebDriverWait(driver, 8).until(
            lambda d: d.execute_script("return typeof jQuery==='undefined' || jQuery.active == 0"))
    except Exception:
        pass
    time.sleep(0.5)

    # Find submit button
    print("  [submit] Finding and clicking Continue button...")
    submitted = False
    submit_btn = None

    for by, sel in [
        (By.CSS_SELECTOR, "button.go.bigbutton[type='submit']"),
        (By.CSS_SELECTOR, "button.bigbutton[type='submit']"),
        (By.CSS_SELECTOR, "#postingForm button[type='submit']"),
        (By.CSS_SELECTOR, "#postingForm input[type='submit']"),
        (By.CSS_SELECTOR, "button.go"),
        (By.XPATH, "//button[@type='submit' and (contains(@class,'go') or contains(@class,'bigbutton'))]"),
        (By.XPATH, "//button[normalize-space(.)='continue' or normalize-space(.)='Continue']"),
        (By.CSS_SELECTOR, "button[type='submit']"),
        (By.CSS_SELECTOR, "input[type='submit']"),
    ]:
        try:
            el = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((by, sel)))
            if el.is_displayed():
                submit_btn = el
                label = (el.text or el.get_attribute("value") or sel)[:40]
                print(f"  [submit] Found button: '{label}'")
                break
        except Exception:
            continue

    if not submit_btn and not submitted:
        print("  [submit] [FAIL] No submit button found!")
        return None

    if submit_btn:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", submit_btn)
        time.sleep(0.5)

    # Force-fill all fields + ZIP bypass before submit
    if zip_code:
        driver.execute_script("""
            (function(t, p, d, e, z) {
                function setVal(sel, val) {
                    document.querySelectorAll(sel).forEach(function(el) {
                        if (!el || !val) return;
                        try {
                            var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                            var setter = Object.getOwnPropertyDescriptor(proto, 'value');
                            if (setter && setter.set) setter.set.call(el, val);
                            else el.value = val;
                        } catch(err) { el.value = val; }
                        el.dispatchEvent(new Event('input',  {bubbles:true}));
                        el.dispatchEvent(new Event('change', {bubbles:true}));
                        el.dispatchEvent(new Event('keyup',  {bubbles:true}));
                        if (window.jQuery) jQuery(el).val(val).trigger('input').trigger('change');
                    });
                }
                if (t) setVal('[name="PostingTitle"]', t);
                if (p) setVal('[name="price"],[name="AskingPrice"]', p);
                if (d) setVal('[name="PostingBody"]', d);
                if (e) {
                    var em = document.querySelector('[name="FromEMail"]');
                    if (em && !em.disabled && !em.readOnly) setVal('[name="FromEMail"]', e);
                }
                if (z) setVal('[name="postal"],[name="postal_code"]', z);
            })(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
            var form = document.getElementById('postingForm');
            if (form && window.jQuery) {
                var v = jQuery(form).data('validator');
                if (v) { v.settings.ignore = '*'; v.settings.rules = {}; }
                jQuery.fn.valid = function() { return true; };
            }
            var postal = document.querySelector('[name="postal"]');
            if (postal) {
                postal.removeAttribute('data-autofilled');
                postal.setAttribute('data-autofilled','false');
                postal.setAttribute('data-confirmed','true');
            }
            document.querySelectorAll('.err li').forEach(function(e){e.remove();});
        """, title, str(price), description, cl_email, str(zip_code).strip() if zip_code else '')

        desc_val  = driver.execute_script("var e=document.querySelector('[name=PostingBody]'); return e?e.value.substring(0,40):'MISSING';")
        zip_val   = driver.execute_script("var e=document.querySelector('[name=postal]')||document.querySelector('[name=postal_code]'); return e?e.value:'MISSING';")
        print(f"  [pre-submit] desc='{desc_val}' zip='{zip_val}'")
        time.sleep(0.3)

    # Strip autofill markers before submit
    driver.execute_script("""
        document.querySelectorAll('[data-autofilled],[autofilled]').forEach(function(el){
            el.removeAttribute('data-autofilled');
            el.removeAttribute('autofilled');
        });
        ['PostingTitle','PostingBody','price','AskingPrice','geographic_area'].forEach(function(name){
            var el = document.querySelector('[name="'+name+'"]');
            if(el && el.value){
                el.dispatchEvent(new Event('input',{bubbles:true}));
                el.dispatchEvent(new Event('change',{bubbles:true}));
            }
        });
    """)
    time.sleep(0.3)

    if not submitted and submit_btn:
        try:
            ActionChains(driver).move_to_element(submit_btn).pause(
                random.uniform(0.3, 0.6)).click().perform()
            submitted = True
            print("  [submit] Clicked via ActionChains [OK]")
        except Exception as e:
            print(f"  [submit] ActionChains failed ({e})")
            try:
                driver.execute_script("arguments[0].click();", submit_btn)
                submitted = True
                print("  [submit] JS click fallback [OK]")
            except Exception as e2:
                print(f"  [submit] JS click also failed: {e2}")

    if submitted and zip_code:
        time.sleep(0.15)
        driver.execute_script("""
            var pEl = document.querySelector('[name="postal"]') ||
                      document.querySelector('[name="postal_code"]') ||
                      document.querySelector('#postal_code') ||
                      document.querySelector('#postal');
            if (pEl) Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(pEl, arguments[0]);
        """, str(zip_code).strip())

    if not submitted:
        try:
            result = driver.execute_script("""
                var form = document.getElementById('postingForm');
                var btn  = arguments[0];
                if (form && typeof form.requestSubmit === 'function') {
                    form.requestSubmit(btn); return 'requestSubmit';
                }
                btn.click(); return 'direct-click';
            """, submit_btn)
            submitted = True
            print(f"  [submit] Fallback: {result} [OK]")
        except Exception as e:
            print(f"  [submit] Fallback also failed: {e}")

    if not submitted:
        return None

    time.sleep(3)

    # -- Wait to leave the edit page (35s like Railway version) ----------------
    deadline = time.time() + 35
    while time.time() < deadline:
        cur = driver.current_url
        form_present = driver.execute_script(
            "return document.getElementById('postingForm') !== null;")
        done_buttons = driver.execute_script(
            "return document.getElementById('done_with_images_button') !== null || "
            "       document.getElementById('publish_bottom') !== null;")
        if not form_present or done_buttons or "s=preview" in cur or "s=fin" in cur or "s=editimage" in cur or "s=images" in cur:
            print(f"  [OK] Left edit form -> {cur}")
            return cur
        time.sleep(0.5)

    # Still stuck -- recovery attempt
    print("  [submit] Still on edit page after 35s -- recovery attempt...")
    try:
        errs = driver.execute_script("""
            var msgs = [];
            document.querySelectorAll('.err,.error,.notice').forEach(function(el) {
                var t = (el.textContent||'').replace(/[ \\t\\n]+/g,' ').trim();
                if (t && t.length > 3 && t.length < 200) msgs.push(t);
            });
            return msgs;
        """) or []
        if errs:
            print(f"  [fail-errors] {errs[:8]}")

        if zip_code:
            driver.execute_script(_VALIDATOR_NUKE_JS, str(zip_code).strip())
        time.sleep(1)
        for by, sel in [
            (By.CSS_SELECTOR, "button.go.bigbutton[type='submit']"),
            (By.CSS_SELECTOR, "button[type='submit']"),
        ]:
            try:
                btn = driver.find_element(by, sel)
                if btn.is_displayed():
                    ActionChains(driver).move_to_element(btn).click().perform()
                    print("  [submit] Recovery click sent")
                    time.sleep(10)
                    cur = driver.current_url
                    if "s=edit" not in cur:
                        print(f"  [OK] Recovery worked -> {cur}")
                        # If CL skipped to preview but we have images, go back to images page
                        if "s=preview" in cur:
                            print("  [submit] Landed on preview after recovery -- will handle images in complete_images_step")
                        return cur
                    break
            except Exception:
                continue
    except Exception as debug_err:
        print(f"  [debug] Error during recovery: {debug_err}")

    print("  [FAIL] Submit failed")
    return None


def fill_listing_details(driver, product: dict):
    _ZIPS = {
        "losangeles": "90001", "newyork": "10001", "chicago": "60601",
        "houston": "77001", "phoenix": "85001", "sfbay": "94102",
        "sandiego": "92101", "seattle": "98101", "miami": "33101",
        "dallas": "75201", "denver": "80201", "atlanta": "30301",
        "boston": "02101", "portland": "97201", "anchorage": "99502",
        "orlando": "32827", "honolulu": "96820", "indianapolis": "46220",
        "wichita": "67212", "louisville": "40210", "neworleans": "70117",
        "baltimore": "21222", "detroit": "48210", "minneapolis": "55440",
        "stlouis": "63138", "omaha": "68110", "lasvegas": "89030",
        "albuquerque": "87108", "brooklyn": "11206", "raleigh": "27604",
        "fargo": "58102", "columbus": "43211", "philadelphia": "19019",
        "nashville": "37205", "saltlakecity": "84118", "milwaukee": "53221",
    }
    # Account data takes priority over everything else
    acc = _load_account_data()
    sel_idx = acc.get("selectedLocationIdx", -1)
    locations = acc.get("locations", [])
    acc_loc = locations[sel_idx] if (sel_idx >= 0 and sel_idx < len(locations)) else {}

    zip_code = (
        acc_loc.get("zip") or
        product.get("_location_zip") or
        product.get("zip_code") or
        product.get("postal_code") or ""
    ).strip()
    if not zip_code:
        _ck = CL_CITY.lower().replace(" ", "").replace("-", "")
        zip_code = _ZIPS.get(_ck, "")

    _CITY_NAMES = {
        "losangeles": "Los Angeles", "newyork": "New York", "chicago": "Chicago",
        "houston": "Houston", "phoenix": "Phoenix", "sfbay": "San Francisco",
        "sandiego": "San Diego", "seattle": "Seattle", "miami": "Miami",
        "dallas": "Dallas", "denver": "Denver", "atlanta": "Atlanta",
        "boston": "Boston", "portland": "Portland",
    }
    _ck = CL_CITY.lower().replace(" ", "").replace("-", "")
    city_name = (
        acc_loc.get("city") or
        product.get("_location_city") or
        _CITY_NAMES.get(_ck, CL_CITY.title())
    )
    cl_email = (acc.get("email") or
                product.get("contact_email") or product.get("email") or "").strip()

    result_url = fill_and_submit_with_wire(driver, product, zip_code, city_name, cl_email)
    if result_url and ("s=edit" not in result_url or "s=editimage" in result_url or "s=images" in result_url):
        print(f"  [OK] Form submitted -> {result_url}")
        return True
    print("  [FAIL] Still on edit page after form submit")
    return False


def _click_first(driver, selectors, label="button"):
    for by, sel in selectors:
        try:
            el = WebDriverWait(driver, 8).until(EC.element_to_be_clickable((by, sel)))
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
            time.sleep(0.35)
            try:
                ActionChains(driver).move_to_element(el).pause(
                    random.uniform(0.2, 0.5)).click().perform()
            except Exception:
                driver.execute_script("arguments[0].click();", el)
            print(f"  [OK] Clicked {label} ({sel[:50]})")
            return True
        except Exception:
            continue
    return False


def _click_geoverify_button(driver):
    try:
        WebDriverWait(driver, 12).until(
            EC.presence_of_element_located((By.CSS_SELECTOR,
                "button[type='submit'], button.go, input[type='submit'], button")))
        time.sleep(0.8)
        btns = driver.find_elements(By.CSS_SELECTOR,
            "button[type='submit'], button.go, input[type='submit'], button")
        btn = None
        for b in btns:
            txt = (b.text or b.get_attribute("value") or "").strip().lower()
            if any(k in txt for k in ("continue", "confirm", "looks good",
                                       "ok", "next", "accept", "proceed", "verify")):
                btn = b
                break
        if not btn:
            for b in btns:
                if b.is_displayed() and b.is_enabled():
                    btn = b
                    break
        if not btn:
            print("  [geoverify] [WARN] No clickable button found")
            return False
        txt = (btn.text or btn.get_attribute("value") or "").strip()
        print(f"  [geoverify] Clicking: '{txt}'")
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
        time.sleep(0.3)
        try:
            driver.execute_script("arguments[0].click();", btn)
        except Exception:
            ActionChains(driver).move_to_element(btn).click().perform()
        try:
            WebDriverWait(driver, 15).until(lambda d: "s=geoverify" not in d.current_url)
            print(f"  [geoverify] [OK] Left geoverify -> {driver.current_url}")
            return True
        except TimeoutException:
            print(f"  [geoverify] Still on geoverify -- URL: {driver.current_url}")
            return False
    except Exception as e:
        print(f"  [geoverify] Error: {e}")
        return False


def _wait_for_images_page(driver, timeout=30):
    print("  [images] Waiting for image upload page...")
    print(f"  [images] Current URL before wait: {driver.current_url}")

    def _on_images_or_preview(d):
        url = d.current_url
        return (
            "s=images" in url
            or "s=preview" in url
            or d.find_elements(By.ID, "done_with_images_button")
            or d.find_elements(By.ID, "add_photos_button")
            or "done with images" in (d.page_source or "").lower()
        )

    try:
        WebDriverWait(driver, timeout).until(lambda d: (
            _on_images_or_preview(d) or "s=geoverify" in d.current_url
        ))
    except TimeoutException:
        print(f"  [images] Timed out waiting -- URL: {driver.current_url}")
        return False

    print(f"  [images] Landed on: {driver.current_url}")

    if "s=geoverify" in driver.current_url:
        print("  [images] [WARN] Geoverify page -- attempting bypass (3 attempts)...")
        for attempt in range(3):
            print(f"  [images] Geoverify attempt {attempt+1}/3")
            if _click_geoverify_button(driver):
                break
            time.sleep(3)

        if "s=geoverify" in driver.current_url:
            print("  [images] [WARN] Geoverify unpassable -- skipping images, going to publish.")
            return True

        try:
            WebDriverWait(driver, 20).until(_on_images_or_preview)
        except TimeoutException:
            if _on_images_or_preview(driver):
                pass
            else:
                print(f"  [images] Post-geoverify: CL skipped images -- URL: {driver.current_url}")
                return True

    print(f"  [images] Page ready -> {driver.current_url}")
    return True


def complete_images_step(driver, product: dict):
    # Wait for s=images (NOT s=editimage -- that was the local PC bug)
    cur = driver.current_url
    print(f"  [images] Checking URL: {cur}")

    if "s=images" not in cur and "s=preview" not in cur:
        print(f"  [images] Waiting for images/preview page...")
        try:
            WebDriverWait(driver, 25).until(lambda d: (
                "s=images" in d.current_url
                or "s=preview" in d.current_url
                or "s=geoverify" in d.current_url
                or d.find_elements(By.CSS_SELECTOR, "input[type='file']")
                or "done with images" in (d.page_source or "").lower()
            ))
            print(f"  [images] Landed: {driver.current_url}")
        except TimeoutException:
            print(f"  [images] Timed out waiting: {driver.current_url}")

        if "s=geoverify" in driver.current_url:
            print("  [images] Geoverify -- bypassing...")
            for _ in range(3):
                if _click_geoverify_button(driver):
                    break
                time.sleep(3)
            try:
                WebDriverWait(driver, 20).until(lambda d:
                    "s=images" in d.current_url or "s=preview" in d.current_url)
                print(f"  [images] Post-geoverify: {driver.current_url}")
            except TimeoutException:
                print(f"  [images] Post-geoverify timeout: {driver.current_url}")

    if "s=preview" in driver.current_url:
        photo_paths = product.get("photo_paths", []) or product.get("images", [])
        if photo_paths:
            print(f"  [images] On preview but product has {len(photo_paths)} image(s) -- navigating back to images page")
            # Navigate back to images page by replacing s=preview with s=images in URL
            base_url = re.sub(r'[?&]s=preview', '', driver.current_url)
            sep = "&" if "?" in base_url else "?"
            images_url = base_url + sep + "s=images"
            driver.get(images_url)
            human_delay(2, 3)
            print(f"  [images] Navigated to: {driver.current_url}")
            if "s=preview" in driver.current_url:
                print("  [images] CL redirected back to preview -- trying session reset...")
                # Try navigating to base post URL to get a fresh images step
                try:
                    base = re.sub(r'[?&]s=[^&]*', '', driver.current_url).rstrip('?&')
                    driver.get(base + "?s=images")
                    human_delay(3, 4)
                    if "s=preview" in driver.current_url:
                        print("  [images] Still on preview after reset -- images step unavailable")
                        return True
                    print(f"  [images] Session reset worked -> {driver.current_url}")
                except Exception as _e:
                    print(f"  [images] Session reset failed: {_e}")
                    return True
            # Fall through to the image upload logic below
        else:
            print("  [images] Already on preview -- no images to upload [OK]")
            return True

    if not _wait_for_images_page(driver):
        if "s=preview" in driver.current_url:
            print("  [images] Timed out but on preview -- continuing [OK]")
            return True
        if "s=geoverify" in driver.current_url:
            print("  [images] Stuck on geoverify -- skipping images, trying publish.")
            return True
        return False

    handle_captcha_if_present(driver)
    human_delay(2, 4)

    photo_paths = product.get("photo_paths", []) or product.get("images", [])
    temp_files = []
    valid = []
    _img_headers = {
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/124.0.0.0 Safari/537.36"),
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.google.com/",
    }
    for p in photo_paths:
        if isinstance(p, str) and p.startswith("http"):
            try:
                print(f"  [images] Downloading: {p[:80]}")
                # Many CDNs (uberprints, shopify, amazon, etc.) 403 the default
                # Python-urllib UA. Use a real browser UA + follow redirects.
                resp = requests.get(p, headers=_img_headers, timeout=30,
                                    allow_redirects=True, stream=True)
                resp.raise_for_status()
                ctype = (resp.headers.get("Content-Type") or "").lower()
                # pick a sane suffix from the content-type
                suffix = ".jpg"
                if "png" in ctype:   suffix = ".png"
                elif "webp" in ctype: suffix = ".webp"
                elif "gif" in ctype:  suffix = ".gif"
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
                tmp.write(resp.content)
                tmp.close()
                size = os.path.getsize(tmp.name)
                print(f"  [images] Downloaded {size} bytes ({ctype or 'unknown'}) -> {tmp.name}")
                # Guard: must be a real image, not an HTML error/anti-bot page
                is_image = ("image" in ctype) or resp.content[:3] in (
                    b"\xff\xd8\xff", b"\x89PN", b"GIF", b"RIF")
                if size > 1000 and is_image:
                    valid.append(tmp.name)
                    temp_files.append(tmp.name)
                else:
                    why = "not an image (CDN blocked / wrong URL)" if not is_image else f"tiny file ({size} bytes)"
                    print(f"  [images] Skipping -- {why}")
                    os.unlink(tmp.name)
            except Exception as e:
                print(f"  [images] Could not download {p[:80]}: {e}")
        elif isinstance(p, str) and os.path.isfile(p):
            valid.append(p)

    if photo_paths and not valid:
        print("  [images] [WARN] Product had image URL(s) but none downloaded "
              "successfully -- listing will post WITHOUT photos. Check the URLs "
              "are direct image links (ending in .jpg/.png) and publicly reachable.")

    try:
        if valid:
            print(f"  [images] Uploading {len(valid)} photo(s)...")
            driver.execute_script("""
                var inputs = document.querySelectorAll('input[type="file"]');
                inputs.forEach(function(el) {
                    el.style.display = 'block';
                    el.style.opacity = '1';
                    el.style.visibility = 'visible';
                    el.removeAttribute('hidden');
                });
            """)
            time.sleep(0.5)

            file_input = None
            for by, sel in [
                (By.ID, "fileInput"),
                (By.CSS_SELECTOR, "input[type='file']"),
                (By.XPATH, "//input[@type='file']"),
            ]:
                try:
                    file_input = driver.find_element(by, sel)
                    print(f"  [images] Found file input: {sel}")
                    break
                except NoSuchElementException:
                    continue

            if file_input:
                for path in valid:
                    abs_path = os.path.abspath(path)
                    print(f"  [images] Sending file: {abs_path}")
                    try:
                        # Make sure input is interactable before sending
                        driver.execute_script("""
                            var el = arguments[0];
                            el.style.display='block'; el.style.opacity='1';
                            el.style.visibility='visible'; el.removeAttribute('hidden');
                            el.removeAttribute('disabled');
                        """, file_input)
                        time.sleep(0.5)
                        file_input.send_keys(abs_path)
                        print(f"  [images] send_keys OK for: {abs_path}")
                    except Exception as _fe:
                        print(f"  [images] send_keys failed ({_fe}) -- retrying with fresh input find")
                        try:
                            file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
                            driver.execute_script("arguments[0].style.display='block';", file_input)
                            time.sleep(0.3)
                            file_input.send_keys(abs_path)
                        except Exception as _fe2:
                            print(f"  [images] Retry also failed: {_fe2}")
                    human_delay(3, 5)
                print(f"  [images] Sent {len(valid)} file(s) -- waiting for upload...")
                human_delay(8, 12)
                # Wait up to 60s for EITHER a thumbnail OR the 'done with images'
                # button to become available (whichever comes first). The old
                # fixed 30s + single button lookup made drafts fail when the
                # upload was merely slow.
                print("  [images] Waiting for upload thumbnail or done button...")
                deadline = time.time() + 60
                uploaded = 0
                while time.time() < deadline:
                    uploaded = driver.execute_script("""
                        return document.querySelectorAll(
                            '.thumb img, .upload-thumb img, img.preview, '
                            + '.image-thumbnail, li.thumb, .mosaic-cell'
                        ).length;
                    """)
                    if uploaded > 0:
                        print(f"  [images] Upload thumbnail appeared: {uploaded}")
                        break
                    # If the 'done with images' button is already clickable, the
                    # page is ready enough to move on even without a thumbnail.
                    done_ready = driver.execute_script("""
                        var bs = document.querySelectorAll("button, input[type=submit]");
                        for (var i=0;i<bs.length;i++){
                            var t=(bs[i].textContent||bs[i].value||'').toLowerCase();
                            if (t.indexOf('done')!==-1 && !bs[i].disabled) return true;
                        }
                        return false;
                    """)
                    if done_ready:
                        print("  [images] 'done with images' button is ready -- proceeding.")
                        break
                    time.sleep(1)

                if uploaded == 0:
                    print("  [images] [WARN] No thumbnail yet -- checking for upload errors...")
                    err = driver.execute_script("""
                        var e = document.querySelector('.upload-error, .file-error, .error');
                        return e ? e.textContent.trim() : null;
                    """)
                    if err:
                        print(f"  [images] Upload error on page: {err}")
                    else:
                        print("  [images] No error shown -- proceeding anyway")
            else:
                print("  [images] [WARN] No file input found on page")
                print(f"  [images] Page: {driver.current_url}")
        else:
            print("  [images] No photos in product -- skipping upload")

        done_selectors = [
            (By.ID, "done_with_images_button"),
            (By.XPATH, "//button[contains(translate(normalize-space(.),'DONE','done'),'done with images')]"),
            (By.XPATH, "//button[contains(translate(normalize-space(.),'DONE','done'),'done')]"),
            (By.CSS_SELECTOR, "button.done_with_images, button[class*='done']"),
            (By.XPATH, "//input[@type='submit' and contains(translate(@value,'DONE','done'),'done')]"),
            (By.CSS_SELECTOR, "button.bigbutton, button.go.bigbutton"),
            (By.CSS_SELECTOR, "button[type='submit'], input[type='submit']"),
        ]

        def _reached_preview(d):
            try:
                return ("s=preview" in d.current_url
                        or bool(d.find_elements(By.ID, "publish_bottom"))
                        or bool(d.find_elements(By.ID, "publish_top"))
                        or bool(d.find_elements(By.ID, "publish_button"))
                        or "unpublished draft" in (d.page_source or "").lower())
            except Exception:
                return False

        def _upload_in_progress(d):
            # CL keeps us on the image step while an upload is still running.
            # Detect an in-flight upload (progress bar / spinner / 'uploading')
            # so we WAIT instead of clicking 'done' too early.
            try:
                return bool(d.execute_script("""
                    var sel = '.upload-progress, .progressbar, .uploading, '
                            + '.spinner, progress, [class*="progress"]';
                    var els = document.querySelectorAll(sel);
                    for (var i=0;i<els.length;i++){
                        var s = window.getComputedStyle(els[i]);
                        if (s && s.display !== 'none' && s.visibility !== 'hidden') return true;
                    }
                    var t = (document.body.innerText||'').toLowerCase();
                    return t.indexOf('uploading') !== -1;
                """))
            except Exception:
                return False

        # The real fix: the ad won't advance to preview until the image has
        # FINISHED uploading. So we loop: wait for any in-flight upload to
        # settle, click 'done with images', and re-check for the preview page.
        reached = False
        for attempt in range(1, 6):
            if _reached_preview(driver):
                reached = True
                break

            # Wait out an in-progress upload before clicking done (up to ~25s).
            waited = 0
            while _upload_in_progress(driver) and waited < 25:
                print(f"  [images] Upload still in progress -- waiting... ({waited}s)")
                time.sleep(3)
                waited += 3

            _click_first(driver, done_selectors, "done with images")
            human_delay(2, 4)
            handle_captcha_if_present(driver)

            try:
                WebDriverWait(driver, 12).until(
                    lambda d: _reached_preview(d) or "s=editimage" not in d.current_url)
            except TimeoutException:
                pass

            if _reached_preview(driver):
                reached = True
                break

            print(f"  [images] Still on image step (attempt {attempt}/5) -- "
                  f"letting the upload finish...")
            time.sleep(6)

        # Last resort: force the preview URL directly.
        if not reached:
            cur = driver.current_url
            preview_url = (re.sub(r's=[^&]+', 's=preview', cur)
                           if "s=" in cur else
                           cur + ("&" if "?" in cur else "?") + "s=preview")
            print(f"  [images] Forcing preview URL: {preview_url}")
            try:
                driver.get(preview_url)
                _page_ready(driver)
                human_delay(2, 3)
            except Exception as _ne:
                print(f"  [images] Preview navigation failed: {_ne}")
            reached = _reached_preview(driver)

        if reached:
            print(f"  [images] [OK] Reached draft preview -> {driver.current_url}")
            return True

        # Genuinely stuck (image never finished). Return False so this draft is
        # marked failed instead of creating a broken/imageless '[No Title]' draft.
        url = driver.current_url
        print(f"  [images] [FAIL] Could not reach preview (image likely never "
              f"finished uploading) -- URL: {url}")
        return False
    finally:
        for tf in temp_files:
            try:
                os.unlink(tf)
            except Exception:
                pass


def upload_photos(driver, product: dict):
    return complete_images_step(driver, product)


def _wait_for_draft_preview(driver, timeout=20):
    try:
        WebDriverWait(driver, timeout).until(lambda d: (
            "s=preview" in d.current_url
            or d.find_elements(By.ID, "publish_bottom")
            or d.find_elements(By.ID, "publish_top")
            or d.find_elements(By.ID, "publish_button")
            or "unpublished draft" in (d.page_source or "").lower()
        ))
        print(f"  [publish] Draft page ready -> {driver.current_url}")
        return True
    except TimeoutException:
        print(f"  [publish] [WARN] Draft page not detected -- URL: {driver.current_url}")
        return False


def publish_listing(driver, ad_name, product):
    handle_captcha_if_present(driver)
    print("  [publish] Waiting for draft preview page...")
    _wait_for_draft_preview(driver)
    human_delay(2, 4)

    try:
        page_html = driver.execute_script("return document.body.innerHTML.substring(0, 3000);")
        print(f"  [publish] Page HTML snippet: {page_html[:1500]}")
    except Exception:
        pass

    published = False

    try:
        result = driver.execute_script("""
            var formIds = ['publish_bottom', 'publish_top'];
            for (var i = 0; i < formIds.length; i++) {
                var form = document.getElementById(formIds[i]);
                if (!form) continue;
                var btns = form.querySelectorAll('button, input[type=submit]');
                for (var j = 0; j < btns.length; j++) {
                    btns[j].scrollIntoView({block:'center'});
                    btns[j].click();
                    return 'clicked-form-btn:' + formIds[i] + ':' + (btns[j].textContent||btns[j].value||'').trim();
                }
                form.submit();
                return 'form-submit:' + formIds[i];
            }
            var allBtns = document.querySelectorAll('button, input[type=submit]');
            for (var k = 0; k < allBtns.length; k++) {
                var txt = (allBtns[k].textContent || allBtns[k].value || '').toLowerCase().trim();
                if (txt) {
                    allBtns[k].scrollIntoView({block:'center'});
                    allBtns[k].click();
                    return 'any-btn:' + txt;
                }
            }
            var links = document.querySelectorAll('a');
            for (var l = 0; l < links.length; l++) {
                var ltxt = (links[l].textContent || '').toLowerCase().trim();
                if (ltxt.indexOf('publish') !== -1 || ltxt.indexOf('confirm') !== -1 ||
                    ltxt.indexOf('post') !== -1 || ltxt.indexOf('submit') !== -1) {
                    links[l].click();
                    return 'link:' + ltxt;
                }
            }
            var anyForm = document.querySelector('form');
            if (anyForm) {
                anyForm.submit();
                return 'any-form-submit:' + (anyForm.id || anyForm.action || 'unknown');
            }
            return 'no-clickable-found';
        """)
        print(f"  [publish] JS result: {result}")
        time.sleep(6)
        cur = driver.current_url
        print(f"  [publish] URL after JS click: {cur}")
        if "s=preview" not in cur and "s=edit" not in cur:
            published = True
        elif result and result != 'no-clickable-found':
            if "thank" in driver.page_source.lower() or "success" in driver.page_source.lower():
                published = True
                print("  [publish] [OK] Success detected in page source")
    except Exception as e:
        print(f"  [publish] JS click failed: {e}")

    if not published:
        try:
            cur_url = driver.current_url
            confirm_url = cur_url.replace("?s=preview", "?s=fin")
            if confirm_url != cur_url:
                print(f"  [publish] Trying direct navigate: {confirm_url}")
                driver.get(confirm_url)
                time.sleep(4)
                if "s=preview" not in driver.current_url:
                    published = True
                    print("  [publish] [OK] Direct navigate worked")
        except Exception as e:
            print(f"  [publish] Direct navigate failed: {e}")

    if not published:
        try:
            for sel in ["#publish_bottom button", "#publish_top button",
                        "button[type='submit']", "input[type='submit']",
                        "button", "a[href*='confirm']"]:
                try:
                    btn = WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, sel)))
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                    time.sleep(0.5)
                    ActionChains(driver).move_to_element(btn).pause(0.5).click().perform()
                    print(f"  [publish] ActionChains on: '{sel}'")
                    time.sleep(5)
                    if "s=preview" not in driver.current_url:
                        published = True
                        break
                except Exception:
                    continue
        except Exception as e:
            print(f"  [publish] ActionChains sweep failed: {e}")

    if not published:
        print(f"  [publish] [FAIL] All methods failed -- URL: {driver.current_url}")
        try:
            print(f"  [publish] Full page title: {driver.title}")
            src = driver.page_source
            print(f"  [publish] Page source (2000 chars): {src[:2000]}")
        except Exception:
            pass
        return False

    human_delay(2, 3)
    handle_captcha_if_present(driver)

    listing_url = driver.current_url
    print(f"  [publish] [OK] Published -> {listing_url}")
    posted_listings[ad_name] = {
        "url": listing_url, "post_time": datetime.now(),
        "visitors": 0, "platform": "Craigslist",
    }
    _save_listings()
    return True


def _parse_delay(val, default_min=120, default_max=180):
    if not val:
        return default_min, default_max
    if isinstance(val, str):
        val = val.strip()
        if "-" in val:
            try:
                parts = val.split("-")
                return float(parts[0]), float(parts[1])
            except Exception:
                pass
        try:
            num = float(val)
            return num * 0.9, num * 1.1
        except Exception:
            pass
    elif isinstance(val, (int, float)):
        return val * 0.9, val * 1.1
    return default_min, default_max


def save_as_draft(driver, ad_name, product):
    """Take a fully-filled listing that has reached the preview/publish page
    and KEEP it as an unpublished draft instead of publishing.

    On Craigslist, once you reach the preview page the ad already lives in
    account/drafts as an "unpublished draft". So the job here is:
      * confirm we are on the preview/draft page,
      * click an explicit "save as draft" / "edit" control if one exists,
      * then navigate AWAY to the account page so the draft is flushed and
        we never accidentally hit publish.
    """
    handle_captcha_if_present(driver)
    print("  [draft] Waiting for draft preview page...")
    preview_reached = _wait_for_draft_preview(driver)
    human_delay(2, 4)

    draft_url = driver.current_url

    # Try to click an explicit "save as draft" / "back to account" style
    # control if CL renders one. This is best-effort -- reaching preview is
    # already enough to persist the draft.
    try:
        clicked = driver.execute_script("""
            var cands = document.querySelectorAll('a, button, input[type=submit]');
            for (var i=0;i<cands.length;i++){
                var t = (cands[i].textContent||cands[i].value||'').toLowerCase().trim();
                if (t.indexOf('save') !== -1 && t.indexOf('draft') !== -1){
                    cands[i].click();
                    return 'save-as-draft:'+t;
                }
            }
            for (var j=0;j<cands.length;j++){
                var t2 = (cands[j].textContent||cands[j].value||'').toLowerCase().trim();
                if (t2.indexOf('edit') !== -1 && t2.indexOf('image') === -1){
                    // 'edit' takes us back into the ad without publishing
                    return 'found-edit:'+t2;   // do NOT click, just note it
                }
            }
            return 'no-explicit-draft-control';
        """)
        print(f"  [draft] control scan: {clicked}")
    except Exception as e:
        print(f"  [draft] control scan failed: {e}")

    human_delay(1, 2)

    # Navigate to the drafts tab so the draft is flushed on CL's side
    # and we can verify it appears there.
    try:
        driver.get(DRAFTS_URL_DEFAULT)
        _page_ready(driver)
        human_delay(2, 3)
    except Exception:
        pass

    # Verification: navigate to drafts page and confirm the ad appears there (or preview URL was reached)
    in_drafts_list = False
    try:
        print("  [draft] Verifying draft saved on drafts page...")
        go_to_drafts_page(driver)
        _page_ready(driver)
        items = get_draft_items(driver)
        title_lower = (product.get("title") or product.get("name") or "").lower().strip()
        for item in items:
            if title_lower in item.text.lower():
                in_drafts_list = True
                break
    except Exception as e:
        print(f"  [draft] Verification page error: {e}")

    if not preview_reached and not in_drafts_list:
        print(f"  [draft] [FAIL] Draft for '{product.get('title')}' failed verification (preview_reached={preview_reached}, in_drafts_list={in_drafts_list})")
        return False

    print(f"  [draft] [OK] Kept and verified as draft (preview was: {draft_url}, in_drafts_list={in_drafts_list})")
    posted_listings[ad_name] = {
        "url": draft_url, "post_time": datetime.now(),
        "visitors": 0, "platform": "Craigslist", "status": "draft",
    }
    _save_listings()
    return True


# ─────────────────────────────────────────────────────────────────────────
# Bulk-publish existing DRAFTS from the account drafts page
# (craigslist.org/account/drafts). Instead of creating a new listing, this
# walks the UL of drafted ads and flips each one from Draft -> Published,
# waiting `wait_between_seconds` between each submission so CL doesn't
# flag the account. Handles pagination if the number of drafts exceeds
# what CL shows on one page.
# ─────────────────────────────────────────────────────────────────────────

# Real URL for the CL drafts tab (the old /account/drafts path returns 404)
DRAFTS_URL_DEFAULT = "https://accounts.craigslist.org/login/home?show_tab=drafts"


def _page_ready(driver, timeout=20):
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: d.execute_script("return document.readyState") == "complete")
    except TimeoutException:
        pass


def go_to_drafts_page(driver, base_url=DRAFTS_URL_DEFAULT):
    driver.get(base_url)
    _page_ready(driver)
    human_delay(2, 3)
    return driver.current_url


def get_draft_items(driver):
    """Return draft list items from the /account/drafts tab.

    The real CL drafts tab is at:
      https://accounts.craigslist.org/login/home?show_tab=drafts

    That page renders posted/draft rows in a table or list inside the
    account home page.  Selectors are tried in priority order.
    """
    selectors = [
        # Account home drafts tab: table rows with links
        "table.posting_table tbody tr",
        "table tbody tr.posting-row",
        "table tbody tr",
        # Some CL layouts use <li> or <p> rows
        "ul.rows > li.result-row",
        "ul.postings > li",
        "p.row",
        "p.result-row",
        # Older fallback table selectors
        "table#draftslist tbody tr",
        "tr[role='row']",
    ]
    for sel in selectors:
        try:
            items = driver.find_elements(By.CSS_SELECTOR, sel)
            valid_items = []
            for it in items:
                # Filter out rows that don't have draft edit/manage links
                has_draft_link = False
                for a in it.find_elements(By.TAG_NAME, "a"):
                    href = a.get_attribute("href") or ""
                    if "post.craigslist.org" in href or "/k/" in href or "s=" in href:
                        has_draft_link = True
                        break
                if has_draft_link:
                    valid_items.append(it)
            if valid_items:
                print(f"  [drafts] get_draft_items: {len(valid_items)} item(s) via '{sel}'")
                return valid_items
        except Exception:
            pass
    return []


def _get_draft_token(item):
    try:
        for a in item.find_elements(By.TAG_NAME, "a"):
            href = a.get_attribute("href") or ""
            # Extract the token part, e.g., /k/3JLp9m9XamnK7mgp3DU16e/0zO69
            match = re.search(r'/k/[^/?&]+(?:/[^/?&]+)?', href)
            if match:
                return match.group(0)
    except Exception:
        pass
    return None


def find_matching_product(title, products):
    if not products:
        return None
    title_lower = title.lower().strip()
    # Try exact match
    for p in products:
        p_title = (p.get("title") or p.get("name") or "").lower().strip()
        if p_title == title_lower:
            return p
    # Try substring match
    for p in products:
        p_title = (p.get("title") or p.get("name") or "").lower().strip()
        if p_title and (p_title in title_lower or title_lower in p_title):
            return p
    return None


def publish_draft_item(driver, item, products=None):
    """Publish a single draft by navigating directly to its preview page (?s=preview)
    (or images page if image upload is needed), uploading images if missing,
    and then clicking the Publish button.
    
    Retries once if it fails to publish or if page loading issues occur, and if still 
    failing, returns False so the caller skips to the next draft.
    """
    for attempt in range(1, 3):
        print(f"  [drafts] Attempt {attempt}/2 to publish draft...")
        try:
            # ── Find the draft's edit/manage link ─────────────────────────────
            link = None
            for a in item.find_elements(By.TAG_NAME, "a"):
                href = a.get_attribute("href") or ""
                if "post.craigslist.org" in href or "/k/" in href or "s=" in href:
                    link = a
                    break

            if not link:
                print("  [drafts] [FAIL] Could not find draft manage link in row.")
                return False

            href = link.get_attribute("href") or ""
            title = link.text.strip() or "(untitled)"

            # Rewrite the URL to go straight to s=preview instead of starting at s=area
            if "s=" in href:
                preview_url = re.sub(r's=[^&]+', 's=preview', href)
            else:
                sep = "&" if "?" in href else "?"
                preview_url = href + sep + "s=preview"

            print(f"  [drafts] Navigating directly to preview URL for '{title}': {preview_url}")
            driver.get(preview_url)
            _page_ready(driver)
            human_delay(2, 4)

            # Find matching product details if available
            product = None
            if products:
                product = find_matching_product(title, products)

            # Check if we landed on an image upload or need images
            cur_url = driver.current_url
            has_images_in_config = bool(product and (product.get("photo_paths") or product.get("images")))
            
            # Check if the preview page already displays images
            has_uploaded_images = False
            if "s=preview" in cur_url:
                try:
                    thumbs = driver.find_elements(By.CSS_SELECTOR, ".thumb img, .upload-thumb img, img.preview, .image-thumbnail, li.thumb, .mosaic-cell")
                    if thumbs:
                        has_uploaded_images = True
                except Exception:
                    pass

            # If we need images and none are uploaded, or if CL redirected us to s=images
            if "s=images" in cur_url or (has_images_in_config and not has_uploaded_images):
                print(f"  [drafts] Image upload needed for '{title}'...")
                if "s=preview" in cur_url:
                    images_url = re.sub(r's=preview', 's=images', cur_url)
                    driver.get(images_url)
                    _page_ready(driver)
                    human_delay(2, 3)
                
                if product:
                    print(f"  [drafts] Uploading missing images for '{title}'...")
                    complete_images_step(driver, product)
                    _wait_for_draft_preview(driver)

            # ── Confirm we reached the preview / publish page ─────────────────
            if not _wait_for_draft_preview(driver):
                print(f"  [drafts] [FAIL] Did not reach preview page (URL: {driver.current_url}).")
                if attempt == 1:
                    print("  [drafts] Retrying...")
                    continue
                return False

            # ── Find the publish button ───────────────────────────────────────
            # Real CL preview page may use several button containers; we try
            # them all, requiring the element to be visible and enabled.
            publish_btn = None
            publish_selectors = [
                # Explicit CL publish-form containers
                "#buttons_bottom button",
                "#buttons_top button",
                "#publish_bottom button",
                "#publish_top button",
                # Named submit buttons CL uses
                "button[name='go']",
                "input[type='submit'][name='go']",
                # Generic class-based selectors
                "button.go.bigbutton",
                "button.bigbutton",
                "button[type='submit']",
                "input[type='submit']",
            ]
            for sel in publish_selectors:
                for el in driver.find_elements(By.CSS_SELECTOR, sel):
                    if el.is_displayed() and el.is_enabled():
                        publish_btn = el
                        break
                if publish_btn:
                    break

            if not publish_btn:
                # Text-based fallback: any visible button mentioning publish/continue
                for el in driver.find_elements(By.XPATH,
                        "//button | //input[@type='submit']"):
                    val = (el.text or el.get_attribute("value") or "").lower()
                    if any(k in val for k in ("publish", "continue", "post", "confirm")):
                        if el.is_displayed() and el.is_enabled():
                            publish_btn = el
                            break

            if not publish_btn:
                print("  [drafts] [FAIL] Could not find publish button on preview page.")
                if attempt == 1:
                    print("  [drafts] Retrying...")
                    continue
                return False

            btn_label = (publish_btn.text or publish_btn.get_attribute("value") or "?").strip()
            print(f"  [drafts] Clicking publish button: '{btn_label}'...")
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", publish_btn)
            human_delay(0.5, 1.5)
            driver.execute_script("arguments[0].click();", publish_btn)
            _page_ready(driver)
            human_delay(3, 5)

            cur_url = driver.current_url
            print(f"  [drafts] URL after publish click: {cur_url}")
            return True

        except Exception as e:
            print(f"  [drafts] Exception on publish attempt {attempt}/2: {e}")
            if attempt == 1:
                print("  [drafts] Retrying...")
                continue
            return False
    return False


def find_next_page_link(driver):
    for sel in ["a.next", "a[rel='next']", "a[href*='page=']"]:
        for el in driver.find_elements(By.CSS_SELECTOR, sel):
            if el.get_attribute("rel") == "next" or "next" in (el.text or "").lower():
                return el
    return None


def _interruptible_sleep(seconds, stop_check=None, tick=2):
    """Sleep in small ticks so a stop signal (stop_check() -> True) can
    break the wait early instead of blocking for the full duration."""
    end = time.time() + seconds
    while time.time() < end:
        if stop_check and stop_check():
            print("  [drafts] Stop requested -- aborting wait.")
            return False
        time.sleep(min(tick, max(0, end - time.time())))
    return True


def publish_all_drafts(driver, base_url=DRAFTS_URL_DEFAULT,
                        max_drafts=None, wait_between_seconds=600,
                        batch_size=1, wait_between_batches=None,
                        stop_check=None, products=None):
    """
    Publish drafts from the account drafts table.

    * batch_size            -> how many drafts to publish back-to-back before
                               taking the long wait. batch_size=1 reproduces
                               the original "publish one, wait 10 min" rhythm.
    * wait_between_seconds  -> short pause between items INSIDE a batch
                               (kept human, e.g. 20-40s). Only used when
                               batch_size > 1.
    * wait_between_batches  -> long pause BETWEEN batches (default = 600s /
                               10 min). This is the "post them in patches"
                               cadence the user asked for.
    * max_drafts            -> cap the total number published (None = all).
    * stop_check            -> optional callable; if it returns True we stop
                               (used so the server's Kill button works during
                               the long waits).
    * products              -> products list to match drafts and download/upload images if needed.

    Pagination is handled automatically. After each publish the DOM is
    re-fetched, so already-published items don't reappear.
    """
    if wait_between_batches is None:
        wait_between_batches = 600 if batch_size > 1 else wait_between_seconds

    go_to_drafts_page(driver, base_url)
    published_count = 0
    in_batch = 0
    attempted_tokens = set()

    while True:
        if stop_check and stop_check():
            print("  [drafts] Stop requested -- ending publish phase.")
            break

        items = get_draft_items(driver)
        if not items:
            print("  [drafts] No draft items found on this page.")
            break

        print(f"  [drafts] Found {len(items)} draft(s) on current page.")

        while True:
            if stop_check and stop_check():
                print("  [drafts] Stop requested -- ending publish phase.")
                return published_count

            if max_drafts is not None and published_count >= max_drafts:
                print(f"  [drafts] Reached max_drafts={max_drafts}, stopping.")
                return published_count

            items = get_draft_items(driver)   # fresh each loop (DOM refreshes)
            if not items:
                break

            # Find the first item we haven't attempted yet
            item_to_publish = None
            token_to_publish = None
            for item in items:
                tok = _get_draft_token(item)
                if tok and tok not in attempted_tokens:
                    item_to_publish = item
                    token_to_publish = tok
                    break

            if not item_to_publish:
                print("  [drafts] All drafts on this page have been attempted.")
                break

            if token_to_publish:
                attempted_tokens.add(token_to_publish)

            ok = publish_draft_item(driver, item_to_publish, products=products)
            if not ok:
                # If draft publishing fails, log it and continue to the next draft
                print(f"  [drafts] [WARN] Could not publish draft '{token_to_publish}' -- skipping to next draft.")
                # Reload/refresh the drafts page to find the next one
                go_to_drafts_page(driver, base_url)
                continue

            _page_ready(driver)
            human_delay(2, 4)
            published_count += 1
            in_batch += 1
            print(f"  [drafts] [OK] Published draft #{published_count} "
                  f"(batch progress {in_batch}/{batch_size})")

            if max_drafts is not None and published_count >= max_drafts:
                return published_count

            if in_batch >= batch_size:
                in_batch = 0
                low, high = _parse_delay(wait_between_batches)
                sleep_secs = random.uniform(low, high)
                print(f"  [drafts] Batch complete -- waiting "
                      f"{sleep_secs:.1f}s (range: {low}-{high}) before next patch...")
                if not _interruptible_sleep(sleep_secs, stop_check):
                    return published_count
            elif wait_between_seconds:
                low, high = _parse_delay(wait_between_seconds)
                sleep_secs = random.uniform(low, high)
                print(f"  [drafts] Waiting {sleep_secs:.1f}s before "
                      f"next item in this batch...")
                if not _interruptible_sleep(sleep_secs, stop_check):
                    return published_count

            go_to_drafts_page(driver, base_url)  # reload list for the next item

        next_link = find_next_page_link(driver)
        if next_link:
            print("  [drafts] Moving to next page of drafts...")
            driver.execute_script("arguments[0].click();", next_link)
            _page_ready(driver)
            human_delay(2, 3)
        else:
            print("  [drafts] No further pages of drafts.")
            break

    print(f"  [drafts] Done. Published {published_count} draft(s) total.")
    return published_count


def _publish_preview_url(driver, preview_url, product=None, stop_check=None):
    """Navigate to a specific draft's preview URL and publish it.
    Re-fetches the publish button fresh on the page (never holds an element
    across navigation) so it can't raise stale-element errors."""
    for attempt in range(1, 3):
        if stop_check and stop_check():
            return False
        try:
            driver.get(preview_url)
            _page_ready(driver)
            human_delay(2, 4)

            cur_url = driver.current_url
            # If CL bounced us to the images step (or product has images not yet
            # uploaded), run the image step then come back to preview.
            has_images = bool(product and (product.get("photo_paths") or product.get("images")))
            has_thumbs = False
            if "s=preview" in cur_url:
                try:
                    has_thumbs = bool(driver.find_elements(
                        By.CSS_SELECTOR,
                        ".thumb img, .upload-thumb img, img.preview, "
                        ".image-thumbnail, li.thumb, .mosaic-cell"))
                except Exception:
                    pass
            if "s=images" in cur_url or (has_images and not has_thumbs and "s=preview" not in cur_url):
                if product:
                    print(f"  [drafts] Uploading images before publish...")
                    try:
                        complete_images_step(driver, product)
                        _wait_for_draft_preview(driver)
                    except Exception as _ie:
                        print(f"  [drafts] Image step warning: {_ie}")

            if not _wait_for_draft_preview(driver):
                print(f"  [drafts] [FAIL] Did not reach preview (URL: {driver.current_url}).")
                if attempt == 1:
                    print("  [drafts] Retrying...")
                    continue
                return False

            # Find the publish button FRESH on the current preview page.
            publish_btn = None
            publish_selectors = [
                "#buttons_bottom button", "#buttons_top button",
                "#publish_bottom button", "#publish_top button",
                "button[name='go']", "input[type='submit'][name='go']",
                "button.go.bigbutton", "button.bigbutton",
                "button[type='submit']", "input[type='submit']",
            ]
            for sel in publish_selectors:
                for el in driver.find_elements(By.CSS_SELECTOR, sel):
                    try:
                        if el.is_displayed() and el.is_enabled():
                            publish_btn = el
                            break
                    except Exception:
                        continue
                if publish_btn:
                    break
            if not publish_btn:
                for el in driver.find_elements(By.XPATH, "//button | //input[@type='submit']"):
                    try:
                        val = (el.text or el.get_attribute("value") or "").lower()
                        if any(k in val for k in ("publish", "continue", "post", "confirm")) \
                                and el.is_displayed() and el.is_enabled():
                            publish_btn = el
                            break
                    except Exception:
                        continue

            if not publish_btn:
                print("  [drafts] [FAIL] No publish button on preview page.")
                if attempt == 1:
                    print("  [drafts] Retrying...")
                    continue
                return False

            label = (publish_btn.text or publish_btn.get_attribute("value") or "?").strip()
            print(f"  [drafts] Clicking publish button: '{label}'...")
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", publish_btn)
            human_delay(0.5, 1.5)
            driver.execute_script("arguments[0].click();", publish_btn)
            _page_ready(driver)
            human_delay(3, 5)
            print(f"  [drafts] URL after publish click: {driver.current_url}")
            return True

        except Exception as e:
            print(f"  [drafts] Publish attempt {attempt}/2 error: {e}")
            if attempt == 1:
                print("  [drafts] Retrying...")
                continue
            return False
    return False


def publish_specific_drafts(driver, drafts, wait_between_seconds=20,
                            batch_size=1, wait_between_batches=None,
                            stop_check=None):
    """Publish ONLY the drafts created in THIS run.

    `drafts` is a list of dicts: {"url": <preview url>, "title": str,
    "product": dict}. We navigate to each stored preview URL and publish it,
    one by one with the configured delay. This deliberately does NOT touch
    other/older drafts sitting in the account, and never holds a drafts-table
    element across a navigation (so no stale-element errors).
    """
    drafts = [d for d in (drafts or []) if d.get("url")]
    if not drafts:
        print("  [drafts] No drafts from this run to publish.")
        return 0
    if wait_between_batches is None:
        wait_between_batches = "540-660"

    published = 0
    in_batch = 0
    for i, d in enumerate(drafts):
        if stop_check and stop_check():
            print("  [drafts] Stop requested -- ending publish phase.")
            break

        url = d["url"]
        title = d.get("title") or "(untitled)"
        product = d.get("product")
        preview_url = (re.sub(r's=[^&]+', 's=preview', url)
                       if "s=" in url else
                       url + ("&" if "?" in url else "?") + "s=preview")

        print(f"  [drafts] Publishing this-run draft {i + 1}/{len(drafts)}: "
              f"'{title}' -> {preview_url}")
        ok = _publish_preview_url(driver, preview_url, product=product, stop_check=stop_check)
        if not ok:
            print(f"  [drafts] [WARN] Could not publish '{title}' -- skipping.")
            continue

        published += 1
        in_batch += 1
        print(f"  [drafts] [OK] Published #{published} ('{title}')")

        # Mark as published in our listings record.
        ad_name = f"CL_{title}"
        try:
            if ad_name in posted_listings:
                posted_listings[ad_name]["status"] = "published"
                posted_listings[ad_name]["url"] = driver.current_url
                posted_listings[ad_name]["post_time"] = datetime.now()
                _save_listings()
        except Exception:
            pass

        # Delay before the next publish (unless this was the last one).
        if i < len(drafts) - 1:
            if in_batch >= batch_size:
                in_batch = 0
                low, high = _parse_delay(wait_between_batches)
            else:
                low, high = _parse_delay(wait_between_seconds)
            sleep_secs = random.uniform(low, high)
            print(f"  [drafts] Waiting {sleep_secs:.1f}s (range {low}-{high}) "
                  f"before next publish...")
            if not _interruptible_sleep(sleep_secs, stop_check):
                break

    print(f"  [drafts] Done. Published {published} of {len(drafts)} this-run draft(s).")
    return published


def post_product(driver, ad_name, product, draft_only=False):
    # draft_only=True  -> fill every step but STOP at preview and keep the ad
    #                     as an unpublished draft (no publish).
    # draft_only=False -> normal behaviour: publish immediately.
    #
    # FIX: never navigate to https://<city>.craigslist.org/post/... -- that URL
    # returns "Page Not Found" (404) for many regions (including chandigarh),
    # which then makes the area-check falsely print "Already past area page".
    # Proven working flow: account postings page -> "make new post" ->
    # post.craigslist.org -> the area-picker block below selects the region.
    print("  Navigating to account postings page...")
    driver.get("https://accounts.craigslist.org/login/home?show_tab=postings")
    human_delay(3, 5)
    handle_captcha_if_present(driver)
    try:
        new_post_link = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "make new post")))
        driver.execute_script("arguments[0].click();", new_post_link)
        print("  [OK] Clicked 'make new post'")
        human_delay(3, 5)
    except TimeoutException:
        driver.get("https://post.craigslist.org/c/sss")
        human_delay(4, 7)

    handle_captcha_if_present(driver)

    try:
        WebDriverWait(driver, 20).until(
            lambda d: d.execute_script("return document.readyState") == "complete")
    except TimeoutException:
        return False

    print(f"  Page title: {driver.title}")
    print(f"  Current URL: {driver.current_url}")

    if "login" in driver.current_url.lower():
        print("  [FAIL] Session expired.")
        return False

    _area_zip = (CL_ZIP or "").strip()
    if not _area_zip:
        _AREA_ZIPS = {
            "losangeles":"90001","newyork":"10001","chicago":"60601",
            "houston":"77001","phoenix":"85001","sfbay":"94102",
            "sandiego":"92101","seattle":"98101","miami":"33101",
            "dallas":"75201","denver":"80201","atlanta":"30301",
            "boston":"02101","portland":"97201",
        }
        _ck = CL_CITY.lower().replace(" ","").replace("-","")
        _area_zip = _AREA_ZIPS.get(_ck, "90001")

    # -- City selection (Railway version two-step logic) ----------------------
    cur = driver.current_url
    print(f"  [city] URL before city: {cur}")
    if "s=area" not in cur and "copyfromanother" not in cur:
        print(f"  [city] Already past area page")
    else:
        if "copyfromanother" in driver.current_url:
            try:
                skip = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH,
                        "//button[normalize-space(.)='skip'] | //input[@value='skip']")))
                driver.execute_script("arguments[0].click();", skip)
                human_delay(2, 3)
                print(f"  [city] Skipped copy page -> {driver.current_url}")
            except Exception:
                try:
                    cont = WebDriverWait(driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR,
                            "button[type='submit'], button.go")))
                    driver.execute_script("arguments[0].click();", cont)
                    human_delay(2, 3)
                except Exception as ce:
                    print(f"  [city] Could not leave copy page: {ce}")

        # ---- Robust area/region selection -------------------------------
        # CL's area page is a jQuery-UI selectmenu wrapping a NATIVE <select>.
        # A JS .click() on the <li> is frequently ignored by the widget — that
        # was the "dropdown doesn't select / always one city" bug. Instead we
        # drive the underlying native <select> directly (set value + dispatch a
        # real change event + refresh the widget). Works for ANY region, and
        # picks the sub-area the user chose rather than a fixed default.
        city_clicked = False
        want = (CL_SUBAREA or CL_CITY or "").lower().replace(" ", "").replace("-", "")

        def _norm(t):
            return (t or "").lower().replace(" ", "").replace("-", "")

        try:
            # 1) Find the native <select> that is the area picker.
            area_select = None
            best = -1
            for s in driver.find_elements(By.TAG_NAME, "select"):
                try:
                    n_opts = len(s.find_elements(By.TAG_NAME, "option"))
                    sid = (s.get_attribute("id") or "").lower()
                    sname = (s.get_attribute("name") or "").lower()
                    score = n_opts + (1000 if ("area" in sid or "area" in sname
                                               or "region" in sid or "sub" in sid) else 0)
                    if n_opts >= 1 and score > best:
                        best, area_select = score, s
                except Exception:
                    continue

            if area_select is not None:
                options = driver.execute_script("""
                    var s = arguments[0], out = [];
                    for (var i=0;i<s.options.length;i++){
                        out.push([s.options[i].value, (s.options[i].text||'').trim()]);
                    }
                    return out;
                """, area_select)
                print(f"  [city] Native area <select>: {len(options)} option(s)")

                chosen_val = chosen_txt = None
                # (a) match the desired sub-area / region
                if want:
                    for val, txt in options:
                        n = _norm(txt)
                        if val and (want in n or n in want):
                            chosen_val, chosen_txt = val, txt
                            break
                # (b) else first option with a real value (skip placeholders)
                if chosen_val is None:
                    for val, txt in options:
                        if val and _norm(txt) not in ("", "select", "selectone",
                                                      "choosearea", "selectarea"):
                            chosen_val, chosen_txt = val, txt
                            break
                # (c) last resort: first option
                if chosen_val is None and options:
                    chosen_val, chosen_txt = options[0]

                if chosen_val is not None:
                    driver.execute_script("""
                        var s = arguments[0], v = arguments[1];
                        s.value = v;
                        s.dispatchEvent(new Event('input',  {bubbles:true}));
                        s.dispatchEvent(new Event('change', {bubbles:true}));
                        try {
                            if (window.jQuery) {
                                jQuery(s).val(v).trigger('change');
                                if (jQuery(s).selectmenu) jQuery(s).selectmenu('refresh');
                            }
                        } catch(e) {}
                    """, area_select, chosen_val)
                    human_delay(0.4, 0.8)
                    cur_val = driver.execute_script("return arguments[0].value;", area_select)
                    if str(cur_val) == str(chosen_val):
                        city_clicked = True
                        print(f"  [OK] Selected area: '{chosen_txt}' (value={chosen_val})")
                    else:
                        print(f"  [city] Native set didn't stick (got '{cur_val}') -- widget fallback")

            # 2) Fallback: jQuery-UI <li> click (with scroll + ActionChains).
            if not city_clicked:
                city_button = WebDriverWait(driver, 6).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR,
                        "span.ui-selectmenu-button, span[id$='-button']")))
                driver.execute_script("arguments[0].click();", city_button)
                human_delay(0.6, 1.0)
                menu_items = WebDriverWait(driver, 5).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR,
                        "ul[id$='-menu'] li, ul.ui-selectmenu-menu li")))
                print(f"  [city] Widget fallback: {len(menu_items)} items")

                def _mtxt(m):
                    return (m.text.strip() or m.get_attribute("textContent") or "").strip()

                pick = None
                if want:
                    for m in menu_items:
                        n = _norm(_mtxt(m))
                        if n and (want in n or n in want):
                            pick = m
                            break
                if pick is None:
                    for m in menu_items:
                        if _mtxt(m):
                            pick = m
                            break
                if pick is not None:
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", pick)
                    driver.execute_script("arguments[0].click();", pick)
                    try:
                        ActionChains(driver).move_to_element(pick).click(pick).perform()
                    except Exception:
                        pass
                    city_clicked = True
                    print(f"  [OK] Selected area (widget): '{_mtxt(pick)}'")
                else:
                    available = [_mtxt(m) for m in menu_items[:8]]
                    print(f"  [city] No area matched '{CL_SUBAREA or CL_CITY}'. Available: {available}")

        except Exception as e:
            print(f"  [city] Area-select error: {e}")

        if not city_clicked:
            # Don't hard-abort: many regions auto-skip / accept the default area.
            # The post-continue URL check below catches a genuinely stuck page.
            print(f"  [city] [WARN] Couldn't explicitly pick an area for "
                  f"'{CL_SUBAREA or CL_CITY}' -- continuing with page default.")
        try:
            continue_btn = WebDriverWait(driver, 8).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR,
                    "button.go.pickbutton, button[class*='pickbutton'], button[type='submit']")))
            driver.execute_script("arguments[0].click();", continue_btn)
            print("  [OK] Submitted area page")
            try:
                WebDriverWait(driver, 15).until(
                    lambda d: "s=area" not in d.current_url and "copyfromanother" not in d.current_url)
                print(f"  [OK] Left area page -> {driver.current_url}")
            except TimeoutException:
                print(f"  [city] Still on area after 15s: {driver.current_url}")
        except Exception as ce:
            print(f"  [city] No continue btn: {ce}")

        if "s=area" in driver.current_url or "copyfromanother" in driver.current_url:
            print(f"  [FAIL] Could not leave area: {driver.current_url}")
            return False

    print(f"  [OK] Left area -> {driver.current_url}")
    handle_captcha_if_present(driver)
    human_delay(2, 4)

    # -- Subarea (s=subarea) ---------------------------------------------------
    if "s=subarea" in driver.current_url:
        print(f"  [subarea] On subarea page: {driver.current_url}")
        desired_subarea = (CL_SUBAREA or "").strip().lower()
        try:
            radios = WebDriverWait(driver, 10).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "input[type='radio']")))
            print(f"  [subarea] Found {len(radios)} radio options")
            picked = None
            if desired_subarea:
                for radio in radios:
                    try:
                        label = driver.execute_script(
                            "var lbl=document.querySelector('label[for=\"'+arguments[0].id+'\"]');"
                            "return lbl ? lbl.textContent.trim().toLowerCase() : '';", radio)
                        if desired_subarea in label or label in desired_subarea:
                            picked = radio
                            break
                    except Exception:
                        pass
            if not picked:
                picked = radios[0]
            driver.execute_script("arguments[0].click();", picked)
        except Exception as se:
            print(f"  [subarea] Error: {se}")
        try:
            cont = WebDriverWait(driver, 8).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR,
                    "button.go, button[type='submit'], input[type='submit']")))
            driver.execute_script("arguments[0].click();", cont)
            WebDriverWait(driver, 15).until(lambda d: "s=subarea" not in d.current_url)
            print(f"  [subarea] Left subarea -> {driver.current_url}")
        except Exception as ce:
            print(f"  [subarea] Continue error: {ce}")
        handle_captcha_if_present(driver)
        human_delay(2, 3)

    # -- Post type -------------------------------------------------------------
    try:
        WebDriverWait(driver, 15).until(
            lambda d: d.find_elements(By.CSS_SELECTOR, "input[value='fso']") or
                      "s=posttype" in d.current_url or
                      "s=type" in d.current_url or
                      (d.find_elements(By.CSS_SELECTOR, "input[type='radio']")
                       and "s=subarea" not in d.current_url))
        print("  [OK] Post type page loaded")
    except TimeoutException:
        return False

    fso_clicked = False
    for val in ['fso', 'fs', 'forsale', 'sss', 'for-sale', 'sale']:
        try:
            el = driver.find_element(By.CSS_SELECTOR, f"input[value='{val}']")
            driver.execute_script("arguments[0].click();", el)
            fso_clicked = True
            print(f"  [OK] Selected post type via input value='{val}'")
            break
        except NoSuchElementException:
            pass

    if not fso_clicked:
        try:
            labels = driver.find_elements(By.CSS_SELECTOR, "label")
            for lbl in labels:
                txt = (lbl.text or "").lower().strip()
                if "for sale" in txt or "forsale" in txt:
                    driver.execute_script("arguments[0].click();", lbl)
                    fso_clicked = True
                    print(f"  [OK] Selected post type via label: '{lbl.text.strip()}'")
                    break
        except Exception as e:
            print(f"  [post-type] Label search failed: {e}")

    if not fso_clicked:
        try:
            radios = WebDriverWait(driver, 5).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "input[type='radio']")))
            for r in radios:
                try:
                    displayed = driver.execute_script('return arguments[0].offsetParent !== null;', r)
                    if displayed:
                        driver.execute_script('arguments[0].click();', r)
                        fso_clicked = True
                        print(f'  [OK] Selected post type via first visible radio')
                        break
                except Exception:
                    continue
        except Exception as e:
            print(f'  [post-type] First radio fallback failed: {e}')

    if not fso_clicked:
        print("  [FAIL] Could not find 'for sale by owner'")
        return False

    human_delay(3, 5)
    handle_captcha_if_present(driver)

    # -- Category --------------------------------------------------------------
    cat_clicked = False
    mapped_label = CATEGORY_MAPPING.get(
        product.get("category", "").lower().strip(), (None, ""))[1]
    if not mapped_label:
        mapped_label = product.get("category", "")
    print(f"  Target category label: {mapped_label}")

    if mapped_label:
        try:
            target_lower = mapped_label.lower().strip()
            xpath = (f"//label[contains("
                     f"translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"
                     f", '{target_lower}')]")
            label_el = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, xpath)))
            driver.execute_script("arguments[0].click();", label_el)
            cat_clicked = True
            print(f"  [OK] Selected category via label: '{mapped_label}'")
        except Exception as e:
            print(f"  Category label failed: {e}")

    if not cat_clicked:
        try:
            ul_value = get_category_ul_value(product.get("category", ""))
            inp = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, f"input[type='radio'][value='{ul_value}']")))
            driver.execute_script("arguments[0].click();", inp)
            cat_clicked = True
            print(f"  [OK] Selected category via radio value={ul_value}")
        except Exception:
            pass

    if not cat_clicked:
        try:
            first_label = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "label.radio-option, label")))
            driver.execute_script("arguments[0].click();", first_label)
            cat_clicked = True
        except Exception:
            pass

    if not cat_clicked:
        return False

    human_delay(2, 3)
    try:
        continue_btn = WebDriverWait(driver, 8).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR,
                "button.go.pickbutton, button[class*='pickbutton'], button[type='submit']")))
        driver.execute_script("arguments[0].click();", continue_btn)
        print("  [OK] Clicked category continue button")
        try:
            WebDriverWait(driver, 20).until(
                lambda d: (
                    d.find_elements(By.ID, 'postingForm') or
                    ('s=cat' not in d.current_url and
                     's=type' not in d.current_url and
                     's=posttype' not in d.current_url)
                ))
            time.sleep(2)
            print("  [OK] postingForm visible after category selection")
        except TimeoutException:
            time.sleep(3)
        print(f"  Current URL after category continue: {driver.current_url}")
        handle_captcha_if_present(driver)
    except TimeoutException:
        human_delay(2, 3)

    click_relocation_if_needed(driver, ad_name)

    try:
        success = fill_listing_details(driver, product)
    except Exception as e:
        print(f"  [FAIL] fill_listing_details crashed: {e}")
        import traceback
        traceback.print_exc()
        return False

    if not success:
        return False

    if not complete_images_step(driver, product):
        print("  [FAIL] Failed at image upload step")
        return False

    if draft_only:
        if not save_as_draft(driver, ad_name, product):
            print("  [FAIL] Failed at save-as-draft step")
            return False
        return True

    if not publish_listing(driver, ad_name, product):
        print("  [FAIL] Failed at publish step")
        return False

    return True


def update_ad_analytics_periodically():
    return  # disabled locally


def run_bulk_with_driver(driver, products, config=None,
                         min_drafts=10, draft_gap_seconds=25,
                         publish_batch_size=1, wait_between_items=20,
                         wait_between_batches="120-180", mode="full",
                         drafts_url=DRAFTS_URL_DEFAULT,
                         stop_check=None, progress=None):
    """
    Run the ENTIRE draft-then-publish flow on ONE already-open driver.

    This is what the server calls so that a single persistent Chrome window
    is reused for every product (no new/temp browser per product). The driver
    is NOT quit here -- the caller owns its lifetime.

    * products      -> list of product dicts.
    * config        -> dict with city/zip/subarea/password/gmail/2captcha so
                       module globals are set correctly for this run.
    * mode          -> "full" | "draft" | "publish".
    * stop_check    -> callable returning True to abort.
    * progress      -> callable(str) for streaming status lines.
    """
    global CL_CITY, CL_ZIP, CL_SUBAREA, CL_PASSWORD, GMAIL_PASSWORD, TWO_CAPTCHA_API_KEY

    cfg = config or {}
    CL_CITY            = (cfg.get("city") or CL_CITY or "losangeles").strip()
    CL_ZIP             = str(cfg.get("zip_code") or CL_ZIP or "").strip()
    CL_SUBAREA         = (cfg.get("subarea") or cfg.get("city_name")
                          or cfg.get("state") or CL_SUBAREA or "").strip()
    CL_PASSWORD        = cfg.get("password", CL_PASSWORD) or ""
    GMAIL_PASSWORD     = (cfg.get("gmail_app_password") or GMAIL_PASSWORD or "").strip()
    TWO_CAPTCHA_API_KEY = (cfg.get("two_captcha_key") or TWO_CAPTCHA_API_KEY or "").strip()

    def _say(msg):
        print(msg)
        if progress:
            try:
                progress(msg if msg.endswith("\n") else msg + "\n")
            except Exception:
                pass

    _load_existing_listings()

    drafted = 0
    run_drafts = []   # only the drafts created in THIS run (url + title + product)
    if mode in ("full", "draft"):
        _say(f"=== DRAFT PHASE (target at least {min_drafts} draft(s)) ===")
        for i, product in enumerate(products):
            if stop_check and stop_check():
                _say("Stop requested -- ending draft phase.")
                break
            title = product.get("title") or product.get("name", "No Title")
            ad_name = f"CL_{title}"
            _say(f"Drafting {i + 1}/{len(products)}: {title}")
            try:
                ok = post_product(driver, ad_name, product, draft_only=True)
            except Exception as e:
                import traceback
                traceback.print_exc()
                _say(f"  [FAIL] draft crashed: {e}")
                ok = False
            if ok:
                drafted += 1
                # Record THIS draft's preview URL so the publish phase only
                # touches drafts we just made (not old/backlog drafts).
                entry = posted_listings.get(ad_name, {})
                run_drafts.append({
                    "url": entry.get("url"),
                    "title": title,
                    "product": product,
                })
                _say(f"  [OK] Drafted ({drafted} so far)")
            else:
                _say("  [FAIL] Draft failed")
            if i < len(products) - 1:
                low, high = _parse_delay(draft_gap_seconds, default_min=20, default_max=30)
                sleep_secs = random.uniform(low, high)
                _say(f"  [drafts] Waiting {sleep_secs:.1f}s before next draft...")
                if not _interruptible_sleep(sleep_secs, stop_check):
                    break
        _say(f"=== DRAFT PHASE DONE: {drafted} draft(s) created ===")
        if drafted < min_drafts:
            _say(f"  [WARN] Only {drafted} draft(s) created; {min_drafts} "
                 f"requested. Select/add more products to reach the target.")

    published = 0
    if mode in ("full", "publish") and not (stop_check and stop_check()):
        _say(f"=== PUBLISH PHASE (one by one, {wait_between_batches}s apart) ===")
        try:
            if mode == "full":
                # Publish ONLY the drafts we just created, by their preview URL.
                published = publish_specific_drafts(
                    driver, run_drafts,
                    wait_between_seconds=wait_between_items,
                    batch_size=publish_batch_size,
                    wait_between_batches=wait_between_batches,
                    stop_check=stop_check,
                )
            else:
                # Explicit publish-only mode: no draft phase ran this time, so
                # publish existing drafts from the account.
                published = publish_all_drafts(
                    driver, base_url=drafts_url, max_drafts=len(products),
                    wait_between_seconds=wait_between_items,
                    batch_size=publish_batch_size,
                    wait_between_batches=wait_between_batches,
                    stop_check=stop_check,
                    products=products,
                )
            _say(f"  [OK] Published {published} draft(s).")
        except Exception as e:
            import traceback
            traceback.print_exc()
            _say(f"  [FAIL] publish phase crashed: {e}")

    return {"drafted": drafted, "published": published}


def main():
    global CL_CITY, CL_PASSWORD, TWO_CAPTCHA_API_KEY, GMAIL_PASSWORD, CL_ZIP, CL_SUBAREA

    # ── Config source: a single job file written by the server (NO env vars).
    #    The server writes BASE_DIR/clb_job.json with everything the client
    #    typed in the UI + the chosen products. If that file is missing
    #    (e.g. running the script by hand), fall back to accounts.json +
    #    products.json so manual runs still work. ──────────────────────────────
    job = _load_job()
    acc = _load_account_data()

    email = (job.get("email", "").strip()
             or acc.get("email", "").strip())
    if not email:
        print("[FAIL] No Craigslist email provided. Type it in the UI and "
              "click Launch, or save it in accounts.json.")
        return

    CL_PASSWORD = (job.get("password", "")
                   or acc.get("password", ""))

    # Gmail app password — needed for IMAP to auto-read CL's verification code.
    GMAIL_PASSWORD = (job.get("gmail_app_password", "").strip()
                      or acc.get("gmail_app_password", "").strip())

    # 2captcha key — used by handle_captcha_if_present().
    TWO_CAPTCHA_API_KEY = (job.get("two_captcha_key", "").strip()
                           or acc.get("two_captcha_key", "").strip())

    # CL region slug (e.g. "losangeles", "newyork"). This is what decides which
    # city's craigslist we post to — it is NOT hardcoded; it comes straight
    # from what was selected in the UI for THIS run.
    CL_CITY = (job.get("city", "").strip()
               or acc.get("city", "").strip())
    if not CL_CITY:
        sel_idx = acc.get("selectedLocationIdx", -1)
        locations = acc.get("locations", [])
        if sel_idx >= 0 and sel_idx < len(locations):
            CL_CITY = (locations[sel_idx].get("state")
                       or locations[sel_idx].get("city") or CL_CITY)
    if not CL_CITY:
        CL_CITY = "losangeles"

    # ZIP + desired sub-area/region for the area-picker dropdown. These drive
    # the city/area selection so it is never stuck on one fixed value.
    CL_ZIP = (str(job.get("zip_code", "")).strip()
              or acc.get("zip", "").strip())
    # What to choose inside the area dropdown (a neighbourhood / sub-region).
    CL_SUBAREA = (job.get("subarea", "").strip()
                  or job.get("city_name", "").strip()
                  or job.get("state", "").strip())

    if not CL_PASSWORD:
        print("  [account] [WARN] No password provided. If this CL account "
              "uses email-code login, a Gmail app password is required.")
    if not GMAIL_PASSWORD:
        print("  [account] [WARN] No Gmail app password. If Craigslist asks "
              "for an emailed verification code, the run will stall.")

    print(f"  [account] Email:   {email}")
    print(f"  [account] Region:  {CL_CITY}   (sub-area target: {CL_SUBAREA or '—'})")
    print(f"  [account] 2captcha: {'set' if TWO_CAPTCHA_API_KEY else 'not set'}"
          f" | Gmail IMAP: {'set' if GMAIL_PASSWORD else 'not set'}")

    _load_existing_listings()

    proxy_url = job.get("proxy_url", "").strip() or None
    driver = make_driver(proxy_url=proxy_url, profile_key=email)

    # ── Session: reuse persistent profile / saved cookies, else a ONE-TIME
    #    manual login window. No automated credential typing by default. ──────
    allow_manual = bool(job.get("manual_login", True))
    manual_timeout = int(job.get("manual_login_timeout_min", 10))
    if not ensure_logged_in(driver, email, allow_manual=allow_manual,
                            manual_timeout_minutes=manual_timeout):
        print("  [session] [FAIL] Could not establish a logged-in session.")
        driver.quit()
        return

    # Products come from the job file first; else products.json.
    products = job.get("products")
    if isinstance(products, list) and products:
        print(f"  [products] Using {len(products)} product(s) from job file.")
    else:
        products_file = "products.json"
        print(f"  [products] No products in job -- reading {products_file}")
        if not os.path.exists(products_file):
            print(f"  [FAIL] Products file not found: {products_file}")
            driver.quit()
            return
        with open(products_file, encoding="utf-8") as f:
            products = json.load(f)
    print(f"  [products] Loaded {len(products)} product(s): " +
          str([p.get('title') or p.get('name') for p in products]))

    threading.Thread(target=update_ad_analytics_periodically, daemon=True).start()

    # ── Run mode (from job file) ────────────────────────────────────────────
    #   "full"    -> draft everything, then batch-publish the drafts (default)
    #   "draft"   -> only create drafts, don't publish
    #   "publish" -> only publish existing drafts (skip drafting)
    mode = (job.get("mode", "full") or "full").strip().lower()

    # Timing / batching knobs (all overridable from the job file).
    min_drafts          = int(job.get("min_drafts", 10))
    draft_gap_seconds   = int(job.get("draft_gap_seconds", 30))    # between drafts
    publish_batch_size  = int(job.get("publish_batch_size", 1))    # ads per patch
    # These support either a plain int (seconds) or a "min-max" range string
    # like "120-180" that _parse_delay() will turn into a random draw.
    wait_between_items  = job.get("wait_between_seconds", "20-30")   # inside a patch
    wait_between_batch  = job.get("wait_between_batches", "120-180")  # between patches
    drafts_url          = job.get("drafts_url", DRAFTS_URL_DEFAULT).strip() or DRAFTS_URL_DEFAULT

    drafted = 0
    if mode in ("full", "draft"):
        print(f"\n=== DRAFT PHASE (target: {len(products)} product(s)) ===")
        for idx, product in enumerate(products):
            product_title = product.get("title") or product.get("name", "No Title")
            ad_name = f"CL_{product_title}"
            print(f"\nDrafting {idx + 1}/{len(products)}: {product_title}")
            try:
                ok = post_product(driver, ad_name, product, draft_only=True)
            except Exception as e:
                print(f"  [FAIL] draft crashed for '{product_title}': {e}")
                import traceback
                traceback.print_exc()
                ok = False

            if ok:
                drafted += 1
                print(f"  [OK] Drafted ({drafted} so far)")
            else:
                # A failed draft is logged and skipped -- we continue to
                # the remaining products rather than aborting the whole run.
                print(f"  [WARN] Draft failed for '{product_title}' -- continuing to next product.")

            # Short randomized gap between drafts (human-paced, interruptible).
            if idx < len(products) - 1:
                low, high = _parse_delay(draft_gap_seconds, default_min=20, default_max=30)
                sleep_secs = random.uniform(low, high)
                print(f"  [drafts] Waiting {sleep_secs:.1f}s before next draft "
                      f"(range {low:.0f}–{high:.0f}s)...")
                _interruptible_sleep(sleep_secs)

        print(f"\n=== DRAFT PHASE DONE: {drafted}/{len(products)} draft(s) created ===")
        if drafted < min_drafts:
            # min_drafts is an informational target only -- it never blocks
            # the publish phase or requires additional products.
            print(f"  [INFO] {drafted} draft(s) created (informational target was "
                  f"{min_drafts}). Proceeding to publish phase.")

    if mode in ("full", "publish"):
        # In "full" mode publish exactly as many drafts as were successfully
        # drafted this run.  In "publish"-only mode publish everything on the
        # drafts page (max_drafts=None means no cap).
        _max_to_publish = drafted if mode == "full" else None
        print(f"\n=== PUBLISH PHASE (batch_size={publish_batch_size}, "
              f"delay={wait_between_batch}s, max={_max_to_publish or 'all'}) ===")
        try:
            published = publish_all_drafts(
                driver,
                base_url=drafts_url,
                max_drafts=_max_to_publish,
                wait_between_seconds=wait_between_items,
                batch_size=publish_batch_size,
                wait_between_batches=wait_between_batch,
                products=products,
            )
            print(f"  [OK] Published {published} draft(s).")
        except Exception as e:
            print(f"  [FAIL] publish phase crashed: {e}")
            import traceback
            traceback.print_exc()

    print("\nAll Craigslist work processed.")
    driver.quit()


if __name__ == "__main__":
    main()