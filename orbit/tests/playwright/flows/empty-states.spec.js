// @ts-check
/**
 * Orbit — Empty State Coverage
 *
 * Real users hit empty states first:
 *   - Fresh install (zero items)
 *   - Filtered to zero matches
 *   - After bulk delete
 *
 * Plugins that show a blank panel here have "users get stuck and don't know
 * what to do" — UX research consensus. WordPress 6.9 changed tablenav rendering
 * when list tables are empty — plugins hooking manage_posts_extra_tablenav
 * broke silently.
 *
 * Usage:
 *   PLUGIN_ADMIN_SLUG=my-plugin \
 *   PLUGIN_EMPTY_PAGES='my-plugin-list,my-plugin-logs' \
 *   npx playwright test empty-states.spec.js
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard } = require('../helpers');

const ADMIN_SLUG  = process.env.PLUGIN_ADMIN_SLUG || process.env.PLUGIN_SLUG;
const EMPTY_PAGES = (process.env.PLUGIN_EMPTY_PAGES || ADMIN_SLUG || '').split(',').filter(Boolean);

test.describe('Empty state UX (WP 6.9+)', () => {
  test.skip(!ADMIN_SLUG || EMPTY_PAGES.length === 0,
    'Set PLUGIN_EMPTY_PAGES (comma-separated admin slugs that have list views)');

  for (const slug of EMPTY_PAGES) {
    test(`${slug} — shows helpful empty state, not a blank panel`, async ({ page }) => {
      const guard = attachConsoleErrorGuard(page);
      await page.goto(`/wp-admin/admin.php?page=${slug}`);
      await page.waitForLoadState('networkidle');

      const contentArea = page.locator('#wpbody-content');
      const text = (await contentArea.innerText()).trim();

      // Must not be blank
      expect(text.length, `${slug}: content area is completely empty`).toBeGreaterThan(20);

      // Must have either: a message, an empty-state illustration, or a CTA button
      const hasMessage = /no items|empty|get started|nothing here|start by|create your first/i.test(text);
      const hasCta = await page.locator('#wpbody-content a.button-primary, #wpbody-content button.button-primary').count() > 0;
      const hasHelp = await page.locator('#wpbody-content [class*="empty"], #wpbody-content .notice, #wpbody-content .description').count() > 0;

      expect(hasMessage || hasCta || hasHelp,
        `${slug}: empty state has no message, CTA, or help text. Users will get stuck.`
      ).toBeTruthy();

      guard.assertClean(`empty state: ${slug}`);
    });
  }
});
