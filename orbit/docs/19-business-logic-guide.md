# Business Logic Testing Guide

> Orbit's 20+ built-in checks cover **what every WordPress plugin needs**
> (security, WP.org compliance, performance, accessibility). This guide covers
> **what your specific plugin needs** — the business logic unique to what it does.

Audience: QA engineers, product managers, developers writing tests for a specific plugin.

---

## The gap Orbit fills vs the gap you fill

| Who writes it | What gets tested |
|---|---|
| **Orbit (built-in)** | Generic WP concerns: nonces, caps, escaping, dbDelta, i18n, accessibility, activation/deactivation/uninstall, plugin conflict matrix, REST auth, etc. |
| **You (this guide)** | Plugin-specific: "does the coupon actually apply?" / "does the report email send to the right address?" / "does the A/B test variant persist across sessions?" |

Orbit gives you 90% of the coverage for free. The 10% that makes YOUR plugin correct is what you write on top.

---

## Fast start — auto-generate your starting point

```bash
# Reads your plugin code, produces a draft config + scenarios + smoke spec
bash scripts/scaffold-tests.sh ~/plugins/my-plugin

# Optional: deeper AI analysis (reads code, writes human-level scenarios)
bash scripts/scaffold-tests.sh ~/plugins/my-plugin --deep

# Outputs:
#   scaffold-out/my-plugin/qa.config.json       ← prefilled with everything Orbit detected
#   scaffold-out/my-plugin/qa-scenarios.md      ← mechanical scenario list (50+ scenarios)
#   scaffold-out/my-plugin/ai-scenarios.md      ← (if --deep) business-logic scenarios
#   tests/playwright/flows/scaffold-my-plugin-smoke.spec.js   ← draft smoke spec
```

**Review every generated file before running.** The mechanical scaffolder can't know which selectors are meaningful — it guesses from code structure. Your job is to tune the 50 generated scenarios into the 30 that actually matter for your plugin.

---

## The business-logic testing workflow

### Step 1 — Scaffold

```bash
bash scripts/scaffold-tests.sh <plugin-path>
```

Look at `qa-scenarios.md`. This is every mechanically-discoverable entry point rendered as a test case. For a typical plugin: 40-80 scenarios covering admin pages, shortcodes, REST, AJAX, cron, blocks.

### Step 2 — Copy the config into your plugin repo

```bash
cp scaffold-out/<plugin>/qa.config.json ~/plugins/<plugin>/qa.config.json
```

Then **edit it**:
- `plugin.admin_slug` — the primary admin page users hit (often wrong on first detection)
- `plugin.rest_admin_endpoint` — the REST route your admin UI calls most
- `plugin.block_post_id` — create a WP post with your blocks, set its ID here
- `plugin.v1_zip` / `plugin.v2_zip` — for update-path testing
- `plugin.user_journey` — the one flow that defines "time to first value"

### Step 3 — Flesh out the business-logic scenarios

Open `qa-scenarios.md`. For each auto-generated scenario, answer:

- **Is this a meaningful check for my plugin?** (Delete if not)
- **What's the real expected outcome?** (The mechanical scenario says "no error" — but your plugin does something specific)
- **What are the failure modes?** (Three things that go wrong in production)

Add new scenarios the scaffolder couldn't know about:
- Discount codes apply correctly
- Email templates render with correct merge tags
- Multi-step form preserves state between steps
- Report export produces correct CSV / PDF
- Scheduled post actually publishes at the scheduled time
- Rate-limiter blocks the 101st request but not the 100th

### Step 4 — Write the Playwright specs

Put your business-logic specs next to Orbit's generic ones:

```
your-plugin/
└── tests/
    └── playwright/
        └── business/                 ← your specs here
            ├── checkout-flow.spec.js
            ├── report-export.spec.js
            └── coupon-application.spec.js
```

Your specs use the same Orbit helpers:

```javascript
const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard, assertPageReady } = require('../../helpers');

test.describe('Checkout flow — 2-step form', () => {
  test('step 2 preserves step 1 data when back-navigating', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    // ... your plugin-specific steps ...
    guard.assertClean('checkout back-nav');
  });
});
```

### Step 5 — Wire into `playwright.config.js`

Add a project for your plugin's specs:

```javascript
{
  name: 'business',
  use: {
    ...devices['Desktop Chrome'],
    storageState: AUTH_FILE,
    video: 'retain-on-failure',
  },
  testMatch: '**/business/**/*.spec.js',
  dependencies: ['setup'],
},
```

Run with: `npx playwright test --project=business`

### Step 6 — Run the full gate

```bash
bash scripts/gauntlet.sh --plugin ~/plugins/my-plugin --mode full
```

Your business specs run alongside Orbit's built-ins. One report.

---

## Patterns for common plugin types

### Form / Lead-capture plugins

- Submit with valid data → data reaches DB / webhook / email
- Submit with invalid data → user sees field-specific errors (covered by `form-validation.spec.js`)
- Submit with XSS payload → output is escaped on admin display
- Submit from same IP 20x → rate limit kicks in
- Submit from a page that embeds the form via shortcode AND via block → both paths work
- Submit while logged out vs logged in → nonce behavior differs, both should work

### Analytics / Tracking plugins

- Page load → tracking script loads before user interaction
- User clicks tracked button → event fires with correct payload (`analytics-events.spec.js`)
- User has "Do Not Track" set → script does NOT fire
- Admin user with consent off → script does NOT fire for admin but does for logged-out visitors
- Plugin deactivated → script no longer loads

### E-commerce / WooCommerce extensions

- Add product to cart → cart shows correct price with plugin's logic applied
- Apply coupon → price recalculates correctly with edge cases (100% discount, coupon for $1000 on $5 cart)
- Checkout → plugin's custom fields appear, validate, persist to order meta
- Under HPOS → `$order->get_meta()` returns correct values (covered by `check-hpos-declaration.sh`)
- Refund / void → plugin's custom logic handles state transitions correctly
- Subscription renewal cron → renews without duplicate charges

### Content / SEO plugins

- Post save → plugin's meta is saved
- Post save via REST API → same meta is saved (many plugins break here)
- Bulk edit 50 posts → all get processed without timeout
- Plugin disabled → existing meta is preserved (not deleted)
- Plugin re-enabled → meta appears correctly in UI

### Block plugins (Gutenberg)

- Block insert → renders in editor
- Block attribute change → save → reload post → attributes preserved (covered by `block-deprecation.spec.js`)
- Block frontend render → matches editor preview
- Block inside a template part → renders without errors
- Block inside a FSE template → renders correctly
- Block supports CSS color schemes / typography

### Integration / API plugins

- API credentials saved → successful test ping
- API credentials invalid → user sees specific error (not "Error")
- API rate-limit hit → plugin backs off + retries correctly
- API returns malformed data → plugin doesn't fatal the site
- API endpoint moves → plugin surfaces the breakage to admin

---

## Writing a good business-logic scenario — template

Every scenario should fit this template:

```markdown
### [ID] — [One-sentence flow]

**Persona:** [admin | editor | author | contributor | subscriber | anonymous]
**Preconditions:** [what must be true before — fixtures, options, other plugins]
**Steps:**
1. [exact action, not vague]
2. [next action]
3. [...]

**Expected:**
- [visible: what the user sees]
- [DB: what changed in the DB]
- [side-effect: emails sent, webhooks called, cron scheduled]

**Failure modes tested:**
- [specific way this can break that this test catches]
- [another specific failure]

**Files involved:** includes/class-foo.php:L123, admin/views/bar.php
**Severity:** P0 | P1 | P2
**Covered by Orbit built-in?** [link to existing spec, or "no — this spec is required"]
```

---

## Anti-patterns — what NOT to do

### ❌ "Test that it works"
Too vague. Does what work? What's the expected state after?

### ❌ Copy-paste generic Orbit checks into your business specs
If Orbit already runs keyboard-nav, don't rewrite it for your plugin. Reference it.

### ❌ Test the UI, not the business rule
`expect(button).toBeVisible()` isn't a business check. `expect(order.total).toBe(95.00)` after coupon is.

### ❌ One giant spec with 20 assertions
Break into one `test()` per meaningful scenario. Easier to diagnose when one fails.

### ❌ Hardcoded test data
Use WP-CLI to create fixtures in `beforeAll`. Delete them in `afterAll`. Tests must be repeatable.

### ❌ Hit the live API
Mock external HTTP with `page.route('**/api.external.com/**', ...)`. Your CI must not call real services.

---

## When to re-scaffold

Re-run `scripts/scaffold-tests.sh` when:
- You add a new admin page, shortcode, REST route, block, cron hook
- You rename an existing one
- You add or remove WooCommerce / Elementor integration
- Before every major release — catches any entry points you forgot to add tests for

The scaffolder is safe to re-run. It writes to `scaffold-out/` not `tests/`. Review the diff between old and new scenarios to spot what changed.

---

## Further reading

- `docs/20-auto-test-generation.md` — how the scaffolder reads your code
- `VISION.md` — the 6 perspectives Orbit must always serve
- `docs/18-release-checklist.md` — complete release gate
- `docs/07-test-templates.md` — working Playwright specs for 6 plugin types
