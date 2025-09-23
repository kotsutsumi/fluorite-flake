# Comprehensive E2E Testing Infrastructure

This directory contains comprehensive end-to-end tests for the Fluorite-flake CLI project generator.

## Overview

Our E2E tests ensure that:
1. ✅ Projects are actually created in temp directories
2. ✅ Dependencies are installed successfully
3. ✅ Development servers start without errors
4. ✅ Applications are accessible via Playwright (no console errors)
5. ✅ Build commands complete successfully
6. ✅ All framework-specific features work correctly

## Test Structure

```
test/e2e/
├── utils/
│   └── test-helpers.ts     # Shared utilities for all E2E tests
├── nextjs.spec.ts          # Next.js project E2E tests
├── expo.spec.ts            # Expo project E2E tests (with Maestro support)
├── tauri.spec.ts           # Tauri project E2E tests
├── flutter.spec.ts         # Flutter project E2E tests
└── README.md               # This file
```

## Running Tests

### Prerequisites

1. **Node.js 18+** and **pnpm** installed
2. **Build the CLI** first:
   ```bash
   pnpm run build
   ```
3. **Install Playwright**:
   ```bash
   pnpm exec playwright install
   ```

### Framework-Specific Prerequisites

#### For Expo with Maestro
```bash
# Install Maestro (optional but recommended)
curl -Ls "https://get.maestro.mobile.dev" | bash

# For iOS testing
open -a Simulator  # macOS only

# For Android testing
emulator -avd <your_avd_name>
```

#### For Tauri
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Linux dependencies
sudo apt-get install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev
```

#### For Flutter
```bash
# Install Flutter SDK
# Follow: https://docs.flutter.dev/get-started/install
```

### Running Tests Locally

```bash
# Run all E2E tests
pnpm run test:e2e

# Run specific framework tests
pnpm run test:e2e:nextjs    # Next.js only
pnpm run test:e2e:expo      # Expo only
pnpm run test:e2e:tauri     # Tauri only
pnpm run test:e2e:flutter   # Flutter only

# Run smoke tests (quick validation)
pnpm run test:e2e:smoke

# Run tests with UI (interactive mode)
pnpm run test:e2e:ui

# Run tests with browser visible
pnpm run test:e2e:headed
```

## Test Features

### 1. Project Creation & Verification
- Creates projects in OS temp directory (`/tmp` or equivalent)
- Verifies all expected files and directories exist
- Checks framework-specific configurations

### 2. Dependency Installation
- Actually runs `pnpm install` (or npm/yarn/bun)
- Waits for installation to complete
- Verifies packages are installed correctly

### 3. Development Server Testing
- Starts the actual dev server
- Waits for server to be ready
- Assigns unique ports to avoid conflicts
- Properly manages server processes

### 4. Playwright Browser Testing
- Opens real browser (headless in CI)
- Navigates to the running application
- Checks for:
  - Page title and content
  - No console errors
  - Interactive elements work
  - Navigation between pages
  - Dark mode toggle (if available)
  - API routes (if configured)

### 5. Build Validation
- Runs actual build commands
- Verifies build output exists
- Checks bundle sizes (performance)
- Validates production builds

### 6. Maestro Testing (Expo)
When Maestro is installed, Expo tests also run:
- Native mobile UI tests
- Touch interactions
- Navigation flows
- Authentication flows (if configured)

Generated Maestro test files:
- `.maestro/smoke-test.yaml` - Basic app functionality
- `.maestro/navigation-test.yaml` - Tab navigation
- `.maestro/auth-test.yaml` - Authentication flow (if enabled)
- `.maestro/ci-test-suite.yaml` - CI test suite

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/e2e.yml` workflow runs:

1. **On every push/PR**: Quick smoke tests
2. **On main/develop**: Full framework tests
3. **Nightly**: Comprehensive all-framework tests

### Test Matrix

| Framework | OS | Node | Special Requirements |
|-----------|-------|-------|---------------------|
| Next.js | Ubuntu | 20 | None |
| Expo | Ubuntu | 20 | Maestro (optional) |
| Tauri | Ubuntu | 20 | Rust toolchain |
| Flutter | Ubuntu | 20 | Flutter SDK |

### Test Reports

- **HTML Report**: Generated in `playwright-report/`
- **JUnit XML**: Generated in `test-results/junit.xml`
- **Screenshots**: Captured on failure
- **Videos**: Recorded in CI (on failure)

## Test Configuration

### Timeouts

- **Local**: 5 minutes per test
- **CI**: 10 minutes per test
- **Action timeout**: 30 seconds
- **Navigation timeout**: 60 seconds

### Parallel Execution

Tests run **serially** to avoid:
- Port conflicts
- Resource exhaustion
- Temp directory conflicts

### Temp Directory Management

- Each test run creates unique temp directory
- Automatic cleanup after tests
- Projects created in: `/tmp/fluorite-e2e-XXXXX/`

## Writing New Tests

### Test Structure

```typescript
test('framework-feature: should work correctly', async () => {
    // 1. Create project
    const projectPath = await manager.createProject(config);

    // 2. Verify structure
    await manager.verifyProjectStructure(projectPath, 'framework');

    // 3. Install dependencies
    await manager.installDependencies(projectPath);

    // 4. Start dev server
    const server = await manager.startDevServer(projectPath, 'framework', 'project-name');

    // 5. Test with Playwright
    await manager.testWithPlaywright(server.url, async (page) => {
        // Your browser tests here
        await expect(page.locator('h1')).toBeVisible();
    });

    // 6. Run build
    await manager.runBuildCommand(projectPath, 'framework');
});
```

### Adding Framework Support

1. Create new spec file: `test/e2e/[framework].spec.ts`
2. Add to Playwright config projects
3. Update CI workflow matrix
4. Add framework-specific helpers to `test-helpers.ts`

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Tests automatically find available ports
   - Kill any running dev servers manually

2. **Temp directory not cleaned**
   - Check `/tmp/fluorite-e2e-*` directories
   - Manual cleanup: `rm -rf /tmp/fluorite-e2e-*`

3. **Maestro tests failing**
   - Ensure simulator/emulator is running
   - Check Maestro is installed: `maestro --version`
   - Verify `.maestro/` directory exists in project

4. **Build failures**
   - Check framework-specific dependencies
   - Verify sufficient disk space
   - Check error logs in test output

### Debug Mode

Set environment variables:
- `HEADLESS=false` - Show browser
- `DEBUG=pw:api` - Playwright debug logs
- `CI=true` - Simulate CI environment

## Performance Benchmarks

Expected test durations:

| Test Suite | Local | CI |
|------------|-------|----|
| Next.js | 2-3 min | 3-5 min |
| Expo | 2-3 min | 3-5 min |
| Tauri | 3-5 min | 5-8 min |
| Flutter | 3-5 min | 5-8 min |
| All Frameworks | 10-15 min | 15-25 min |

## Contributing

When adding new E2E tests:
1. Follow existing test patterns
2. Add proper cleanup
3. Handle errors gracefully
4. Document special requirements
5. Update this README

## Future Enhancements

- [ ] Add visual regression testing
- [ ] Performance benchmarking
- [ ] Accessibility testing
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Mobile device emulation
- [ ] Network condition simulation
- [ ] Database integration tests
- [ ] Authentication flow tests
- [ ] Deployment verification