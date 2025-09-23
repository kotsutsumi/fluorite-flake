#!/bin/bash

# install-global.sh - Build, pack, and globally install the local fluorite-flake package
# Workflow:
#   pnpm build
#   pnpm pack --pack-destination /tmp
#   pnpm add -g /tmp/fluorite-flake-<version>.tgz
#   fluorite-flake --help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but not installed." >&2
    exit 1
  fi
}

trim_quotes() {
  local value="$1"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s\n' "$value"
}

existing_global_store() {
  local root modules_yaml store_line resolved
  root=$(pnpm root -g 2>/dev/null || true)
  if [[ -z "$root" ]]; then
    return
  fi

  modules_yaml="$root/.modules.yaml"
  if [[ ! -f "$modules_yaml" ]]; then
    return
  fi

  store_line=$(grep -E '^[[:space:]]*storeDir:' "$modules_yaml" | head -n1 | sed -E 's/^[[:space:]]*storeDir:[[:space:]]*//')
  store_line="$(trim_quotes "$store_line")"
  if [[ -z "$store_line" ]]; then
    return
  fi

  if [[ "$store_line" != /* ]]; then
    resolved=$(node -pe "const path=require('path'); console.log(path.resolve(process.argv[1], process.argv[2]));" "$root" "$store_line")
  else
    resolved="$store_line"
  fi

  if [[ -d "$resolved" ]]; then
    printf '%s\n' "$resolved"
  fi
}

require_command pnpm
require_command node

PACKAGE_NAME="$(node -pe "require('./package.json').name")"
PACKAGE_VERSION="$(node -pe "require('./package.json').version")"
PACKAGE_TGZ="/tmp/${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz"

DEFAULT_STORE="$(pnpm store path 2>/dev/null || true)"
LEGACY_STORE="$(existing_global_store || true)"

if [[ -n "$LEGACY_STORE" && -n "$DEFAULT_STORE" && "$LEGACY_STORE" != "$DEFAULT_STORE" ]]; then
  export PNPM_STORE_DIR="$LEGACY_STORE"
  echo "🏪 Aligning pnpm store with existing global installs: $PNPM_STORE_DIR"
elif [[ -n "$LEGACY_STORE" ]]; then
  export PNPM_STORE_DIR="$LEGACY_STORE"
  echo "🏪 Using pnpm store: $PNPM_STORE_DIR"
elif [[ -n "$DEFAULT_STORE" ]]; then
  export PNPM_STORE_DIR="$DEFAULT_STORE"
  echo "🏪 Using pnpm store: $PNPM_STORE_DIR"
fi

echo "🧹 Ensuring clean installation..."
if pnpm list -g --depth -1 --color=never | grep -qE "^${PACKAGE_NAME}[[:space:]]"; then
  echo "📦 Found existing $PACKAGE_NAME installation, removing..."
  pnpm remove -g "$PACKAGE_NAME" || echo "⚠️  Failed to remove existing installation; continuing"
else
  echo "✅ No existing global installation found"
fi

if [[ -f "$PACKAGE_TGZ" ]]; then
  echo "♻️  Removing existing package archive: $PACKAGE_TGZ"
  rm -f "$PACKAGE_TGZ"
fi

echo "Building ${PACKAGE_NAME}@${PACKAGE_VERSION}..."
pnpm build

echo "Packing to /tmp..."
pnpm pack --pack-destination /tmp

echo "📦 Installing ${PACKAGE_TGZ} globally..."
if ! pnpm add -g "$PACKAGE_TGZ"; then
  echo "❌ Global installation failed."
  echo "💡 Try syncing your pnpm store manually:"
  echo "   pnpm remove -g $PACKAGE_NAME"
  if [[ -n "$LEGACY_STORE" ]]; then
    echo "   PNPM_STORE_DIR=$LEGACY_STORE pnpm add -g \"$PACKAGE_TGZ\""
  else
    echo "   pnpm add -g \"$PACKAGE_TGZ\""
  fi
  exit 1
fi

echo "Running ${PACKAGE_NAME} --help to verify installation..."
"$PACKAGE_NAME" --help

printf '\nDone. Installed %s@%s globally from %s\n' "$PACKAGE_NAME" "$PACKAGE_VERSION" "$PACKAGE_TGZ"
