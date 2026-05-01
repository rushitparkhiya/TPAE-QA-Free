#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  TPAE-QA  |  Unified QA Runner
#  Combines: TPAE Playwright widget/AJAX tests + Orbit audits
#
#  Usage:
#    bash run-qa.sh                        # full run (all steps)
#    bash run-qa.sh --only e2e             # only Playwright tests
#    bash run-qa.sh --only audit           # only static code audits
#    bash run-qa.sh --only report          # only open last report
#    bash run-qa.sh --project tpae-chromium  # single Playwright project
#    bash run-qa.sh --plugin /path/to/plugin # override plugin path
# ─────────────────────────────────────────────────────────────
set -euo pipefail
[ -z "${TERM:-}" ] && export TERM=xterm-256color

# ── Colours ────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

ok()     { echo -e "${GREEN}✓  $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠  $1${NC}"; }
fail()   { echo -e "${RED}✗  $1${NC}"; }
info()   { echo -e "${CYAN}→  $1${NC}"; }
header() { echo -e "\n${BOLD}━━━  $1  ━━━${NC}"; }
skip()   { echo -e "${DIM}⊘  $1 (skipped)${NC}"; }

# ── Defaults ───────────────────────────────────────────────
ONLY=""
PW_PROJECT=""
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="reports"
SUMMARY_FILE="$REPORT_DIR/qa-summary-$TIMESTAMP.md"
PASS=0; WARN=0; FAIL=0

# Load .env if present
[ -f .env ] && export $(grep -v '^#' .env | xargs)

PLUGIN_PATH="${WP_PLUGIN_PATH:-}"

# ── Parse args ─────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --only)    ONLY="$2";       shift 2 ;;
    --project) PW_PROJECT="$2"; shift 2 ;;
    --plugin)  PLUGIN_PATH="$2"; shift 2 ;;
    *) shift ;;
  esac
done

mkdir -p "$REPORT_DIR" .auth

# ── Banner ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        TPAE + Orbit  —  Unified QA Runner            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  ${DIM}Run time: $(date)${NC}"
echo -e "  ${DIM}Base URL: ${WP_BASE_URL:-http://localhost}${NC}"
[ -n "$PLUGIN_PATH" ] && echo -e "  ${DIM}Plugin:   $PLUGIN_PATH${NC}"
echo ""

# ── Summary init ───────────────────────────────────────────
cat > "$SUMMARY_FILE" <<EOF
# TPAE + Orbit QA Report
**Date:** $(date)
**Base URL:** ${WP_BASE_URL:-http://localhost}
**Plugin:** ${PLUGIN_PATH:-not set}

---

EOF

run_step() {
  local name="$1" cmd="$2"
  info "Running: $name"
  if eval "$cmd" >> "$SUMMARY_FILE" 2>&1; then
    ok "$name passed"
    echo "- ✅ $name" >> "$SUMMARY_FILE"
    PASS=$((PASS+1))
  else
    fail "$name failed"
    echo "- ❌ $name" >> "$SUMMARY_FILE"
    FAIL=$((FAIL+1))
  fi
}

run_step_warn() {
  local name="$1" cmd="$2"
  info "Running: $name"
  if eval "$cmd" >> "$SUMMARY_FILE" 2>&1; then
    ok "$name passed"
    echo "- ✅ $name" >> "$SUMMARY_FILE"
    PASS=$((PASS+1))
  else
    warn "$name had warnings (non-blocking)"
    echo "- ⚠️  $name (warnings)" >> "$SUMMARY_FILE"
    WARN=$((WARN+1))
  fi
}

# ═══════════════════════════════════════════════════════════
#  STEP 1 — STATIC CODE AUDITS  (Orbit scripts)
# ═══════════════════════════════════════════════════════════
if [[ -z "$ONLY" || "$ONLY" == "audit" ]]; then
  header "STEP 1 — Static Code Audits"

  if [ -z "$PLUGIN_PATH" ]; then
    warn "WP_PLUGIN_PATH not set — skipping static audits"
    warn "Set it in .env or pass --plugin /path/to/plugin"
    WARN=$((WARN+1))
  else
    # PHP compatibility check
    if command -v phpcs &>/dev/null && [ -f orbit/config/phpcs.xml ]; then
      run_step_warn "PHPCS (WP coding standards)" \
        "phpcs --standard=orbit/config/phpcs.xml '$PLUGIN_PATH'"
    else
      skip "PHPCS (install: composer global require squizlabs/php_codesniffer)"
    fi

    # PHP version compatibility (7.4 – 8.3)
    if command -v phpstan &>/dev/null && [ -f orbit/config/phpstan.neon ]; then
      run_step_warn "PHPStan (static analysis)" \
        "phpstan analyse --configuration=orbit/config/phpstan.neon '$PLUGIN_PATH'"
    else
      skip "PHPStan (install: composer global require phpstan/phpstan)"
    fi

    # PHP version compat check via orbit script
    if [ -f orbit/scripts/check-php-compat.sh ]; then
      run_step_warn "PHP version compat (7.4-8.3)" \
        "bash orbit/scripts/check-php-compat.sh '$PLUGIN_PATH'"
    fi

    # WP version compat check
    if [ -f orbit/scripts/check-wp-compat.sh ]; then
      run_step_warn "WP version compat" \
        "bash orbit/scripts/check-wp-compat.sh '$PLUGIN_PATH'"
    fi

    # Live CVE / security check
    if [ -f orbit/scripts/check-live-cve.sh ]; then
      run_step_warn "Live CVE security scan" \
        "bash orbit/scripts/check-live-cve.sh '$PLUGIN_PATH'"
    fi

    # i18n / translation check
    if [ -f orbit/scripts/check-translation.sh ]; then
      run_step_warn "i18n / translation check" \
        "bash orbit/scripts/check-translation.sh '$PLUGIN_PATH'"
    fi

    # WP.org guidelines / readme.txt
    if [ -f orbit/scripts/check-readme-txt.sh ]; then
      run_step_warn "readme.txt / WP.org guidelines" \
        "bash orbit/scripts/check-readme-txt.sh '$PLUGIN_PATH'"
    fi

    # Zip hygiene (no .DS_Store, node_modules, etc.)
    if [ -f orbit/scripts/check-zip-hygiene.sh ]; then
      run_step_warn "Zip hygiene" \
        "bash orbit/scripts/check-zip-hygiene.sh '$PLUGIN_PATH'"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════
#  STEP 2 — PLAYWRIGHT E2E TESTS
# ═══════════════════════════════════════════════════════════
if [[ -z "$ONLY" || "$ONLY" == "e2e" ]]; then
  header "STEP 2 — Playwright E2E Tests"

  if ! command -v npx &>/dev/null; then
    fail "npx not found — run: npm install"
    FAIL=$((FAIL+1))
  else
    PW_CMD="npx playwright test"

    # Single project override
    if [ -n "$PW_PROJECT" ]; then
      PW_CMD="$PW_CMD --project=$PW_PROJECT"
      info "Running project: $PW_PROJECT"
    fi

    info "Running TPAE widget tests..."
    if npx playwright test --project=tpae-chromium --project=tpae-mobile --project=tpae-ajax; then
      ok "TPAE widget + AJAX tests passed"
      echo "- ✅ TPAE widget + AJAX tests (chromium + mobile)" >> "$SUMMARY_FILE"
      PASS=$((PASS+1))
    else
      fail "TPAE tests had failures — see reports/html/"
      echo "- ❌ TPAE widget tests" >> "$SUMMARY_FILE"
      FAIL=$((FAIL+1))
    fi

    info "Running Orbit flow tests..."
    if npx playwright test --project=orbit-flows --project=orbit-elementor; then
      ok "Orbit flow tests passed"
      echo "- ✅ Orbit flow + Elementor tests" >> "$SUMMARY_FILE"
      PASS=$((PASS+1))
    else
      warn "Orbit flow tests had failures — see reports/html/"
      echo "- ⚠️  Orbit flow tests (check reports/html/)" >> "$SUMMARY_FILE"
      WARN=$((WARN+1))
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════
#  STEP 3 — REPORT
# ═══════════════════════════════════════════════════════════
if [[ -z "$ONLY" || "$ONLY" == "report" ]]; then
  header "STEP 3 — Report"

  # Append verdict to summary
  {
    echo ""
    echo "---"
    echo ""
    echo "## Verdict"
    echo ""
    echo "| Result | Count |"
    echo "|--------|-------|"
    echo "| ✅ Pass    | $PASS |"
    echo "| ⚠️  Warning | $WARN |"
    echo "| ❌ Fail    | $FAIL |"
    echo ""
    if [ "$FAIL" -gt 0 ]; then
      echo "### 🔴 BLOCK — Fix failures before release"
    elif [ "$WARN" -gt 0 ]; then
      echo "### 🟡 WARN — Review warnings before release"
    else
      echo "### 🟢 SHIP — All checks passed"
    fi
  } >> "$SUMMARY_FILE"

  echo ""
  echo -e "${BOLD}━━━  Final Verdict  ━━━${NC}"
  echo -e "  ✅ Pass:    ${GREEN}$PASS${NC}"
  echo -e "  ⚠️  Warn:    ${YELLOW}$WARN${NC}"
  echo -e "  ❌ Fail:    ${RED}$FAIL${NC}"
  echo ""

  if [ "$FAIL" -gt 0 ]; then
    echo -e "  ${RED}${BOLD}🔴 BLOCK — Fix failures before release${NC}"
  elif [ "$WARN" -gt 0 ]; then
    echo -e "  ${YELLOW}${BOLD}🟡 WARN — Review warnings before release${NC}"
  else
    echo -e "  ${GREEN}${BOLD}🟢 SHIP — All checks passed${NC}"
  fi

  echo ""
  echo -e "  ${DIM}Summary report : $SUMMARY_FILE${NC}"
  echo -e "  ${DIM}Playwright HTML: reports/html/index.html${NC}"
  echo -e "  ${DIM}View report    : npm run report${NC}"
  echo ""

  # Open Playwright HTML report automatically (non-CI only)
  if [ "${CI:-}" != "true" ] && command -v npx &>/dev/null; then
    info "Opening Playwright HTML report..."
    npx playwright show-report reports/html &
  fi
fi

# ── Exit code: fail if any hard failures ───────────────────
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
