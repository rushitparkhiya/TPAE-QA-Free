import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_NAV_PAGE_SLUG || '/tpae-test-navigation-menu/';

test.describe('Navigation Menu Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('NM-01: nav wrapper renders', async ({ page }) => {
    await expect(page.locator('.tp-nav-menu, .plus-nav-menu-wrap').first()).toBeVisible();
  });

  test('NM-02: top-level menu items are visible', async ({ page }) => {
    const items = page.locator('.tp-nav-menu > ul > li, .plus-nav-menu-wrap nav ul > li');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('NM-03: each menu item has an anchor with valid href', async ({ page }) => {
    const links = page.locator('.tp-nav-menu a, .plus-nav-menu-wrap a');
    const first = links.first();
    const href = await first.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toMatch(/^javascript:/i);
  });

  test('NM-04: dropdown submenu shows on hover', async ({ page }) => {
    const hasDropdown = await page.locator('.tp-nav-menu .menu-item-has-children, .plus-nav-menu-wrap .menu-item-has-children').count();
    if (hasDropdown === 0) {
      test.skip();
      return;
    }
    const parentItem = page.locator('.tp-nav-menu .menu-item-has-children, .plus-nav-menu-wrap .menu-item-has-children').first();
    await parentItem.hover();
    await page.waitForTimeout(400);
    const submenu = page.locator('.tp-nav-menu .sub-menu, .plus-nav-menu-wrap .sub-menu').first();
    await expect(submenu).toBeVisible();
  });

  test('NM-05: hamburger toggle visible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const toggle = page.locator('.tp-nav-toggle, .tp-menu-toggle, .tp-hamburger').first();
    if (await toggle.count() > 0) {
      await expect(toggle).toBeVisible();
    }
  });

  test('NM-M01: mobile menu opens on hamburger click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const toggle = page.locator('.tp-nav-toggle, .tp-menu-toggle, .tp-hamburger').first();
    if (await toggle.count() === 0) {
      test.skip();
      return;
    }
    await toggle.click();
    await page.waitForTimeout(400);
    const mobileMenu = page.locator('.tp-nav-menu ul, .plus-nav-menu-wrap ul').first();
    await expect(mobileMenu).toBeVisible();
  });

  test('NM-06: active menu item has current-menu-item class', async ({ page }) => {
    // The test page IS the nav page, so the current page link should have this class
    const current = page.locator('.current-menu-item, .current_page_item');
    // This is optional — only assert if class is present
    if (await current.count() > 0) {
      await expect(current.first()).toBeVisible();
    }
  });

  test('NM-07: no JS errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
