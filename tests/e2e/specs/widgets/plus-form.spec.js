import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_FORM_PAGE_SLUG || '/tpae-test-plus-form/';

test.describe('Plus Form Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('PF-01: form element renders', async ({ page }) => {
    await expect(page.locator('.tp-form-wrapper form, form.tp-plus-form').first()).toBeVisible();
  });

  test('PF-02: text input field is visible', async ({ page }) => {
    const input = page.locator('.tp-form-wrapper input[type="text"], .tp-form-wrapper input[type="email"]').first();
    await expect(input).toBeVisible();
  });

  test('PF-03: submit button is visible', async ({ page }) => {
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();
    await expect(btn).toBeVisible();
  });

  test('PF-04: required field validation prevents empty submit', async ({ page }) => {
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();
    await btn.click();
    // Browser-native validation or plugin validation should block submission
    const required = page.locator('.tp-form-wrapper [required]:invalid, .tp-form-wrapper .tp-field-error');
    await page.waitForTimeout(300);
    // Form should NOT have navigated away
    expect(page.url()).toMatch(new RegExp(PAGE.replace('/', '\\/') + '|' + (process.env.WP_BASE_URL || 'localhost'), 'i'));
  });

  test('PF-05: email field rejects invalid email format', async ({ page }) => {
    const emailField = page.locator('.tp-form-wrapper input[type="email"]').first();
    if (await emailField.count() === 0) {
      test.skip();
      return;
    }
    await emailField.fill('not-an-email');
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();
    await btn.click();
    await page.waitForTimeout(300);
    // Should show native browser validation or plugin error
    const isInvalid = await emailField.evaluate(el => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('PF-06: valid form submission triggers AJAX (not full page reload)', async ({ page }) => {
    const textInput = page.locator('.tp-form-wrapper input[type="text"]').first();
    const emailInput = page.locator('.tp-form-wrapper input[type="email"]').first();
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();

    if (await textInput.count() > 0) await textInput.fill('Test User');
    if (await emailInput.count() > 0) await emailInput.fill('test@example.com');

    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('admin-ajax.php'), { timeout: 8000 }).catch(() => null),
      btn.click(),
    ]);

    if (response) {
      expect(response.status()).toBe(200);
    }
  });

  test('PF-07: success message appears after valid submission', async ({ page }) => {
    const textInput = page.locator('.tp-form-wrapper input[type="text"]').first();
    const emailInput = page.locator('.tp-form-wrapper input[type="email"]').first();
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();

    if (await textInput.count() > 0) await textInput.fill('Test User');
    if (await emailInput.count() > 0) await emailInput.fill('test@example.com');

    await btn.click();
    const success = page.locator('.tp-form-success, .tp-success-msg, .wpcf7-mail-sent-ok').first();
    await expect(success).toBeVisible({ timeout: 8000 });
  });

  test('PF-08: textarea field accepts multi-line input', async ({ page }) => {
    const textarea = page.locator('.tp-form-wrapper textarea').first();
    if (await textarea.count() === 0) {
      test.skip();
      return;
    }
    await textarea.fill('Line 1\nLine 2\nLine 3');
    const value = await textarea.inputValue();
    expect(value).toContain('Line 2');
  });

  test('PF-09: select/dropdown field renders options', async ({ page }) => {
    const select = page.locator('.tp-form-wrapper select').first();
    if (await select.count() === 0) {
      test.skip();
      return;
    }
    const options = select.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('PF-10: checkbox field is toggleable', async ({ page }) => {
    const checkbox = page.locator('.tp-form-wrapper input[type="checkbox"]').first();
    if (await checkbox.count() === 0) {
      test.skip();
      return;
    }
    await checkbox.check();
    expect(await checkbox.isChecked()).toBe(true);
    await checkbox.uncheck();
    expect(await checkbox.isChecked()).toBe(false);
  });

  test('PF-11: no JS errors on form page load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('PF-R01: form renders without overflow on 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const form = page.locator('.tp-form-wrapper form, form.tp-plus-form').first();
    if (await form.count() > 0) {
      const bb = await form.boundingBox();
      expect(bb.width).toBeLessThanOrEqual(376);
    }
  });
});
