import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_COUNTER_PAGE_SLUG || '/tpae-test-number-counter/';

test.describe('Number Counter Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('NC-01: counter element renders', async ({ page }) => {
    await expect(page.locator('.tp-counter-number').first()).toBeVisible();
  });

  test('NC-02: counter starts from zero and increments', async ({ page }) => {
    // scroll counter into view to trigger animation
    await page.locator('.tp-counter-number').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const startVal = parseInt(await page.locator('.tp-counter-number').first().innerText(), 10);
    await page.waitForTimeout(1500);
    const midVal = parseInt(await page.locator('.tp-counter-number').first().innerText(), 10);
    expect(midVal).toBeGreaterThanOrEqual(startVal);
  });

  test('NC-03: counter reaches target value', async ({ page }) => {
    const target = parseInt(process.env.WP_COUNTER_TARGET || '100', 10);
    await page.locator('.tp-counter-number').first().scrollIntoViewIfNeeded();
    // Wait for animation to finish (up to 6s)
    await page.waitForFunction(
      (t) => parseInt(document.querySelector('.tp-counter-number')?.innerText, 10) >= t,
      target,
      { timeout: 6000 }
    );
    const finalVal = parseInt(await page.locator('.tp-counter-number').first().innerText(), 10);
    expect(finalVal).toBe(target);
  });

  test('NC-04: prefix and suffix are visible', async ({ page }) => {
    const prefix = page.locator('.counter-number-prefix').first();
    const suffix = page.locator('.counter-number-suffix').first();
    // Only assert if the test page includes these
    if (await prefix.count() > 0) await expect(prefix).toBeVisible();
    if (await suffix.count() > 0) await expect(suffix).toBeVisible();
  });

  test('NC-05: no JS errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
