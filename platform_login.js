/**
 * platform_login.js — generalized manual-login window (Node + Puppeteer).
 *
 * Opens a real Chrome window using the SAME persistent profile dir the given
 * platform's Python engine uses, navigates to that platform's login page, waits
 * for YOU to log in by hand, and (where the engine reads a cookie file) dumps
 * cookies in the shape Python's load_cookies() expects. The shared profile dir
 * means the Python side reuses the session automatically.
 *
 * Run:
 *   node platform_login.js <platform> <email>
 *   e.g. node platform_login.js craigslist you@gmail.com
 *        node platform_login.js classifiedads you@gmail.com
 *   (email optional: falls back to clb_job.json, then accounts.json)
 *
 * Supported platforms: craigslist, classifiedads.
 * (adlandpro is handled by the Python login window on the server side.)
 *
 * NOTE: page-level JavaScript in a normal web page canNOT read a site's
 * httpOnly session cookie. Puppeteer can, because it drives Chrome over the
 * DevTools protocol — that's why this is a Node script, not front-end page JS.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

let puppeteer;
try { puppeteer = require("puppeteer-core"); }
catch { puppeteer = require("puppeteer"); }

const BASE_DIR = __dirname;
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const POLL_MS = 2000;

// Per-platform config. profileBase + hash must match each Python engine's
// _profile_dir_for() so the session is shared.
const PLATFORMS = {
  craigslist: {
    label: "Craigslist",
    profileBase: "chrome_profiles",                        // craigslist_new.py
    loginUrl: "https://accounts.craigslist.org/login",
    loggedIn: ["log out", "logout", "logged in as"],
    cookieDomain: "craigslist.org",
    // craigslist_new.load_cookies() reads cl_cookies_<hash>.json
    cookieFile: (hash) => `cl_cookies_${hash}.json`,
    writeCookies: true,
  },
  classifiedads: {
    label: "ClassifiedAds",
    profileBase: "chrome_profiles_ca",                     // classifiedads.py
    loginUrl: "https://www.classifiedads.com/users/sign_in",
    loggedIn: ["sign out", "log out", "logout", "my account", "my ads", "post ad"],
    cookieDomain: "classifiedads.com",
    // classifiedads.py relies purely on the persistent profile (no cookie file).
    writeCookies: false,
  },
};

function md5short(s) {
  return crypto.createHash("md5").update(s || "default").digest("hex").slice(0, 12);
}

function profileDirFor(cfg, email) {
  const dir = path.join(BASE_DIR, cfg.profileBase, md5short(email));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveEmail() {
  const argEmail = process.argv[3];
  if (argEmail) return argEmail.trim();
  try {
    const job = JSON.parse(fs.readFileSync(path.join(BASE_DIR, "clb_job.json"), "utf-8"));
    if (job.email) return String(job.email).trim();
  } catch {}
  try {
    const acc = JSON.parse(fs.readFileSync(path.join(BASE_DIR, "accounts.json"), "utf-8"));
    const platform = (process.argv[2] || "craigslist").trim();
    const row = (acc[platform] || [])[0];
    if (row && row.email) return String(row.email).trim();
  } catch {}
  return "";
}

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH))
    return process.env.CHROME_PATH;
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
        ]
      : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function isLoggedInText(txt, signals) {
  const t = (txt || "").toLowerCase();
  return signals.some((s) => t.includes(s));
}

function toPyCookie(c) {
  const out = {
    domain: c.domain,
    httpOnly: !!c.httpOnly,
    name: c.name,
    path: c.path || "/",
    secure: !!c.secure,
    value: c.value,
  };
  if (c.sameSite) out.sameSite = c.sameSite;
  if (!c.session && typeof c.expires === "number" && c.expires > 0) {
    out.expiry = Math.floor(c.expires);
  }
  return out;
}

async function main() {
  const platform = (process.argv[2] || "craigslist").trim().toLowerCase();
  const cfg = PLATFORMS[platform];
  if (!cfg) {
    console.error(`[login] Unsupported platform '${platform}'. `
      + `Supported: ${Object.keys(PLATFORMS).join(", ")}.`);
    process.exit(3); // server treats exit 3 as "no JS login -> fall back to Python"
  }

  const email = resolveEmail();
  if (!email) {
    console.error("[login] No email. Pass it: node platform_login.js "
      + platform + " you@example.com");
    process.exit(2);
  }

  const userDataDir = profileDirFor(cfg, email);
  const executablePath = findChrome();

  console.log("=".repeat(60));
  console.log(`  ${cfg.label.toUpperCase()} MANUAL LOGIN (JavaScript / Puppeteer)`);
  console.log("  A Chrome window will open. Log in by hand.");
  console.log("  The session is saved and reused by the posting engine.");
  console.log(`  platform  : ${platform}`);
  console.log(`  email     : ${email}`);
  console.log(`  profile   : ${userDataDir}`);
  console.log(`  chrome    : ${executablePath || "(puppeteer bundled Chromium)"}`);
  console.log("=".repeat(60));

  const launchOpts = {
    headless: false,
    defaultViewport: null,
    userDataDir,
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-blink-features=AutomationControlled",
      "--start-maximized",
    ],
  };
  if (executablePath) launchOpts.executablePath = executablePath;

  const browser = await puppeteer.launch(launchOpts);
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  try {
    await page.goto(cfg.loginUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch (e) {
    console.log(`[login] Initial navigation warning: ${e.message}`);
  }

  const client = await page.target().createCDPSession();
  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  let loggedIn = false;

  while (Date.now() < deadline) {
    let txt = "";
    try {
      txt = await page.evaluate(() => (document.body ? document.body.innerText : ""));
    } catch {}
    if (isLoggedInText(txt, cfg.loggedIn)) { loggedIn = true; break; }
    const secsLeft = Math.round((deadline - Date.now()) / 1000);
    console.log(`[login] Waiting for you to log in... (${secsLeft}s left)`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  if (!loggedIn) {
    console.error("[login] Timed out waiting for manual login.");
    await browser.close();
    process.exit(1);
  }

  const saveCookiesOnce = async () => {
    if (!(cfg.writeCookies && cfg.cookieFile)) return;
    let all = [];
    try {
      const res = await client.send("Network.getAllCookies");
      all = res.cookies || [];
    } catch (e) {
      all = await page.cookies().catch(() => []);
    }
    const cookies = all
      .filter((c) => (c.domain || "").includes(cfg.cookieDomain))
      .map(toPyCookie);
    try {
      const cookiesPath = path.join(BASE_DIR, cfg.cookieFile(md5short(email)));
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), "utf-8");
      console.log(`[login] [OK] Saved ${cookies.length} cookie(s) -> ${path.basename(cookiesPath)}`);
    } catch (e) {
      console.log(`[login] cookie save failed: ${e.message}`);
    }
  };

  await saveCookiesOnce();
  if (!(cfg.writeCookies && cfg.cookieFile)) {
    console.log("[login] [OK] Session stored in the persistent profile "
      + "(no separate cookie file needed for this platform).");
  }

  console.log("[login] Login complete. The window will STAY OPEN.");
  console.log("[login] You can browse here. Close the window yourself when done.");
  console.log("[login] NOTE: close this window BEFORE starting a posting run "
    + "(both share the same Chrome profile, which one process can use at a time).");

  // Keep the session file fresh while the window stays open.
  const refresh = setInterval(() => { saveCookiesOnce().catch(() => {}); }, 30000);

  // Exit only when the user actually closes the Chrome window.
  browser.on("disconnected", () => {
    clearInterval(refresh);
    console.log("[login] Window closed. Session saved. Bye.");
    process.exit(0);
  });

  // Keep the Node process alive indefinitely (until the browser is closed).
  await new Promise(() => {});
}

main().catch((e) => {
  console.error("[login] Fatal:", e);
  process.exit(1);
});
