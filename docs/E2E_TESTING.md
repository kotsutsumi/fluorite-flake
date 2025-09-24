# E2E Testing Documentation

## Overview

The fluorite-flake project includes comprehensive End-to-End (E2E) tests to verify that generated projects are fully functional and all included scripts work correctly.

## Test Structure

### Test Files
- `test/e2e-nextjs.test.ts` - Tests for Next.js project generation
- `test/e2e-comprehensive.test.ts` - Comprehensive test suite covering multiple patterns
- `test/e2e-utils.ts` - Utility functions for E2E testing

### Test Patterns

#### Next.js Pattern 1: Basic Configuration
- **Framework**: Next.js
- **Database**: None
- **Deployment**: No
- **Storage**: None
- **Package Manager**: pnpm
- **Auth**: No

This pattern tests the most basic Next.js setup to ensure core functionality works.

#### Next.js Pattern 2: With Turso Database
- Includes database configuration with Turso (SQLite at the edge)
- Tests Prisma/Drizzle ORM integration
- Verifies database initialization scripts

#### Next.js Pattern 3: With Vercel Deployment
- Tests deployment configuration
- Verifies deployment scripts are created

## What the Tests Verify

### 1. Project Generation
- Project is created in the correct directory
- All expected files and directories are present
- Project structure matches framework requirements

### 2. Package.json Scripts
All generated scripts are present and have correct commands:
- `dev` - Development server
- `build` - Production build
- `start` - Production server
- `lint` - Linting with Biome
- `lint:fix` - Auto-fix linting issues
- `format` - Format code with Biome
- `format:check` - Check formatting
- `check` - Combined lint and format check
- `check:fix` - Fix all issues

### 3. Script Execution
Each script is tested to ensure it runs correctly:
- **lint**: Runs and reports issues
- **lint:fix**: Attempts to fix issues (may fail for unsafe fixes)
- **format**: Formats code successfully
- **format:check**: Checks formatting
- **build**: Creates production build
- **check**: Runs combined checks
- **check:fix**: Fixes most issues

### 4. Build Output
- TypeScript configuration is valid
- Next.js configuration is correct
- Biome configuration is properly set up
- Build artifacts are created (`.next` directory)

### 5. Project Structure
Verifies correct directory structure:
```
src/
  app/        # Next.js App Router
  components/ # React components
    ui/       # UI components
  lib/        # Utilities
  hooks/      # Custom hooks
  styles/     # CSS files
public/       # Static assets
```

## Running the Tests

### Run All E2E Tests
```bash
pnpm run test:e2e
```

### Run Next.js E2E Tests Only
```bash
pnpm run test:e2e:nextjs
```

### Run Comprehensive E2E Tests
```bash
pnpm run test:e2e:comprehensive
```

### Run with Watch Mode
```bash
pnpm run test:e2e:watch
```

### CI/CD Testing
```bash
pnpm run test:e2e:ci
```

## Test Implementation Details

### Non-Interactive Mode
The `createProject` function supports both interactive and non-interactive modes:
- **Interactive**: Prompts user for configuration choices
- **Non-Interactive**: Accepts complete configuration object for testing

```typescript
// Non-interactive mode for testing
await createProject({
  projectName: 'test-project',
  projectPath: '/path/to/project',
  framework: 'nextjs',
  database: 'none',
  deployment: false,
  storage: 'none',
  auth: false,
  packageManager: 'pnpm'
});
```

### Test Utilities

The `test/e2e-utils.ts` file provides helper functions:

- `createTestDirectory()` - Creates temporary test directory
- `cleanupTestDirectory()` - Cleans up after tests
- `runCommand()` - Executes shell commands
- `runPackageManagerCommand()` - Runs package manager commands
- `verifyProjectStructure()` - Checks expected files exist
- `verifyPackageScripts()` - Validates package.json scripts
- `createTestFileWithIssues()` - Creates files with linting/formatting issues for testing
- `verifyBuildOutput()` - Checks build artifacts

### Test Timeouts

Different operations have appropriate timeouts:
- **E2E_TIMEOUT**: 5 minutes for build operations
- **COMMAND_TIMEOUT**: 1 minute for regular commands

### Error Handling

Tests handle various scenarios:
- Commands that may exit with non-zero codes (linting with issues)
- Unsafe fixes that require manual intervention
- Build processes that take longer time

## Key Learnings

### 1. Configuration Scope
Test configuration must be created within test functions, not at describe level, to ensure variables like `projectPath` are properly initialized after `beforeAll` hooks run.

### 2. Command Exit Codes
Some commands like `lint:fix` and `check:fix` may exit with non-zero codes when they find issues they can't automatically fix (like unused variables requiring `--unsafe` flag). Tests should use `reject: false` option with execa to handle these cases.

### 3. Project Path Resolution
The `createProject` function must preserve the provided `projectPath` and not override it with current working directory paths.

### 4. Biome Commands
- `biome lint --fix` - Fixes safe linting issues
- `biome check --fix` - Fixes both linting and formatting issues
- Some issues require `--unsafe` flag which tests don't use

## Future Improvements

1. Add E2E tests for other frameworks (Expo, Tauri, Flutter)
2. Test database integration patterns
3. Test deployment workflows
4. Add performance benchmarks
5. Test with different package managers (npm, yarn, bun)
6. Add visual regression testing for generated UI components