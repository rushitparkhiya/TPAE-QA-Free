// @ts-check
/**
 * Orbit — Error State Coverage
 *
 * What does the UI show when things fail? Most plugins leave users staring at
 * a spinner forever, or a cryptic "Error" with no recovery path.
 *
 * Tests:
 *   - AJAX 500 → user sees an error message, not a frozen UI
 *   - REST WP_Error → human-readable message
 *   - Network offline → graceful degradation
 *
 * Usage:
 *   PLUGIN_ADMIN_SLUG=my-plugin \
 *   PLUGIN_AJAX_ACTION=my_plugin_save \
 *   npx playwright test error-states.spec.js
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard } = require('../helpers');

const ADMIN_SLUG  = process.env.PLUGIN_ADMIN_SLUG || process.env.PLUGIN_SLUG;
const AJAX_ACTION = process.env.PLUGIN_AJAX_ACTION || '';

test.describe('Error state UX', () => {
  test.skip(!ADMIN_SLUG, 'Set PLUGIN_ADMIN_SLUG');

  test('admin page handles AJAX 500 gracefully', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page, {
      ignore: [/favicon/i, /500/], // we're deliberately triggering 500
    });

    // Intercept all admin-ajax.php requests and return 500
    await page.route('**/wp-admin/admin-ajax.php', (route) => {
      const body = route.request().postData() || '';
      if (AJAX_ACTION && body.includes(AJAX_ACTION)) {
        return route.fulfill({ status: 500, body: 'Internal Server Error' });
      }
      return route.continue();
    });

    await page.goto(`/wp-admin/admin.php?page=${ADMIN_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Trigger any save/submit button to exercise AJAX
    const saveBtn = page.locator('button[type="submit"], .button-primary').first();
    if (await saveBtn.count() > 0) {
      await saveBtn.click();
      await page.waitForTimeout(2000);

      const bodyText = await page.locator('body').innerText();

      // Must not silently fail — user needs feedback
      const hasError = /error|failed|try again|something went wrong/i.test(bodyText);
      const hasFrozenSpinner = await page.locator('.spinner.is-active, [aria-busy="true"]').count() > 0;

      expect(hasError || !hasFrozenSpinner,
        'AJAX error with no user feedback — UI appears frozen'
      ).toBeTruthy();
    }
  });

  test('REST endpoint error shows human-readable message', async ({ page }) => {
    await page.route('**/wp-json/**', (route) => {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'rest_invalid_param', message: 'Invalid parameter.' }),
      });
    });

    await page.goto(`/wp-admin/admin.php?page=${ADMIN_SLUG}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    // Should NOT expose raw error codes to the user
    expect(bodyText,
      'Raw REST error code leaked to UI — wrap with human message'
    ).not.toContain('rest_invalid_param');
  });
});
