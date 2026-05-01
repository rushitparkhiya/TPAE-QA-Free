/**
 * Orbit — SEO Plugin Comparison Flow Template
 *
 * PAIRING RULES (read before writing any spec):
 * ──────────────────────────────────────────────
 * Screenshots MUST be named: pair-NN-{slug}-{a|b}[-extra].png
 * Videos      MUST be named: pair-NN-{slug}-{a|b}.webm
 *
 * NN   = zero-padded pair number (01, 02 … 99)
 * slug = short topic name, lowercase, hyphens (dashboard, social, sitemaps …)
 * a    = plugin under test (left column in report)
 * b    = competitor plugin (right column in report)
 *
 * WHY THIS MATTERS:
 *   The report generator pairs screenshots/videos by slug — NOT by sequential
 *   index. This means "pair-03-social-a.png" will ALWAYS appear next to
 *   "pair-03-social-b.png", regardless of how many tests each plugin has or
 *   what order they run in. Never name files nxt-03-*.png / rm-03-*.png —
 *   that caused the index-mismatch bug where Social was shown next to Titles.
 *
 * HOW TO USE FOR A NEW PLUGIN PAIR:
 * ───────────────────────────────────
 * Step 1: For each plugin, run the DISCOVERY test (SEO-0) first.
 *         It prints all nav links to the console — copy exact URLs.
 * Step 2: Map features to PAIR numbers. Example:
 *           PAIR 1 → Dashboard
 *           PAIR 2 → Meta/Titles (match the same feature, not the same menu order)
 *           PAIR 3 → Social/OG
 *           PAIR 4 → Sitemaps
 *           PAIR 5 → Schema
 *           PAIR 6 → Redirections
 * Step 3: Write tests for Plugin A using side 'a', Plugin B using side 'b'.
 *         Use snapPair() from helpers — never raw page.screenshot().
 * Step 4: Test titles MUST start with "PAIR-N | slug | a|b |" for video
 *         auto-renaming to work in afterEach.
 *
 * VIDEO AUTO-RENAMING:
 *   The afterEach hook below reads the test title to rename Playwright's
 *   auto-generated video to pair-NN-slug-a/b.webm in VDIR.
 *   Format: "PAIR-1 | dashboard | a | Description"
 */

const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');
const {
  assertPageReady,
  gotoAdmin,
  discoverNavLinks,
  exploreAllTabs,
  slowScroll,
  checkFrontend,
  snapPair,
} = require('../../helpers');

const BASE  = process.env.WP_TEST_URL || 'http://localhost:8881';
const ADMIN = `${BASE}/wp-admin`;
const SNAP  = path.join(__dirname, '../../../../reports/screenshots/flows-compare');
const VDIR  = path.join(__dirname, '../../../../reports/videos');

// ── Replace with your plugin slugs ───────────────────────────────────────────
const PLUGIN_A_SLUG = 'plugin-a-admin-page-slug';  // from WP admin menu
const PLUGIN_B_SLUG = 'plugin-b-admin-page-slug';
// ─────────────────────────────────────────────────────────────────────────────

// ── Auto-rename video to pair naming convention ───────────────────────────────
test.afterEach(async ({ page }, testInfo) => {
  await page.waitForTimeout(300); // let video flush to disk
  const videoPath = await page.video()?.path().catch(() => null);
  if (!videoPath || !fs.existsSync(videoPath)) return;
  const m = testInfo.title.match(/^PAIR-(\d+)\s*\|\s*([a-z0-9-]+)\s*\|\s*(a|b)/i);
  if (!m) return;
  const num  = String(m[1]).padStart(2, '0');
  const slug = m[2].toLowerCase();
  const side = m[3].toLowerCase();
  fs.mkdirSync(VDIR, { recursive: true });
  const dest = path.join(VDIR, `pair-${num}-${slug}-${side}.webm`);
  try { fs.copyFileSync(videoPath, dest); } catch {}
});

// ── DISCOVERY — run this FIRST for each plugin ───────────────────────────────

test('Discovery | Plugin A — print all nav links', async ({ page }) => {
  await gotoAdmin(page, PLUGIN_A_SLUG);
  const links = await discoverNavLinks(page, 'a[href*="page="], a[href*="#/"], .nav-tab-wrapper a, [role="tab"]');
  console.log('\n[DISCOVERY Plugin A] Nav links:');
  links.forEach(l => console.log(`  ${l.text} → ${l.href}`));
  const tabs = await page.locator('[role="tab"]').count();
  console.log(`[DISCOVERY Plugin A] [role=tab] count: ${tabs}\n`);
  expect(links.length).toBeGreaterThan(0);
});

test('Discovery | Plugin B — print all nav links', async ({ page }) => {
  await gotoAdmin(page, PLUGIN_B_SLUG);
  const links = await discoverNavLinks(page, 'a[href*="page="], a[href*="#/"], .nav-tab-wrapper a, [role="tab"]');
  console.log('\n[DISCOVERY Plugin B] Nav links:');
  links.forEach(l => console.log(`  ${l.text} → ${l.href}`));
  const tabs = await page.locator('[role="tab"]').count();
  console.log(`[DISCOVERY Plugin B] [role=tab] count: ${tabs}\n`);
  expect(links.length).toBeGreaterThan(0);
});

// ── PAIR 1: Dashboard ─────────────────────────────────────────────────────────

test.describe('PAIR 1 — Dashboard', () => {

  test('PAIR-1 | dashboard | a | Plugin A dashboard', async ({ page }) => {
    await gotoAdmin(page, PLUGIN_A_SLUG);
    await snapPair(page, 1, 'dashboard', 'a', SNAP);
    await slowScroll(page, 3);
    await snapPair(page, 1, 'dashboard', 'a', SNAP, 'scroll');
    const heading = await page.locator('h1,h2,h3').first().textContent().catch(() => '');
    console.log(`[PAIR-1 A] Heading: ${heading}`);
  });

  test('PAIR-1 | dashboard | b | Plugin B dashboard', async ({ page }) => {
    await gotoAdmin(page, PLUGIN_B_SLUG);
    await snapPair(page, 1, 'dashboard', 'b', SNAP);
    await slowScroll(page, 3);
    await snapPair(page, 1, 'dashboard', 'b', SNAP, 'scroll');
    const heading = await page.locator('h1,h2,h3').first().textContent().catch(() => '');
    console.log(`[PAIR-1 B] Heading: ${heading}`);
  });

});

// ── PAIR 2: Meta / Title Templates ────────────────────────────────────────────
// IMPORTANT: Match the SAME feature, not the same menu position.
// Plugin A "Meta Templates" may be at #/general/meta-templates
// Plugin B "Titles & Meta" may be at admin.php?page=plugin-b-titles
// Both go in PAIR 2 because they cover the same job-to-be-done.

test.describe('PAIR 2 — Meta / Title Templates', () => {

  test('PAIR-2 | meta | a | Plugin A meta templates', async ({ page }) => {
    // Replace with real URL from Discovery
    test.skip(true, 'Update URL from Discovery output');
    // await page.goto(`${ADMIN}/admin.php?page=${PLUGIN_A_SLUG}#/general/meta-templates`);
    // await page.waitForLoadState('domcontentloaded');
    // await page.waitForTimeout(2500);
    // await snapPair(page, 2, 'meta', 'a', SNAP);
  });

  test('PAIR-2 | meta | b | Plugin B titles & meta', async ({ page }) => {
    // Replace with real URL from Discovery
    test.skip(true, 'Update URL from Discovery output');
    // await page.goto(`${ADMIN}/admin.php?page=${PLUGIN_B_SLUG}-titles`);
    // await page.waitForLoadState('domcontentloaded');
    // await page.waitForTimeout(2000);
    // const tabCount = await exploreAllTabs(page, 14);
    // await snapPair(page, 2, 'meta', 'b', SNAP);
    // console.log(`[PAIR-2 B] Tabs: ${tabCount}`);
  });

});

// ── PAIR 3: Social / OG Meta ──────────────────────────────────────────────────

test.describe('PAIR 3 — Social / OG Meta', () => {

  test('PAIR-3 | social | a | Plugin A social settings', async ({ page }) => {
    test.skip(true, 'Update URL from Discovery output');
  });

  test('PAIR-3 | social | b | Plugin B social/OG tab', async ({ page }) => {
    test.skip(true, 'Update URL from Discovery output');
    // NOTE: Plugin B may put Social inside Titles & Meta panel (not a separate page).
    // Navigate to the panel then click the Social tab — same PAIR 3, side b.
  });

});

// ── PAIR 4: Sitemaps ──────────────────────────────────────────────────────────

test.describe('PAIR 4 — Sitemaps', () => {

  test('PAIR-4 | sitemaps | a | Plugin A sitemaps', async ({ page }) => {
    test.skip(true, 'Update URL from Discovery output');
    // Also verify the live sitemap URL:
    // const res = await page.goto(`${BASE}/sitemap.xml`).catch(() => null);
    // await snapPair(page, 4, 'sitemaps', 'a', SNAP, 'xml');
  });

  test('PAIR-4 | sitemaps | b | Plugin B sitemap settings', async ({ page }) => {
    test.skip(true, 'Update URL from Discovery output');
    // const res = await page.goto(`${BASE}/sitemap_index.xml`).catch(() => null);
    // await snapPair(page, 4, 'sitemaps', 'b', SNAP, 'xml');
  });

});

// ── PAIR 5: Schema / JSON-LD ──────────────────────────────────────────────────

test.describe('PAIR 5 — Schema / JSON-LD', () => {

  test('PAIR-5 | schema | a | Plugin A schema settings', async ({ page }) => {
    test.skip(true, 'Update URL from Discovery output');
  });

  test('PAIR-5 | schema | b | Plugin B schema settings', async ({ page }) => {
    test.skip(true, 'Update URL from Discovery output');
  });

});

// ── PAIR 6: Redirections ──────────────────────────────────────────────────────

test.describe('PAIR 6 — Redirections', () => {

  test('PAIR-6 | redirections | a | Plugin A redirection manager', async ({ page }) => {
    test.skip(true, 'Update URL from Discovery output');
  });

  test('PAIR-6 | redirections | b | Plugin B redirections page', async ({ page }) => {
    test.skip(true, 'Update URL from Discovery output');
  });

});

// ── Frontend checks (run for both plugins on the same homepage) ───────────────

test('Frontend | OG + schema + canonical — homepage', async ({ page }) => {
  const data = await checkFrontend(page, BASE);
  console.log('[Frontend] OG:', data.ogTitle, '| Twitter:', data.twitterCard);
  console.log('[Frontend] Schema types:', data.schemaTypes.join(', '));
  console.log('[Frontend] Canonical:', data.canonical);
  expect(data.title, 'Page has no title').toBeTruthy();
});
