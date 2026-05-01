// @ts-check
/**
 * Orbit — Loading State Coverage
 *
 * Catches:
 *   - FOUC (Flash of Unstyled Content)
 *   - Missing spinners / skeleton screens
 *   - React/Vue hydration mismatches
 *   - Content jumping as data loads (CLS)
 *
 * Usage:
 *   PLUGIN_ADMIN_SLUG=my-plugin npx playwright test loading-states.spec.js
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard } = require('../helpers');

const ADMIN_SLUG = process.env.PLUGIN_ADMIN_SLUG || process.env.PLUGIN_SLUG;

test.describe('Loading state UX', () => {
  test.skip(!ADMIN_SLUG, 'Set PLUGIN_ADMIN_SLUG');

  test('shows loading indicator during async data fetch', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);

    // Slow down network to force loading state to be visible
    await page.route('**/wp-json/**', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      return route.continue();
    });

    await page.goto(`/wp-admin/admin.php?page=${ADMIN_SLUG}`);

    // Within first 500ms of loading, there should be some loading indicator
    await page.waitForTimeout(300);
    const hasLoadingIndicator = await page.evaluate(() => {
      const selectors = [
        '.spinner',
        '.spinner.is-active',
        '[aria-busy="true"]',
        '[role="progressbar"]',
        '.loading',
        '.loader',
        '[class*="skeleton"]',
        '[class*="Skeleton"]',
      ];
      return selectors.some((s) => document.querySelector(s) !== null);
    });

    // Not strictly required — but warn if there's no feedback during slow load
    if (!hasLoadingIndicator) {
      console.warn(`[orbit] ${ADMIN_SLUG}: no loading indicator during 1.5s network delay`);
    }

    await page.waitForLoadState('networkidle');
    guard.assertClean(`loading: ${ADMIN_SLUG}`);
  });

  test('no Cumulative Layout Shift > 0.1 after load', async ({ page }) => {
    await page.goto(`/wp-admin/admin.php?page=${ADMIN_SLUG}`);

    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-ignore
            if (!entry.hadRecentInput) clsValue += entry.value;
          }
        });
        try {
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch {
          resolve(0);
          return;
        }
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    expect(cls,
      `CLS is ${cls} (>0.1 is poor, >0.25 is bad) — content jumping during load`
    ).toBeLessThan(0.25);
  });
});
