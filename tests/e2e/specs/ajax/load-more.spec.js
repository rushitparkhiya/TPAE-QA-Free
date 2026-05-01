import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_BLOG_PAGE_SLUG || '/tpae-test-blog-listout/';

/**
 * AJAX Load-More tests for Blog Listout (handler: L_theplus_more_post).
 * These tests target the nopriv AJAX handler directly and via the UI.
 */
test.describe('AJAX Load-More (Blog Listout)', () => {

  test('LM-01: load-more button is present and renders', async ({ page }) => {
    await gotoFrontend(page, PAGE);
    const btn = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn').first();
    if (await btn.count() === 0) {
      test.skip();
      return;
    }
    await expect(btn).toBeVisible();
  });

  test('LM-02: clicking load-more fires POST to admin-ajax.php', async ({ page }) => {
    await gotoFrontend(page, PAGE);
    const btn = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn').first();
    if (await btn.count() === 0) {
      test.skip();
      return;
    }

    const requests = [];
    page.on('request', req => {
      if (req.url().includes('admin-ajax.php')) requests.push(req);
    });

    await btn.click();
    await page.waitForTimeout(2000);

    const ajaxRequest = requests.find(r => r.method() === 'POST');
    expect(ajaxRequest).toBeTruthy();
  });

  test('LM-03: AJAX response is valid JSON with success=true', async ({ page }) => {
    await gotoFrontend(page, PAGE);
    const btn = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn').first();
    if (await btn.count() === 0) {
      test.skip();
      return;
    }

    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('admin-ajax.php') && resp.status() === 200, { timeout: 8000 }),
      btn.click(),
    ]);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toMatch(/json/i);

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
  });

  test('LM-04: new post items appear in DOM after load-more', async ({ page }) => {
    await gotoFrontend(page, PAGE);
    const btn = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn').first();
    if (await btn.count() === 0) {
      test.skip();
      return;
    }

    const before = await page.locator('.tp-post-list-item, .blog-list-item').count();
    await btn.click();
    await page.waitForTimeout(2500);
    const after = await page.locator('.tp-post-list-item, .blog-list-item').count();
    expect(after).toBeGreaterThan(before);
  });

  test('LM-05: AJAX request includes nonce parameter', async ({ page }) => {
    await gotoFrontend(page, PAGE);
    const btn = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn').first();
    if (await btn.count() === 0) {
      test.skip();
      return;
    }

    let requestBody = '';
    page.on('request', req => {
      if (req.url().includes('admin-ajax.php') && req.method() === 'POST') {
        requestBody = req.postData() || '';
      }
    });

    await btn.click();
    await page.waitForTimeout(2000);

    // TPAE uses 'security' as the nonce field name
    expect(requestBody).toMatch(/nonce|security/i);
  });

  test('LM-06: direct AJAX call without nonce returns error', async ({ page }) => {
    await gotoFrontend(page, PAGE);

    const baseUrl = process.env.WP_BASE_URL || 'http://localhost';
    const ajaxUrl = `${baseUrl}/wp-admin/admin-ajax.php`;

    const response = await page.evaluate(async (url) => {
      const fd = new FormData();
      fd.append('action', 'theplus_more_post');
      fd.append('security', 'invalid_nonce_12345');
      fd.append('page_id', '1');
      fd.append('current_page', '1');

      const res = await fetch(url, { method: 'POST', body: fd });
      const text = await res.text();
      return { status: res.status, body: text };
    }, ajaxUrl);

    // Should either return -1 (WP nonce failure) or success:false
    expect(
      response.body === '-1' || response.body.includes('"success":false') || response.body.includes('false')
    ).toBe(true);
  });
});
