/**
 * Elementor editor helper utilities.
 *
 * Assumption: tests that use these helpers open an already-published
 * Elementor test page (created once, ID stored in .env).
 * We interact with the FRONTEND rendered output, not the editor itself,
 * for most widget render tests — this keeps tests fast and stable.
 *
 * For editor-interaction tests, use openEditorForPost().
 */

/**
 * Open the Elementor editor for a given post ID.
 * @param {import('@playwright/test').Page} page
 * @param {number} postId
 */
export async function openEditorForPost(page, postId) {
  await page.goto(`/wp-admin/post.php?post=${postId}&action=elementor`);
  // Wait for Elementor editor iframe
  await page.waitForSelector('#elementor-preview-iframe', { timeout: 30_000 });
}

/**
 * Get the Elementor editor preview iframe's frame object.
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').FrameLocator}
 */
export function getPreviewFrame(page) {
  return page.frameLocator('#elementor-preview-iframe');
}

/**
 * Wait for the Elementor frontend to finish loading on a page.
 * Checks that `.elementor` container is present and JS is initialised.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForElementorFrontend(page) {
  await page.waitForFunction(() => {
    return typeof window.elementorFrontend !== 'undefined'
      && window.elementorFrontend.isEditMode !== undefined;
  }, { timeout: 15_000 });
}

/**
 * Scroll an element into view and wait for it to be visible.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function scrollToWidget(page, selector) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // allow scroll-trigger animations
}
