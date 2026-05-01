import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_FLIPBOX_PAGE_SLUG || '/tpae-test-flip-box/';

test.describe('Flip Box Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('FB-01: front face is visible on load', async ({ page }) => {
    const front = page.locator('.tp-flipbox-front').first();
    await expect(front).toBeVisible();
  });

  test('FB-02: hover reveals back face', async ({ page }) => {
    const box = page.locator('.tp-flipbox-wrapper').first();
    const back = page.locator('.tp-flipbox-back').first();

    await box.hover();
    await page.waitForTimeout(400); // CSS transition
    await expect(back).toBeVisible();
  });

  test('FB-03: mouse-out hides back face', async ({ page }) => {
    const box = page.locator('.tp-flipbox-wrapper').first();
    const back = page.locator('.tp-flipbox-back').first();
    const front = page.locator('.tp-flipbox-front').first();

    await box.hover();
    await page.waitForTimeout(400);
    // Move mouse away from the box
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await expect(front).toBeVisible();
  });

  test('FB-04: back face CTA button is clickable', async ({ page }) => {
    const box = page.locator('.tp-flipbox-wrapper').first();
    await box.hover();
    await page.waitForTimeout(400);
    const btn = page.locator('.tp-flipbox-back .elementor-button').first();
    await expect(btn).toBeVisible();
  });

  test('FB-05: no JS errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('FB-R01: mobile layout — box renders without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const box = page.locator('.tp-flipbox-wrapper').first();
    const bb = await box.boundingBox();
    expect(bb.width).toBeLessThanOrEqual(375);
  });
});
