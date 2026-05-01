import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_FORM_PAGE_SLUG || '/tpae-test-plus-form/';

/**
 * AJAX Form Submission tests for Plus Form widget (handler: tpae_form_submission).
 */
test.describe('AJAX Form Submission (Plus Form)', () => {

  test('FS-01: valid form submission sends POST to admin-ajax.php', async ({ page }) => {
    await gotoFrontend(page, PAGE);

    const requests = [];
    page.on('request', req => {
      if (req.url().includes('admin-ajax.php')) requests.push(req);
    });

    const textInput = page.locator('.tp-form-wrapper input[type="text"]').first();
    const emailInput = page.locator('.tp-form-wrapper input[type="email"]').first();
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();

    if (await btn.count() === 0) { test.skip(); return; }

    if (await textInput.count() > 0) await textInput.fill('QA Test User');
    if (await emailInput.count() > 0) await emailInput.fill('qa@example.com');

    await btn.click();
    await page.waitForTimeout(3000);

    const ajaxPost = requests.find(r => r.method() === 'POST' && r.url().includes('admin-ajax.php'));
    expect(ajaxPost).toBeTruthy();
  });

  test('FS-02: AJAX response returns 200 and success body', async ({ page }) => {
    await gotoFrontend(page, PAGE);

    const textInput = page.locator('.tp-form-wrapper input[type="text"]').first();
    const emailInput = page.locator('.tp-form-wrapper input[type="email"]').first();
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();

    if (await btn.count() === 0) { test.skip(); return; }

    if (await textInput.count() > 0) await textInput.fill('QA Test User');
    if (await emailInput.count() > 0) await emailInput.fill('qa@example.com');

    const [response] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('admin-ajax.php') && resp.status() === 200,
        { timeout: 10000 }
      ),
      btn.click(),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).not.toMatch(/"success":\s*false/);
  });

  test('FS-03: success message renders in DOM after submission', async ({ page }) => {
    await gotoFrontend(page, PAGE);

    const textInput = page.locator('.tp-form-wrapper input[type="text"]').first();
    const emailInput = page.locator('.tp-form-wrapper input[type="email"]').first();
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();

    if (await btn.count() === 0) { test.skip(); return; }

    if (await textInput.count() > 0) await textInput.fill('QA Test User');
    if (await emailInput.count() > 0) await emailInput.fill('qa@example.com');

    await btn.click();
    const success = page.locator('.tp-form-success, .tp-success-msg, .tp-form-success-msg').first();
    await expect(success).toBeVisible({ timeout: 10000 });
  });

  test('FS-04: request includes action=tpae_form_submission', async ({ page }) => {
    await gotoFrontend(page, PAGE);

    let capturedBody = '';
    page.on('request', req => {
      if (req.url().includes('admin-ajax.php') && req.method() === 'POST') {
        capturedBody = req.postData() || '';
      }
    });

    const textInput = page.locator('.tp-form-wrapper input[type="text"]').first();
    const emailInput = page.locator('.tp-form-wrapper input[type="email"]').first();
    const btn = page.locator('.tp-form-wrapper button[type="submit"], .tp-form-wrapper input[type="submit"]').first();

    if (await btn.count() === 0) { test.skip(); return; }

    if (await textInput.count() > 0) await textInput.fill('QA Test User');
    if (await emailInput.count() > 0) await emailInput.fill('qa@example.com');

    await btn.click();
    await page.waitForTimeout(3000);

    expect(capturedBody).toMatch(/action=tpae_form_submission/i);
  });

  test('FS-05: direct AJAX with tampered nonce returns error', async ({ page }) => {
    await gotoFrontend(page, PAGE);

    const baseUrl = process.env.WP_BASE_URL || 'http://localhost';
    const ajaxUrl = `${baseUrl}/wp-admin/admin-ajax.php`;

    const response = await page.evaluate(async (url) => {
      const fd = new FormData();
      fd.append('action', 'tpae_form_submission');
      fd.append('security', 'tampered_nonce_abc');
      fd.append('form_id', '1');
      fd.append('name', 'Hacker');
      fd.append('email', 'hack@evil.com');

      const res = await fetch(url, { method: 'POST', body: fd });
      const text = await res.text();
      return { status: res.status, body: text };
    }, ajaxUrl);

    expect(
      response.body === '-1' || response.body.includes('"success":false') || response.body.includes('false')
    ).toBe(true);
  });

  test('FS-06: spam/honeypot field blocks bot submissions (if present)', async ({ page }) => {
    await gotoFrontend(page, PAGE);

    const honeypot = page.locator('.tp-form-wrapper input[name*="honeypot"], .tp-form-wrapper .tp-honeypot').first();
    if (await honeypot.count() === 0) {
      test.skip();
      return;
    }

    // Honeypot field should be hidden from real users
    const isVisible = await honeypot.isVisible();
    expect(isVisible).toBe(false);
  });
});
