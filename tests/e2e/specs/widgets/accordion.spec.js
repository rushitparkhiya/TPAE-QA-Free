import { test, expect } from '@playwright/test';
import { gotoFrontend, scrollToWidget } from '../../helpers/wp-admin.js';
import { assertNoConsoleErrors } from '../../helpers/assert.js';

/**
 * Accordion widget tests.
 * Prerequisite: a page at ACCORDION_PAGE_SLUG with the Accordion widget configured
 * to have 3 items, default settings (first item open, multiple=no).
 */
const PAGE = process.env.WP_ACCORDION_PAGE_SLUG || '/tpae-test-accordion/';

test.describe('Accordion Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('AC-01: renders 3 accordion items', async ({ page }) => {
    const items = page.locator('.theplus-accordion-wrapper .accordion-list-item');
    await expect(items).toHaveCount(3);
  });

  test('AC-02: first item is open by default', async ({ page }) => {
    const firstContent = page.locator('.accordion-list-item').first().locator('.accordion-text-content');
    await expect(firstContent).toBeVisible();
  });

  test('AC-03: click closed item to expand it', async ({ page }) => {
    const secondHeader = page.locator('.accordion-list-item').nth(1).locator('.accordion-head');
    const secondContent = page.locator('.accordion-list-item').nth(1).locator('.accordion-text-content');

    await expect(secondContent).toBeHidden();
    await secondHeader.click();
    await expect(secondContent).toBeVisible();
  });

  test('AC-04: click open item to collapse it', async ({ page }) => {
    const firstHeader = page.locator('.accordion-list-item').first().locator('.accordion-head');
    const firstContent = page.locator('.accordion-list-item').first().locator('.accordion-text-content');

    await expect(firstContent).toBeVisible();
    await firstHeader.click();
    await expect(firstContent).toBeHidden();
  });

  test('AC-05: only one item open at a time (multiple=no)', async ({ page }) => {
    const secondHeader = page.locator('.accordion-list-item').nth(1).locator('.accordion-head');
    const firstContent = page.locator('.accordion-list-item').first().locator('.accordion-text-content');
    const secondContent = page.locator('.accordion-list-item').nth(1).locator('.accordion-text-content');

    await secondHeader.click();
    await expect(secondContent).toBeVisible();
    await expect(firstContent).toBeHidden();
  });

  test('AC-06: aria-expanded is true on open item', async ({ page }) => {
    const firstHeader = page.locator('.accordion-list-item').first().locator('.accordion-head');
    const ariaExpanded = await firstHeader.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('true');
  });

  test('AC-07: aria-expanded is false on closed item', async ({ page }) => {
    const secondHeader = page.locator('.accordion-list-item').nth(1).locator('.accordion-head');
    const ariaExpanded = await secondHeader.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');
  });

  test('AC-08: keyboard Enter opens closed item', async ({ page }) => {
    const secondHeader = page.locator('.accordion-list-item').nth(1).locator('.accordion-head');
    const secondContent = page.locator('.accordion-list-item').nth(1).locator('.accordion-text-content');

    await secondHeader.focus();
    await page.keyboard.press('Enter');
    await expect(secondContent).toBeVisible();
  });

  test('AC-09: no JS console errors on page', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('AC-R01: mobile — items full width, no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const wrapper = page.locator('.theplus-accordion-wrapper').first();
    const box = await wrapper.boundingBox();
    expect(box.width).toBeLessThanOrEqual(375);
  });
});
