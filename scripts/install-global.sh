#!/bin/bash

# install-global.sh - Build, pack, and globally install the local fluorite-flake package
# Workflow:
#   pnpm build
#   pnpm pack --pack-destination /tmp
#   npm install -g /tmp/fluorite-flake-<version>.tgz
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

require_command pnpm
require_command npm
require_command node

PACKAGE_NAME="$(node -pe "require('./package.json').name")"
PACKAGE_VERSION="$(node -pe "require('./package.json').version")"
PACKAGE_TGZ="/tmp/${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz"

# Remove any stale archive from previous runs
if [[ -f "$PACKAGE_TGZ" ]]; then
  echo "♻️  Removing existing package archive: $PACKAGE_TGZ"
  rm -f "$PACKAGE_TGZ"
fi

# Uninstall existing global installation (npm manages its own global prefix)
echo "🧹 Ensuring clean npm installation..."
if npm list -g --depth=0 "$PACKAGE_NAME" >/dev/null 2>&1; then
  echo "📦 Found existing $PACKAGE_NAME installation via npm, removing..."
  npm uninstall -g "$PACKAGE_NAME"
else
  echo "✅ No npm global installation found"
fi

# Build and pack using pnpm (project default)
echo "Building ${PACKAGE_NAME}@${PACKAGE_VERSION}..."
pnpm build

echo "Packing to /tmp..."
pnpm pack --pack-destination /tmp >/dev/null

if [[ ! -f "$PACKAGE_TGZ" ]]; then
  echo "Error: expected tarball not found at $PACKAGE_TGZ" >&2
  exit 1
fi

# Install the tarball globally with npm to avoid pnpm store mismatch issues
echo "📦 Installing ${PACKAGE_TGZ} globally with npm..."
npm install -g "$PACKAGE_TGZ"

echo "Running ${PACKAGE_NAME} --help to verify installation..."
"$PACKAGE_NAME" --help

printf '\nDone. Installed %s@%s globally from %s\n' "$PACKAGE_NAME" "$PACKAGE_VERSION" "$PACKAGE_TGZ"
