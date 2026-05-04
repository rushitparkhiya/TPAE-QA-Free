# TPAE Pre-Release Guide
> For TPAE Free v6.x — run before every release, before every `git tag`.
>
> **Legend:** ✅ = automated by `run-prerelease.sh` · 👤 = manual sign-off required

---

## Quick Start

```bash
# Full run (all 5 gates)
npm run prerelease -- --version 6.4.15

# Hotfix / urgent patch (skips slow steps)
npm run prerelease:quick -- --version 6.4.15

# Resume from a specific gate after fixing failures
bash run-prerelease.sh --version 6.4.15 --gate 3

# Custom plugin path
bash run-prerelease.sh --version 6.4.15 --plugin /path/to/tpae-free
```

---

## Verdict Rules

| Verdict | Condition | Action |
|---|---|---|
| 🟢 **SHIP** | 0 critical, 0 high | Complete manual sign-off → `git tag vX.Y.Z && git push --tags` |
| 🟡 **WARN** | Warnings only | Document in release notes, proceed at discretion |
| 🟠 **HOLD** | High-severity findings | Fix all High items before tagging |
| 🔴 **BLOCK** | Any critical finding | Do NOT release — fix first, re-run from failing gate |

**Hard rule:** Never tag a release with any unaddressed Critical or High finding.

---

## Gate 1 — Preflight ✅ `~5 sec`

Checks that all required tools exist before wasting time on later gates.

**Checks:** `node` · `npx` · `git` · `php` (optional: `phpcs`, `phpstan`) · Playwright browsers installed

**If it fails:** Install the missing tool, then re-run. No need to `--gate` skip — gate 1 is fast.

```bash
npm install               # install Node deps
npx playwright install    # install browsers
```

---

## Gate 2 — Release Metadata ✅ `~30 sec`

**Fail fast** — if this gate fails, gate 3 will not run.

### Checklist

- [ ] ✅ Version numbers synced in **all 3 places** — plugin header `Version:`, constant `define('L_THEPLUS_VERSION', ...)`, `readme.txt` `Stable tag:`
- [ ] ✅ `CHANGELOG.md` / `readme.txt` has entry for this version (`== X.Y.Z ==`)
- [ ] ✅ Branch naming — `release/vX.Y.Z` or `hotfix/vX.Y.Z` (never direct push to `main`)
- [ ] ✅ PHP syntax lint — `php -l` on all `.php` files: zero errors
- [ ] ✅ No dangerous functions — `eval()`, `shell_exec()`, `system()`, `passthru()`, `popen()`, `proc_open()`
- [ ] ✅ `wp_options` autoload — large data options have `autoload = no`
- [ ] ✅ Zip hygiene — no `.DS_Store`, `node_modules/`, `.git/`, `*.map`, `phpunit*`, `.cursor/`
- [ ] ✅ Plugin header complete — `Plugin Name`, `Version`, `Requires at least`, `Tested up to`, `Requires PHP`
- [ ] ✅ `readme.txt` complete — `Stable tag`, `Requires at least`, `Tested up to`, `License`
- [ ] ✅ License file present (`license.txt` or `LICENSE`)
- [ ] ✅ POT file up to date (`languages/tpebl.pot`)

### Common Fixes

```bash
# Version mismatch — edit plugin main .php:
#   Version: 6.4.15
# Edit readme.txt:
#   Stable tag: 6.4.15
# Edit plugin constant:
#   define( 'L_THEPLUS_VERSION', '6.4.15' );

# Changelog missing — add to readme.txt:
# == 6.4.15 ==
# * Fix: description of fix

# Regen POT file (needs WP-CLI)
wp i18n make-pot . languages/tpebl.pot --slug=the-plus-addons-for-elementor-page-builder
```

**Resume after fix:**
```bash
bash run-prerelease.sh --version 6.4.15 --gate 2
```

---

## Gate 3 — Code Quality + Security ✅ `~5 min`

### PHP Standards
- [ ] ✅ PHPCS — zero `ERROR` level violations (WP coding standards)
- [ ] ✅ PHPStan — no level-5 type errors

### PHP / WP Compatibility
- [ ] ✅ PHP 7.4, 8.0, 8.1, 8.2, 8.3 — no compatibility issues
- [ ] ✅ WordPress 6.0–7.0 — no deprecated API usage

### Security
- [ ] ✅ Live CVE scan (NVD + Patchstack + WPScan) — no matches ← **CRITICAL if fails**
- [ ] ✅ All user-facing inputs sanitized — `sanitize_text_field()`, `absint()`, `wp_kses_post()`
- [ ] ✅ All outputs escaped — `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`
- [ ] ✅ All AJAX handlers have `check_ajax_referer()` or `wp_verify_nonce()`
- [ ] ✅ All REST endpoints have `permission_callback` (not `__return_true` on write endpoints)
- [ ] ✅ No `$wpdb->query()` without `$wpdb->prepare()`
- [ ] 👤 No IDOR — after nonce passes, handler checks object belongs to current user
- [ ] 👤 No privilege escalation — no `wp_capabilities` meta overwrite accepted from input

### Database
- [ ] ✅ No obvious N+1 query patterns (DB calls inside `foreach` loops — heuristic)
- [ ] ✅ `wp_options` entries — `autoload = no` for large data

### Assets
- [ ] ✅ New assets enqueued conditionally — not globally on every page

### i18n
- [ ] ✅ All user-facing strings use `__()`, `_e()`, `esc_html_e()` with text domain `tpebl`
- [ ] ✅ POT file regenerated and matches current strings

**If gate 3 fails:**
```bash
# Check failing skill output, fix the code, then:
bash run-prerelease.sh --version 6.4.15 --gate 3
```

---

## Gate 4 — E2E + Functional + Performance + UI/UX ✅ + 👤 `~10–30 min`

### TPAE Widget Tests ✅ `npm run test:tpae`
- [ ] ✅ All 10 widget specs pass — Chromium (`tpae-chromium`)
- [ ] ✅ All widget specs pass — mobile 375px Pixel 5 (`tpae-mobile`)
- [ ] ✅ AJAX tests pass — load-more + form-submission (`tpae-ajax`)
- [ ] ✅ Firefox cross-browser tests pass (`tpae-firefox`)

### Orbit Flow + Elementor Tests ✅
- [ ] ✅ 25+ user flow specs pass (`orbit-flows`)
- [ ] ✅ Elementor widget QA passes (`orbit-elementor`)
- [ ] ✅ Visual regression snapshots pass (`orbit-visual`)
- [ ] ✅ PM / UX audit passes — label quality, spell check (`orbit-pm`)
- [ ] ✅ Editor performance tests pass (`orbit-perf`)

### Performance
- [ ] ✅ Lighthouse performance score ≥ 75 (target: 85+) — auto-runs if Lighthouse installed
- [ ] ✅ DB query profiling — count not regressed vs previous release (`orbit/scripts/db-profile.sh`)
- [ ] 👤 No CSS/JS 404s on key frontend pages
- [ ] 👤 JS bundle size not increased >10% vs previous release
- [ ] 👤 No synchronous external HTTP calls blocking page render
- [ ] 👤 No individual queries >100ms on key pages

### Plugin Lifecycle ✅ (if `WP_PATH` + `wp-cli` set in `.env`)
- [ ] ✅ Plugin activates cleanly — no PHP fatals on fresh WP install
- [ ] ✅ Admin panel loads without errors after activation
- [ ] ✅ Plugin deactivates cleanly — no fatal on deactivation hook
- [ ] ✅ Plugin re-activates cleanly
- [ ] 👤 Plugin uninstalls cleanly — user data removed if opted in

> To enable lifecycle tests, add to `.env`:
> ```
> WP_PATH=/path/to/wordpress
> ```

### Compatibility 👤 Manual
- [ ] 👤 Tested on PHP 7.4 + WP latest — no fatals
- [ ] 👤 Tested on PHP 8.2 + WP latest — no fatals
- [ ] 👤 No fatal errors with `WP_DEBUG=true` + `WP_DEBUG_LOG=true`
- [ ] 👤 Tested with **Rank Math** active — no conflicts
- [ ] 👤 Tested with **Yoast SEO** active — no conflicts
- [ ] 👤 Tested with **WooCommerce** active — no conflicts
- [ ] 👤 Tested with **Elementor Pro** active — no conflicts

**If gate 4 fails:**
```bash
# View failing test details
npm run report   # opens reports/html/index.html

# View raw Playwright log
cat reports/prerelease-[timestamp]/pw-tpae-widgets.log

# Resume after fix
bash run-prerelease.sh --version 6.4.15 --gate 4
```

---

## Gate 5 — Evidence Pack ✅

Auto-generated at end of run. Contains:
- Full pass/fail/critical counts
- Every check result with severity
- Manual sign-off checklist
- Links to Playwright HTML report and raw logs
- Final **SHIP / WARN / HOLD / BLOCK** verdict

**Location:** `reports/prerelease-[timestamp]/evidence-pack.md`
**Save this file** — it's proof the release was QA'd.

---

## UI/UX Sign-off 👤 Manual

### Layout & Responsive
- [ ] 👤 No horizontal overflow at 375px, 768px, 1440px
- [ ] 👤 No broken images on any widget
- [ ] 👤 Hit areas ≥ 44×44px on all interactive elements (buttons, toggles, icon buttons)
- [ ] 👤 Consistent spacing — gaps/padding follow 4px or 8px grid

### Elementor Panel Specific
- [ ] 👤 Widget settings panel fits in 320px Elementor sidebar — no overflow
- [ ] 👤 Section tabs navigable by keyboard (Tab cycles through all)
- [ ] 👤 Responsive controls show Desktop/Tablet/Mobile icons for all size/spacing controls
- [ ] 👤 Color picker defaults are not blank/empty on first use
- [ ] 👤 Dynamic content dropdowns (post lists, categories) are searchable for long lists
- [ ] 👤 All widgets render correctly in Container layout (Elementor 3.6+)

### Forms & Inputs
- [ ] 👤 All inputs have visible labels — no placeholder-only labels
- [ ] 👤 Error states: red border + message, not just color change
- [ ] 👤 Save actions show success feedback (not silent)
- [ ] 👤 Toggle switches have text labels ("Enable / Disable")
- [ ] 👤 Destructive actions (reset settings, delete template) require a confirm dialog

### Animations & Interactions
- [ ] 👤 Buttons use `transform: scale(0.96)` on press
- [ ] 👤 No `transition: all` anywhere — specific properties only
- [ ] 👤 Elements already visible on page load are not animated in

### Accessibility
- [ ] ✅ WCAG 2.1 AA color contrast — checked via axe-core in Playwright
- [ ] 👤 All icon-only buttons have `aria-label`
- [ ] 👤 Widget output has correct heading hierarchy (no skipped levels, e.g. h1→h3)
- [ ] 👤 All interactive elements reachable by Tab

### Typography
- [ ] 👤 Counters/prices/stats use `font-variant-numeric: tabular-nums` (no layout shift)
- [ ] 👤 No single-word orphans on last line of important headings

---

## Release Process 👤 Manual

- [ ] 👤 Branch: `release/vX.Y.Z` — never push directly to `main`
- [ ] ✅ GitHub Actions: all CI checks green (`.github/workflows/playwright.yml`)
- [ ] 👤 Plugin zip root folder = plugin slug: `the-plus-addons-for-elementor-page-builder/`
- [ ] 👤 Zip tested: download → fresh WP install → activate → spot-check 3 widgets
- [ ] 👤 Release notes written — non-technical, user-focused
- [ ] 👤 `Tested up to:` updated to current WP version in plugin header + readme.txt

---

## Sign-off

| Role | Name | Date | Verdict |
|---|---|---|---|
| Developer | | | |
| QA Engineer | | | |
| Release Manager | | | |

---

## After SHIP

```bash
git tag v6.4.15
git push --tags
# → .github/workflows/release.yml triggers automatically
# → Runs all gates in CI, uploads evidence artifacts (30-day retention)
# → Build release zip
# → Upload to WP.org
```

---

## Hotfix Release

For urgent patches only — skips slow Playwright projects, Lighthouse, DB profiling:

```bash
npm run prerelease:quick -- --version 6.4.15
```

**Minimum required before any hotfix:**
- ✅ PHP syntax lint
- ✅ Version parity (header + readme.txt + tag)
- ✅ `tpae-chromium` Playwright tests
- 👤 Manual activation test on staging
