# TPAE Pre-Release Checklist
> Combined from: orbit pre-release-checklist + orbit ui-ux-checklist, adapted for TPAE Free v6.x
> Run `bash run-prerelease.sh --version X.Y.Z` to automate the ✅ automated items.
> Manual items require human sign-off before tagging.

---

## Gate 2 — Release Metadata ✅ Automated

- [ ] Version numbers synced in all 3 places — plugin header `Version:`, version constant `define('L_THEPLUS_VERSION', ...)`, `readme.txt` `Stable tag:`
- [ ] `CHANGELOG.md` / `readme.txt` has entry for this version (`== X.Y.Z ==`)
- [ ] PHP syntax lint — `php -l` on all `.php` files: zero errors
- [ ] No dangerous functions — `eval()`, `shell_exec()`, `system()`, `passthru()`, `popen()`, `proc_open()`
- [ ] `wp_options` autoload — large data options have `autoload = no`
- [ ] Zip hygiene — no `.DS_Store`, `node_modules/`, `.git/`, `*.map`, `phpunit*`, `.cursor/`
- [ ] Branch naming — `release/vX.Y.Z` or `hotfix/vX.Y.Z` (not direct push to main)
- [ ] Plugin header complete — `Plugin Name`, `Version`, `Requires at least`, `Tested up to`, `Requires PHP`
- [ ] `readme.txt` complete — `Stable tag`, `Requires at least`, `Tested up to`, `License`
- [ ] License file present (`license.txt` or `LICENSE`)
- [ ] POT file up to date (`languages/tpebl.pot`)

---

## Gate 3 — Code Quality + Security ✅ Automated

### PHP Standards
- [ ] PHPCS: zero `ERROR` level violations (WP coding standards)
- [ ] PHPStan: no level-5 type errors

### PHP / WP Compatibility
- [ ] PHP 7.4, 8.0, 8.1, 8.2, 8.3 — no compatibility issues
- [ ] WordPress 6.0–7.0 — no deprecated API usage

### Security
- [ ] Live CVE scan (NVD + Patchstack + WPScan) — no matches
- [ ] All user-facing inputs sanitized — `sanitize_text_field()`, `absint()`, `wp_kses_post()`, etc.
- [ ] All outputs escaped — `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`
- [ ] All AJAX handlers have `check_ajax_referer()` or `wp_verify_nonce()`
- [ ] All REST endpoints have `permission_callback` (not `__return_true` on write endpoints)
- [ ] No direct `$wpdb->query()` without `$wpdb->prepare()`
- [ ] No IDOR — after nonce passes, handler checks requested object belongs to current user
- [ ] No privilege escalation — no arbitrary `wp_capabilities` meta overwrites accepted from input

### Database
- [ ] No obvious N+1 query patterns (DB calls inside `foreach` loops)
- [ ] New `wp_options` entries — `autoload` = `no` for large data

### Assets
- [ ] New assets enqueued conditionally — not on every page globally

### i18n
- [ ] All user-facing strings use `__()`, `_e()`, `esc_html_e()` with text domain `tpebl`
- [ ] POT file regenerated and matches current strings

---

## Gate 4 — Playwright E2E + Functional + UI/UX ✅ Automated + 👤 Manual

### Widget Tests (Automated — `npm run test:tpae`)
- [ ] All 10 widget specs pass on Chromium
- [ ] All widget specs pass on mobile viewport (375px — Pixel 5)
- [ ] AJAX load-more + form-submission tests pass
- [ ] Firefox cross-browser tests pass

### Orbit Flow Tests (Automated)
- [ ] User flow specs pass (`orbit-flows`)
- [ ] Elementor widget QA passes (`orbit-elementor`)
- [ ] Visual regression snapshots pass (`orbit-visual`)
- [ ] PM / UX audit passes (`orbit-pm`)

### Performance (Automated where possible)
- [ ] Lighthouse performance score ≥ 75 (target: 85+)
- [ ] No CSS/JS 404s on key frontend pages 👤
- [ ] JS bundle size not increased >10% vs previous release 👤
- [ ] No synchronous external HTTP calls blocking page render 👤
- [ ] DB query count not regressed vs previous release (`orbit/scripts/db-profile.sh`)
- [ ] No queries >100ms on key pages 👤

### Plugin Lifecycle (Automated if WP_PATH + wp-cli set)
- [ ] Plugin activates cleanly — no PHP fatals on fresh WP install
- [ ] Admin panel loads without errors after activation
- [ ] Plugin deactivates cleanly — no fatal on deactivation hook
- [ ] Plugin re-activates cleanly
- [ ] Plugin uninstalls cleanly — user data removed if opted in 👤

### Compatibility 👤 Manual
- [ ] Tested on PHP 7.4 + WP latest
- [ ] Tested on PHP 8.2 + WP latest
- [ ] No fatal errors with `WP_DEBUG=true` + `WP_DEBUG_LOG=true`
- [ ] Tested with Rank Math active — no conflicts
- [ ] Tested with Yoast SEO active — no conflicts
- [ ] Tested with WooCommerce active — no conflicts
- [ ] Tested with Elementor Pro active — no conflicts

---

## UI/UX Checklist 👤 Manual (from orbit ui-ux-checklist)

### Layout & Responsive
- [ ] No horizontal overflow at 375px, 768px, 1440px (`document.documentElement.scrollWidth > clientWidth`)
- [ ] No broken images on any widget
- [ ] Hit areas ≥ 44×44px on all interactive elements (buttons, toggles, icon buttons)
- [ ] Consistent spacing — gaps/padding follow 4px or 8px grid

### TPAE / Elementor Panel Specific
- [ ] Widget settings panel fits in 320px Elementor sidebar — no overflow
- [ ] Section tabs navigable by keyboard (Tab key cycles through)
- [ ] Responsive controls labeled — Desktop/Tablet/Mobile icons present for all size/spacing controls
- [ ] Color picker defaults are not blank/empty on first use
- [ ] Dynamic content dropdowns (post lists, categories) are searchable for long lists
- [ ] Widget renders correctly in Container layout (Elementor 3.6+)

### Forms & Inputs
- [ ] All inputs have visible labels — no placeholder-only labels
- [ ] Error states are clear — red border + message, not just color change
- [ ] Save actions show success feedback (not silent)
- [ ] Toggle switches have text labels ("Enable / Disable")
- [ ] Destructive actions (reset settings, delete template) require confirmation dialog

### Animations & Interactions
- [ ] Buttons use `transform: scale(0.96)` on press (not 0.95 or 0.98)
- [ ] No `transition: all` — specific properties listed only
- [ ] No elements animated on initial page load if already visible

### Accessibility
- [ ] WCAG 2.1 AA color contrast on all text (checked via axe-core in Playwright)
- [ ] All icon-only buttons have `aria-label`
- [ ] Widget output has correct heading hierarchy (no skipped levels)
- [ ] Keyboard navigable — all interactive elements reachable by Tab

### Typography
- [ ] `font-variant-numeric: tabular-nums` on counters, prices, stats (prevents layout shift)
- [ ] No single-word "orphans" on last line of important headings

---

## Release Process Checklist 👤 Manual

- [ ] Branch: `release/vX.Y.Z` — never push directly to `main`
- [ ] GitHub Actions: all CI checks green (`.github/workflows/playwright.yml`)
- [ ] Plugin zip root folder = plugin slug: `the-plus-addons-for-elementor-page-builder/`
- [ ] Zip tested: download → fresh WP install → activate → spot-check 3 widgets
- [ ] Release notes written — non-technical, user-focused (not "fixed bug in line 42")
- [ ] `Tested up to:` in plugin header + readme.txt updated to current WP version

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Developer | | | |
| QA | | | |
| Release Manager | | | |

**Rule:** Never tag a release with any unaddressed Critical or High finding.
For hotfixes, minimum required: PHP lint ✓ + version parity ✓ + `tpae-chromium` Playwright ✓

---

## Automated Command

```bash
# Full pre-release (all 5 gates)
npm run prerelease -- --version 6.4.15

# Quick / hotfix (skips slow Playwright + Lighthouse)
npm run prerelease:quick -- --version 6.4.15

# Resume from a specific gate after fixing failures
bash run-prerelease.sh --version 6.4.15 --gate 3
```
