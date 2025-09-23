# install-local.ps1 - Build and globally install fluorite-flake locally (PowerShell)
# This script builds the project, packs it, and installs it globally for local testing

param(
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Usage: ./scripts/install-local.ps1

This script will:
1. Build the fluorite-flake project
2. Pack it to a .tgz file
3. Install it globally using pnpm
4. Test the installation with --help

Requirements:
- pnpm must be installed
- Node.js must be installed
- Run from the project root directory
"@
    exit 0
}

# Function to write colored output
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to get package information from package.json
function Get-PackageInfo {
    if (-not (Test-Path "package.json")) {
        Write-Error "package.json not found. Please run this script from the project root."
        exit 1
    }

    try {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        return @{
            Name = $packageJson.name
            Version = $packageJson.version
        }
    }
    catch {
        Write-Error "Failed to parse package.json: $_"
        exit 1
    }
}

# Main script
try {
    Write-Info "Starting local installation of fluorite-flake..."

    # Check if we're in the project root
    if (-not (Test-Path "package.json")) {
        Write-Error "package.json not found. Please run this script from the project root."
        exit 1
    }

    # Check required tools
    if (-not (Test-Command "pnpm")) {
        Write-Error "pnpm is required but not installed. Please install pnpm first."
        exit 1
    }

    # Get package info
    $packageInfo = Get-PackageInfo
    $packageName = $packageInfo.Name
    $packageVersion = $packageInfo.Version

    Write-Info "Package: $packageName@$packageVersion"

    # Step 1: Build the project
    Write-Info "Building the project..."
    $buildResult = & pnpm build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    Write-Success "Build completed"

    # Step 2: Pack the project
    Write-Info "Packing the project..."
    $packDestination = $env:TEMP
    $packageFile = Join-Path $packDestination "$packageName-$packageVersion.tgz"

    # Remove existing package file if it exists
    if (Test-Path $packageFile) {
        Write-Warning "Removing existing package file: $packageFile"
        Remove-Item $packageFile -Force
    }

    $packResult = & pnpm pack --pack-destination $packDestination
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Pack failed"
        exit 1
    }

    # Verify the package file was created
    if (-not (Test-Path $packageFile)) {
        Write-Error "Package file not found: $packageFile"
        exit 1
    }
    Write-Success "Package created: $packageFile"

    # Step 3: Install globally
    Write-Info "Installing globally..."

    # Check if the package is already installed globally and uninstall it
    $globalList = & pnpm list -g $packageName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Warning "Existing global installation found. Uninstalling..."
        & pnpm remove -g $packageName
    }

    $installResult = & pnpm add -g $packageFile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Global installation failed"
        exit 1
    }
    Write-Success "Global installation completed"

    # Step 4: Test the installation
    Write-Info "Testing the installation..."

    # Check if the command is available
    if (-not (Test-Command $packageName)) {
        Write-Error "Command '$packageName' not found in PATH after installation"
        Write-Info "You may need to restart your terminal or update your PATH"
        exit 1
    }

    # Run --help to test
    Write-Info "Running '$packageName --help':"
    Write-Host ""
    $helpResult = & $packageName --help
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to run '$packageName --help'"
        exit 1
    }

    Write-Host ""
    Write-Success "Local installation and testing completed successfully!"
    Write-Info "You can now use '$packageName' globally"
    Write-Info "Package file location: $packageFile"

    # Cleanup
    Write-Info "Cleaning up temporary package file..."
    Remove-Item $packageFile -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Error "An error occurred: $_"
    exit 1
}