#!/usr/bin/env bash
# Install the Orbit pre-commit hook into the current git repo.
set -e

if [ ! -d ".git" ]; then
  echo "Not a git repo — cd to your plugin dir first"
  exit 1
fi

HOOK_SOURCE=".githooks/pre-commit"
if [ ! -f "$HOOK_SOURCE" ]; then
  # If user is running this from their plugin dir, source the hook from Orbit repo
  ORBIT_ROOT="${ORBIT_ROOT:-$HOME/Claude/wordpress-qa-master}"
  HOOK_SOURCE="$ORBIT_ROOT/.githooks/pre-commit"
  if [ ! -f "$HOOK_SOURCE" ]; then
    echo "Orbit pre-commit hook not found at $HOOK_SOURCE"
    echo "Set ORBIT_ROOT env var to your orbit clone path"
    exit 1
  fi
fi

mkdir -p .git/hooks
cp "$HOOK_SOURCE" .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✓ Installed pre-commit hook from $HOOK_SOURCE"
echo "  Test with: git commit (next staged commit will trigger it)"
echo "  Bypass with: git commit --no-verify"
