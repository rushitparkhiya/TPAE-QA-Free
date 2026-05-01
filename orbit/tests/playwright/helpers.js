/**
 * Orbit — Playwright test helpers
 *
 * RULES that prevent recording error screens (learned the hard way):
 *
 * 1. Call assertPageReady(page) at the top of EVERY test — throws immediately
 *    on permission errors so the video shows the real issue, not a blank page.
 *
 * 2. Before writing ANY spec for a new plugin: call discoverNavLinks(page, selector)
 *    to extract the exact URLs/hashes for every section. Never guess selectors.
 *
 * 3. Use gotoAdmin(page, pageSlug) instead of raw goto — it validates the
 *    response and throws on redirect-to-login or PHP fatal.
 */

const path = require('path');
const fs   = require('fs');

const ADMIN_BASE = process.env.WP_TEST_URL
  ? `${process.env.WP_TEST_URL}/wp-admin`
  : 'http://localhost:8881/wp-admin';

// ─── Error patterns ────────────────────────────────────────────────────────────

const ERROR_PATTERNS = [
  /sorry, you are not allowed/i,
  /you do not have sufficient permissions/i,
  /wp_die/i,
  /php fatal error/i,
  /parse error/i,
  /call to undefined function/i,
  /access denied/i,
  /rank-math-registration/i,  // RankMath wizard gate
];

// ─── assertPageReady — THROW on any error state ────────────────────────────────
// Use at the start of every test. Fails fast so video captures the real issue.

async function assertPageReady(page, context = '') {
  const url   = page.url();
  const title = await page.title().catch(() => '');
  const body  = await page.evaluate(() => document.body?.innerText || '').catch(() => '');

  if (url.includes('wp-login.php')) {
    throw new Error(`[orbit] Redirected to login — auth cookies are stale. Re-run setup.\n  Context: ${context}`);
  }

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(body) || pattern.test(url)) {
      throw new Error(`[orbit] Error page detected: "${body.slice(0, 120)}"\n  URL: ${url}\n  Context: ${context}`);
    }
  }

  if (body.length < 100 && !url.includes('wp-login')) {
    throw new Error(`[orbit] Page body too short (${body.length} chars) — plugin may not be installed or configured.\n  URL: ${url}`);
  }
}

// ─── detectErrorPage — non-throwing version for optional checks ────────────────

async function detectErrorPage(page) {
  try {
    const url  = page.url();
    const body = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (url.includes('wp-login.php')) return true;
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.test(body) || pattern.test(url)) return true;
    }
    if (body.length < 100 && !url.includes('wp-login')) return true;
    return false;
  } catch {
    return false;
  }
}

// ─── gotoAdmin — navigate with validation ─────────────────────────────────────
// Throws if the page redirects to login or shows an error.

async function gotoAdmin(page, slug, hashOrQuery = '') {
  const url = `${ADMIN_BASE}/admin.php?page=${slug}${hashOrQuery}`;
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800); // fallback buffer for React mount
  await assertPageReady(page, `gotoAdmin(${slug})`);
}

// ─── discoverNavLinks — extract real nav URLs before writing a spec ────────────
// Run this FIRST when testing a new plugin to get exact URLs.
// Returns array of { text, href } for all visible navigation links.
//
// Example:
//   const links = await discoverNavLinks(page, '.nxtext_navlink');
//   console.log(JSON.stringify(links, null, 2));
//
// Then use those exact href values in goto() calls — never guess.

async function discoverNavLinks(page, navSelector = 'a[href*="page="], a[href*="#/"]') {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)]
      .filter(el => el.offsetParent !== null)
      .map(el => ({
        text: el.innerText?.trim().replace(/\s+/g, ' '),
        href: el.getAttribute('href') || el.href || '',
      }))
      .filter(el => el.text && el.text.length > 0 && el.text.length < 80);
  }, navSelector);
}

// ─── exploreAllTabs — click through every tab on a settings page ───────────────
// Works for RankMath (uses [role="tab"]) and WP settings pages (uses .nav-tab-wrapper a).
// Returns count of tabs found.

async function exploreAllTabs(page, maxTabs = 15) {
  await page.waitForTimeout(1000);
  const tabs = page.locator('[role="tab"], .nav-tab-wrapper a, .cmb-nav-tab-wrapper a');
  const count = await tabs.count().catch(() => 0);
  for (let i = 0; i < Math.min(count, maxTabs); i++) {
    try {
      await tabs.nth(i).click({ timeout: 3000 });
      await page.waitForTimeout(500);
      await slowScroll(page, 2);
    } catch { break; }
  }
  return count;
}

// ─── slowScroll ────────────────────────────────────────────────────────────────

async function slowScroll(page, steps = 5) {
  const height = await page.evaluate(() => document.body.scrollHeight).catch(() => 0);
  if (height <= 0) return;
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), (height / steps) * i);
    await page.waitForTimeout(350);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(250);
}

// ─── waitForReady ──────────────────────────────────────────────────────────────

async function waitForReady(page, selector, timeout = 8000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    console.warn(`[orbit] Element not found after ${timeout}ms: ${selector}`);
    return false;
  }
}

// ─── countElements ────────────────────────────────────────────────────────────

async function countElements(page, selector) {
  return page.evaluate((sel) => document.querySelectorAll(sel).length, selector);
}

// ─── snapPair — save screenshot with enforced pair-NN-slug-side naming ────────
// ALWAYS use this instead of page.screenshot() in flow specs.
// Enforces the contract that the report generator depends on.
//
// Example:
//   await snapPair(page, 1, 'dashboard', 'a', SNAP_DIR);            // pair-01-dashboard-a.png
//   await snapPair(page, 1, 'dashboard', 'a', SNAP_DIR, 'scroll');  // pair-01-dashboard-a-scroll.png
//
// Naming rules:
//   pairNum : integer 1–99. Pairs plugins by feature topic, not by test order.
//   slug    : short topic name, lowercase, hyphens only (dashboard, social, sitemaps)
//   side    : 'a' = plugin under test (left), 'b' = competitor (right)
//   extra   : optional suffix for multiple shots in same flow (scroll, modal, form)


async function snapPair(page, pairNum, slug, side, snapDir, extra = '') {
  fs.mkdirSync(snapDir, { recursive: true });
  const num    = String(pairNum).padStart(2, '0');
  const suffix = extra ? `-${extra}` : '';
  const file   = path.join(snapDir, `pair-${num}-${slug}-${side}${suffix}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

// ─── checkFrontend — check meta/schema/OG on any URL ─────────────────────────
// Returns a data object with all key SEO signals. Use in any test.

async function checkFrontend(page, url) {
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');

  const data = await page.evaluate(() => {
    const get = (sel, attr = 'content') => document.querySelector(sel)?.[attr] || null;
    const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
      .filter(Boolean);
    const schemaTypes = schemas.map(s => s['@type'] || (s['@graph'] ? s['@graph'].map(n => n['@type']) : '?')).flat();

    return {
      title:      document.title,
      metaDesc:   get('meta[name="description"]'),
      canonical:  get('link[rel="canonical"]', 'href'),
      ogTitle:    get('meta[property="og:title"]'),
      ogDesc:     get('meta[property="og:description"]'),
      ogImage:    get('meta[property="og:image"]'),
      twitterCard: get('meta[name="twitter:card"]'),
      schemaCount: schemas.length,
      schemaTypes,
    };
  });

  return data;
}

// ─── attachConsoleErrorGuard — zero-console-error assertion ────────────────────
// Call at the start of any test to fail if the browser console logs an error
// during the test. Catches silent JS bugs that QA/PM can't see visually.
//
//   const { attachConsoleErrorGuard } = require('../../helpers');
//   test('does thing', async ({ page }) => {
//     const guard = attachConsoleErrorGuard(page);
//     // ... test body ...
//     guard.assertClean();
//   });

function attachConsoleErrorGuard(page, opts = {}) {
  const ignore = opts.ignore || [
    /favicon/i,
    /chrome-extension/i,
    /\[HMR\]/,
    /DevTools/,
  ];
  const errors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (ignore.some((re) => re.test(text))) return;
    errors.push(text);
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  return {
    errors,
    pageErrors,
    assertClean(label = '') {
      const all = [...errors, ...pageErrors];
      if (all.length > 0) {
        throw new Error(
          `[orbit] ${all.length} console/page errors during ${label || 'test'}:\n` +
            all.slice(0, 10).map((e) => `  • ${e.slice(0, 200)}`).join('\n')
        );
      }
    },
  };
}

module.exports = {
  assertPageReady,
  detectErrorPage,
  gotoAdmin,
  discoverNavLinks,
  exploreAllTabs,
  slowScroll,
  waitForReady,
  countElements,
  checkFrontend,
  snapPair,
  attachConsoleErrorGuard,
  ADMIN_BASE,
};
