#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  TPAE + Orbit  |  Pre-Release Gate Runner
#
#  4 sequential gates — fail fast, evidence pack at the end.
#  Run this BEFORE git tag, BEFORE WP.org submit.
#
#  Usage:
#    bash run-prerelease.sh --version 6.4.15 --plugin /path/to/plugin
#    bash run-prerelease.sh --version 6.4.15              # auto-detect plugin from .env
#    bash run-prerelease.sh --gate 2                      # resume from gate 2
#    bash run-prerelease.sh --version 6.4.15 --quick      # skip slow Playwright projects
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
[ -z "${TERM:-}" ] && export TERM=xterm-256color

# ── Colours ────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
BLUE='\033[0;34m'

ok()     { echo -e "${GREEN}  ✓  $1${NC}"; }
warn()   { echo -e "${YELLOW}  ⚠  $1${NC}"; }
fail()   { echo -e "${RED}  ✗  $1${NC}"; }
info()   { echo -e "${CYAN}  →  $1${NC}"; }
gate()   { echo -e "\n${BOLD}${BLUE}┌─────────────────────────────────────────────────┐${NC}"; \
           echo -e "${BOLD}${BLUE}│  Gate $1: $2${NC}"; \
           echo -e "${BOLD}${BLUE}└─────────────────────────────────────────────────┘${NC}"; }
skip()   { echo -e "${DIM}  ⊘  $1 (skipped — tool not found)${NC}"; }

# ── Defaults ───────────────────────────────────────────────────
VERSION=""
PLUGIN_PATH=""
START_GATE=1
QUICK=false
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="reports/prerelease-$TIMESTAMP"

CRITICAL=0; HIGH=0; WARN=0; PASS=0

# Load .env
[ -f .env ] && export $(grep -v '^#' .env | xargs 2>/dev/null) || true
PLUGIN_PATH="${WP_PLUGIN_PATH:-}"

# ── Args ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --version) VERSION="$2";     shift 2 ;;
    --plugin)  PLUGIN_PATH="$2"; shift 2 ;;
    --gate)    START_GATE="$2";  shift 2 ;;
    --quick)   QUICK=true;       shift ;;
    *) shift ;;
  esac
done

# Auto-detect version from git tag if not provided
if [ -z "$VERSION" ]; then
  VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
fi
[ -z "$VERSION" ] && VERSION="dev"

mkdir -p "$REPORT_DIR" .auth

EVIDENCE_FILE="$REPORT_DIR/evidence-pack.md"
VERDICT_FILE="$REPORT_DIR/verdict.txt"

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
check() {
  local label="$1" cmd="$2" severity="${3:-warn}"
  info "$label"
  local out
  if out=$(eval "$cmd" 2>&1); then
    ok "$label"
    echo "- ✅ **$label**" >> "$EVIDENCE_FILE"
    PASS=$((PASS+1))
    return 0
  else
    case $severity in
      critical)
        fail "$label  ← CRITICAL"
        echo "- 🔴 **CRITICAL: $label**" >> "$EVIDENCE_FILE"
        echo "\`\`\`" >> "$EVIDENCE_FILE"
        echo "$out" | head -30 >> "$EVIDENCE_FILE"
        echo "\`\`\`" >> "$EVIDENCE_FILE"
        CRITICAL=$((CRITICAL+1)) ;;
      high)
        fail "$label  ← HIGH"
        echo "- 🟠 **HIGH: $label**" >> "$EVIDENCE_FILE"
        HIGH=$((HIGH+1)) ;;
      *)
        warn "$label  ← warning (non-blocking)"
        echo "- ⚠️  **WARN: $label**" >> "$EVIDENCE_FILE"
        WARN=$((WARN+1)) ;;
    esac
    return 1
  fi
}

check_skip() {
  local label="$1" cmd="$2" tool="$3" severity="${4:-warn}"
  if command -v "$tool" &>/dev/null; then
    check "$label" "$cmd" "$severity"
  else
    skip "$label (needs: $tool)"
    echo "- ⊘ **SKIPPED: $label** (tool not installed: \`$tool\`)" >> "$EVIDENCE_FILE"
  fi
}

require_plugin() {
  if [ -z "$PLUGIN_PATH" ] || [ ! -d "$PLUGIN_PATH" ]; then
    warn "Plugin path not set or not found — some checks will be skipped"
    warn "Set WP_PLUGIN_PATH in .env or pass --plugin /path"
    return 1
  fi
  return 0
}

# ══════════════════════════════════════════════════════════════
#  GATE 1 — PREFLIGHT  (5 sec)
#  Verify all required tools exist before wasting time on gate 3
# ══════════════════════════════════════════════════════════════
if [ "$START_GATE" -le 1 ]; then
  gate 1 "Preflight — Tool Availability"
  echo "## Gate 1 — Preflight" >> "$EVIDENCE_FILE"

  MISSING=()

  for tool in node npx git; do
    if command -v "$tool" &>/dev/null; then
      ok "$tool found  ($(${tool} --version 2>/dev/null | head -1))"
      echo "- ✅ \`$tool\` available" >> "$EVIDENCE_FILE"
    else
      fail "$tool NOT FOUND"
      echo "- 🔴 \`$tool\` MISSING" >> "$EVIDENCE_FILE"
      MISSING+=("$tool")
    fi
  done

  for tool in php phpcs phpstan; do
    if command -v "$tool" &>/dev/null; then
      ok "$tool found"
      echo "- ✅ \`$tool\` available" >> "$EVIDENCE_FILE"
    else
      warn "$tool not found (optional — code audits will be skipped)"
      echo "- ⚠️  \`$tool\` not installed (optional)" >> "$EVIDENCE_FILE"
    fi
  done

  # Playwright browsers
  if npx playwright install --dry-run chromium &>/dev/null 2>&1; then
    ok "Playwright chromium installed"
  else
    warn "Playwright browsers may not be installed — run: npx playwright install"
  fi

  if [ ${#MISSING[@]} -gt 0 ]; then
    fail "Gate 1 FAILED — missing required tools: ${MISSING[*]}"
    fail "Install missing tools and re-run."
    exit 1
  fi
  ok "Gate 1 PASSED — all required tools found"
fi

# ══════════════════════════════════════════════════════════════
#  GATE 2 — RELEASE METADATA  (30 sec)
#  Version parity, changelog, readme.txt, zip hygiene, license
# ══════════════════════════════════════════════════════════════
if [ "$START_GATE" -le 2 ]; then
  gate 2 "Release Metadata"
  echo "" >> "$EVIDENCE_FILE"
  echo "## Gate 2 — Release Metadata" >> "$EVIDENCE_FILE"

  # Version parity
  if require_plugin; then
    # Check plugin header version
    HEADER_VERSION=$(grep -m1 'Version:' "$PLUGIN_PATH"/*.php 2>/dev/null | grep -oP '\d+\.\d+[\.\d]*' | head -1 || echo "unknown")
    # Check readme.txt stable tag
    README_VERSION=$(grep -i 'Stable tag:' "$PLUGIN_PATH/readme.txt" 2>/dev/null | grep -oP '\d+\.\d+[\.\d]*' | head -1 || echo "unknown")

    info "Plugin header version:  $HEADER_VERSION"
    info "readme.txt stable tag:  $README_VERSION"
    info "Requested version:      $VERSION"

    if [ "$VERSION" != "dev" ]; then
      CLEAN_VERSION="${VERSION#v}"
      if [ "$HEADER_VERSION" = "$CLEAN_VERSION" ] && [ "$README_VERSION" = "$CLEAN_VERSION" ]; then
        ok "Version parity: all three match ($CLEAN_VERSION)"
        echo "- ✅ **Version parity** — header, readme.txt, tag all = $CLEAN_VERSION" >> "$EVIDENCE_FILE"
        PASS=$((PASS+1))
      else
        fail "Version MISMATCH — header=$HEADER_VERSION  readme=$README_VERSION  tag=$CLEAN_VERSION"
        echo "- 🔴 **CRITICAL: Version mismatch** — header=$HEADER_VERSION readme=$README_VERSION tag=$CLEAN_VERSION" >> "$EVIDENCE_FILE"
        CRITICAL=$((CRITICAL+1))
      fi
    else
      warn "No version tag given — skipping version parity check"
    fi

    # Changelog check
    CHANGELOG=""
    for f in "$PLUGIN_PATH/CHANGELOG.md" "$PLUGIN_PATH/changelog.txt" "$PLUGIN_PATH/readme.txt"; do
      [ -f "$f" ] && CHANGELOG="$f" && break
    done
    if [ -n "$CHANGELOG" ] && [ "$VERSION" != "dev" ]; then
      CLEAN_VERSION="${VERSION#v}"
      if grep -q "$CLEAN_VERSION" "$CHANGELOG" 2>/dev/null; then
        ok "Changelog entry found for $CLEAN_VERSION"
        echo "- ✅ **Changelog** entry exists for $CLEAN_VERSION" >> "$EVIDENCE_FILE"
        PASS=$((PASS+1))
      else
        fail "Changelog missing entry for $CLEAN_VERSION in $CHANGELOG"
        echo "- 🔴 **CRITICAL: Changelog** missing entry for $CLEAN_VERSION" >> "$EVIDENCE_FILE"
        CRITICAL=$((CRITICAL+1))
      fi
    fi

    # Zip hygiene
    if [ -f orbit/scripts/check-zip-hygiene.sh ]; then
      check "Zip hygiene (no .git, node_modules, .DS_Store)" \
        "bash orbit/scripts/check-zip-hygiene.sh '$PLUGIN_PATH'" "high"
    else
      # Inline check
      BAD_FILES=$(find "$PLUGIN_PATH" \( -name ".DS_Store" -o -name "Thumbs.db" -o -name "*.log" \
        -o -path "*/node_modules/*" -o -path "*/.git/*" -o -path "*/.github/*" \
        -o -name "*.map" -o -name "phpunit*" -o -name "*.test.php" \) \
        -not -path "*/vendor/*" 2>/dev/null | head -20)
      if [ -z "$BAD_FILES" ]; then
        ok "Zip hygiene — no dev files found"
        echo "- ✅ **Zip hygiene** — clean" >> "$EVIDENCE_FILE"
        PASS=$((PASS+1))
      else
        warn "Dev files present (should be excluded from release zip):"
        echo "$BAD_FILES" | while read -r f; do warn "  $f"; done
        echo "- ⚠️  **Zip hygiene** — dev files found (exclude from zip)" >> "$EVIDENCE_FILE"
        WARN=$((WARN+1))
      fi
    fi

    # PHP syntax lint (fast — just parse, no exec)
    if command -v php &>/dev/null; then
      info "PHP syntax lint..."
      PHP_ERRORS=$(find "$PLUGIN_PATH" -name "*.php" -not -path "*/vendor/*" -exec php -l {} \; 2>&1 | grep -v "No syntax errors" || true)
      if [ -z "$PHP_ERRORS" ]; then
        ok "PHP syntax: no errors"
        echo "- ✅ **PHP syntax lint** — clean" >> "$EVIDENCE_FILE"
        PASS=$((PASS+1))
      else
        fail "PHP syntax errors found:"
        echo "$PHP_ERRORS"
        echo "- 🔴 **CRITICAL: PHP syntax errors**" >> "$EVIDENCE_FILE"
        echo "\`\`\`" >> "$EVIDENCE_FILE"
        echo "$PHP_ERRORS" | head -20 >> "$EVIDENCE_FILE"
        echo "\`\`\`" >> "$EVIDENCE_FILE"
        CRITICAL=$((CRITICAL+1))
      fi
    fi

    # Orbit release metadata scripts
    for script in check-plugin-header check-readme-txt check-license check-pot-file; do
      [ -f "orbit/scripts/${script}.sh" ] && \
        check "$script" "bash orbit/scripts/${script}.sh '$PLUGIN_PATH'" "warn"
    done
  fi

  if [ "$CRITICAL" -gt 0 ]; then
    echo ""
    fail "Gate 2 FAILED — $CRITICAL critical issue(s). Fix before running Gate 3."
    echo ""
    echo "Fixes needed:"
    [ "$CRITICAL" -gt 0 ] && echo "  • Resolve all 🔴 CRITICAL items above"
    echo ""
    echo "Then resume with: bash run-prerelease.sh --version $VERSION --plugin '$PLUGIN_PATH' --gate 2"
    exit 1
  fi
  ok "Gate 2 PASSED — release metadata clean"
fi

# ══════════════════════════════════════════════════════════════
#  GATE 3 — FULL QA  (main)
#  Static code audits + full Playwright E2E test suite
# ══════════════════════════════════════════════════════════════
if [ "$START_GATE" -le 3 ]; then
  gate 3 "Full QA — Static Audits + Playwright E2E"
  echo "" >> "$EVIDENCE_FILE"
  echo "## Gate 3 — Full QA" >> "$EVIDENCE_FILE"

  # ── 3a: Static code audits ──────────────────────────────────
  if require_plugin; then
    info "Running static code audits..."

    check_skip "PHPCS — WP coding standards" \
      "phpcs --standard=orbit/config/phpcs.xml '$PLUGIN_PATH' 2>&1 | tail -5" \
      "phpcs" "high"

    check_skip "PHPStan — static analysis (level 5)" \
      "phpstan analyse --configuration=orbit/config/phpstan.neon '$PLUGIN_PATH' 2>&1 | tail -10" \
      "phpstan" "high"

    [ -f orbit/scripts/check-php-compat.sh ] && \
      check "PHP 7.4–8.3 compat" "bash orbit/scripts/check-php-compat.sh '$PLUGIN_PATH'" "high"

    [ -f orbit/scripts/check-wp-compat.sh ] && \
      check "WP 6.0–6.9 compat" "bash orbit/scripts/check-wp-compat.sh '$PLUGIN_PATH'" "warn"

    [ -f orbit/scripts/check-live-cve.sh ] && \
      check "Live CVE security scan" "bash orbit/scripts/check-live-cve.sh '$PLUGIN_PATH'" "critical"

    [ -f orbit/scripts/check-translation.sh ] && \
      check "i18n / translation check" "bash orbit/scripts/check-translation.sh '$PLUGIN_PATH'" "warn"
  fi

  # ── 3b: Playwright E2E ──────────────────────────────────────
  info "Running Playwright E2E tests..."
  echo "" >> "$EVIDENCE_FILE"
  echo "### Playwright Results" >> "$EVIDENCE_FILE"

  run_pw() {
    local label="$1"; shift
    if npx playwright test "$@" 2>&1 | tee "$REPORT_DIR/pw-${label}.log"; then
      ok "Playwright [$label] PASSED"
      echo "- ✅ **Playwright $label**" >> "$EVIDENCE_FILE"
      PASS=$((PASS+1))
    else
      fail "Playwright [$label] FAILED"
      echo "- 🔴 **CRITICAL: Playwright $label failed** — see reports/html/" >> "$EVIDENCE_FILE"
      CRITICAL=$((CRITICAL+1))
    fi
  }

  # Always run TPAE widget + AJAX tests
  run_pw "tpae-widgets" --project=tpae-chromium --project=tpae-ajax

  # Mobile viewport
  run_pw "tpae-mobile" --project=tpae-mobile

  if [ "$QUICK" = false ]; then
    # Firefox cross-browser
    run_pw "tpae-firefox" --project=tpae-firefox

    # Orbit flow tests
    run_pw "orbit-flows" --project=orbit-flows

    # Orbit Elementor widget QA
    run_pw "orbit-elementor" --project=orbit-elementor

    # Visual regression
    run_pw "orbit-visual" --project=orbit-visual

    # PM / UX audit
    run_pw "orbit-pm" --project=orbit-pm
  else
    warn "Quick mode — skipping firefox, orbit-flows, orbit-elementor, visual, pm"
    echo "- ⊘ Firefox, Orbit flows, Visual, PM (quick mode — skipped)" >> "$EVIDENCE_FILE"
  fi
fi

# ══════════════════════════════════════════════════════════════
#  GATE 4 — EVIDENCE PACK
# ══════════════════════════════════════════════════════════════
gate 4 "Evidence Pack"

# Final verdict
{
  echo ""
  echo "---"
  echo ""
  echo "## Verdict"
  echo ""
  echo "| | Count |"
  echo "|---|---|"
  echo "| 🔴 Critical | $CRITICAL |"
  echo "| 🟠 High     | $HIGH |"
  echo "| ⚠️  Warning  | $WARN |"
  echo "| ✅ Pass     | $PASS |"
  echo ""
  echo "**Version:** $VERSION"
  echo "**Date:** $(date)"
  echo ""
  if   [ "$CRITICAL" -gt 0 ]; then echo "## 🔴 BLOCK — $CRITICAL critical issue(s). Do NOT release."
  elif [ "$HIGH" -gt 0 ];     then echo "## 🟠 HOLD — $HIGH high-severity issue(s). Fix before release."
  elif [ "$WARN" -gt 0 ];     then echo "## 🟡 WARN — $WARN warning(s). Review before release."
  else                              echo "## 🟢 SHIP — All gates passed. Safe to tag and release."
  fi
  echo ""
  echo "---"
  echo ""
  echo "### Reports"
  echo "- Playwright HTML: \`reports/html/index.html\`"
  echo "- Evidence pack:   \`$EVIDENCE_FILE\`"
  echo "- Raw PW logs:     \`$REPORT_DIR/pw-*.log\`"
} >> "$EVIDENCE_FILE"

# ── Terminal summary ────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║         Pre-Release Verdict                  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Version : ${BOLD}$VERSION${NC}"
echo -e "  🔴 Critical : ${RED}$CRITICAL${NC}"
echo -e "  🟠 High     : ${YELLOW}$HIGH${NC}"
echo -e "  ⚠️  Warning  : ${YELLOW}$WARN${NC}"
echo -e "  ✅ Pass     : ${GREEN}$PASS${NC}"
echo ""

if   [ "$CRITICAL" -gt 0 ]; then
  echo -e "  ${RED}${BOLD}🔴 BLOCK — Do NOT release. Fix $CRITICAL critical issue(s) first.${NC}"
elif [ "$HIGH" -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}🟠 HOLD  — $HIGH high-severity finding(s). Review before tagging.${NC}"
elif [ "$WARN" -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}🟡 WARN  — Warnings present. Proceed with caution.${NC}"
else
  echo -e "  ${GREEN}${BOLD}🟢 SHIP  — All checks passed. Safe to: git tag $VERSION && git push --tags${NC}"
fi

echo ""
echo -e "  ${DIM}Evidence pack : $EVIDENCE_FILE${NC}"
echo -e "  ${DIM}Playwright HTML: reports/html/index.html  →  npm run report${NC}"
echo ""

# Open HTML report (non-CI)
if [ "${CI:-}" != "true" ] && command -v npx &>/dev/null; then
  npx playwright show-report reports/html &
fi

[ "$CRITICAL" -gt 0 ] && exit 1
[ "$HIGH" -gt 0 ]     && exit 2
exit 0
