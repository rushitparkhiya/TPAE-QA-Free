# Pre-Release Runbook

Run this before every TPAE release. All 4 gates must pass before you `git tag`.

---

## Quick Reference

```bash
# Full pre-release (all 4 gates)
npm run prerelease -- --version 6.4.15

# Resume from gate 2 (after fixing gate 2 failures)
npm run prerelease -- --version 6.4.15 --gate 2

# Quick mode — skips firefox, orbit-flows, visual, pm (faster, use for hotfixes)
npm run prerelease -- --version 6.4.15 --quick

# Custom plugin path
npm run prerelease -- --version 6.4.15 --plugin /path/to/tpae-free
```

---

## The 4 Gates

### Gate 1 — Preflight (5 sec)
Checks that `node`, `npx`, `git`, `php` exist. Fails fast if a required tool is missing.

**If it fails:** Install the missing tool and re-run.

---

### Gate 2 — Release Metadata (30 sec)
| Check | What it verifies |
|---|---|
| Version parity | Plugin header `Version:` == `readme.txt` `Stable tag:` == git tag |
| Changelog | Entry for this version exists in CHANGELOG.md / readme.txt |
| PHP syntax lint | `php -l` on all `.php` files — zero syntax errors |
| Zip hygiene | No `.DS_Store`, `node_modules/`, `.git/`, `*.map`, `*.test.php` |
| Plugin header | `Plugin Name`, `Version`, `Requires at least`, `Tested up to` all present |
| readme.txt | `Stable tag`, `Requires at least`, `Tested up to` present |
| License | `license.txt` or `LICENSE` present |
| POT file | `.pot` translation file up to date |

**If it fails:** Fix the metadata issue, then resume with `--gate 2`. Don't skip to gate 3.

Common fixes:
```bash
# Version mismatch
# In plugin main PHP file:  Version: 6.4.15
# In readme.txt:            Stable tag: 6.4.15
# Then: git tag v6.4.15

# Changelog missing
# Add section to readme.txt or CHANGELOG.md:
# == 6.4.15 ==
# * Fix: ...

# Regen POT file (needs WP-CLI)
wp i18n make-pot . languages/tpae.pot --slug=the-plus-addons-for-elementor-page-builder
```

---

### Gate 3 — Full QA

#### 3a — Static Code Audits
| Check | Severity if fails |
|---|---|
| PHPCS (WP coding standards) | High |
| PHPStan level-5 | High |
| PHP 7.4–8.3 compat | High |
| WP 6.0–6.9 compat | Warn |
| Live CVE security scan | **Critical** |
| i18n check | Warn |

#### 3b — Playwright E2E
| Project | What it tests |
|---|---|
| `tpae-chromium` | All 10 widget specs + AJAX specs (Chrome) |
| `tpae-mobile` | Same specs on Pixel 5 viewport (375px) |
| `tpae-ajax` | load-more + form-submission AJAX tests |
| `tpae-firefox` | Cross-browser widget tests |
| `orbit-flows` | 25+ user flow specs (Orbit) |
| `orbit-elementor` | Elementor widget QA (Orbit) |
| `orbit-visual` | Visual regression snapshots |
| `orbit-pm` | PM/UX audit — label quality, spell check |

**If gate 3 fails:**
- Check `reports/html/index.html` for failing test details
- Check `reports/prerelease-[timestamp]/pw-*.log` for raw output
- Fix the failing tests/code, then resume with `--gate 3`

---

### Gate 4 — Evidence Pack
Generates `reports/prerelease-[timestamp]/evidence-pack.md` with:
- Full verdict: SHIP / WARN / HOLD / BLOCK
- All check results with pass/fail/critical counts
- Links to Playwright HTML report

**Save this file.** It's proof the release was QA'd.

---

## Verdict Rules

| Verdict | Meaning | Action |
|---|---|---|
| 🟢 **SHIP** | 0 critical, 0 high | Tag + push + WP.org submit |
| 🟡 **WARN** | Warnings only | Document in release notes, proceed at discretion |
| 🟠 **HOLD** | High-severity findings | Fix before tagging |
| 🔴 **BLOCK** | Critical findings | Do NOT release — fix first |

---

## After SHIP

```bash
git tag v6.4.15
git push --tags
# → GitHub Actions release.yml triggers automatically
# → Runs all gates in CI, uploads evidence artifacts
# → Build your release zip
# → Upload to WP.org
```

---

## Hotfix Release (faster)

For urgent patches only:

```bash
npm run prerelease:quick -- --version 6.4.15
```

Quick mode skips: firefox, orbit-flows, orbit-visual, orbit-pm.
Still runs: PHP lint, version parity, TPAE chromium + mobile + AJAX tests.

**Minimum required before any hotfix:** PHP lint ✓ + version parity ✓ + `tpae-chromium` ✓
