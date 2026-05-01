#!/usr/bin/env bash
# Orbit — block.json schema + apiVersion check
#
# Gutenberg blocks must declare block.json with:
#   - apiVersion: 3 (WP 6.3+, required for iframe sandbox)
#   - $schema URL for editor validation
#   - Correct name prefix (namespace/block-name)
#   - Valid editorScript/script/style handles
#
# Missing apiVersion: 3 = block renders in classic iframe (performance hit,
# no React DOM isolation). Missing $schema = no editor autocomplete.

set -e

PLUGIN_PATH="${1:-}"
[ -z "$PLUGIN_PATH" ] && { echo "Usage: $0 /path/to/plugin"; exit 1; }

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

BLOCK_FILES=$(find "$PLUGIN_PATH" -name "block.json" -not -path "*/node_modules/*" -not -path "*/vendor/*" 2>/dev/null)
if [ -z "$BLOCK_FILES" ]; then
  echo "No block.json files — plugin doesn't ship Gutenberg blocks"
  exit 0
fi

FAIL=0
WARN=0
COUNT=0

for bjson in $BLOCK_FILES; do
  COUNT=$((COUNT + 1))
  REL="${bjson#$PLUGIN_PATH/}"

  # Must be valid JSON first
  if ! python3 -m json.tool "$bjson" > /dev/null 2>&1; then
    echo -e "${RED}✗ $REL: invalid JSON${NC}"
    FAIL=1
    continue
  fi

  # apiVersion check — must be 3 for modern WP
  API_VER=$(python3 -c "import json; d=json.load(open('$bjson')); print(d.get('apiVersion',''))" 2>/dev/null)
  case "$API_VER" in
    3)
      : # OK
      ;;
    2|1)
      echo -e "${YELLOW}⚠ $REL: apiVersion: $API_VER — upgrade to 3 (WP 6.3+, iframe sandbox)${NC}"
      WARN=1
      ;;
    "")
      echo -e "${RED}✗ $REL: missing apiVersion (must be 3)${NC}"
      FAIL=1
      ;;
    *)
      echo -e "${RED}✗ $REL: unknown apiVersion: $API_VER${NC}"
      FAIL=1
      ;;
  esac

  # $schema recommended
  HAS_SCHEMA=$(python3 -c "import json; d=json.load(open('$bjson')); print('yes' if '\$schema' in d else 'no')" 2>/dev/null)
  if [ "$HAS_SCHEMA" = "no" ]; then
    echo -e "${YELLOW}⚠ $REL: missing \$schema (recommend https://schemas.wp.org/trunk/block.json)${NC}"
    WARN=1
  fi

  # name must be namespace/block-name format
  NAME=$(python3 -c "import json; d=json.load(open('$bjson')); print(d.get('name',''))" 2>/dev/null)
  if [ -z "$NAME" ]; then
    echo -e "${RED}✗ $REL: missing 'name' field${NC}"
    FAIL=1
  elif ! echo "$NAME" | grep -qE '^[a-z][a-z0-9-]*/[a-z][a-z0-9-]*$'; then
    echo -e "${RED}✗ $REL: name '$NAME' must be 'namespace/block-name' (lowercase + hyphens)${NC}"
    FAIL=1
  fi

  # If render is declared, render.php must exist
  RENDER=$(python3 -c "import json,os; d=json.load(open('$bjson')); r=d.get('render',''); print(r)" 2>/dev/null)
  if [ -n "$RENDER" ] && [ "$RENDER" != "None" ]; then
    RENDER_PATH=$(dirname "$bjson")/$(echo "$RENDER" | sed 's|^file:./||')
    if [ ! -f "$RENDER_PATH" ]; then
      echo -e "${RED}✗ $REL: render file '$RENDER' declared but not found at $RENDER_PATH${NC}"
      FAIL=1
    fi
  fi
done

echo ""
echo "Checked $COUNT block.json files"

if [ "$FAIL" -eq 1 ]; then
  echo -e "${RED}block.json: FAIL${NC}"
  exit 1
fi
if [ "$WARN" -eq 1 ]; then
  echo -e "${YELLOW}block.json: WARN — modernize before release${NC}"
  exit 0
fi
echo -e "${GREEN}block.json: PASS${NC}"
exit 0
