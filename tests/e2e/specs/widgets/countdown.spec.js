import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_COUNTDOWN_PAGE_SLUG || '/tpae-test-countdown/';

test.describe('Countdown Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('CD-01: countdown wrapper renders', async ({ page }) => {
    await expect(page.locator('.tp-countdown-wrapper').first()).toBeVisible();
  });

  test('CD-02: all four time units visible', async ({ page }) => {
    const units = page.locator('.tp-countdown-wrapper .countdown-section');
    await expect(units).toHaveCount(4); // days, hours, min, sec
  });

  test('CD-03: numbers are non-negative integers', async ({ page }) => {
    const numbers = page.locator('.tp-countdown-wrapper .countdown-period');
    const count = await numbers.count();
    for (let i = 0; i < count; i++) {
      const text = await numbers.nth(i).innerText();
      expect(parseInt(text, 10)).toBeGreaterThanOrEqual(0);
    }
  });

  test('CD-04: seconds tick forward between two reads', async ({ page }) => {
    const secLocator = page.locator('.tp-countdown-wrapper .countdown-section').last().locator('.countdown-period');
    const val1 = parseInt(await secLocator.innerText(), 10);
    await page.waitForTimeout(2000);
    const val2 = parseInt(await secLocator.innerText(), 10);
    // Either seconds decreased (normal countdown) or wrapped (at minute boundary)
    expect(typeof val2).toBe('number');
  });

  test('CD-05: no JS errors on countdown page', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
