/**
 * cl_login.js — Craigslist manual-login window in JavaScript (Node + Puppeteer).
 *
 * Replaces the Python/Selenium login window. It:
 *   1. Opens a real Chrome window using the SAME persistent profile dir the
 *      Python posting engine uses  ->  chrome_profiles/<md5(email)[:12]>
 *   2. Navigates to the Craigslist login page and waits for YOU to log in
 *      by hand (email + password + any emailed code).
 *   3. On detecting a logged-in session, dumps cookies to
 *      cl_cookies_<md5(email)[:12]>.json  in the EXACT shape Python's
 *      load_cookies() reads, then closes the window.
 *
 * Because it shares the same profile dir + cookie file, the Python side
 * (ensure_logged_in / load_cookies) picks the session up automatically —
 * no code change needed on the posting side.
 *
 * Run:
 *   npm install
 *   node cl_login.js navvv619@gmail.com
 *   (email optional: falls back to clb_job.json, then accounts.json)
 *
 * NOTE: page-level JavaScript in a normal web page canNOT read Craigslist's
 * httpOnly session cookie. Puppeteer can, because it drives Chrome over the
 * DevTools protocol (same capability Selenium had) — that's why this is a
 * Node script, not front-end page JS.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

// puppeteer-core keeps the install light and uses your installed Chrome.
// If you prefer the bundled Chromium, `npm i puppeteer` and require("puppeteer").
let puppeteer;
try { puppeteer = require("puppeteer-core"); }
catch { puppeteer = require("puppeteer"); }

const BASE_DIR = __dirname;
const LOGIN_URL = "https://accounts.craigslist.org/login";
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const POLL_MS = 2000;

function md5short(s) {
  return crypto.createHash("md5").update(s || "default").digest("hex").slice(0, 12);
}

function profileDirFor(email) {
  const dir = path.join(BASE_DIR, "chrome_profiles", md5short(email));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cookiesPathFor(email) {
  return path.join(BASE_DIR, `cl_cookies_${md5short(email)}.json`);
}

function resolveEmail() {
  const argEmail = process.argv[2];
  if (argEmail) return argEmail.trim();
  // fall back to clb_job.json, then accounts.json (matches the Python side)
  try {
    const job = JSON.parse(fs.readFileSync(path.join(BASE_DIR, "clb_job.json"), "utf-8"));
    if (job.email) return String(job.email).trim();
  } catch {}
  try {
    const acc = JSON.parse(fs.readFileSync(path.join(BASE_DIR, "accounts.json"), "utf-8"));
    const cl = (acc.craigslist || [])[0];
    if (cl && cl.email) return String(cl.email).trim();
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
  return null; // let puppeteer use its bundled Chromium if available
}

function isLoggedInText(txt) {
  const t = (txt || "").toLowerCase();
  return (
    t.includes("log out") ||
    t.includes("accounts.craigslist.org/logout") ||
    t.includes("logged in as")
  );
}

// Map a CDP cookie to the JSON shape Python's load_cookies() expects.
function toPyCookie(c) {
  const out = {
    domain: c.domain,
    httpOnly: !!c.httpOnly,
    name: c.name,
    path: c.path || "/",
    secure: !!c.secure,
    value: c.value,
  };
  if (c.sameSite) out.sameSite = c.sameSite; // Python pops this anyway
  if (!c.session && typeof c.expires === "number" && c.expires > 0) {
    out.expiry = Math.floor(c.expires); // seconds, int
  }
  return out;
}

async function main() {
  const email = resolveEmail();
  if (!email) {
    console.error("[cl-login] No email. Pass it: node cl_login.js you@gmail.com");
    process.exit(2);
  }

  const userDataDir = profileDirFor(email);
  const cookiesPath = cookiesPathFor(email);
  const executablePath = findChrome();

  console.log("=".repeat(60));
  console.log("  CRAIGSLIST MANUAL LOGIN (JavaScript / Puppeteer)");
  console.log("  A Chrome window will open. Log in by hand.");
  console.log("  Session is saved once, then reused by the posting engine.");
  console.log(`  email     : ${email}`);
  console.log(`  profile   : ${userDataDir}`);
  console.log(`  cookies-> : ${cookiesPath}`);
  console.log(`  chrome    : ${executablePath || "(puppeteer bundled Chromium)"}`);
  console.log("=".repeat(60));

  const launchOpts = {
    headless: false,
    defaultViewport: null,
    userDataDir, // <- SAME dir the Python engine uses => shared session
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
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch (e) {
    console.log(`[cl-login] Initial navigation warning: ${e.message}`);
  }

  const client = await page.target().createCDPSession();
  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  let loggedIn = false;

  while (Date.now() < deadline) {
    let txt = "";
    try {
      txt = await page.evaluate(() =>
        document.body ? document.body.innerText : ""
      );
    } catch {
      // page may be mid-navigation; ignore and retry
    }
    if (isLoggedInText(txt)) {
      loggedIn = true;
      break;
    }
    const secsLeft = Math.round((deadline - Date.now()) / 1000);
    console.log(`[cl-login] Waiting for you to log in... (${secsLeft}s left)`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  if (!loggedIn) {
    console.error("[cl-login] Timed out waiting for manual login.");
    await browser.close();
    process.exit(1);
  }

  // Grab ALL craigslist cookies (incl. httpOnly) via the DevTools protocol.
  let all = [];
  try {
    const res = await client.send("Network.getAllCookies");
    all = res.cookies || [];
  } catch (e) {
    console.log(`[cl-login] getAllCookies failed, falling back: ${e.message}`);
    all = await page.cookies();
  }

  const clCookies = all
    .filter((c) => (c.domain || "").includes("craigslist.org"))
    .map(toPyCookie);

  fs.writeFileSync(cookiesPath, JSON.stringify(clCookies, null, 2), "utf-8");
  console.log(`[cl-login] [OK] Saved ${clCookies.length} cookie(s) -> ${path.basename(cookiesPath)}`);
  console.log("[cl-login] Login complete. Closing window; the posting run can start.");

  // Close so the shared profile isn't locked when Python opens it.
  await browser.close();
  process.exit(0);
}

main().catch((e) => {
  console.error("[cl-login] Fatal:", e);
  process.exit(1);
});
