#!/bin/bash
#
# check-circular-deps.sh - Detect circular dependencies that cause TDZ errors
#
# Usage: npm run ci:circular
#
# This script uses madge to detect circular dependencies in the codebase.
# Circular dependencies in JavaScript/TypeScript can cause Temporal Dead Zone (TDZ)
# errors when modules reference each other before initialization completes.
#
# Known safe circular patterns (type-only imports) are excluded.
#

set -e

echo "🔍 Checking for circular dependencies..."
echo ""

# Run madge with TypeScript support
# --circular: Only show circular dependencies
# --extensions: Include both .ts and .tsx files
# --exclude: Exclude test files and node_modules
OUTPUT=$(npx madge --circular --extensions ts,tsx --exclude '\.test\.|\.spec\.|node_modules' src/ 2>&1)

# Check if any circular dependencies were found
if echo "$OUTPUT" | grep -q "Found .* circular dependencies"; then
  echo "❌ Circular dependencies detected!"
  echo ""
  echo "$OUTPUT"
  echo ""
  echo "=== TDZ Prevention Guidelines ==="
  echo "1. Use 'import type' for type-only imports"
  echo "2. Use dynamic imports for heavy components: dynamic(() => import('./Component'))"
  echo "3. Remove problematic exports from barrel files (index.ts)"
  echo "4. Move shared types to a separate types.ts file"
  echo ""
  exit 1
else
  echo "✅ No circular dependencies found!"
  echo ""
  echo "$OUTPUT"
  exit 0
fi
