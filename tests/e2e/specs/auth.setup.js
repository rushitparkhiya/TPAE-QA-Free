/**
 * Authentication setup — runs once, saves session to .auth/admin.json
 * so all tests reuse the logged-in session without repeating the login flow.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '../.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/wp-login.php');

  await page.fill('#user_login', process.env.WP_ADMIN_USER || 'admin');
  await page.fill('#user_pass', process.env.WP_ADMIN_PASS || 'password');
  await page.click('#wp-submit');

  await expect(page).toHaveURL(/wp-admin/);

  await page.context().storageState({ path: AUTH_FILE });
});
