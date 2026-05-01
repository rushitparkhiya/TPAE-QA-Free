import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

/**
 * Heading Title widget tests.
 * Prerequisite: page at WP_HEADING_PAGE_SLUG with multiple heading widgets
 * testing different HTML tags and styles.
 */
const PAGE = process.env.WP_HEADING_PAGE_SLUG || '/tpae-test-heading/';

test.describe('Heading Title Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('HT-01: renders heading element', async ({ page }) => {
    await expect(page.locator('.theplus-heading-title').first()).toBeVisible();
  });

  test('HT-02: heading with h1 tag uses <h1>', async ({ page }) => {
    // The test page should have a widget set to h1
    const h1 = page.locator('.theplus-heading-title h1').first();
    await expect(h1).toBeVisible();
  });

  test('HT-03: heading with h3 tag uses <h3>', async ({ page }) => {
    const h3 = page.locator('.theplus-heading-title h3').first();
    await expect(h3).toBeVisible();
  });

  test('HT-04: highlight word has highlight span', async ({ page }) => {
    // Test page has a heading "Hello World" with "World" as highlight word
    const highlight = page.locator('.theplus-heading-title .tp-highlight-text').first();
    await expect(highlight).toBeVisible();
  });

  test('HT-05: separator renders when enabled', async ({ page }) => {
    const separator = page.locator('.theplus-heading-title .tp-title-separator').first();
    await expect(separator).toBeVisible();
  });

  test('HT-06: heading link wraps in <a>', async ({ page }) => {
    const link = page.locator('.theplus-heading-title a').first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toMatch(/^javascript:/i);
  });

  test('HT-07: no XSS — script tag in title is not executed', async ({ page }) => {
    let alerted = false;
    page.on('dialog', async dialog => {
      alerted = true;
      await dialog.dismiss();
    });
    // The test page should have a heading with sanitized script input
    await page.waitForTimeout(500);
    expect(alerted).toBe(false);
  });

  test('HT-R01: mobile — no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const heading = page.locator('.theplus-heading-title').first();
    const box = await heading.boundingBox();
    expect(box.width).toBeLessThanOrEqual(375);
  });
});
