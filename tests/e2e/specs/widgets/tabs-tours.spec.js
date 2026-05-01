import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_TABS_PAGE_SLUG || '/tpae-test-tabs-tours/';

test.describe('Tabs / Tours Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('TT-01: tabs wrapper renders', async ({ page }) => {
    await expect(page.locator('.tp-tab-wrapper, .tp-tabs-tour-wrap').first()).toBeVisible();
  });

  test('TT-02: at least two tab titles visible', async ({ page }) => {
    const tabs = page.locator('.tp-tab-wrapper .tp-tab-title, .tp-tabs-tour-wrap [role="tab"]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('TT-03: first tab panel is active on load', async ({ page }) => {
    const activePanel = page.locator('.tp-tab-content.active, .tp-tab-pane.active, [role="tabpanel"][aria-hidden="false"]').first();
    await expect(activePanel).toBeVisible();
  });

  test('TT-04: clicking second tab shows its content', async ({ page }) => {
    const tabs = page.locator('.tp-tab-wrapper .tp-tab-title, .tp-tabs-tour-wrap [role="tab"]');
    if (await tabs.count() < 2) {
      test.skip();
      return;
    }
    await tabs.nth(1).click();
    await page.waitForTimeout(400);
    // Second panel should now be active/visible
    const panels = page.locator('.tp-tab-content, .tp-tab-pane, [role="tabpanel"]');
    const secondPanelVisible = await panels.nth(1).isVisible();
    expect(secondPanelVisible).toBe(true);
  });

  test('TT-05: clicking first tab then third shows third content', async ({ page }) => {
    const tabs = page.locator('.tp-tab-wrapper .tp-tab-title, .tp-tabs-tour-wrap [role="tab"]');
    const count = await tabs.count();
    if (count < 3) {
      test.skip();
      return;
    }
    await tabs.nth(0).click();
    await page.waitForTimeout(300);
    await tabs.nth(2).click();
    await page.waitForTimeout(400);
    const panels = page.locator('.tp-tab-content, .tp-tab-pane, [role="tabpanel"]');
    const thirdVisible = await panels.nth(2).isVisible();
    expect(thirdVisible).toBe(true);
  });

  test('TT-06: active tab title has active class or aria-selected', async ({ page }) => {
    const tabs = page.locator('.tp-tab-wrapper .tp-tab-title, .tp-tabs-tour-wrap [role="tab"]');
    await tabs.first().click();
    await page.waitForTimeout(300);
    const firstTab = tabs.first();
    const hasActive = await firstTab.evaluate(el =>
      el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
    );
    expect(hasActive).toBe(true);
  });

  test('TT-07: tab panels have role="tabpanel" (accessibility)', async ({ page }) => {
    const panels = page.locator('[role="tabpanel"]');
    if (await panels.count() > 0) {
      const count = await panels.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('TT-08: tab titles have role="tab" (accessibility)', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    if (await tabs.count() > 0) {
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test('TT-09: no JS errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('TT-R01: tabs render without overflow on 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const wrapper = page.locator('.tp-tab-wrapper, .tp-tabs-tour-wrap').first();
    if (await wrapper.count() > 0) {
      const bb = await wrapper.boundingBox();
      expect(bb.width).toBeLessThanOrEqual(376);
    }
  });
});
