# Auto Test Generation — How Orbit Reads Your Code

> Orbit can point at any WordPress plugin directory and generate:
>   - A starter `qa.config.json` prefilled with every entry point
>   - A 50-scenario `qa-scenarios.md` test plan
>   - A draft Playwright smoke spec
>   - (With `--deep`) AI-written business-logic scenarios
>
> This doc explains what it reads, how it reads, and what it can't know.

---

## The command

```bash
bash scripts/scaffold-tests.sh <plugin-path> [--deep]
```

**Without `--deep`:** pure grep + AST extraction. 5 seconds. Always safe.

**With `--deep`:** additionally invokes the `/orbit-scaffold-tests` Claude skill which reads the code and drafts human-level scenarios. Requires `claude` CLI installed. Takes 2-5 minutes.

---

## What Orbit extracts (mechanical, grep-based)

| Entry point | PHP pattern it matches | Why it matters |
|---|---|---|
| **Admin pages** | `add_menu_page`, `add_submenu_page`, `add_options_page`, `add_theme_page`, etc. | Every `?page=` URL the admin can visit |
| **Shortcodes** | `add_shortcode('name', ...)` | Frontend output to test for XSS + shortcode attr handling |
| **REST routes** | `register_rest_route('ns/v1', '/foo', ...)` | Auth + IDOR + schema validation targets |
| **AJAX actions (auth)** | `add_action('wp_ajax_foo', ...)` | Capability-check targets |
| **AJAX actions (nopriv)** | `add_action('wp_ajax_nopriv_foo', ...)` | Public attack surface |
| **Cron hooks** | `wp_schedule_event(..., 'hook_name')` | Activation should register, deactivation should clear |
| **Gutenberg blocks** | `block.json` files | Block deprecation + apiVersion + render path checks |
| **Custom post types** | `register_post_type('slug', ...)` | Archive URLs, capability mapping |
| **Custom DB tables** | `$wpdb->prefix . 'my_table'` pattern | Uninstall cleanup targets |
| **WooCommerce usage** | `wc_get_order`, `WC_Order`, HPOS hooks | Triggers HPOS-specific tests |
| **Elementor usage** | `Elementor\Widget_Base` references | Triggers Elementor-specific project |
| **Plugin type** | Derived from above | Selects the right test templates |

---

## What gets generated

### 1. `scaffold-out/<plugin>/qa.config.json`

```json
{
  "plugin": {
    "name": "my-plugin",
    "slug": "my-plugin",
    "path": "/path/to/my-plugin",
    "type": "gutenberg-blocks",        ← inferred
    "prefix": "my_plugin",              ← from slug
    "text_domain": "my-plugin",         ← from header
    "version": "2.3.1",                 ← from header
    "admin_slug": "my-plugin-settings", ← first detected
    "admin_slugs": ["my-plugin-settings", "my-plugin-logs"],
    "shortcodes": ["myplugin_button", "myplugin_form"],
    "rest_routes": ["my-plugin/v1", "my-plugin/v1/items"],
    "ajax_actions": {
      "authenticated":   ["save_settings", "export_data"],
      "unauthenticated": ["submit_lead"]
    },
    "cron_hooks": ["my_plugin_daily_cleanup"],
    "blocks": ["my-plugin/hero", "my-plugin/testimonial"],
    "post_types": ["my_plugin_item"],
    "custom_tables": ["my_plugin_log"],
    "uses_woocommerce": false
  },
  "gauntlet": { "mode": "full", "env": "local" }
}
```

Every field is editable. The values are Orbit's best guesses — but code patterns aren't always obvious, and some fields need human judgment (e.g., which admin page is the "main" one vs secondary).

### 2. `scaffold-out/<plugin>/qa-scenarios.md`

A structured markdown test plan with:

**Smoke scenarios (S-01 to S-03):** activation, deactivation, uninstall.
**Admin page scenarios (A-10+):** one per detected admin page.
**Shortcode scenarios (SC-20+):** one per detected shortcode, including a malformed-attribute XSS test.
**REST scenarios (R-30+):** auth behavior across three user roles.
**AJAX scenarios (AJ-40+):** separate coverage for `wp_ajax_` and `wp_ajax_nopriv_` actions.
**Cron scenarios (C-50+):** registration on activate, removal on deactivate.
**Block scenarios (B-60+):** insert → save → reload without validation errors.
**Cross-cutting checks:** memory, a11y, RTL, conflict matrix, uninstall DB cleanup.

Example:

```markdown
### AJ-40 — wp_ajax_save_settings rejects unauthenticated
Steps: POST to /wp-admin/admin-ajax.php with action=save_settings
(a) logged out, (b) nonce missing, (c) nonce invalid, (d) subscriber, (e) admin.
Pass: (a)-(d) return 401/403 OR die('0'), (e) returns success.
Capability check must match the sensitivity of the action.
```

Typical output: 40-80 scenarios for a medium-sized plugin.

### 3. `tests/playwright/flows/scaffold-<plugin>-smoke.spec.js`

A starter Playwright spec with:
- One test confirming the primary admin page loads (uses Orbit's `assertPageReady` + `attachConsoleErrorGuard`)
- One test per shortcode that verifies it didn't leave literal `[shortcode]` text in the page output

This spec is **intentionally minimal** — it's a "show me Orbit's helper patterns so I can copy them for real tests" starter.

### 4. (With `--deep`) `scaffold-out/<plugin>/ai-scenarios.md`

The `/orbit-scaffold-tests` skill reads the plugin source and produces:

- **One paragraph:** what the plugin actually does, in plain English
- **3-7 core user flows:** Who / Trigger / Success / Failure-modes
- **15-30 business-logic scenarios:** specific to what this plugin does
- **Edge cases the mechanical scaffolder missed:** things that can only go wrong given the plugin's specific logic
- **Playwright spec drafts:** one per core flow, with PLACEHOLDER markers where selectors are guessed
- **Required fixtures:** pre-seeded data needed to run the plan
- **File:line refs:** every scenario cites the PHP code it's testing

---

## What Orbit can't know from code alone

| Area | Why not | How to fill the gap |
|---|---|---|
| **Which admin page is "primary"** | Code just registers them — humans decide which is the landing page | Edit `admin_slug` in qa.config.json |
| **Expected output of a shortcode** | Code defines the function; output depends on post context and fixtures | Write actual assertion in your custom spec |
| **Business rules** | "Discount = 10% for orders > $100" isn't discoverable from code structure | Write business-logic specs per `docs/19-business-logic-guide.md` |
| **User intent** | Code shows what's possible; intent is in PRDs, not code | You write the "why" part of scenarios |
| **Visual baseline** | No reference of what "correct" looks like | First release: designer reviews + commits baselines |
| **External API contracts** | Plugin calls the API; contract lives on the API side | Mock with `page.route()` and verify the request shape |

---

## Under the hood — how the mechanical extraction works

Key techniques:

### Grep patterns
```bash
# Admin pages
grep -rEh "add_(menu|submenu|options|dashboard|...)_page\s*\(" "$PLUGIN_PATH" \
  --include="*.php" --exclude-dir=vendor --exclude-dir=node_modules | \
  grep -oE "['\"][a-z0-9_-]+['\"]" | sort -u
```

We don't parse PHP — we grep. That's intentional:
- **Fast** (5 seconds on plugins with 100k lines)
- **Works on broken code** (a plugin with a syntax error still has grep-able patterns)
- **No dependencies** beyond `grep` and `python3` (for JSON output)

Tradeoff: we miss dynamic registrations like:
```php
foreach ($slugs as $slug) {
  add_menu_page('My Plugin', 'My Plugin', 'manage_options', $slug, ...);
}
```
We see `add_menu_page` but can't resolve `$slug`. That's a reasonable tradeoff — plugins that use runtime-computed slugs are rare and generally an anti-pattern.

### Plugin type heuristic
```
1. Any block.json found        → gutenberg-blocks
2. Any Elementor\Widget_Base   → elementor-addon
3. Any wc_get_order / WC_Order → woocommerce-extension
4. Any REST route but no admin → rest-api
5. Default                     → general
```

### Prefix derivation
We convert the folder name: `my-cool-plugin` → `my_cool_plugin`. Most WP plugins follow this convention. For plugins that don't, you edit `prefix` in `qa.config.json` after scaffolding.

---

## Limits and known issues

- **Does not run the plugin** — so we can't see what hooks fire at runtime, only what the source registers.
- **Does not resolve PHP namespaces** — if your plugin uses `Foo\Bar\RestController::register()`, we won't follow it into the class. Works fine on typical plugins that register via function names.
- **Shortcode attributes not extracted** — we know `[myplugin_button]` exists, not that it takes `style="primary"` and `size="large"`. Human fills this in.
- **Block attributes not extracted** — we know `my-plugin/hero` exists, not its attribute schema. Read `block.json` yourself for that.
- **`--deep` requires Claude CLI** — mechanical part works standalone.

---

## Example: real run output

```
$ bash scripts/scaffold-tests.sh ~/plugins/example

Orbit Test Scaffolder — example
Reading plugin code...

→ Admin pages
→ Shortcodes
→ REST routes
→ AJAX actions
→ Cron hooks
→ Gutenberg blocks
→ Custom post types
→ Custom tables

── Detected entry points ──
  Admin pages:              3
  Shortcodes:               2
  REST routes:              5
  AJAX actions:             4
  Cron hooks:               1
  Gutenberg blocks:         2
  Custom post types:        1
  Plugin type:              gutenberg-blocks

✓ Wrote scaffold-out/example/qa.config.json
✓ Wrote scaffold-out/example/qa-scenarios.md (67 lines)
✓ Wrote tests/playwright/flows/scaffold-example-smoke.spec.js

── Done ──
Config:       scaffold-out/example/qa.config.json
Scenarios:    scaffold-out/example/qa-scenarios.md
Smoke spec:   tests/playwright/flows/scaffold-example-smoke.spec.js

Next:
  1. Review scaffold-out/example/qa.config.json — tune any wrong guesses
  2. Copy to your plugin: cp scaffold-out/example/qa.config.json ~/plugins/example/qa.config.json
  3. Edit the scaffolded spec with real selectors + user intent
  4. Run:  bash scripts/gauntlet.sh --plugin ~/plugins/example --mode full
```

---

## The workflow loop

```
┌─────────────────────────────────────────────────────┐
│ 1. bash scripts/scaffold-tests.sh <plugin>         │
│    → mechanical extraction → config + scenarios    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Review & edit qa.config.json + qa-scenarios.md  │
│    → human judgment on which scenarios matter      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. Write business-logic Playwright specs           │
│    → using Orbit's helpers (attachConsoleErrorGuard)│
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. bash scripts/gauntlet.sh --plugin <path> --mode full │
│    → 20+ generic checks + your business-logic specs│
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. Open reports/index.html                         │
│    → every output from the run, one landing page   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 6. Add a new feature → re-run scaffold-tests.sh    │
│    → diff old/new scenarios — catches new entry pts│
└─────────────────────────────────────────────────────┘
```

---

## Related docs

- `VISION.md` — the 6 perspectives Orbit must serve
- `docs/19-business-logic-guide.md` — how to write plugin-specific scenarios
- `docs/18-release-checklist.md` — what must pass before tagging
- `docs/02-configuration.md` — full `qa.config.json` reference
