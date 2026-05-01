// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenv } from 'dotenv';

dotenv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE  = path.join(__dirname, '.auth/admin.json');
const BASE_URL   = process.env.WP_BASE_URL || process.env.WP_TEST_URL || 'http://localhost';

export default defineConfig({
  // Both TPAE widget specs and Orbit flow specs live under tests/
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 60_000,

  reporter: [
    ['html',  { outputFolder: 'reports/html',    open: 'never' }],
    ['json',  { outputFile:   'reports/results.json' }],
    ['line'],
  ],

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
    trace:      'on-first-retry',
  },

  projects: [

    // ─────────────────────────────────────────────────
    //  SHARED AUTH SETUP  (runs once, saves cookies)
    // ─────────────────────────────────────────────────
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: { storageState: undefined },
    },

    // ─────────────────────────────────────────────────
    //  TPAE WIDGET TESTS  (tests/e2e/specs/widgets/)
    // ─────────────────────────────────────────────────
    {
      name: 'tpae-chromium',
      testMatch: /e2e\/specs\/widgets\/.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    {
      name: 'tpae-firefox',
      testMatch: /e2e\/specs\/widgets\/.*\.spec\.js/,
      use: { ...devices['Desktop Firefox'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    {
      name: 'tpae-mobile',
      testMatch: /e2e\/specs\/widgets\/.*\.spec\.js/,
      use: { ...devices['Pixel 5'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },

    // ─────────────────────────────────────────────────
    //  TPAE AJAX TESTS  (tests/e2e/specs/ajax/)
    // ─────────────────────────────────────────────────
    {
      name: 'tpae-ajax',
      testMatch: /e2e\/specs\/ajax\/.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },

    // ─────────────────────────────────────────────────
    //  ORBIT — USER FLOWS  (orbit/tests/playwright/flows/)
    // ─────────────────────────────────────────────────
    {
      name: 'orbit-flows',
      testDir: './orbit/tests/playwright/flows',
      testMatch: /.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },

    // ─────────────────────────────────────────────────
    //  ORBIT — ELEMENTOR WIDGET QA  (orbit/tests/playwright/elementor/)
    // ─────────────────────────────────────────────────
    {
      name: 'orbit-elementor',
      testDir: './orbit/tests/playwright/elementor',
      testMatch: /.*\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
        video: { mode: 'on', size: { width: 1440, height: 900 } },
        screenshot: 'on',
      },
      dependencies: ['setup'],
    },

    // ─────────────────────────────────────────────────
    //  ORBIT — VISUAL REGRESSION
    // ─────────────────────────────────────────────────
    {
      name: 'orbit-visual',
      testDir: './orbit/tests/playwright/visual',
      testMatch: /.*\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
        screenshot: 'on',
      },
      dependencies: ['setup'],
    },

    // ─────────────────────────────────────────────────
    //  ORBIT — PM / UX AUDIT
    // ─────────────────────────────────────────────────
    {
      name: 'orbit-pm',
      testDir: './orbit/tests/playwright/pm',
      testMatch: /.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },

    // ─────────────────────────────────────────────────
    //  ORBIT — EDITOR PERFORMANCE
    // ─────────────────────────────────────────────────
    {
      name: 'orbit-perf',
      testDir: './orbit/tests/playwright/editor-perf',
      testMatch: /.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
  ],
});
