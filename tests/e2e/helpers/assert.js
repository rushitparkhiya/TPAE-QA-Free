/**
 * Custom assertion helpers built on top of Playwright's expect().
 */
import { expect } from '@playwright/test';

/**
 * Assert that no JS console errors were recorded on the page.
 * Call this at the end of tests that render widgets.
 * @param {import('@playwright/test').Page} page
 */
export async function assertNoConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  // Give the page a moment to emit any async errors
  await page.waitForTimeout(500);
  expect(errors, `Unexpected JS console errors: ${errors.join(', ')}`).toHaveLength(0);
}

/**
 * Assert that an element is visible and within the viewport.
 * @param {import('@playwright/test').Locator} locator
 */
export async function assertInViewport(locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
}

/**
 * Assert an anchor element has a valid href (not javascript: or empty).
 * @param {import('@playwright/test').Locator} anchor
 */
export async function assertSafeHref(anchor) {
  const href = await anchor.getAttribute('href');
  expect(href).toBeTruthy();
  expect(href).not.toMatch(/^javascript:/i);
}

/**
 * Assert a response from admin-ajax.php was a success JSON.
 * @param {import('@playwright/test').Response} response
 */
export async function assertAjaxSuccess(response) {
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBeTruthy();
}
