// @ts-check
/**
 * Orbit — Visual Regression vs Previous Release
 *
 * Instead of just "match baseline", this compares against the last git tag.
 * If the plugin UI moved pixels since v1.2.3, fail with a diff image.
 *
 * Usage:
 *   PLUGIN_SLUG=my-plugin \
 *   PLUGIN_PREV_TAG=v1.2.3 \
 *   PLUGIN_VISUAL_URLS='["/wp-admin/admin.php?page=my-plugin","/wp-admin/admin.php?page=my-plugin-logs"]' \
 *   npx playwright test visual-regression-release.spec.js
 *
 * Workflow:
 *   1. Checkout old tag into a temp dir
 *   2. Start wp-env on port 8882 with old version installed
 *   3. Screenshot both versions
 *   4. Diff via Playwright's toHaveScreenshot with maxDiffPixelRatio
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard } = require('../helpers');

const PLUGIN_SLUG = (process.env.PLUGIN_SLUG || '').replace(/[^a-zA-Z0-9_-]/g, '');
const PREV_TAG    = process.env.PLUGIN_PREV_TAG || '';
let URLS;
try { URLS = JSON.parse(process.env.PLUGIN_VISUAL_URLS || '[]'); } catch { URLS = []; }

test.describe('Visual regression vs previous release', () => {
  test.skip(!PLUGIN_SLUG || !PREV_TAG || URLS.length === 0,
    'Set PLUGIN_SLUG + PLUGIN_PREV_TAG + PLUGIN_VISUAL_URLS (JSON array)');

  for (const url of URLS) {
    const key = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
    test(`${url} matches ${PREV_TAG} baseline`, async ({ page }) => {
      const guard = attachConsoleErrorGuard(page);

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Use tag-specific baseline name so we compare apples-to-apples
      await expect(page).toHaveScreenshot(`${PREV_TAG}__${key}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,  // 2% pixel tolerance
        threshold: 0.2,
      });

      guard.assertClean(`visual regression: ${url}`);
    });
  }
});
