import { test, expect } from '@playwright/test';
import { gotoFrontend } from '../../helpers/wp-admin.js';

const PAGE = process.env.WP_VIDEO_PAGE_SLUG || '/tpae-test-video/';

test.describe('Video Player Widget', () => {

  test.beforeEach(async ({ page }) => {
    await gotoFrontend(page, PAGE);
  });

  test('VP-01: YouTube embed iframe renders', async ({ page }) => {
    const iframe = page.locator('.tp-video-player-wrap iframe, .elementor-video-container iframe').first();
    await expect(iframe).toBeVisible();
    const src = await iframe.getAttribute('src');
    expect(src).toMatch(/youtube\.com|youtu\.be/i);
  });

  test('VP-02: poster image is visible before play (if set)', async ({ page }) => {
    const poster = page.locator('.tp-video-poster-wrap').first();
    if (await poster.count() > 0) {
      await expect(poster).toBeVisible();
    }
  });

  test('VP-03: play button overlay is visible', async ({ page }) => {
    const playBtn = page.locator('.tp-video-play-button, .tp-overlay-play').first();
    if (await playBtn.count() > 0) {
      await expect(playBtn).toBeVisible();
    }
  });

  test('VP-04: lightbox opens on click (if lightbox enabled)', async ({ page }) => {
    const playBtn = page.locator('.tp-video-lightbox-btn, [data-tp-popup]').first();
    if (await playBtn.count() > 0) {
      await playBtn.click();
      const lightbox = page.locator('.tp-lightbox-overlay, .mfp-container').first();
      await expect(lightbox).toBeVisible({ timeout: 5000 });
    }
  });

  test('VP-05: aspect ratio wrapper maintains ratio', async ({ page }) => {
    const wrapper = page.locator('.tp-video-wrapper, .elementor-video').first();
    const box = await wrapper.boundingBox();
    expect(box.height).toBeGreaterThan(0);
    // 16:9 ratio — height should be ~56% of width
    const ratio = box.height / box.width;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.7);
  });

  test('VP-R01: video scales to container on 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoFrontend(page, PAGE);
    const wrapper = page.locator('.tp-video-wrapper').first();
    const box = await wrapper.boundingBox();
    expect(box.width).toBeLessThanOrEqual(375);
  });

  test('VP-06: no JS errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await gotoFrontend(page, PAGE);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
