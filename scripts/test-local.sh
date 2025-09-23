#!/bin/bash

# Fluorite-flake Local E2E Test Runner
# This script runs E2E tests locally with proper setup and teardown

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Fluorite-flake Local E2E Test Runner${NC}"
echo ""

# Parse arguments
FRAMEWORK=""
KEEP_ARTIFACTS=false
HEADED=false
DEBUG=false
MOBILE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --framework)
      FRAMEWORK="$2"
      shift 2
      ;;
    --keep)
      KEEP_ARTIFACTS=true
      shift
      ;;
    --headed)
      HEADED=true
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --mobile)
      MOBILE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --framework <name>  Test specific framework (nextjs, expo, tauri, flutter)"
      echo "  --keep              Keep test artifacts after completion"
      echo "  --headed            Run tests in headed mode (visible browser)"
      echo "  --debug             Enable debug output"
      echo "  --mobile            Run mobile tests (Maestro/Patrol)"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js 18+ is required (found: $(node -v))${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}❌ pnpm is not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ pnpm: $(pnpm -v)${NC}"

# Check for optional tools
if [ "$MOBILE" = true ] || [ "$FRAMEWORK" = "expo" ]; then
  if command -v maestro &> /dev/null; then
    echo -e "${GREEN}✅ Maestro: $(maestro --version 2>&1 | head -n1)${NC}"
    export HAS_MAESTRO=true
  else
    echo -e "${YELLOW}⚠️  Maestro not found (Expo mobile tests will be skipped)${NC}"
    echo -e "   Install with: curl -fsSL https://get.maestro.mobile.dev | bash"
    export HAS_MAESTRO=false
  fi
fi

if [ "$MOBILE" = true ] || [ "$FRAMEWORK" = "flutter" ]; then
  if command -v flutter &> /dev/null; then
    echo -e "${GREEN}✅ Flutter: $(flutter --version | head -n1)${NC}"
    export HAS_FLUTTER=true

    # Check for Patrol CLI
    if command -v patrol &> /dev/null; then
      echo -e "${GREEN}✅ Patrol: $(patrol --version 2>&1 | head -n1)${NC}"
      export HAS_PATROL=true
    else
      echo -e "${YELLOW}⚠️  Patrol not found (Flutter mobile tests will be limited)${NC}"
      echo -e "   Install with: dart pub global activate patrol_cli"
      export HAS_PATROL=false
    fi
  else
    echo -e "${YELLOW}⚠️  Flutter not found (Flutter tests will be skipped)${NC}"
    export HAS_FLUTTER=false
    export HAS_PATROL=false
  fi
fi

if [ "$FRAMEWORK" = "tauri" ]; then
  if command -v cargo &> /dev/null; then
    echo -e "${GREEN}✅ Rust: $(cargo --version)${NC}"
    export HAS_RUST=true
  else
    echo -e "${YELLOW}⚠️  Rust not found (Tauri build tests will be limited)${NC}"
    export HAS_RUST=false
  fi
fi

echo ""

# Build the project first
echo -e "${YELLOW}🔨 Building fluorite-flake...${NC}"
pnpm run build
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Install Playwright browsers if needed
echo -e "${YELLOW}📦 Ensuring Playwright browsers are installed...${NC}"
npx playwright install chromium
echo -e "${GREEN}✅ Playwright ready${NC}"
echo ""

# Set environment variables
if [ "$KEEP_ARTIFACTS" = true ]; then
  export KEEP_TEST_ARTIFACTS=true
fi

if [ "$DEBUG" = true ]; then
  export DEBUG="pw:api"
  export PWDEBUG=1
fi

# Build test command
TEST_CMD="npx playwright test"

if [ -n "$FRAMEWORK" ]; then
  TEST_CMD="$TEST_CMD test/e2e/${FRAMEWORK}.spec.ts"
fi

if [ "$HEADED" = true ]; then
  TEST_CMD="$TEST_CMD --headed"
fi

# Run tests
echo -e "${BLUE}🧪 Running E2E tests...${NC}"
echo -e "${YELLOW}Command: $TEST_CMD${NC}"
echo ""

# Create a trap to clean up on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}🧹 Cleaning up...${NC}"

  # Kill any remaining dev servers
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "expo start" 2>/dev/null || true
  pkill -f "tauri dev" 2>/dev/null || true
  pkill -f "flutter run" 2>/dev/null || true

  # Clean up temp directories unless keeping artifacts
  if [ "$KEEP_ARTIFACTS" != true ]; then
    rm -rf /tmp/fluorite-e2e-* 2>/dev/null || true
    rm -rf /tmp/fluorite-test-* 2>/dev/null || true
  fi
}

trap cleanup EXIT

# Run the tests
if $TEST_CMD; then
  echo ""
  echo -e "${GREEN}✅ All tests passed!${NC}"

  # Show test report location
  if [ -f "playwright-report/index.html" ]; then
    echo ""
    echo -e "${BLUE}📊 Test report available at: file://$(pwd)/playwright-report/index.html${NC}"
  fi

  # Show artifacts location if kept
  if [ "$KEEP_ARTIFACTS" = true ]; then
    echo ""
    echo -e "${BLUE}📁 Test artifacts kept in: /tmp/fluorite-e2e-*${NC}"
  fi
else
  echo ""
  echo -e "${RED}❌ Tests failed${NC}"

  # Show test report
  if [ -f "playwright-report/index.html" ]; then
    echo ""
    echo -e "${YELLOW}📊 View test report: npx playwright show-report${NC}"
  fi

  exit 1
fi