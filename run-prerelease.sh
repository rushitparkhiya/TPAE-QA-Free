#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  TPAE + Orbit  |  Pre-Release Gate Runner
#
#  5 sequential gates — fail fast, evidence pack at the end.
#  Run this BEFORE git tag, BEFORE WP.org submit.
#
#  Usage:
#    bash run-prerelease.sh --version 6.4.15 --plugin /path/to/plugin
#    bash run-prerelease.sh --version 6.4.15   # auto-detect plugin from .env
#    bash run-prerelease.sh --gate 3           # resume from a specific gate
#    bash run-prerelease.sh --version 6.4.15 --quick  # hotfix mode (skip slow steps)
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
[ -z "${TERM:-}" ] && export TERM=xterm-256color

# ── Colours ────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'

ok()     { echo -e "${GREEN}  ✓  $1${NC}"; }
warn()   { echo -e "${YELLOW}  ⚠  $1${NC}"; }
fail()   { echo -e "${RED}  ✗  $1${NC}"; }
info()   { echo -e "${CYAN}  →  $1${NC}"; }
gate()   { echo -e "\n${BOLD}${BLUE}┌──────────────────────────────────────────────────┐${NC}"
           echo -e "${BOLD}${BLUE}│  Gate $1: $2${NC}"
           echo -e "${BOLD}${BLUE}└──────────────────────────────────────────────────┘${NC}"; }
section(){ echo -e "\n${MAGENTA}  ▸ $1${NC}"; }
skipit() { echo -e "${DIM}  ⊘  $1${NC}"; }

# ── Defaults ───────────────────────────────────────────────────
VERSION=""; PLUGIN_PATH=""; START_GATE=1; QUICK=false
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="reports/prerelease-$TIMESTAMP"
CRITICAL=0; HIGH=0; WARN_COUNT=0; PASS=0

# Load .env
[ -f .env ] && export $(grep -v '^#' .env | xargs 2>/dev/null) || true
PLUGIN_PATH="${WP_PLUGIN_PATH:-}"

# ── Args ───────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --version) VERSION="$2";     shift 2 ;;
    --plugin)  PLUGIN_PATH="$2"; shift 2 ;;
    --gate)    START_GATE="$2";  shift 2 ;;
    --quick)   QUICK=true;       shift ;;
    *) shift ;;
  esac
done

# Auto-detect version from git tag
[ -z "$VERSION" ] && VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "dev")
mkdir -p "$REPORT_DIR" .auth

EVIDENCE_FILE="$REPORT_DIR/evidence-pack.md"

# ── Init evidence pack ─────────────────────────────────────────
cat > "$EVIDENCE_FILE" <<EOF
# TPAE Pre-Release Evidence Pack
**Version:** $VERSION
**Date:** $(date)
**Plugin:** ${PLUGIN_PATH:-not set}
**Base URL:** ${WP_BASE_URL:-http://localhost}

---
EOF

# ── Helpers ────────────────────────────────────────────────────
_log_pass()  { echo "- ✅ **$1**" >> "$EVIDENCE_FILE"; PASS=$((PASS+1)); }
_log_crit()  { echo "- 🔴 **CRITICAL: $1**" >> "$EVIDENCE_FILE"; CRITICAL=$((CRITICAL+1)); }
_log_high()  { echo "- 🟠 **HIGH: $1**" >> "$EVIDENCE_FILE"; HIGH=$((HIGH+1)); }
_log_warn()  { echo "- ⚠️  **WARN: $1**" >> "$EVIDENCE_FILE"; WARN_COUNT=$((WARN_COUNT+1)); }
_log_skip()  { echo "- ⊘ **SKIPPED: $1**" >> "$EVIDENCE_FILE"; }

check() {
  local label="$1" cmd="$2" severity="${3:-warn}"
  info "$label"
  local out; out=$(eval "$cmd" 2>&1) && {
    ok "$label"; _log_pass "$label"; return 0
  } || {
    case $severity in
      critical) fail "$label ← CRITICAL"
                echo "- 🔴 **CRITICAL: $label**" >> "$EVIDENCE_FILE"
                printf '```\n%s\n```\n' "$(echo "$out" | head -20)" >> "$EVIDENCE_FILE"
                CRITICAL=$((CRITICAL+1)) ;;
      high)     fail "$label ← HIGH"; _log_high "$label" ;;
      *)        warn "$label ← warning"; _log_warn "$label" ;;
    esac
    return 1
  }
}

check_skip() {
  local label="$1" cmd="$2" tool="$3" severity="${4:-warn}"
  command -v "$tool" &>/dev/null && check "$label" "$cmd" "$severity" \
    || { skipit "$label (needs: $tool)"; _log_skip "$label (tool: $tool)"; }
}

require_plugin() {
  [ -n "$PLUGIN_PATH" ] && [ -d "$PLUGIN_PATH" ] && return 0
  warn "Plugin path not set — skipping plugin-level checks"
  warn "Set WP_PLUGIN_PATH in .env or pass --plugin /path"
  return 1
}

run_pw() {
  local label="$1"; shift
  info "Playwright: $label"
  if npx playwright test "$@" 2>&1 | tee "$REPORT_DIR/pw-${label}.log"; then
    ok "Playwright [$label] PASSED"; _log_pass "Playwright: $label"
  else
    fail "Playwright [$label] FAILED"
    echo "- 🔴 **CRITICAL: Playwright $label** — see reports/html/" >> "$EVIDENCE_FILE"
    CRITICAL=$((CRITICAL+1))
  fi
}

# ══════════════════════════════════════════════════════════════
#  GATE 1 — PREFLIGHT  (~5 sec)
# ══════════════════════════════════════════════════════════════
if [ "$START_GATE" -le 1 ]; then
  gate 1 "Preflight — Tool Availability"
  echo -e "\n## Gate 1 — Preflight" >> "$EVIDENCE_FILE"
  MISSING=()

  for tool in node npx git; do
    command -v "$tool" &>/dev/null \
      && { ok "$tool ($(${tool} --version 2>/dev/null | head -1))"; _log_pass "$tool available"; } \
      || { fail "$tool NOT FOUND"; _log_crit "$tool MISSING"; MISSING+=("$tool"); }
  done

  for tool in php phpcs phpstan; do
    command -v "$tool" &>/dev/null \
      && { ok "$tool found"; _log_pass "$tool available"; } \
      || { warn "$tool not found (optional)"; _log_skip "$tool not installed (optional)"; }
  done

  npx playwright install --dry-run chromium &>/dev/null 2>&1 \
    && ok "Playwright chromium ready" \
    || warn "Playwright browsers not installed — run: npx playwright install"

  [ ${#MISSING[@]} -gt 0 ] && {
    fail "Gate 1 FAILED — missing: ${MISSING[*]}"
    exit 1
  }
  ok "Gate 1 PASSED"
fi

# ══════════════════════════════════════════════════════════════
#  GATE 2 — RELEASE METADATA  (~30 sec)
# ══════════════════════════════════════════════════════════════
if [ "$START_GATE" -le 2 ]; then
  gate 2 "Release Metadata"
  echo -e "\n## Gate 2 — Release Metadata" >> "$EVIDENCE_FILE"

  if require_plugin; then

    # ── Version parity ──────────────────────────────────────
    section "Version Parity"
    HEADER_VER=$(grep -m1 'Version:' "$PLUGIN_PATH"/*.php 2>/dev/null | grep -oP '\d+\.\d+[\.\d]*' | head -1 || echo "unknown")
    README_VER=$(grep -i 'Stable tag:' "$PLUGIN_PATH/readme.txt" 2>/dev/null | grep -oP '\d+\.\d+[\.\d]*' | head -1 || echo "unknown")
    CONST_VER=$(grep -r "define.*VERSION.*['\"]" "$PLUGIN_PATH"/*.php 2>/dev/null | grep -oP '\d+\.\d+[\.\d]*' | head -1 || echo "unknown")

    info "Plugin header:    $HEADER_VER"
    info "Plugin constant:  $CONST_VER"
    info "readme.txt tag:   $README_VER"
    info "Requested:        $VERSION"

    if [ "$VERSION" != "dev" ]; then
      CV="${VERSION#v}"
      if [ "$HEADER_VER" = "$CV" ] && [ "$README_VER" = "$CV" ]; then
        ok "Version parity — all match ($CV)"
        echo "- ✅ **Version parity** — header=$CV constant=$CONST_VER readme=$CV" >> "$EVIDENCE_FILE"
        PASS=$((PASS+1))
        # Warn if constant doesn't match (3rd place)
        [ "$CONST_VER" != "$CV" ] && warn "Plugin version constant ($CONST_VER) doesn't match — check your define()" && _log_warn "Version constant mismatch: $CONST_VER vs $CV"
      else
        fail "Version MISMATCH — header=$HEADER_VER  readme=$README_VER  tag=$CV"
        _log_crit "Version mismatch — header=$HEADER_VER readme=$README_VER tag=$CV"
      fi
    fi

    # ── Changelog ───────────────────────────────────────────
    section "Changelog"
    CHANGELOG=""
    for f in "$PLUGIN_PATH/CHANGELOG.md" "$PLUGIN_PATH/changelog.txt" "$PLUGIN_PATH/readme.txt"; do
      [ -f "$f" ] && CHANGELOG="$f" && break
    done
    if [ -n "$CHANGELOG" ] && [ "$VERSION" != "dev" ]; then
      CV="${VERSION#v}"
      grep -q "$CV" "$CHANGELOG" \
        && { ok "Changelog entry found for $CV"; _log_pass "Changelog entry for $CV"; } \
        || { fail "Changelog missing entry for $CV"; _log_crit "Changelog missing entry for $CV in $CHANGELOG"; }
    fi

    # ── Branch naming ────────────────────────────────────────
    section "Branch / Release Process"
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    info "Current branch: $CURRENT_BRANCH"
    if echo "$CURRENT_BRANCH" | grep -qE '^(release/|hotfix/|main|master)'; then
      ok "Branch name is valid: $CURRENT_BRANCH"
      _log_pass "Branch: $CURRENT_BRANCH"
    else
      warn "Branch '$CURRENT_BRANCH' — convention: release/vX.Y.Z or hotfix/vX.Y.Z"
      _log_warn "Non-standard branch: $CURRENT_BRANCH"
    fi

    # ── PHP syntax lint ──────────────────────────────────────
    section "PHP Syntax Lint"
    if command -v php &>/dev/null; then
      PHP_ERRORS=$(find "$PLUGIN_PATH" -name "*.php" -not -path "*/vendor/*" \
        -exec php -l {} \; 2>&1 | grep -v "No syntax errors" || true)
      [ -z "$PHP_ERRORS" ] \
        && { ok "PHP syntax: clean"; _log_pass "PHP syntax lint"; } \
        || { fail "PHP syntax errors"; _log_crit "PHP syntax errors"
             printf '```\n%s\n```\n' "$(echo "$PHP_ERRORS" | head -20)" >> "$EVIDENCE_FILE"; }
    fi

    # ── Dangerous function check ─────────────────────────────
    section "Dangerous Functions (eval/exec/system/shell_exec)"
    DANGEROUS=$(grep -rn --include="*.php" \
      -E '\b(eval|shell_exec|system|passthru|popen|proc_open)\s*\(' \
      "$PLUGIN_PATH" \
      --exclude-dir=vendor --exclude-dir=node_modules 2>/dev/null || true)
    if [ -z "$DANGEROUS" ]; then
      ok "No dangerous functions found"
      _log_pass "No eval/exec/system/shell_exec"
    else
      fail "Dangerous functions found:"
      echo "$DANGEROUS" | head -10 | while read -r line; do warn "  $line"; done
      echo "- 🔴 **CRITICAL: Dangerous functions (eval/exec/shell_exec)**" >> "$EVIDENCE_FILE"
      printf '```\n%s\n```\n' "$(echo "$DANGEROUS" | head -15)" >> "$EVIDENCE_FILE"
      CRITICAL=$((CRITICAL+1))
    fi

    # ── wp_options autoload check ────────────────────────────
    section "wp_options autoload"
    BAD_AUTOLOAD=$(grep -rn --include="*.php" \
      "add_option\|update_option" "$PLUGIN_PATH" \
      --exclude-dir=vendor 2>/dev/null \
      | grep -v "autoload.*no\|'no'\|\"no\"" \
      | grep -v "//\|#" | head -10 || true)
    if [ -z "$BAD_AUTOLOAD" ]; then
      ok "wp_options autoload: looks correct"
      _log_pass "wp_options autoload check"
    else
      warn "Some options may be auto-loading — verify 'autoload' = 'no' for large data:"
      echo "$BAD_AUTOLOAD" | head -5 | while read -r line; do warn "  $line"; done
      _log_warn "wp_options autoload — manual review needed"
    fi

    # ── Zip hygiene ──────────────────────────────────────────
    section "Zip Hygiene"
    if [ -f orbit/scripts/check-zip-hygiene.sh ]; then
      check "Zip hygiene" "bash orbit/scripts/check-zip-hygiene.sh '$PLUGIN_PATH'" "high"
    else
      BAD_FILES=$(find "$PLUGIN_PATH" \( \
        -name ".DS_Store" -o -name "Thumbs.db" -o -name "*.log" \
        -o -path "*/node_modules/*" -o -path "*/.git/*" -o -path "*/.github/*" \
        -o -name "*.map" -o -name "phpunit*" -o -name "*.test.php" \
        -o -name ".cursor" -o -name "*.lock" \) \
        -not -path "*/vendor/*" 2>/dev/null | head -20)
      [ -z "$BAD_FILES" ] \
        && { ok "Zip hygiene: clean"; _log_pass "Zip hygiene"; } \
        || { warn "Dev files present (exclude from zip):"; echo "$BAD_FILES" | while read -r f; do warn "  $f"; done; _log_warn "Zip hygiene — dev files found"; }
    fi

    # ── Orbit metadata scripts ───────────────────────────────
    section "Plugin Metadata"
    for script in check-plugin-header check-readme-txt check-license check-pot-file; do
      [ -f "orbit/scripts/${script}.sh" ] && \
        check "$script" "bash orbit/scripts/${script}.sh '$PLUGIN_PATH'" "warn"
    done

  fi # require_plugin

  # ── Fail fast on critical metadata issues ────────────────
  if [ "$CRITICAL" -gt 0 ]; then
    echo ""
    fail "Gate 2 FAILED — $CRITICAL critical issue(s). Fix before Gate 3."
    echo "Resume: bash run-prerelease.sh --version $VERSION --gate 2"
    exit 1
  fi
  ok "Gate 2 PASSED"
fi

# ══════════════════════════════════════════════════════════════
#  GATE 3 — CODE QUALITY + SECURITY  (~5 min)
# ══════════════════════════════════════════════════════════════
if [ "$START_GATE" -le 3 ]; then
  gate 3 "Code Quality + Security"
  echo -e "\n## Gate 3 — Code Quality + Security" >> "$EVIDENCE_FILE"

  if require_plugin; then

    section "PHP Code Standards"
    check_skip "PHPCS — WP coding standards (zero ERRORs)" \
      "phpcs --standard=orbit/config/phpcs.xml '$PLUGIN_PATH' 2>&1 | tail -5" \
      "phpcs" "high"

    check_skip "PHPStan — static analysis level 5" \
      "phpstan analyse --configuration=orbit/config/phpstan.neon '$PLUGIN_PATH' 2>&1 | tail -10" \
      "phpstan" "high"

    section "PHP Compatibility"
    [ -f orbit/scripts/check-php-compat.sh ] && \
      check "PHP 7.4–8.3 compat" "bash orbit/scripts/check-php-compat.sh '$PLUGIN_PATH'" "high"
    [ -f orbit/scripts/check-wp-compat.sh ] && \
      check "WP 6.0–7.0 compat"  "bash orbit/scripts/check-wp-compat.sh '$PLUGIN_PATH'" "warn"

    section "Security"
    [ -f orbit/scripts/check-live-cve.sh ] && \
      check "Live CVE security scan (NVD/Patchstack/WPScan)" \
        "bash orbit/scripts/check-live-cve.sh '$PLUGIN_PATH'" "critical"

    # N+1 query pattern detection (simple heuristic)
    N1=$(grep -rn --include="*.php" "get_post_meta\|get_option\|WP_Query" \
      "$PLUGIN_PATH" --exclude-dir=vendor 2>/dev/null \
      | grep -c "foreach\|for (\|while (" || echo "0")
    if [ "$N1" -gt 0 ]; then
      warn "Possible N+1 query patterns ($N1 hits) — review DB calls inside loops"
      _log_warn "Possible N+1 queries ($N1 hits) — manual review needed"
    else
      ok "No obvious N+1 query patterns"
      _log_pass "N+1 query check (heuristic)"
    fi

    # Conditional asset enqueuing
    section "Asset Enqueuing"
    GLOBAL_ENQUEUE=$(grep -rn --include="*.php" "wp_enqueue_script\|wp_enqueue_style" \
      "$PLUGIN_PATH" --exclude-dir=vendor 2>/dev/null \
      | grep -v "is_singular\|is_page\|has_block\|is_admin\|conditional\|if (" \
      | wc -l || echo "0")
    if [ "$GLOBAL_ENQUEUE" -gt 0 ]; then
      warn "$GLOBAL_ENQUEUE potentially unconditional enqueue(s) — may load on every page"
      _log_warn "Unconditional asset enqueuing ($GLOBAL_ENQUEUE occurrences) — review"
    else
      ok "Assets appear to be conditionally enqueued"
      _log_pass "Conditional asset enqueuing"
    fi

    section "i18n"
    [ -f orbit/scripts/check-translation.sh ] && \
      check "i18n / POT file check" "bash orbit/scripts/check-translation.sh '$PLUGIN_PATH'" "warn"

  fi # require_plugin
  ok "Gate 3 PASSED"
fi

# ══════════════════════════════════════════════════════════════
#  GATE 4 — PLAYWRIGHT E2E + FUNCTIONAL + UI/UX  (~10-30 min)
# ══════════════════════════════════════════════════════════════
if [ "$START_GATE" -le 4 ]; then
  gate 4 "Playwright E2E + Functional + UI/UX"
  echo -e "\n## Gate 4 — E2E + Functional + UI/UX" >> "$EVIDENCE_FILE"

  # ── Core widget + AJAX tests (always run) ────────────────
  section "TPAE Widget Tests"
  run_pw "tpae-widgets" --project=tpae-chromium --project=tpae-ajax
  run_pw "tpae-mobile"  --project=tpae-mobile

  if [ "$QUICK" = false ]; then

    section "Cross-browser"
    run_pw "tpae-firefox" --project=tpae-firefox

    section "Orbit Flow Tests"
    run_pw "orbit-flows"     --project=orbit-flows
    run_pw "orbit-elementor" --project=orbit-elementor

    section "Visual Regression"
    run_pw "orbit-visual" --project=orbit-visual

    section "Performance"
    run_pw "orbit-perf" --project=orbit-perf

    section "PM / UX Audit"
    run_pw "orbit-pm" --project=orbit-pm

    # DB profiling (if orbit script available)
    section "Database"
    if [ -f orbit/scripts/db-profile.sh ]; then
      check "DB query profiling" \
        "bash orbit/scripts/db-profile.sh 2>&1 | tail -20" "warn"
    else
      skipit "DB profiling (orbit/scripts/db-profile.sh not found)"
      _log_skip "DB query profiling"
    fi

    # Lighthouse performance score
    section "Lighthouse Performance"
    if [ -f orbit/scripts/lighthouse-attribution.py ] && command -v npx &>/dev/null; then
      info "Running Lighthouse audit..."
      LH_URL="${WP_BASE_URL:-http://localhost}"
      LH_OUT="$REPORT_DIR/lighthouse.json"
      if npx lighthouse "$LH_URL" \
          --output=json --output-path="$LH_OUT" \
          --chrome-flags="--headless --no-sandbox" \
          --quiet 2>/dev/null; then
        LH_SCORE=$(python3 -c "import json; d=json.load(open('$LH_OUT')); print(int(d['categories']['performance']['score']*100))" 2>/dev/null || echo "0")
        if [ "$LH_SCORE" -ge 75 ]; then
          ok "Lighthouse performance: $LH_SCORE/100 (target ≥75)"
          _log_pass "Lighthouse performance: $LH_SCORE/100"
        elif [ "$LH_SCORE" -ge 60 ]; then
          warn "Lighthouse performance: $LH_SCORE/100 (below target of 75)"
          _log_warn "Lighthouse performance: $LH_SCORE/100 (target ≥75)"
        else
          fail "Lighthouse performance: $LH_SCORE/100 (critical — target ≥75)"
          _log_high "Lighthouse performance: $LH_SCORE/100 (critical)"
        fi
      else
        warn "Lighthouse audit could not run (site may be unreachable)"
        _log_warn "Lighthouse skipped — site unreachable"
      fi
    else
      # Lightweight check: try npx lighthouse directly
      if command -v npx &>/dev/null && npx --yes lighthouse --version &>/dev/null 2>&1; then
        LH_URL="${WP_BASE_URL:-http://localhost}"
        info "Running Lighthouse on $LH_URL..."
        LH_SCORE=$(npx lighthouse "$LH_URL" \
          --output=json --chrome-flags="--headless --no-sandbox" --quiet 2>/dev/null \
          | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['performance']['score']*100))" 2>/dev/null || echo "0")
        [ "$LH_SCORE" -ge 75 ] \
          && { ok "Lighthouse: $LH_SCORE/100"; _log_pass "Lighthouse performance: $LH_SCORE/100"; } \
          || { warn "Lighthouse: $LH_SCORE/100 (target ≥75)"; _log_warn "Lighthouse: $LH_SCORE/100"; }
      else
        skipit "Lighthouse (install: npm install -g lighthouse)"
        _log_skip "Lighthouse (not installed)"
      fi
    fi

  else
    warn "Quick mode — skipping: firefox, orbit flows, visual, perf, PM, DB profiling, Lighthouse"
    _log_warn "Quick mode: firefox/flows/visual/perf/PM/DB/Lighthouse skipped"
  fi

  # ── Functional: plugin lifecycle ─────────────────────────
  section "Plugin Lifecycle (activate / deactivate / uninstall)"
  if command -v wp &>/dev/null && [ -n "${WP_PATH:-}" ]; then
    # WP-CLI available
    PLUGIN_SLUG=$(basename "$PLUGIN_PATH")
    check "Plugin activate (WP-CLI)" \
      "wp plugin activate '$PLUGIN_SLUG' --path='$WP_PATH' 2>&1" "critical"
    check "No PHP fatals after activation" \
      "wp option get siteurl --path='$WP_PATH' 2>&1" "critical"
    check "Plugin deactivate (WP-CLI)" \
      "wp plugin deactivate '$PLUGIN_SLUG' --path='$WP_PATH' 2>&1" "high"
    check "Plugin re-activate (WP-CLI)" \
      "wp plugin activate '$PLUGIN_SLUG' --path='$WP_PATH' 2>&1" "critical"
  else
    warn "WP-CLI not found or WP_PATH not set — skipping activation lifecycle tests"
    warn "Set WP_PATH=/path/to/wordpress in .env to enable"
    _log_warn "Plugin lifecycle tests skipped (WP_PATH not set or wp-cli missing)"
  fi

  # ── UI/UX automated checks ───────────────────────────────
  section "UI/UX — Horizontal Overflow (375px / 768px / 1440px)"
  # This is covered by tpae-mobile and orbit-visual projects above.
  # Adding extra inline note.
  echo "- ℹ️ **Horizontal overflow** — tested via tpae-mobile (375px) + orbit-visual" >> "$EVIDENCE_FILE"

  ok "Gate 4 PASSED (check Playwright report for individual test details)"
fi

# ══════════════════════════════════════════════════════════════
#  GATE 5 — EVIDENCE PACK + FINAL VERDICT
# ══════════════════════════════════════════════════════════════
gate 5 "Evidence Pack + Final Verdict"

# ── Manual checklist reminder ─────────────────────────────
{
  echo ""
  echo "---"
  echo ""
  echo "## Manual Sign-off Required Before Shipping"
  echo ""
  echo "These cannot be fully automated — confirm each manually:"
  echo ""
  echo "### Functional"
  echo "- [ ] Admin panel loads without PHP fatal errors (WP_DEBUG=true)"
  echo "- [ ] Fresh install → activate → spot-check key widgets"
  echo "- [ ] Plugin uninstalls cleanly (data removed if user opted in)"
  echo "- [ ] Tested with conflicting plugins: Rank Math, Yoast, WooCommerce, Elementor Pro"
  echo "- [ ] No fatal errors with WP_DEBUG=true + WP_DEBUG_LOG=true"
  echo ""
  echo "### Performance"
  echo "- [ ] No CSS/JS 404s on key frontend pages"
  echo "- [ ] JS bundle size not increased >10% vs previous release"
  echo "- [ ] No synchronous external HTTP calls blocking page render"
  echo "- [ ] No queries >100ms on key pages"
  echo ""
  echo "### UI/UX (from orbit ui-ux-checklist)"
  echo "- [ ] No broken images on any widget"
  echo "- [ ] Hit areas ≥ 44×44px on all interactive elements"
  echo "- [ ] Elementor widget panel fits in 320px sidebar without overflow"
  echo "- [ ] Responsive controls show Desktop/Tablet/Mobile icons"
  echo "- [ ] Color picker defaults are not blank/empty on first use"
  echo "- [ ] Dynamic content dropdowns are searchable for long lists"
  echo "- [ ] Destructive actions (reset, delete) show confirm dialog"
  echo "- [ ] All inputs have visible labels (not placeholder-only)"
  echo ""
  echo "### Release Process"
  echo "- [ ] Plugin zip root folder = plugin slug (the-plus-addons-for-elementor-page-builder/)"
  echo "- [ ] Zip tested: fresh install → activate → spot-check"
  echo "- [ ] Release notes written (non-technical, user-focused)"
  echo "- [ ] GitHub Actions: all CI checks green"
  echo ""
} >> "$EVIDENCE_FILE"

# ── Automated verdict ─────────────────────────────────────
{
  echo "---"
  echo ""
  echo "## Automated Verdict"
  echo ""
  echo "| Severity | Count |"
  echo "|---|---|"
  echo "| 🔴 Critical | $CRITICAL |"
  echo "| 🟠 High     | $HIGH |"
  echo "| ⚠️  Warning  | $WARN_COUNT |"
  echo "| ✅ Pass     | $PASS |"
  echo ""
  echo "**Version:** $VERSION  |  **Date:** $(date)"
  echo ""
  if   [ "$CRITICAL" -gt 0 ]; then echo "## 🔴 BLOCK — $CRITICAL critical issue(s). Do NOT release."
  elif [ "$HIGH" -gt 0 ];     then echo "## 🟠 HOLD — $HIGH high-severity issue(s). Fix before release."
  elif [ "$WARN_COUNT" -gt 0 ]; then echo "## 🟡 WARN — $WARN_COUNT warning(s). Review before release."
  else                              echo "## 🟢 SHIP — All automated checks passed."
  fi
  echo ""
  echo "### Artifacts"
  echo "- Playwright HTML : \`reports/html/index.html\`"
  echo "- Evidence pack   : \`$EVIDENCE_FILE\`"
  echo "- PW logs         : \`$REPORT_DIR/pw-*.log\`"
} >> "$EVIDENCE_FILE"

# ── Terminal output ───────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║          TPAE Pre-Release Verdict                ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Version  : ${BOLD}$VERSION${NC}"
echo -e "  🔴 Critical : ${RED}${BOLD}$CRITICAL${NC}"
echo -e "  🟠 High     : ${YELLOW}$HIGH${NC}"
echo -e "  ⚠️  Warning  : ${YELLOW}$WARN_COUNT${NC}"
echo -e "  ✅ Pass     : ${GREEN}$PASS${NC}"
echo ""

if   [ "$CRITICAL" -gt 0 ]; then
  echo -e "  ${RED}${BOLD}🔴 BLOCK — Fix $CRITICAL critical issue(s) before release.${NC}"
elif [ "$HIGH" -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}🟠 HOLD  — $HIGH high-severity finding(s). Review before tagging.${NC}"
elif [ "$WARN_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}🟡 WARN  — Warnings present. Manual review recommended.${NC}"
else
  echo -e "  ${GREEN}${BOLD}🟢 SHIP  — All automated checks passed.${NC}"
  echo -e "  ${GREEN}         Complete manual sign-off, then: git tag $VERSION && git push --tags${NC}"
fi

echo ""
echo -e "  ${DIM}Evidence pack : $EVIDENCE_FILE${NC}"
echo -e "  ${DIM}HTML report   : reports/html/index.html  →  npm run report${NC}"
echo ""

[ "${CI:-}" != "true" ] && command -v npx &>/dev/null && npx playwright show-report reports/html &

[ "$CRITICAL" -gt 0 ] && exit 1
[ "$HIGH" -gt 0 ]     && exit 2
exit 0
