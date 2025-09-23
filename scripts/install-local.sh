#!/bin/bash

# install-local.sh - Build and globally install fluorite-flake locally
# This script builds the project, packs it, and installs it globally for local testing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get version from package.json
get_package_version() {
    if command_exists node; then
        node -pe "require('./package.json').version"
    elif command_exists jq; then
        jq -r '.version' package.json
    else
        # Fallback: parse with grep and sed
        grep '"version"' package.json | sed 's/.*"version": *"\([^"]*\)".*/\1/'
    fi
}

# Function to get package name from package.json
get_package_name() {
    if command_exists node; then
        node -pe "require('./package.json').name"
    elif command_exists jq; then
        jq -r '.name' package.json
    else
        # Fallback: parse with grep and sed
        grep '"name"' package.json | sed 's/.*"name": *"\([^"]*\)".*/\1/'
    fi
}

# Function to cleanup on exit
cleanup() {
    if [[ -n "${PACKAGE_FILE:-}" && -f "$PACKAGE_FILE" ]]; then
        log_info "Cleaning up temporary package file: $PACKAGE_FILE"
        rm -f "$PACKAGE_FILE"
    fi
}

trap cleanup EXIT

# Main script
main() {
    log_info "Starting local installation of fluorite-flake..."

    # Check if we're in the project root
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi

    # Check required tools
    if ! command_exists pnpm; then
        log_error "pnpm is required but not installed. Please install pnpm first."
        exit 1
    fi

    # Get package info
    PACKAGE_NAME=$(get_package_name)
    PACKAGE_VERSION=$(get_package_version)

    if [[ -z "$PACKAGE_NAME" || -z "$PACKAGE_VERSION" ]]; then
        log_error "Failed to read package name or version from package.json"
        exit 1
    fi

    log_info "Package: $PACKAGE_NAME@$PACKAGE_VERSION"

    # Step 1: Build the project
    log_info "Building the project..."
    if ! pnpm build; then
        log_error "Build failed"
        exit 1
    fi
    log_success "Build completed"

    # Step 2: Pack the project
    log_info "Packing the project..."
    PACK_DESTINATION="/tmp"
    PACKAGE_FILE="$PACK_DESTINATION/${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz"

    # Remove existing package file if it exists
    if [[ -f "$PACKAGE_FILE" ]]; then
        log_warning "Removing existing package file: $PACKAGE_FILE"
        rm -f "$PACKAGE_FILE"
    fi

    if ! pnpm pack --pack-destination "$PACK_DESTINATION"; then
        log_error "Pack failed"
        exit 1
    fi

    # Verify the package file was created
    if [[ ! -f "$PACKAGE_FILE" ]]; then
        log_error "Package file not found: $PACKAGE_FILE"
        exit 1
    fi
    log_success "Package created: $PACKAGE_FILE"

    # Step 3: Install globally
    log_info "Installing globally..."

    # Check if the package is already installed globally and uninstall it
    if pnpm list -g "$PACKAGE_NAME" >/dev/null 2>&1; then
        log_warning "Existing global installation found. Uninstalling..."
        pnpm remove -g "$PACKAGE_NAME" || log_warning "Failed to uninstall existing version"
    fi

    if ! pnpm add -g "$PACKAGE_FILE"; then
        log_error "Global installation failed"
        exit 1
    fi
    log_success "Global installation completed"

    # Step 4: Test the installation
    log_info "Testing the installation..."

    # Check if the command is available
    if ! command_exists "$PACKAGE_NAME"; then
        log_error "Command '$PACKAGE_NAME' not found in PATH after installation"
        log_info "You may need to restart your terminal or update your PATH"
        exit 1
    fi

    # Run --help to test
    log_info "Running '$PACKAGE_NAME --help':"
    echo
    if ! "$PACKAGE_NAME" --help; then
        log_error "Failed to run '$PACKAGE_NAME --help'"
        exit 1
    fi

    echo
    log_success "Local installation and testing completed successfully!"
    log_info "You can now use '$PACKAGE_NAME' globally"
    log_info "Package file location: $PACKAGE_FILE"
}

# Run main function
main "$@"