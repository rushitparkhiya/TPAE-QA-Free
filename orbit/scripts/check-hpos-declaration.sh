#!/usr/bin/env bash
# Orbit — WooCommerce HPOS (High-Performance Order Storage) Declaration
#
# Since WC 8.2, plugins must explicitly declare HPOS compatibility.
# Missing declaration = WooCommerce shows "incompatible" warning, marketplace rejects.
# Only relevant if the plugin interacts with WooCommerce orders.

set -e

PLUGIN_PATH="${1:-}"
[ -z "$PLUGIN_PATH" ] && { echo "Usage: $0 /path/to/plugin"; exit 1; }

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

# Does the plugin even interact with WooCommerce orders?
USES_WC=$(grep -rEl "wc_get_order|woocommerce|WC_Order|wp_posts.*shop_order|wc_orders" "$PLUGIN_PATH" \
  --include="*.php" --exclude-dir=vendor --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')
if [ "$USES_WC" -eq 0 ]; then
  echo "Plugin doesn't interact with WooCommerce orders — HPOS declaration not required"
  exit 0
fi

echo "Plugin touches WooCommerce ($USES_WC file(s))."

# Check for the HPOS compatibility declaration
HPOS_DECLARED=$(grep -rE "FeaturesUtil::declare_compatibility.*custom_order_tables|declare_compatibility\s*\(\s*['\"]custom_order_tables" "$PLUGIN_PATH" \
  --include="*.php" --exclude-dir=vendor --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')

# Check for the before_woocommerce_init hook
HOOK_PRESENT=$(grep -rE "add_action\s*\(\s*['\"]before_woocommerce_init" "$PLUGIN_PATH" \
  --include="*.php" --exclude-dir=vendor --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')

# Check for legacy get_post_meta usage on orders (HPOS-incompatible pattern)
LEGACY_META=$(grep -rE "get_post_meta\s*\(\s*\\\$order_id|get_post_meta\s*\(\s*\\\$order->id" "$PLUGIN_PATH" \
  --include="*.php" --exclude-dir=vendor --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')

FAIL=0
WARN=0

if [ "$HPOS_DECLARED" -eq 0 ]; then
  echo -e "${RED}✗ No HPOS compatibility declaration found${NC}"
  echo "  Add in main plugin file:"
  echo "    add_action( 'before_woocommerce_init', function() {"
  echo "      if ( class_exists( \\Automattic\\WooCommerce\\Utilities\\FeaturesUtil::class ) ) {"
  echo "        \\Automattic\\WooCommerce\\Utilities\\FeaturesUtil::declare_compatibility("
  echo "          'custom_order_tables', __FILE__, true"
  echo "        );"
  echo "      }"
  echo "    });"
  FAIL=1
fi

if [ "$HOOK_PRESENT" -eq 0 ]; then
  echo -e "${YELLOW}⚠ No before_woocommerce_init hook — HPOS declaration won't fire${NC}"
  WARN=1
fi

if [ "$LEGACY_META" -gt 0 ]; then
  echo -e "${RED}✗ $LEGACY_META file(s) use get_post_meta(\$order_id) — HPOS-incompatible${NC}"
  echo "  HPOS stores orders in wc_orders table, not wp_posts. Use:"
  echo "    \$order->get_meta('key')   instead of   get_post_meta(\$order_id, 'key', true)"
  FAIL=1
fi

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo -e "${RED}HPOS: FAIL — plugin will be flagged incompatible by WooCommerce${NC}"
  exit 1
fi
if [ "$WARN" -eq 1 ]; then
  echo -e "${YELLOW}HPOS: WARN${NC}"
  exit 0
fi
echo -e "${GREEN}HPOS: PASS — declared and uses modern API${NC}"
exit 0
