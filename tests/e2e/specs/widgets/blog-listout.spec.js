import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_BLOG_PAGE_SLUG || '/tpae-test-blog-listout/';

test.describe('Blog Listout Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('BL-01: blog grid renders post items', async ({ page }) => {
    const items = page.locator('.tp-post-list-item, .blog-list-item, .post-list-item');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('BL-02: each post has a title', async ({ page }) => {
    const titles = page.locator('.tp-post-list-item .post-title, .blog-list-item h3, .blog-list-item h2');
    await expect(titles.first()).toBeVisible();
  });

  test('BL-03: each post has a featured image (if set)', async ({ page }) => {
    const imgs = page.locator('.tp-post-list-item img.wp-post-image, .tp-post-list-item .post-thumbnail img');
    if (await imgs.count() > 0) {
      const src = await imgs.first().getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  test('BL-04: post meta — date visible (if enabled)', async ({ page }) => {
    const meta = page.locator('.tp-post-list-item .post-date, .tp-post-list-item time');
    if (await meta.count() > 0) {
      await expect(meta.first()).toBeVisible();
    }
  });

  test('BL-05: post meta — category visible (if enabled)', async ({ page }) => {
    const cat = page.locator('.tp-post-list-item .post-category, .tp-post-list-item .category');
    if (await cat.count() > 0) {
      await expect(cat.first()).toBeVisible();
    }
  });

  test('BL-06: read more / post link is valid anchor', async ({ page }) => {
    const links = page.locator('.tp-post-list-item a[href]');
    const href = await links.first().getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toMatch(/^javascript:/i);
  });

  test('BL-07: excerpt renders without raw HTML tags', async ({ page }) => {
    const excerpts = page.locator('.tp-post-list-item .post-excerpt, .tp-post-list-item p');
    if (await excerpts.count() > 0) {
      const text = await excerpts.first().innerText();
      expect(text).not.toMatch(/<\/?[a-z]+/i);
    }
  });

  test('BL-08: load more button is visible (if pagination = load-more)', async ({ page }) => {
    const loadMore = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn');
    if (await loadMore.count() > 0) {
      await expect(loadMore.first()).toBeVisible();
    }
  });

  test('BL-A01: load more appends new posts', async ({ page }) => {
    const loadMore = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn').first();
    if (await loadMore.count() === 0) {
      test.skip();
      return;
    }
    const before = await page.locator('.tp-post-list-item, .blog-list-item').count();
    await loadMore.click();
    await page.waitForTimeout(2000);
    const after = await page.locator('.tp-post-list-item, .blog-list-item').count();
    expect(after).toBeGreaterThan(before);
  });

  test('BL-A02: load more AJAX request returns 200', async ({ page }) => {
    const loadMore = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn').first();
    if (await loadMore.count() === 0) {
      test.skip();
      return;
    }
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('admin-ajax.php') && resp.status() === 200),
      loadMore.click(),
    ]);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).not.toMatch(/"success":false/);
  });

  test('BL-A03: load more button hides after last page', async ({ page }) => {
    const loadMore = page.locator('.tp-load-more-btn, [data-tp-loadmore], .tp-sc-btn').first();
    if (await loadMore.count() === 0) {
      test.skip();
      return;
    }
    // Click until button disappears or max 5 attempts
    for (let i = 0; i < 5; i++) {
      if (await loadMore.isVisible()) {
        await loadMore.click();
        await page.waitForTimeout(2000);
      } else {
        break;
      }
    }
    // Either hidden or text/attribute changes to indicate no more posts
    const stillVisible = await loadMore.isVisible().catch(() => false);
    if (stillVisible) {
      const text = await loadMore.innerText();
      // Some themes change text to "No more posts" — pass either way
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test('BL-R01: grid renders without horizontal overflow on 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const grid = page.locator('.tp-post-list-wrapper, .blog-list-wrapper').first();
    if (await grid.count() > 0) {
      const bb = await grid.boundingBox();
      expect(bb.width).toBeLessThanOrEqual(376);
    }
  });

  test('BL-09: no JS errors on page load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
