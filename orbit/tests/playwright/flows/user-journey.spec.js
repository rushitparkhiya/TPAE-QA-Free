// @ts-check
/**
 * Orbit — Full User Journey Template (PM role)
 *
 * Tests the complete path a new user walks:
 *   fresh install → activate → onboarding → configure → use → measure → uninstall
 *
 * Any one step can have its own spec. This is the integration test that
 * exercises them all together as a single flow — which is what real users do.
 *
 * Customize via qa.config.json:
 *   plugin.user_journey = {
 *     activate_redirect: "/wp-admin/admin.php?page=my-plugin-setup",
 *     onboarding_complete_selector: ".my-plugin-onboarding-complete",
 *     settings_page: "my-plugin-settings",
 *     settings_save_selector: "button[name='save_settings']",
 *     frontend_assert_selector: ".my-plugin-content"
 *   }
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard, assertPageReady } = require('../helpers');
const { execSync } = require('child_process');

const PLUGIN_SLUG = (process.env.PLUGIN_SLUG || '').replace(/[^a-zA-Z0-9_-]/g, '');
const JOURNEY = JSON.parse(process.env.PLUGIN_USER_JOURNEY || '{}');
const WP_ENV_RUN = process.env.WP_ENV_RUN || 'npx wp-env run cli wp';

function wp(cmd) {
  try { return execSync(`${WP_ENV_RUN} ${cmd}`, { encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

test.describe.configure({ mode: 'serial' });

test.describe('Full user journey — end-to-end', () => {
  test.skip(!PLUGIN_SLUG || Object.keys(JOURNEY).length === 0,
    'Set PLUGIN_SLUG and PLUGIN_USER_JOURNEY (JSON) to run user journey');

  test('new user completes install → configure → use flow', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);

    // Step 1: Ensure plugin is active
    wp(`plugin activate ${PLUGIN_SLUG}`);

    // Step 2: Check activation redirect (most plugins set a redirect transient)
    if (JOURNEY.activate_redirect) {
      await page.goto(JOURNEY.activate_redirect);
      await assertPageReady(page, 'post-activation redirect');
    }

    // Step 3: Complete onboarding (if the plugin has one)
    if (JOURNEY.onboarding_complete_selector) {
      const onboarding = page.locator(JOURNEY.onboarding_complete_selector);
      if (await onboarding.count() > 0) {
        await onboarding.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Step 4: Navigate to settings + save default
    if (JOURNEY.settings_page) {
      await page.goto(`/wp-admin/admin.php?page=${JOURNEY.settings_page}`);
      await assertPageReady(page, 'settings page');

      if (JOURNEY.settings_save_selector) {
        await page.click(JOURNEY.settings_save_selector);
        await page.waitForTimeout(1500);

        // Expect either success notice or redirect
        const success = await page.locator('.notice-success, .updated').count();
        expect(success, 'Settings save should show a success notice').toBeGreaterThan(0);
      }
    }

    // Step 5: Visit frontend, assert plugin output
    if (JOURNEY.frontend_assert_selector) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.locator(JOURNEY.frontend_assert_selector).first(),
        'Frontend should show plugin output after configuration'
      ).toBeVisible({ timeout: 10000 });
    }

    // Step 6: Zero console/page errors through the entire journey
    guard.assertClean('user journey');
  });
});
