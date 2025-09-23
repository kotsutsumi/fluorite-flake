# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fluorite-flake is a TypeScript CLI utility that provides beautiful terminal output styling with ANSI colors. It can be used both as a global CLI tool and as a library in Node.js projects.

## Development Commands

```bash
# Development workflow
pnpm install          # Install dependencies
pnpm run dev         # Run CLI in development mode (uses tsx)
pnpm run build       # Compile TypeScript to dist/
pnpm run format      # Format code with Biome
pnpm run lint        # Lint code with Biome
pnpm run check       # Run both format and lint checks

# Publishing
pnpm publish         # Publish to npm (auto-runs build via prepublishOnly)
```

## Architecture

### Module System
- Uses ES modules (`"type": "module"` in package.json)
- TypeScript compiles to ESNext modules with bundler resolution
- Requires Node.js >=18.0.0

### Entry Points
- **CLI**: `src/cli.ts` → `dist/cli.js` (executable with shebang)
- **Library**: `src/index.ts` → `dist/index.js` (programmatic API exports)

### Key Dependencies
- **chalk** (v5.3.0): Terminal string styling - note this is ESM-only
- **commander** (v12.1.0): CLI argument parsing and command structure
- **ora** (v8.1.0): Terminal spinners for async operations

### Code Quality
- **Biome**: Handles both formatting and linting with strict rules
- **TypeScript**: Strict mode enabled with all strict checks
- **Husky**: Pre-commit hooks run format, lint, and build automatically

### Publishing Configuration
- Package publishes only `dist/`, `README.md`, and `LICENSE` files
- Binary entry point: `fluorite-flake` → `./dist/cli.js`
- Main library export: `dist/index.js`

## Important Patterns

### Adding New CLI Commands
Commands are added to `src/cli.ts` using the commander pattern:
```typescript
program
  .command('commandname [args]')
  .description('Description')
  .option('-f, --flag', 'Flag description')
  .action((args, options) => {
    // Implementation
  });
```

### Exporting Library Functions
Public API functions go in `src/index.ts` and should be fully typed with interfaces for options.

### Using Chalk Colors
Since chalk v5 is ESM-only, dynamic color selection requires type casting:
```typescript
const colorFn = chalk[colorName as keyof typeof chalk] as typeof chalk.cyan;
```