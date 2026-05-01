const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const WP_URL  = process.env.WP_TEST_URL || 'http://localhost:8881';
const EDITOR  = process.env.EDITOR || 'elementor';
const REPORT  = process.env.REPORT_PATH;

test('measure editor perf', async ({ page }) => {
  const result = {
    url: WP_URL,
    editor: EDITOR,
    editorReadyMs: null,
    panelPopulatedMs: null,
    widgets: [],
    consoleErrors: [],
    consoleWarnings: 0,
    memoryStart: null,
    memoryEnd: null,
  };

  page.on('console', m => {
    if (m.type() === 'error')   result.consoleErrors.push(m.text());
    if (m.type() === 'warning') result.consoleWarnings++;
  });

  const startTime = Date.now();

  if (EDITOR === 'elementor') {
    await page.goto(`${WP_URL}/wp-admin/post-new.php?post_type=page`);
    await page.waitForLoadState('networkidle');

    const switchBtn = page.locator('#elementor-switch-mode-button');
    if (await switchBtn.isVisible().catch(() => false)) await switchBtn.click();

    await page.waitForSelector('#elementor-panel', { timeout: 30000 });
    result.editorReadyMs = Date.now() - startTime;

    const panelStart = Date.now();
    await page.waitForSelector('#elementor-panel-elements-wrapper .elementor-element', { timeout: 15000 });
    result.panelPopulatedMs = Date.now() - panelStart;

    result.memoryStart = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    // Enumerate widgets in panel and insert each (cap at 10 for timing)
    const widgetNames = await page.$$eval('#elementor-panel-elements-wrapper .elementor-element', els =>
      els.slice(0, 10).map(e => e.getAttribute('data-element_type') || e.textContent?.trim().slice(0, 40)).filter(Boolean)
    );

    for (const name of widgetNames) {
      const insertStart = Date.now();
      try {
        await page.locator(`#elementor-panel-elements-wrapper .elementor-element:has-text("${name}")`).first().click({ timeout: 5000 });
        await page.waitForTimeout(500);
      } catch (e) { continue; }
      const insertMs = Date.now() - insertStart;
      const mem = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      result.widgets.push({ name, insertMs, memoryMB: +((mem - result.memoryStart) / 1048576).toFixed(1) });
    }

    result.memoryEnd = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

  } else {
    // Gutenberg
    await page.goto(`${WP_URL}/wp-admin/post-new.php`);
    await page.waitForSelector('.edit-post-header', { timeout: 30000 });
    result.editorReadyMs = Date.now() - startTime;

    const close = page.locator('button[aria-label="Close"]');
    if (await close.isVisible().catch(() => false)) await close.click();

    const panelStart = Date.now();
    await page.click('button[aria-label="Toggle block inserter"]');
    await page.waitForSelector('.block-editor-inserter__block-list', { timeout: 10000 });
    result.panelPopulatedMs = Date.now() - panelStart;

    result.memoryStart = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    const blockNames = await page.$$eval('.block-editor-block-types-list__item', els =>
      els.slice(0, 10).map(e => e.getAttribute('aria-label') || e.textContent?.trim().slice(0, 40)).filter(Boolean)
    );

    for (const name of blockNames) {
      const insertStart = Date.now();
      try {
        await page.locator(`.block-editor-block-types-list__item:has-text("${name}")`).first().click({ timeout: 5000 });
        await page.waitForTimeout(400);
      } catch (e) { continue; }
      const insertMs = Date.now() - insertStart;
      const mem = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      result.widgets.push({ name, insertMs, memoryMB: +((mem - result.memoryStart) / 1048576).toFixed(1) });
    }

    result.memoryEnd = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
  }

  result.totalMemoryGrowthMB = +((result.memoryEnd - result.memoryStart) / 1048576).toFixed(1);

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(result, null, 2));
  console.log('Report:', REPORT);
});
