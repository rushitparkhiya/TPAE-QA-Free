#!/usr/bin/env bash
# Orbit — Gauntlet dry-run / preflight
#
# Validates every dependency the full gauntlet needs without running the heavy
# checks. Use this first on a new environment to find "command not found" issues
# in 5 seconds instead of 5 minutes into a gauntlet run.

set +e  # don't abort — we want to report every missing tool

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

MISSING_CRITICAL=0
MISSING_OPTIONAL=0

check() {
  local tool="$1"
  local role="$2"   # critical | optional
  local install="$3"

  if command -v "$tool" &>/dev/null; then
    local version
    version=$("$tool" --version 2>&1 | head -1 || true)
    echo -e "${GREEN}✓${NC} $tool — ${version:-installed}"
  else
    if [ "$role" = "critical" ]; then
      echo -e "${RED}✗${NC} $tool — MISSING (required)"
      echo "    Install: $install"
      MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
    else
      echo -e "${YELLOW}⚠${NC} $tool — missing (optional: $install)"
      MISSING_OPTIONAL=$((MISSING_OPTIONAL + 1))
    fi
  fi
}

echo -e "${CYAN}── Orbit Preflight ──${NC}\n"

echo "Core:"
check "bash"    critical "comes with OS"
check "php"     critical "brew install php"
check "node"    critical "brew install node"
check "npx"     critical "ships with node"
check "python3" critical "brew install python3"

echo ""
echo "WordPress tools:"
check "wp"          critical "brew install wp-cli/wp-cli/wp-cli"
check "composer"    optional "brew install composer"

echo ""
echo "Static analysis:"
check "phpcs"       optional "composer global require wp-coding-standards/wpcs squizlabs/php_codesniffer"
check "phpstan"     optional "composer global require phpstan/phpstan"
check "phpcbf"      optional "comes with phpcs"

echo ""
echo "Perf / E2E:"
check "lighthouse"  optional "npm install -g lighthouse"
check "playwright"  optional "npm install && npx playwright install"

echo ""
echo "Misc:"
check "jq"          optional "brew install jq"
check "bc"          optional "brew install bc"
check "msgfmt"      optional "brew install gettext (for translation test)"
check "redis-cli"   optional "brew install redis (for object cache test)"
check "claude"      optional "npm install -g @anthropic-ai/claude-code (for Step 11 AI audits)"

echo ""
echo -e "${CYAN}── Environment ──${NC}\n"

# wp-env
if command -v npx &>/dev/null && [ -f ".wp-env.json" ]; then
  echo -e "${GREEN}✓${NC} .wp-env.json present"
elif command -v npx &>/dev/null; then
  echo -e "${YELLOW}⚠${NC} .wp-env.json missing in current dir — wp-env-based tests will fail"
fi

# qa.config.json
if [ -f "qa.config.json" ]; then
  echo -e "${GREEN}✓${NC} qa.config.json present"
  PLUGIN_PATH=$(python3 -c "import json; print(json.load(open('qa.config.json'))['plugin'].get('path',''))" 2>/dev/null || echo "")
  if [ -n "$PLUGIN_PATH" ]; then
    if [ -d "$PLUGIN_PATH" ]; then
      echo -e "${GREEN}✓${NC} plugin.path exists: $PLUGIN_PATH"
    else
      echo -e "${RED}✗${NC} plugin.path set but directory missing: $PLUGIN_PATH"
      MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
    fi
  fi
else
  echo -e "${YELLOW}⚠${NC} qa.config.json missing — use --plugin flag or create config"
fi

# Auth file
if [ -f ".auth/wp-admin.json" ]; then
  echo -e "${GREEN}✓${NC} .auth/wp-admin.json — Playwright auth stored"
else
  echo -e "${YELLOW}⚠${NC} .auth/wp-admin.json missing — setup will run on first Playwright execution"
fi

# Is wp-env actually running?
if command -v curl &>/dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "${WP_TEST_URL:-http://localhost:8881}" 2>/dev/null)
  HTTP_CODE="${HTTP_CODE:-000}"
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓${NC} WP site responds at ${WP_TEST_URL:-http://localhost:8881}"
  else
    echo -e "${YELLOW}⚠${NC} No WP site at ${WP_TEST_URL:-http://localhost:8881} (HTTP $HTTP_CODE) — run: npx wp-env start"
  fi
fi

# Scripts exist
echo ""
echo -e "${CYAN}── Orbit scripts ──${NC}\n"
for s in gauntlet.sh check-zip-hygiene.sh check-gdpr-hooks.sh check-login-assets.sh \
         check-translation.sh check-readme-txt.sh check-version-parity.sh check-license.sh \
         check-plugin-header.sh check-block-json.sh check-hpos-declaration.sh \
         check-object-cache.sh seed-large-dataset.sh db-profile.sh; do
  if [ -x "scripts/$s" ]; then
    echo -e "${GREEN}✓${NC} scripts/$s"
  elif [ -f "scripts/$s" ]; then
    echo -e "${YELLOW}⚠${NC} scripts/$s exists but not executable — chmod +x"
  else
    echo -e "${YELLOW}⚠${NC} scripts/$s missing"
  fi
done

# Custom skills
echo ""
echo -e "${CYAN}── Custom Claude skills ──${NC}\n"
for skill in orbit-wp-security orbit-wp-performance orbit-wp-database orbit-wp-standards; do
  if [ -f "$HOME/.claude/skills/$skill/SKILL.md" ]; then
    echo -e "${GREEN}✓${NC} /$skill"
  else
    echo -e "${RED}✗${NC} /$skill — missing SKILL.md at ~/.claude/skills/$skill/"
    MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
  fi
done

echo ""
echo "════════════════════════════════════"
if [ "$MISSING_CRITICAL" -gt 0 ]; then
  echo -e "${RED}$MISSING_CRITICAL critical dep(s) missing — gauntlet will fail${NC}"
  exit 1
fi
if [ "$MISSING_OPTIONAL" -gt 0 ]; then
  echo -e "${YELLOW}$MISSING_OPTIONAL optional dep(s) missing — gauntlet will skip those steps${NC}"
fi
echo -e "${GREEN}Preflight: READY${NC}"
exit 0
