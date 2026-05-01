// @ts-check
/**
 * Orbit — Analytics Events Firing (PA role)
 *
 * Tests that declared analytics events actually fire when the user takes the
 * triggering action. Catches the classic "we shipped tracking but no events
 * are coming through" bug.
 *
 * Works with any tag manager / analytics lib (GA4, Mixpanel, PostHog, custom).
 * We intercept outgoing network requests to known analytics endpoints.
 *
 * Customize via env:
 *   PLUGIN_ANALYTICS_EVENTS='[{"action":"click","selector":"#save-btn","expect_event":"plugin_save_clicked","endpoint_match":"google-analytics.com"}]'
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard } = require('../helpers');

const PLUGIN_SLUG = process.env.PLUGIN_SLUG;
const EVENTS_SPEC = process.env.PLUGIN_ANALYTICS_EVENTS || '[]';

let events;
try { events = JSON.parse(EVENTS_SPEC); } catch { events = []; }

test.describe('Analytics events firing', () => {
  test.skip(!PLUGIN_SLUG || events.length === 0,
    'Set PLUGIN_ANALYTICS_EVENTS JSON array to test analytics firing');

  for (const spec of events) {
    test(`event "${spec.expect_event}" fires on ${spec.action} of ${spec.selector}`, async ({ page }) => {
      const guard = attachConsoleErrorGuard(page);
      const captured = [];

      // Intercept known analytics domains
      const endpoints = spec.endpoint_match
        ? [spec.endpoint_match]
        : ['google-analytics.com', 'googletagmanager.com', 'mixpanel.com', 'posthog.com', '/wp-json/.*track'];
      const endpointRegex = new RegExp(endpoints.join('|'));

      page.on('request', (req) => {
        if (endpointRegex.test(req.url())) {
          captured.push({
            url: req.url(),
            method: req.method(),
            body: req.postData() || '',
          });
        }
      });

      // Visit the target page
      if (spec.page) {
        await page.goto(spec.page);
        await page.waitForLoadState('networkidle');
      }

      // Perform action
      const el = page.locator(spec.selector).first();
      await expect(el, `Target selector ${spec.selector} should exist`).toBeVisible({ timeout: 10000 });

      switch (spec.action) {
        case 'click':
          await el.click();
          break;
        case 'fill':
          await el.fill(spec.value || 'test');
          break;
        case 'submit':
          await el.evaluate((form) => form.submit());
          break;
        case 'hover':
          await el.hover();
          break;
        default:
          throw new Error(`Unknown action: ${spec.action}`);
      }

      // Allow time for event to fire
      await page.waitForTimeout(1500);

      // Verify expected event was sent
      const matching = captured.filter((req) => {
        const haystack = req.url + ' ' + req.body;
        return haystack.includes(spec.expect_event);
      });

      expect(matching.length,
        `Expected event "${spec.expect_event}" not found. Captured ${captured.length} analytics requests but none matched.\n` +
        `Sample: ${JSON.stringify(captured.slice(0, 3), null, 2)}`
      ).toBeGreaterThan(0);

      guard.assertClean(`analytics: ${spec.expect_event}`);
    });
  }
});
