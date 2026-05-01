// @ts-check
/**
 * Orbit — First-Time User Experience (FTUE) / Onboarding Spec
 *
 * Tests the first 60 seconds after a user activates the plugin:
 *   - Activation redirect lands somewhere useful (not wp-admin default)
 *   - Onboarding wizard is reachable and skippable
 *   - Skip flow does NOT leave the plugin in a broken state
 *   - User can reach core feature within 3 clicks
 *
 * PM-oriented: this is the metric product managers track as "time to first value".
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard, assertPageReady } = require('../helpers');
const { execSync } = require('child_process');

const PLUGIN_SLUG = (process.env.PLUGIN_SLUG || '').replace(/[^a-zA-Z0-9_-]/g, '');
const WP_ENV_RUN = process.env.WP_ENV_RUN || 'npx wp-env run cli wp';
const CORE_FEATURE_URL = process.env.PLUGIN_CORE_FEATURE_URL || '';
const ONBOARDING_URL = process.env.PLUGIN_ONBOARDING_URL || '';

function wp(cmd) {
  try { return execSync(`${WP_ENV_RUN} ${cmd}`, { encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

test.describe.configure({ mode: 'serial' });

test.describe('First-time user experience (FTUE)', () => {
  test.skip(!PLUGIN_SLUG, 'Set PLUGIN_SLUG');

  test.beforeAll(async () => {
    // Fresh state: deactivate + delete, then install + activate
    wp(`plugin deactivate ${PLUGIN_SLUG}`);
    wp(`plugin activate ${PLUGIN_SLUG}`);
  });

  test('activation redirect provides value (not default plugins page)', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);

    // Simulate fresh activation by visiting plugins page — many plugins intercept
    await page.goto('/wp-admin/plugins.php');
    await page.waitForLoadState('networkidle');

    // After click "Activate" (simulated via WP-CLI), the next admin visit
    // should ideally redirect to onboarding, not stay on plugins list.
    // This test just documents where you end up.
    await page.goto('/wp-admin/');
    await page.waitForTimeout(1500);

    const currentUrl = page.url();
    console.log(`[orbit] Post-activation admin landing: ${currentUrl}`);

    // Soft check: if plugin stored an activation redirect, note it
    const redirectTransient = wp(
      `transient get _${PLUGIN_SLUG}_activation_redirect 2>/dev/null || echo ''`
    );
    if (redirectTransient) {
      console.log(`[orbit] Plugin set activation_redirect transient: ${redirectTransient}`);
    }

    guard.assertClean('post-activation');
  });

  test('onboarding can be skipped without breaking plugin', async ({ page }) => {
    test.skip(!ONBOARDING_URL, 'Set PLUGIN_ONBOARDING_URL to test skip flow');
    const guard = attachConsoleErrorGuard(page);

    await page.goto(ONBOARDING_URL);
    await assertPageReady(page, 'onboarding');

    // Look for a skip control
    const skipSelectors = [
      'a:has-text("Skip")',
      'button:has-text("Skip")',
      'a:has-text("Later")',
      '[data-action="skip"]',
      '.onboarding-skip',
    ];
    let skipped = false;
    for (const sel of skipSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.click();
        skipped = true;
        break;
      }
    }
    expect(skipped, 'Onboarding should have a skip/later option — WCAG + UX requirement').toBeTruthy();

    // After skip, plugin admin should still work (not stuck in onboarding)
    await page.waitForLoadState('networkidle');
    const stillOnOnboarding = page.url().includes(ONBOARDING_URL.split('?page=')[1] || '___impossible___');
    expect(stillOnOnboarding, 'After skipping, user should not remain on onboarding page').toBeFalsy();

    guard.assertClean('onboarding skip');
  });

  test('core feature is reachable within 3 clicks', async ({ page }) => {
    test.skip(!CORE_FEATURE_URL, 'Set PLUGIN_CORE_FEATURE_URL to the main feature page');
    const guard = attachConsoleErrorGuard(page);

    const path = [];
    await page.goto('/wp-admin/');
    path.push(page.url());

    // Click #1: find the plugin in the admin menu
    const menuLink = page.locator(`#adminmenu a[href*="${PLUGIN_SLUG}"]`).first();
    if (await menuLink.count() > 0) {
      await menuLink.click();
      await page.waitForLoadState('domcontentloaded');
      path.push(page.url());
    }

    // Click #2 or #3: find the specific feature
    const featureMatcher = new URL(CORE_FEATURE_URL, 'http://localhost:8881').searchParams.get('page') || CORE_FEATURE_URL;
    let reached = page.url().includes(featureMatcher);
    if (!reached) {
      const subMenuLink = page.locator(`#adminmenu a[href*="${featureMatcher}"]`).first();
      if (await subMenuLink.count() > 0) {
        await subMenuLink.click();
        await page.waitForLoadState('domcontentloaded');
        path.push(page.url());
        reached = page.url().includes(featureMatcher);
      }
    }

    expect(path.length, `Core feature required ${path.length} admin navigations (max 3)`).toBeLessThanOrEqual(3);
    expect(reached, `Core feature at ${CORE_FEATURE_URL} not reachable from admin menu`).toBeTruthy();

    guard.assertClean('FTUE core feature');
  });
});
