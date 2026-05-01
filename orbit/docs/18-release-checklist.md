# Release Gate — Orbit Master Checklist

> Before tagging any WordPress plugin release, every check in this document
> must pass. Automated via `bash scripts/gauntlet.sh --mode release`.

---

## Pre-tag automated gate

All of these are wired into `gauntlet.sh`. A failing check blocks the release.

### Code correctness
- [ ] Step 1 — PHP Lint (syntax errors)
- [ ] Step 1b — Zip hygiene (no `.git/`, `node_modules/`, source maps, forbidden functions)
- [ ] Step 2 — WPCS (WordPress Coding Standards)
- [ ] Step 2b — WP.org Plugin Check (official WP.org review tool)
- [ ] Step 3 — PHPStan level 5 (static analysis)

### Release metadata
- [ ] Plugin header completeness (`check-plugin-header.sh`)
- [ ] readme.txt WP.org parser valid (`check-readme-txt.sh`)
- [ ] Version parity: plugin header ↔ readme.txt ↔ CHANGELOG.md ↔ git tag (`check-version-parity.sh`)
- [ ] GPL license compliance, all bundled libs (`check-license.sh`)
- [ ] "Tested up to" is current WP version

### Internationalization
- [ ] Step 5 — .pot regeneration, untranslated string count < threshold
- [ ] Step 8f — Runtime translation test (pseudo-locale .mo loaded, no PHP errors)

### Functional / E2E
- [ ] Step 6 — Playwright functional + visual baseline
- [ ] Step 6c — PHP deprecation scan (debug.log clean)
- [ ] Step 8g — Lifecycle (uninstall cleanup + update path + block deprecation)

### Performance
- [ ] Step 7 — Lighthouse ≥ 80
- [ ] Step 8 — DB profiling (no N+1, autoload < 800KB)
- [ ] Step 8b — Peak memory < 32MB (warn at 64MB, fail > 64MB)
- [ ] Step 10 — Frontend TTFB < 500ms

### Accessibility
- [ ] Step 11 — axe-core WCAG 2.2 AA (0 Critical/Serious)
- [ ] Step 8h — Keyboard navigation (no focus traps)
- [ ] Step 8h — All 9 admin color schemes render
- [ ] Step 8h — RTL layout (Arabic locale, no overflow)

### Security
- [ ] Step 11 — `/orbit-wp-security` skill audit (13 WP vuln patterns)
- [ ] Step 8i — REST API Application Password permission_callback holds
- [ ] Step 8d — GDPR / Privacy API hooks registered (if storing user data)
- [ ] Step 8e — No plugin assets leaked on wp-login.php

### Compatibility
- [ ] Step 8g — Plugin conflict matrix (top 20 popular plugins)
- [ ] Step 8c — WP-Cron events registered / cleared correctly
- [ ] Multisite activation (if `Network: true` in header)
- [ ] WP 7.0 Connectors security (if plugin uses Abilities API)
- [ ] HPOS declaration (if plugin touches WooCommerce orders)
- [ ] `block.json` apiVersion: 3 (if plugin ships blocks)

### Environment matrix
- [ ] PHP 7.4, 8.1, 8.3 (via CI matrix)
- [ ] WP latest, latest-1, latest-2
- [ ] Chromium, Firefox, WebKit
- [ ] Desktop, tablet, mobile viewport

---

## Manual review (not automatable)

### PM sign-off
- [ ] User journey flow works end-to-end (`user-journey.spec.js` passes with real data)
- [ ] FTUE is under 3 clicks to core feature (`onboarding-ftue.spec.js`)
- [ ] Analytics events fire correctly (`analytics-events.spec.js`)
- [ ] UAT report reviewed (`reports/uat-report-*.html`)

### PA / Analytics
- [ ] Tracking events have correct names and payload
- [ ] Consent mode handled (GDPR)
- [ ] Dashboard KPI queries return expected shape

### Design / Visual
- [ ] Visual regression vs previous release (`visual-regression-release.spec.js`)
- [ ] No color scheme breaks (Ectoplasm, Sunrise, etc.)
- [ ] Screenshots attached to release notes

### Release ops
- [ ] CHANGELOG.md entry drafted
- [ ] readme.txt `== Upgrade Notice ==` mentions breaking changes
- [ ] Git tag matches version in all 3 files
- [ ] Release zip excludes dev artifacts (verified by `check-zip-hygiene.sh`)
- [ ] Release notes posted
- [ ] Support docs updated for new features

---

## Fast-track paths

### Patch release (bugfix only)
Minimum required:
- PHP lint, PHPCS, PHPStan
- Zip hygiene
- Version parity
- Playwright smoke (single happy-path flow)
- GDPR hooks (if data path changed)

### Major release
Everything in this checklist, plus:
- Manual QA pass on staging
- Beta period with 5+ external testers
- Migration dry-run on production-sized dataset (`seed-large-dataset.sh 10000`)
- Rollback plan documented

---

## Running the full gate

```bash
# Preflight — validates deps
bash scripts/gauntlet-dry-run.sh

# Full release gate (45-60 min end to end)
bash scripts/gauntlet.sh --plugin . --mode full

# Just the release-metadata checks (30 seconds)
bash scripts/check-plugin-header.sh .
bash scripts/check-readme-txt.sh .
bash scripts/check-version-parity.sh . v1.2.3   # replace with your tag
bash scripts/check-license.sh .
bash scripts/check-block-json.sh .
bash scripts/check-hpos-declaration.sh .

# Reports index
python3 scripts/generate-reports-index.py --title "Release v1.2.3"
open reports/index.html
```
