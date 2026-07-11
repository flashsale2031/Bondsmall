# server.py — CLBlast backend
import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
import requests as req_lib

# ── Flask ────────────────────────────────────────────────────────────────────
try:
    from flask import Flask, Response, jsonify, request, send_from_directory
    from flask_cors import CORS
except ImportError:
    sys.exit(
        "Missing dependencies.\n"
        "Run:  pip install flask flask-cors\n"
    )

app = Flask(__name__)
CORS(app)  # enable CORS on all endpoints

@app.get("/")
def index():
    # Find the HTML file (try both names)
    for name in ["index.html", "clblast.html"]:
        if (BASE_DIR / name).exists():
            return send_from_directory(str(BASE_DIR), name)
    return "index.html not found in " + str(BASE_DIR), 404

@app.get("/<path:filename>")
def static_files(filename):
    return send_from_directory(str(BASE_DIR), filename)



# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent
PRODUCTS_JSON = BASE_DIR / "products.json"
LISTINGS_JSON = BASE_DIR / "posted_listings.json"
SUBSET_JSON   = BASE_DIR / "products_subset.json"
ACCOUNTS_JSON = BASE_DIR / "accounts.json"
JOB_FILE      = BASE_DIR / "clb_job.json"
SCRIPTS = {
    "craigslist":    BASE_DIR / "craigslist_new.py",
    "adlandpro":     BASE_DIR / "adlandpro.py",
    "classifiedads": BASE_DIR / "classifiedads.py",
}

# ── Global state (protected by _lock) ────────────────────────────────────────
_lock     = threading.Lock()
_proc     = None           # subprocess.Popen or None
_lines    = []             # list of str, stdout from running script
_status   = "idle"         # "idle"|"running"|"done"|"error"
_platform = ""

# ── Bulk Post state variables ──
_bulk_active = False
_bulk_next_post_time = 0.0
_bulk_current_product = ""
_bulk_remaining_count = 0

# ── Manual CL Login drivers (keyed by email) ──
LOGIN_DRIVERS = {}

# ── Single reused posting driver (so we never spawn a new/temp browser per
#    product). Keyed by "platform:email". This is the SAME window the whole
#    bulk run reuses. ──
_bulk_driver = None
_bulk_driver_key = None


class _LineTee:
    """A stdout-like object that appends every write to the live log (_lines)
    AND forwards it to the real stdout so nothing is lost."""
    def __init__(self, real):
        self._real = real
        self._buf = ""

    def write(self, s):
        try:
            self._real.write(s)
        except Exception:
            pass
        try:
            self._buf += s
            while "\n" in self._buf:
                line, self._buf = self._buf.split("\n", 1)
                with _lock:
                    _lines.append(line + "\n")
        except Exception:
            pass
        return len(s) if s else 0

    def flush(self):
        try:
            self._real.flush()
        except Exception:
            pass

    # ---- transparency so Selenium/uc/Chrome never trip over a missing attr --
    def fileno(self):
        return self._real.fileno()

    def isatty(self):
        try:
            return self._real.isatty()
        except Exception:
            return False

    def writable(self):
        return True

    def readable(self):
        return False

    @property
    def encoding(self):
        return getattr(self._real, "encoding", "utf-8")

    @property
    def errors(self):
        return getattr(self._real, "errors", "replace")

    @property
    def buffer(self):
        return getattr(self._real, "buffer", None)

    def __getattr__(self, name):
        # Anything not defined here -> delegate to the real stdout.
        # Guard private names to avoid recursion before __init__ finishes.
        if name.startswith("_"):
            raise AttributeError(name)
        return getattr(self.__dict__["_real"], name)


def _append_line(msg):
    with _lock:
        _lines.append(msg if msg.endswith("\n") else msg + "\n")

# ── Helpers ──────────────────────────────────────────────────────────────────
def _read_json(path: Path, default):
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default

def _read_products():
    """Load products sorted exactly like the /products endpoint.
    CRITICAL: browser checkbox indices are based on this sorted order.
    Using _read_json directly gives wrong products because products.json is unsorted."""
    products = _read_json(PRODUCTS_JSON, [])
    products.sort(key=lambda p: (p.get("title") or p.get("name") or "").lower())
    return products

def _write_json(path: Path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as exc:
        raise IOError(f"Could not write {path.name}: {exc}") from exc

# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/ping")
def ping():
    return jsonify({"ok": True, "time": datetime.now().isoformat()})

@app.get("/products")
def get_products():
    products = _read_json(PRODUCTS_JSON, [])
    # Case-insensitive alphabetical sorting by title/name
    products.sort(key=lambda p: (p.get("title") or p.get("name") or "").lower())
    return jsonify(products)

@app.get("/accounts/<platform>")
def get_accounts(platform):
    accounts_data = _read_json(ACCOUNTS_JSON, {})
    if platform == "2captcha":
        return jsonify(accounts_data.get(platform, {}))
    return jsonify(accounts_data.get(platform, []))

@app.post("/accounts/<platform>")
def save_accounts(platform):
    try:
        data = request.get_json(force=True)
        accounts_data = _read_json(ACCOUNTS_JSON, {})
        accounts_data[platform] = data
        _write_json(ACCOUNTS_JSON, accounts_data)
        return jsonify({"status": "ok"}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

@app.post("/products")
def add_product():
    product = request.get_json(force=True)
    if not isinstance(product, dict) or not (product.get("title") or product.get("name")):
        return jsonify({"error": "Invalid product — 'title' or 'name' is required"}), 400

    products = _read_json(PRODUCTS_JSON, [])
    products.append(product)
    _write_json(PRODUCTS_JSON, products)
    return jsonify({"ok": True, "index": len(products) - 1}), 201

@app.delete("/products/<int:idx>")
def delete_product(idx):
    products = _read_json(PRODUCTS_JSON, [])
    # Re-sort to match frontend indices
    products.sort(key=lambda p: (p.get("title") or p.get("name") or "").lower())
    if idx < 0 or idx >= len(products):
        return jsonify({"error": "Index out of range"}), 404
    products.pop(idx)
    _write_json(PRODUCTS_JSON, products)
    return jsonify({"ok": True})

@app.post("/sync-products")
def sync_products():
    try:
        products = request.get_json(force=True)
        if not isinstance(products, list):
            return jsonify({"error": "Expected a JSON array of products"}), 400
        _write_json(PRODUCTS_JSON, products)
        return jsonify({"status": "ok", "count": len(products)}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

@app.post("/ai/anthropic-proxy")
def anthropic_proxy():
    try:
        body = request.get_json(force=True) or {}
        anthropic_key = request.headers.get("X-Anthropic-Key") or os.environ.get("ANTHROPIC_KEY")
        if not anthropic_key:
            return jsonify({"error": "Anthropic API Key is required"}), 400

        messages = body.get("messages")
        max_tokens = body.get("max_tokens", 300)

        outbound_headers = {
            "Content-Type": "application/json",
            "x-api-key": anthropic_key,
            "anthropic-version": "2023-06-01"
        }
        outbound_body = {
            "model": "claude-sonnet-4-20250514",
            "max_tokens": max_tokens,
            "messages": messages
        }

        response = req_lib.post(
            "https://api.anthropic.com/v1/messages",
            headers=outbound_headers,
            json=outbound_body,
            timeout=30
        )
        
        try:
            return jsonify(response.json()), response.status_code
        except Exception:
            return Response(response.content, status=response.status_code, mimetype="application/json")
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

@app.get("/listings")
def get_listings():
    return jsonify(_read_json(LISTINGS_JSON, {}))


# ── Manual Login (all platforms) ─────────────────────────────────────────────
_LOGIN_MODULES = {
    "craigslist":    "craigslist_new",
    "adlandpro":     "adlandpro",
    "classifiedads": "classifiedads",
}

_PLATFORM_LABELS = {
    "craigslist":    "Craigslist",
    "adlandpro":     "AdLandPro",
    "classifiedads": "ClassifiedAds",
}

@app.post("/api/login-window")
@app.post("/api/craigslist/login-window")   # backward-compat alias
def platform_login_window():
    """Open a headed Chrome at the platform's login page using a persistent profile."""
    try:
        body = request.get_json(force=True) or {}
        email = (body.get("email") or "").strip()
        platform = (body.get("platform") or "craigslist").strip().lower()
        if not email:
            return jsonify({"ok": False, "error": "Email is required."}), 400
        if platform not in _LOGIN_MODULES:
            return jsonify({"ok": False, "error": f"Unknown platform '{platform}'."}), 400

        driver_key = f"{platform}:{email}"
        label = _PLATFORM_LABELS.get(platform, platform)

        # If a driver is already open for this platform+email, reuse it
        if driver_key in LOGIN_DRIVERS:
            try:
                LOGIN_DRIVERS[driver_key].title
                return jsonify({"ok": True, "message": f"{label} login window already open. Log in, then click 'I\u2019ve logged in'."})
            except Exception:
                LOGIN_DRIVERS.pop(driver_key, None)

        # Import the right module's open_login_window
        import importlib
        mod = importlib.import_module(_LOGIN_MODULES[platform])
        open_fn = mod.open_login_window

        result = {"driver": None, "error": None}

        def _open():
            try:
                result["driver"] = open_fn(email)
            except Exception as exc:
                result["error"] = str(exc)

        t = threading.Thread(target=_open, daemon=True)
        t.start()
        t.join(timeout=60)  # 60s: first run needs webdriver_manager download time

        if result["error"]:
            return jsonify({"ok": False, "error": result["error"]}), 500
        if result["driver"]:
            LOGIN_DRIVERS[driver_key] = result["driver"]
            return jsonify({"ok": True, "message": f"{label} login window opened. Log in, then click 'I\u2019ve logged in'."})
        else:
            return jsonify({"ok": False, "error": "Timed out opening Chrome."}), 500
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.post("/api/login-done")
@app.post("/api/craigslist/login-done")   # backward-compat alias
def platform_login_done():
    """Close the login Chrome window, flushing cookies to the persistent profile."""
    try:
        body = request.get_json(force=True) or {}
        email = (body.get("email") or "").strip()
        platform = (body.get("platform") or "craigslist").strip().lower()
        if not email:
            return jsonify({"ok": False, "error": "Email is required."}), 400

        driver_key = f"{platform}:{email}"
        driver = LOGIN_DRIVERS.pop(driver_key, None)
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
            return jsonify({"ok": True, "saved": True})
        else:
            return jsonify({"ok": True, "saved": False})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


def _get_or_open_posting_driver(platform, email, proxy_url=None):
    """Return ONE persistent, logged-in driver for this platform+email,
    reusing the manual-login window if it's still open so we post in the
    SAME browser where the server is running (never a new/temp browser)."""
    global _bulk_driver, _bulk_driver_key
    import importlib
    mod = importlib.import_module(_LOGIN_MODULES.get(platform, "craigslist_new"))

    key = f"{platform}:{email}"

    # 1) Reuse the already-open manual-login window if present + alive.
    drv = LOGIN_DRIVERS.get(key)
    if drv is not None:
        try:
            drv.title  # liveness probe
            _append_line("[CLBlast] Reusing the open login window for posting.\n")
            _bulk_driver, _bulk_driver_key = drv, key
            return mod, drv
        except Exception:
            LOGIN_DRIVERS.pop(key, None)

    # 2) Reuse a previous bulk driver if still alive.
    if _bulk_driver is not None and _bulk_driver_key == key:
        try:
            _bulk_driver.title
            _append_line("[CLBlast] Reusing existing posting browser.\n")
            return mod, _bulk_driver
        except Exception:
            _bulk_driver = None

    # 3) Otherwise open a single persistent-profile window (NOT temp).
    _append_line("[CLBlast] Opening one persistent Chrome window...\n")
    drv = mod.make_driver(proxy_url=proxy_url, profile_key=email)
    try:
        mod.ensure_logged_in(drv, email, allow_manual=True,
                             manual_timeout_minutes=10)
    except Exception as e:
        _append_line(f"[CLBlast] Session check warning: {e}\n")
    LOGIN_DRIVERS[key] = drv
    _bulk_driver, _bulk_driver_key = drv, key
    return mod, drv


def _run_bulk(body):
    global _proc, _status, _lines, _platform, _bulk_active, _bulk_next_post_time, _bulk_current_product, _bulk_remaining_count

    platform = body.get("platform", "").lower()
    email = body.get("email", "")
    password = body.get("password", "")
    two_captcha_key = body.get("two_captcha_key", "")
    craigslist_city = body.get("craigslist_city", "losangeles")
    zip_code  = body.get("zip_code", "")
    city_name = body.get("city_name", "")
    state     = body.get("state", "")
    product_indices = body.get("product_indices", [])
    account_label = body.get("account_label", "Account")
    interval_mins = float(body.get("interval", 10.0))
    mode = (body.get("mode") or "full").strip().lower()
    min_drafts = int(body.get("min_drafts", 10))
    proxy_url = (body.get("proxy_url") or "").strip() or None

    all_prods = _read_products()   # sorted = matches browser checkbox indices

    # Build the product list ONCE (with location injection) -- all of them go
    # into a SINGLE run on a SINGLE browser.
    products = []
    for prod_idx in product_indices:
        if prod_idx >= len(all_prods):
            continue
        prod = dict(all_prods[prod_idx])
        if zip_code:  prod["_location_zip"]   = zip_code
        if city_name: prod["_location_city"]  = city_name
        if state:     prod["_location_state"] = state
        products.append(prod)

    _bulk_active = True
    with _lock:
        _proc = None
        _lines.clear()
        _platform = platform
        _status = "running"
        _bulk_current_product = ""
        _bulk_remaining_count = len(products)
        _bulk_next_post_time = 0.0
        _lines.append(f"[CLBlast] Starting single-browser run for "
                      f"{len(products)} product(s)...\n")

    # Persist a job file too (so a manual `python craigslist_new.py` still works
    # and for auditing), but we DO NOT spawn it -- we run in-process.
    _write_json(JOB_FILE, {
        "platform": platform, "email": email, "password": password,
        "gmail_app_password": body.get("gmail_app_password", ""),
        "two_captcha_key": two_captcha_key, "city": craigslist_city,
        "zip_code": zip_code, "city_name": city_name, "state": state,
        "subarea": body.get("subarea", ""), "products": products,
        "mode": mode, "min_drafts": min_drafts,
    })

    config = {
        "city": craigslist_city, "zip_code": zip_code, "city_name": city_name,
        "state": state, "subarea": body.get("subarea", ""),
        "password": password, "gmail_app_password": body.get("gmail_app_password", ""),
        "two_captcha_key": two_captcha_key,
    }

    real_stdout = sys.stdout
    try:
        mod, driver = _get_or_open_posting_driver(platform, email, proxy_url)

        # Stream everything the automation prints into the live log.
        sys.stdout = _LineTee(real_stdout)
        try:
            result = mod.run_bulk_with_driver(
                driver,
                products,
                config=config,
                mode=mode,
                min_drafts=min_drafts,
                draft_gap_seconds=int(body.get("draft_gap_seconds", 30)),
                publish_batch_size=int(body.get("publish_batch_size", 1)),
                wait_between_items=int(body.get("wait_between_seconds", 20)),
                wait_between_batches=int(interval_mins * 60),
                drafts_url=body.get("drafts_url",
                                    "https://craigslist.org/account/drafts"),
                stop_check=lambda: not _bulk_active,
                progress=_append_line,
            )
        finally:
            sys.stdout = real_stdout

        _append_line(f"[CLBlast] Finished. Drafted={result.get('drafted')} "
                     f"Published={result.get('published')}\n")
    except Exception as e:
        sys.stdout = real_stdout
        import traceback
        traceback.print_exc()
        _append_line(f"[CLBlast] Error: {e}\n")

    # NOTE: we intentionally KEEP the driver open (stored in LOGIN_DRIVERS /
    # _bulk_driver) so the same browser is reused next time. Use the login
    # window's close button / /api/login-done to quit it.

    with _lock:
        _bulk_active = False
        _status = "done"
        _lines.append("[CLBlast] Bulk posting queue completed.\n")


@app.post("/bulk-post")
def bulk_post():
    global _status, _bulk_active
    body = request.get_json(force=True) or {}
    
    with _lock:
        # Auto-clear stale lock: if status is "running" but no live proc, reset it
        if (_status == "running" or _bulk_active) and (_proc is None or _proc.poll() is not None):
            _status = "idle"
            _bulk_active = False
        if _status == "running" or _bulk_active:
            return jsonify({"error": "busy"}), 409
            
    threading.Thread(target=_run_bulk, args=(body,), daemon=True).start()
    return jsonify({"ok": True})


@app.post("/post")
def launch_post():
    global _proc, _lines, _status, _platform

    body = request.get_json(force=True) or {}
    platform = body.get("platform", "").lower()

    if platform not in SCRIPTS:
        return jsonify({"error": f"Unknown platform '{platform}'"}), 400

    script = SCRIPTS[platform]
    if not script.exists():
        return jsonify({"error": f"Script not found: {script}"}), 500

    with _lock:
        # Auto-clear stale lock: if status is "running" but no live proc, reset it
        if _status == "running" and (_proc is None or _proc.poll() is not None):
            _status = "idle"
        if _status == "running":
            return jsonify({"error": "busy"}), 409

        # Handle product indices
        product_indices = body.get("product_indices")
        zip_code  = body.get("zip_code", "")
        city_name = body.get("city_name", "")
        state     = body.get("state", "")
        _subset_file = None  # unique temp file for this job

        if isinstance(product_indices, list) and len(product_indices) > 0:
            if not PRODUCTS_JSON.exists():
                return jsonify({"error": "products.json not found — add products first."}), 400

            all_prods = _read_products()   # sorted — matches browser checkbox indices
            # Deep-copy each dict so location injection doesn't mutate the shared list
            subset = [dict(all_prods[i]) for i in product_indices if i < len(all_prods)]
            if zip_code or city_name or state:
                for p in subset:
                    if zip_code:  p["_location_zip"]   = zip_code
                    if city_name: p["_location_city"]  = city_name
                    if state:     p["_location_state"] = state

            # Unique filename per job — prevents concurrent jobs from clobbering each other
            import uuid as _uuid
            _subset_file = BASE_DIR / f"clb_subset_{_uuid.uuid4().hex[:10]}.json"
            _write_json(_subset_file, subset)
            products_file = str(_subset_file)
            print(f"[server] Subset -> {_subset_file.name}: " +
                  str([p.get('title') or p.get('name') for p in subset]))
        else:
            if not PRODUCTS_JSON.exists():
                return jsonify({"error": "products.json not found — add products first."}), 400
            subset = _read_products()   # post everything if nothing selected
            products_file = str(PRODUCTS_JSON)
            print(f"[server] No selection -> using all {len(subset)} products")

        # Build the job file the script reads (NO env vars for client data).
        # Everything the client typed + the chosen products goes into one file.
        job = {
            "platform":           platform,
            "email":              body.get("email", ""),
            "password":           body.get("password", ""),
            "gmail_app_password": body.get("gmail_app_password", ""),
            "two_captcha_key":    body.get("two_captcha_key", ""),
            "city":               body.get("craigslist_city", "losangeles"),
            "zip_code":           zip_code,
            "city_name":          city_name,
            "state":              state,
            "subarea":            body.get("subarea", ""),
            "products":           subset,
        }
        _write_json(JOB_FILE, job)
        print(f"[server] Wrote {JOB_FILE.name}: "
              f"{len(subset)} product(s), region={job['city']}, "
              f"area={job['subarea'] or city_name or '-'}")

        # Minimal env: only encoding flags (needed for Windows unicode output).
        _email    = body.get("email", "")
        _password = body.get("password", "")
        _tckey    = body.get("two_captcha_key", "")
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8:replace"
        env["PYTHONUTF8"]       = "1"
        # AP/CA scripts read credentials from env vars rather than the job file
        if _email:    env["CL_EMAIL"]        = _email
        if _password: env["CL_PASSWORD"]     = _password
        if _tckey:    env["TWO_CAPTCHA_KEY"] = _tckey

        account_label = body.get("account_label", "Account")
        _lines = [f"[CLBlast] Starting {platform} / {account_label}...\n"]
        _status = "running"
        _platform = platform

        def _run():
            global _proc, _status, _bulk_active
            # Craigslist -> run in the SAME persistent browser (no subprocess,
            # no new/temp window per product). Other platforms keep subprocess.
            if platform == "craigslist":
                _bulk_active = True
                real_stdout = sys.stdout
                try:
                    mod, driver = _get_or_open_posting_driver(
                        platform, body.get("email", ""),
                        (body.get("proxy_url") or "").strip() or None)
                    sys.stdout = _LineTee(real_stdout)
                    try:
                        mod.run_bulk_with_driver(
                            driver, subset,
                            config={
                                "city": body.get("craigslist_city", "losangeles"),
                                "zip_code": zip_code, "city_name": city_name,
                                "state": state, "subarea": body.get("subarea", ""),
                                "password": body.get("password", ""),
                                "gmail_app_password": body.get("gmail_app_password", ""),
                                "two_captcha_key": body.get("two_captcha_key", ""),
                            },
                            mode=(body.get("mode") or "full"),
                            min_drafts=int(body.get("min_drafts", 10)),
                            draft_gap_seconds=int(body.get("draft_gap_seconds", 30)),
                            publish_batch_size=int(body.get("publish_batch_size", 1)),
                            wait_between_items=int(body.get("wait_between_seconds", 20)),
                            wait_between_batches=int(float(body.get("interval", 10.0)) * 60),
                            stop_check=lambda: not _bulk_active,
                            progress=_append_line,
                        )
                    finally:
                        sys.stdout = real_stdout
                    with _lock:
                        _status = "done"
                        _lines.append("[CLBlast] Done.\n")
                except Exception as exc:
                    sys.stdout = real_stdout
                    with _lock:
                        _status = "error"
                        _lines.append(f"[CLBlast] Error: {exc}\n")
                finally:
                    _bulk_active = False
                    try:
                        if _subset_file and _subset_file.exists():
                            _subset_file.unlink()
                    except Exception:
                        pass
                return

            try:
                proc = subprocess.Popen(
                    [sys.executable, "-u", str(script)],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    env=env,
                    cwd=str(BASE_DIR),
                    bufsize=1,
                )
                with _lock:
                    _proc = proc

                for line in proc.stdout:
                    with _lock:
                        _lines.append(line)

                proc.wait()
                with _lock:
                    rc = proc.returncode
                    _status = "done" if rc == 0 else "error"
                    _lines.append(f"[CLBlast] Script exited with code {rc}\n")
            except Exception as exc:
                with _lock:
                    _status = "error"
                    _lines.append(f"[CLBlast] Error: {exc}\n")
            finally:
                try:
                    if _subset_file and _subset_file.exists():
                        _subset_file.unlink()
                        print(f"[server] Cleaned up {_subset_file.name}")
                except Exception:
                    pass

        threading.Thread(target=_run, daemon=True).start()

    return jsonify({"ok": True, "platform": platform, "job_id": 1})

@app.get("/post/status")
def post_status():
    with _lock:
        now = time.time()
        time_left = max(0, int(_bulk_next_post_time - now)) if _bulk_active and _bulk_next_post_time > now else 0
        return jsonify({
            "status":   _status,
            "platform": _platform,
            "lines":    len(_lines),
            "bulk_active": _bulk_active,
            "bulk_time_left": time_left,
            "bulk_current_product": _bulk_current_product,
            "bulk_remaining_count": _bulk_remaining_count
        })

@app.post("/post/kill")
def kill_post():
    global _proc, _status, _bulk_active
    with _lock:
        _bulk_active = False
        if _proc:
            try:
                _proc.terminate()
            except Exception:
                pass
        _status = "idle"  # Always force-reset regardless of current state
        _lines.append("[CLBlast] Job terminated by user.\n")
    return jsonify({"ok": True})

@app.post("/post/reset")
def reset_post():
    """Force-clear any stuck job lock. Use when server shows 'busy' after a crash."""
    global _proc, _status, _bulk_active
    with _lock:
        _bulk_active = False
        _status = "idle"
        if _proc:
            try:
                _proc.terminate()
            except Exception:
                pass
            _proc = None
        _lines.append("[CLBlast] Server lock force-reset.\n")
    return jsonify({"ok": True, "message": "Server lock cleared. Ready for new jobs."})

@app.get("/post/stream")
def post_stream():
    try:
        from_idx = max(0, int(request.args.get("from", 0)))
    except (ValueError, TypeError):
        from_idx = 0
    def _generate():
        sent = from_idx
        while True:
            with _lock:
                new_lines = _lines[sent:]
                status    = _status

            for line in new_lines:
                safe = line.rstrip("\n").replace("\n", " ")
                yield f"data: {safe}\n\n"
                sent += 1

            if status in ("done", "error") and sent >= len(_lines):
                yield f"event: done\ndata: {status}\n\n"
                break

            time.sleep(0.25)

    return Response(
        _generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

# ── JavaScript login window (Node + Puppeteer) ───────────────────────────────
# Opens a login window via platform_login.js (Node/Puppeteer) for platforms that
# support it (craigslist, classifiedads). For other platforms (e.g. adlandpro)
# it falls back to the existing Python login window so the button still works.
_JS_LOGIN_PROC = {}   # "platform:email" -> Popen
_JS_LOGIN_PLATFORMS = {"craigslist", "classifiedads"}


def _open_python_login(platform, email, proxy_url=None):
    """Fallback: open the platform's Python/Selenium login window (same as
    /api/login-window) and stash the driver so /api/login-done can save it."""
    import importlib
    mod = importlib.import_module(_LOGIN_MODULES[platform])
    driver = mod.open_login_window(email, proxy_url=proxy_url)
    LOGIN_DRIVERS[f"{platform}:{email}"] = driver
    return driver


@app.post("/api/login-window-js")
def login_window_js():
    try:
        body = request.get_json(force=True) or {}
        email = (body.get("email") or "").strip()
        platform = (body.get("platform") or "craigslist").strip().lower()
        if not email:
            return jsonify({"ok": False, "error": "Email is required."}), 400
        if platform not in _LOGIN_MODULES:
            return jsonify({"ok": False, "error": f"Unknown platform '{platform}'."}), 400

        # Platforms without a JS login script -> use the proven Python window.
        if platform not in _JS_LOGIN_PLATFORMS:
            try:
                _open_python_login(platform, email,
                                   (body.get("proxy_url") or "").strip() or None)
                label = _PLATFORM_LABELS.get(platform, platform)
                return jsonify({"ok": True, "message": f"{label} login window opening "
                                "(desktop). Log in, then click 'I've logged in'."})
            except Exception as exc:
                return jsonify({"ok": False, "error": f"Python login failed: {exc}"}), 500

        script = BASE_DIR / "platform_login.js"
        if not script.exists():
            return jsonify({"ok": False, "error": "platform_login.js not found in project folder."}), 500

        key = f"{platform}:{email}"
        p = _JS_LOGIN_PROC.get(key)
        if p and p.poll() is None:
            return jsonify({"ok": True, "message": "Login window already open."})

        import shutil as _sh
        node_bin = _sh.which("node")
        if not node_bin:
            return jsonify({"ok": False,
                            "error": "Node.js not found on PATH. Install Node and run "
                                     "`npm install` in the project folder first."}), 500

        env = os.environ.copy()
        env.setdefault("PYTHONUTF8", "1")
        proc = subprocess.Popen(
            [node_bin, str(script), platform, email],
            cwd=str(BASE_DIR), env=env,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
        )
        _JS_LOGIN_PROC[key] = proc

        def _pump():
            try:
                for line in proc.stdout:
                    _append_line(line)
            except Exception:
                pass
        threading.Thread(target=_pump, daemon=True).start()

        return jsonify({"ok": True, "message": "Login window opening. Log in; "
                                               "the session saves automatically."})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


if __name__ == "__main__":
    print("+--------------------------------------+")
    print("|  CLBlast local server  - port 5000   |")
    print("|  Open clblast.html in your browser   |")
    print("+--------------------------------------+")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)