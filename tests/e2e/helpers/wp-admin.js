/**
 * WordPress admin helper utilities.
 */

/**
 * Navigate to the WP admin dashboard.
 * @param {import('@playwright/test').Page} page
 */
export async function gotoAdmin(page) {
  await page.goto('/wp-admin/');
}

/**
 * Navigate to a specific admin page (e.g. 'options-general.php').
 * @param {import('@playwright/test').Page} page
 * @param {string} slug
 */
export async function gotoAdminPage(page, slug) {
  await page.goto(`/wp-admin/${slug}`);
}

/**
 * Navigate to a frontend page by its WordPress page ID.
 * @param {import('@playwright/test').Page} page
 * @param {number} postId
 */
export async function gotoPageById(page, postId) {
  await page.goto(`/?p=${postId}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a frontend URL path.
 * @param {import('@playwright/test').Page} page
 * @param {string} path  e.g. '/sample-page/'
 */
export async function gotoFrontend(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Dismiss any admin notice if present.
 * @param {import('@playwright/test').Page} page
 */
export async function dismissAdminNotices(page) {
  const dismissBtn = page.locator('.notice-dismiss').first();
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click();
  }
}
