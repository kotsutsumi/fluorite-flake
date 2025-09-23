# Scripts Documentation

This directory contains utility scripts for developing and testing fluorite-flake.

## Local Installation Scripts

### 🚀 install-local.sh (Unix/Linux/macOS)

A comprehensive script that builds the project, packs it, and installs it globally for local testing.

**Usage:**
```bash
# Run from project root
./scripts/install-local.sh

# Or using pnpm script
pnpm run install:local
```

**What it does:**
1. 📦 Builds the project using `pnpm build`
2. 🏗️ Packs the project to `/tmp/fluorite-flake-{version}.tgz` (version from package.json)
3. 🌍 Installs it globally using `pnpm add -g`
4. ✅ Tests the installation with `fluorite-flake --help`
5. 🧹 Cleans up temporary files

**Features:**
- ✨ Dynamic version detection from package.json
- 🔍 Automatic dependency checking (pnpm, node)
- 🔄 Handles existing global installations (uninstalls first)
- 🎨 Colored output with progress indicators
- ⚠️ Comprehensive error handling
- 🧹 Automatic cleanup on exit

### 🪟 install-local.ps1 (Windows PowerShell)

PowerShell equivalent for Windows users.

**Usage:**
```powershell
# Run from project root
./scripts/install-local.ps1

# Or using pnpm script
pnpm run install:local:win

# For help
./scripts/install-local.ps1 -Help
```

**Same functionality as the shell script but optimized for Windows environments.**

## Prerequisites

Before running the installation scripts:

1. **Node.js** (>=18.0.0) must be installed
2. **pnpm** must be installed and available in PATH
3. **Project must build successfully** (`pnpm build` should pass)

## Troubleshooting

### Build Fails
If the script fails during the build step:
```bash
❌ Build failed
```

**Solutions:**
1. Fix TypeScript/compilation errors in the source code
2. Run `pnpm run check` to identify and fix linting issues
3. Ensure all dependencies are installed: `pnpm install`

### Installation Fails
If global installation fails:
```bash
❌ Global installation failed
```

**Solutions:**
1. Check pnpm permissions
2. Try with elevated permissions (sudo on Unix, Run as Administrator on Windows)
3. Clear pnpm cache: `pnpm store prune`

### Command Not Found After Installation
If `fluorite-flake` command is not found after installation:
```bash
❌ Command 'fluorite-flake' not found in PATH after installation
```

**Solutions:**
1. Restart your terminal
2. Check if pnpm global bin directory is in your PATH
3. Run `pnpm config get global-bin-dir` to find the installation directory

## Manual Installation Steps

If the scripts don't work, you can manually follow these steps:

```bash
# 1. Build the project
pnpm build

# 2. Get version from package.json
VERSION=$(node -pe "require('./package.json').version")

# 3. Pack the project
pnpm pack --pack-destination /tmp

# 4. Install globally
pnpm add -g "/tmp/fluorite-flake-${VERSION}.tgz"

# 5. Test installation
fluorite-flake --help
```

## Development Workflow

For active development, this workflow is recommended:

```bash
# 1. Make changes to source code
# 2. Test locally
pnpm run install:local

# 3. Test the CLI
fluorite-flake create

# 4. When satisfied, commit changes
git add .
git commit -m "feat: add new feature"
```

## Script Details

### Version Detection

The scripts automatically detect the package version using multiple fallback methods:

1. **Node.js**: `node -pe "require('./package.json').version"`
2. **jq**: `jq -r '.version' package.json` (if available)
3. **grep/sed**: Fallback regex parsing

### Cross-Platform Compatibility

- **Unix/Linux/macOS**: Uses bash with POSIX-compliant commands
- **Windows**: Uses PowerShell with Windows-native commands
- Both scripts provide identical functionality with platform-specific optimizations

### Error Handling

Both scripts include comprehensive error handling:
- ✅ Dependency checking
- ✅ File existence validation
- ✅ Command success verification
- ✅ Automatic cleanup on failure
- ✅ Clear error messages with suggestions

### Cleanup

The scripts automatically clean up temporary files:
- Removes packed .tgz files from `/tmp` (Unix) or `%TEMP%` (Windows)
- Cleanup runs on both successful completion and script interruption