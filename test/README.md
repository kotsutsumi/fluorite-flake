# Test Infrastructure Documentation

## Overview

The Fluorite-flake test infrastructure follows a 3-tier testing approach to ensure comprehensive validation of the CLI tool and generated projects.

## Test Structure

```
test/
├── unit/           # Module-level unit tests
├── functional/     # CLI feature tests
├── scenario/       # Full project generation tests
├── helpers/        # Test utilities and helpers
└── fixtures/       # Test data and mock files
```

## Test Tiers

### 1. Unit Tests (`test/unit/`)
- **Purpose**: Test individual modules and functions in isolation
- **Timeout**: 10 seconds
- **Coverage**: All utility functions, generators, configuration modules
- **Run**: `pnpm test:unit`

#### Structure:
- `utils/` - Utility function tests
- `config/` - Configuration module tests
- `generators/` - Generator module tests
- `commands/` - Command helper function tests

### 2. Functional Tests (`test/functional/`)
- **Purpose**: Test CLI commands and features
- **Timeout**: 30 seconds
- **Coverage**: CLI commands, arguments, interactive prompts
- **Run**: `pnpm test:functional`

#### Structure:
- `cli/` - CLI command tests
- `commands/` - Command execution tests
- `features/` - Feature integration tests

### 3. Scenario Tests (`test/scenario/`)
- **Purpose**: Test complete project generation scenarios
- **Timeout**: 5 minutes
- **Coverage**: Full project generation for all frameworks
- **Run**: `pnpm test:scenario`
- **Concurrency**: Sequential execution (prevents conflicts)

#### Structure:
- `nextjs/` - Next.js project generation tests
- `expo/` - Expo (React Native) project tests
- `tauri/` - Tauri desktop app tests
- `flutter/` - Flutter cross-platform tests

## Test Commands

```bash
# Run all tests
pnpm test

# Run specific test tier
pnpm test:unit          # Unit tests only
pnpm test:functional    # Functional tests only
pnpm test:scenario      # Scenario tests only

# Development
pnpm test:watch         # Watch mode for all tests
pnpm test:coverage      # Run with coverage report
pnpm test:ui            # Open Vitest UI

# Run single test file (without workspace)
pnpm test:single path/to/test.ts
```

## Test Helpers

### Temporary Directory Management (`test/helpers/temp-dir.ts`)
```typescript
import { createTempDir, createTempProject, cleanupAllTempDirs } from './helpers/temp-dir.js';

// Create temporary directory
const tempDir = await createTempDir('test-prefix-');

// Create temporary project with package.json
const projectPath = await createTempProject('test-project', {
    framework: 'nextjs',
    packageManager: 'pnpm'
});

// Cleanup after tests
afterAll(async () => {
    await cleanupAllTempDirs();
});
```

### CLI Runner (`test/helpers/cli-runner.ts`)
```typescript
import { runCli, expectSuccess, expectOutput } from './helpers/cli-runner.js';

// Run CLI command
const result = await runCli(['create', '--help']);

// Check results
expectSuccess(result);
expectOutput(result, 'Create a new project');
```

### Project Generator (`test/helpers/project-generator.ts`)
```typescript
import { generateProject, verifyProjectStructure, TEST_CONFIGS } from './helpers/project-generator.js';

// Generate project
const { projectPath, config } = await generateProject({
    projectName: 'test-app',
    framework: 'nextjs',
    database: 'turso',
    orm: 'prisma'
});

// Verify structure
const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
    'package.json',
    'tsconfig.json',
    'next.config.mjs'
]);
```

## CI/CD Integration

### GitHub Actions Workflows

1. **Main CI** (`.github/workflows/ci.yml`)
   - Runs on: Push and PR to main/develop
   - Tests: Unit + Functional tests
   - Matrix: Node.js 20, 22

2. **Scenario Tests** (`.github/workflows/scenario-tests.yml`)
   - Runs on: Push, PR, and daily schedule
   - Tests: Full project generation scenarios
   - Matrix: OS (Ubuntu, macOS, Windows) × Framework (Next.js, Expo, Tauri, Flutter)

3. **Test Coverage** (`.github/workflows/test-coverage.yml`)
   - Runs on: Push and PR
   - Reports: Coverage to Codecov
   - Artifacts: Coverage reports

## Writing Tests

### Unit Test Example
```typescript
import { describe, expect, it } from 'vitest';
import { myFunction } from '../../../src/utils/my-function.js';

describe('myFunction', () => {
    it('should handle basic case', () => {
        const result = myFunction('input');
        expect(result).toBe('expected');
    });
});
```

### Functional Test Example
```typescript
import { describe, expect, it } from 'vitest';
import { runCli, expectSuccess } from '../../helpers/cli-runner.js';

describe('CLI create command', () => {
    it('should display help', async () => {
        const result = await runCli(['create', '--help']);
        expectSuccess(result);
        expectOutput(result, 'Create a new project');
    });
});
```

### Scenario Test Example
```typescript
import { describe, expect, it, afterAll } from 'vitest';
import { generateProject, verifyProjectStructure } from '../../helpers/project-generator.js';
import { cleanupAllTempDirs } from '../../helpers/temp-dir.js';

describe('Next.js project generation', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    it('should generate Next.js project with Turso', async () => {
        const { projectPath } = await generateProject({
            projectName: 'test-app',
            framework: 'nextjs',
            database: 'turso',
            orm: 'prisma'
        });

        const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
            'package.json',
            'prisma/schema.prisma'
        ]);

        expect(valid).toBe(true);
        expect(missingFiles).toHaveLength(0);
    });
});
```

## Environment Variables

Tests automatically set these environment variables:
- `FLUORITE_TEST_MODE=true` - Enables test mode
- `FLUORITE_CLOUD_MODE=mock` - Uses mock cloud provisioning
- `FLUORITE_AUTO_PROVISION=false` - Disables auto-provisioning
- `NODE_ENV=test` - Sets Node environment to test

## Best Practices

1. **Isolation**: Each test should be independent and not rely on others
2. **Cleanup**: Always clean up temporary files and directories
3. **Mocking**: Use test mode to avoid real API calls and installations
4. **Timeouts**: Set appropriate timeouts for different test types
5. **Coverage**: Aim for >80% code coverage
6. **Naming**: Use descriptive test names that explain what is being tested
7. **Organization**: Group related tests using `describe` blocks

## Troubleshooting

### Common Issues

1. **Timeout errors**: Increase timeout in test configuration
2. **File not found**: Ensure proper cleanup between tests
3. **Port conflicts**: Tests should use dynamic ports
4. **CI failures**: Check OS-specific requirements

### Debug Mode

```bash
# Run tests with verbose output
DEBUG=* pnpm test

# Run specific test file
pnpm vitest run test/unit/utils/slugify.test.ts

# Run tests matching pattern
pnpm vitest run -t "should generate Next.js"
```

## Migration from Old Structure

The test infrastructure has been migrated from:
- Playwright E2E tests → Vitest scenario tests
- Storybook tests → Removed (not needed for CLI)
- Scattered tests → Organized into 3 tiers

All tests now use Vitest for consistency and better integration.