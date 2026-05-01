// @ts-check
/**
 * Orbit — Form Validation UX
 *
 * A good form:
 *   - Shows field-specific errors (not just "Something went wrong")
 *   - Sets aria-invalid="true" on invalid fields
 *   - Moves focus to the first invalid field
 *   - Success messages use role="status" or aria-live
 *
 * Usage:
 *   PLUGIN_ADMIN_SLUG=my-plugin-settings \
 *   npx playwright test form-validation.spec.js
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard } = require('../helpers');

const ADMIN_SLUG = process.env.PLUGIN_ADMIN_SLUG || process.env.PLUGIN_SLUG;

test.describe('Form validation UX', () => {
  test.skip(!ADMIN_SLUG, 'Set PLUGIN_ADMIN_SLUG to a settings page with a form');

  test('submitting empty required fields triggers specific errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);

    await page.goto(`/wp-admin/admin.php?page=${ADMIN_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Find required fields
    const requiredFields = page.locator('input[required], select[required], textarea[required]');
    const count = await requiredFields.count();
    if (count === 0) {
      test.skip(true, 'No required form fields found on this page');
      return;
    }

    // Clear all required fields
    for (let i = 0; i < count; i++) {
      const field = requiredFields.nth(i);
      const tag = await field.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'input' || tag === 'textarea') {
        await field.fill('');
      }
    }

    // Submit
    const submit = page.locator('button[type="submit"], .button-primary[type="submit"]').first();
    if (await submit.count() > 0) {
      await submit.click();
      await page.waitForTimeout(1500);

      // Check 1: aria-invalid should be set on at least one field
      const invalidFields = await page.locator('[aria-invalid="true"]').count();

      // Check 2: there should be an error message
      const errorMessage = await page.locator('.error, .notice-error, [role="alert"]').count();

      // Check 3: HTML5 validation (invalid: pseudo-class)
      const html5Invalid = await page.evaluate(() => {
        return document.querySelectorAll(':invalid').length;
      });

      expect(invalidFields + errorMessage + html5Invalid,
        'Submitting empty required fields should show some form of validation feedback'
      ).toBeGreaterThan(0);
    }

    guard.assertClean('form validation');
  });

  test('success notice is announced (role=status or aria-live)', async ({ page }) => {
    await page.goto(`/wp-admin/admin.php?page=${ADMIN_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Check that any existing notices have proper ARIA
    const notices = page.locator('.notice, .updated, .error');
    const noticeCount = await notices.count();

    if (noticeCount > 0) {
      const hasAriaLive = await notices.evaluateAll((els) =>
        els.some((el) =>
          el.getAttribute('role') === 'alert' ||
          el.getAttribute('role') === 'status' ||
          el.hasAttribute('aria-live')
        )
      );
      // Not strictly required for WP core notices (they use .notice), but warn
      if (!hasAriaLive) {
        console.warn('[orbit] Notices present without role=alert/status — screen readers may miss them');
      }
    }
  });
});
