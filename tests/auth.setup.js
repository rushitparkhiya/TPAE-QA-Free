import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_FILE = path.join(__dirname, '../.auth/admin.json');

setup('authenticate as WP admin', async ({ page }) => {
  const base = process.env.WP_BASE_URL || 'http://localhost';
  const user = process.env.WP_ADMIN_USER || 'admin';
  const pass = process.env.WP_ADMIN_PASS || 'password';

  await page.goto(`${base}/wp-login.php`);
  await page.locator('#user_login').fill(user);
  await page.locator('#user_pass').fill(pass);
  await page.locator('#wp-submit').click();
  await expect(page).toHaveURL(/wp-admin/, { timeout: 15000 });

  await page.context().storageState({ path: AUTH_FILE });
});
