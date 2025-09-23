# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fluorite-flake is a comprehensive Next.js boilerplate generator and CLI utility that provides:
1. **Interactive Project Generator**: Create production-ready Next.js applications with customizable configurations
2. **Terminal Styling**: Beautiful terminal output with ANSI colors and animations
3. **Modern Stack**: Next.js 15, TypeScript, TailwindCSS v4, and cutting-edge tooling
4. **Flexible Database Support**: Choose between Turso (SQLite edge) or Supabase (PostgreSQL)
5. **ORM Options**: Prisma or Drizzle ORM integration
6. **Authentication**: Better Auth integration with session management
7. **Deployment Ready**: Vercel deployment configuration with Blob storage

## Development Commands

```bash
# Development workflow
pnpm install          # Install dependencies
pnpm run dev         # Run CLI in development mode (uses tsx)
pnpm run build       # Compile TypeScript to dist/
pnpm run format      # Format code with Biome
pnpm run lint        # Lint code with Biome
pnpm run check       # Run both format and lint checks

# Testing
pnpm run test        # Run unit tests with Vitest
pnpm run test:e2e    # Run E2E tests with Playwright
pnpm run test:watch  # Run tests in watch mode

# Publishing (automated via GitHub Actions on main branch merge)
pnpm publish         # Manual publish to npm (auto-runs build via prepublishOnly)
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
- **prompts** (v2.4.2): Interactive CLI prompts for project configuration
- **fs-extra** (v11.2.0): Enhanced file system operations
- **execa** (v9.5.2): Process execution for running commands
- **handlebars** (v4.7.8): Template engine for code generation

### Code Quality
- **Biome**: Handles both formatting and linting with strict rules
- **TypeScript**: Strict mode enabled with all strict checks
- **Husky**: Pre-commit hooks run format, lint, and build automatically
- **Best Practices**:
  - Proper TypeScript typing (no `any` types)
  - Functional programming patterns (`for...of` over `forEach`)
  - Structured error handling and validation
  - Consistent code formatting and organization

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

## Create Command (Project Generator)

### Usage
```bash
fluorite-flake create  # or 'fluorite-flake new'
```

### Interactive Options
The create command prompts for:
1. **Project Name**: Name of your new Next.js application
2. **Database**: Choose between:
   - None (no database)
   - Turso (SQLite at the edge)
   - Supabase (PostgreSQL)
3. **ORM** (if database selected):
   - Prisma (type-safe database client)
   - Drizzle (TypeScript ORM)
4. **Deployment**: Configure for Vercel deployment
5. **Authentication**: Add Better Auth integration

### Configuration Combinations
The generator supports 14 different configuration combinations, all thoroughly tested:
- Basic configurations (no database)
- Database + ORM combinations (Turso/Supabase with Prisma/Drizzle)
- Each with optional deployment and authentication

### Generated Project Structure
```
project-name/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   └── api/         # API routes (auth, upload endpoints)
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── auth/        # Auth components (if selected)
│   │   └── file-upload.tsx # File upload component (if deployment selected)
│   ├── lib/             # Utility functions and configurations
│   │   ├── auth.ts      # Better Auth server config (if selected)
│   │   ├── blob.ts      # Vercel Blob client (if deployment selected)
│   │   └── store.ts     # Jotai state management
│   ├── hooks/           # Custom React hooks
│   └── styles/          # Global styles and Tailwind CSS
├── prisma/              # Prisma schema (if selected)
├── drizzle/             # Drizzle config (if selected)
├── public/              # Static assets
├── scripts/             # Deployment scripts (if selected)
└── Configuration files
```

## Generator Architecture

### Modular Generators
The project uses a modular architecture with separate generators:

```
src/generators/
├── next-generator.ts      # Base Next.js project setup
├── database-generator.ts  # Database and ORM configuration
├── deployment-generator.ts # Vercel deployment setup
└── auth-generator.ts      # Authentication integration
```

### Adding New Generators
1. Create a new file in `src/generators/`
2. Export an async function accepting `ProjectConfig`
3. Import and call from `src/commands/create.ts`
4. Add tests in `test/generator.test.ts`

### ProjectConfig Interface
```typescript
interface ProjectConfig {
  projectName: string;
  projectPath: string;
  database: 'none' | 'turso' | 'supabase';
  orm?: 'prisma' | 'drizzle';
  deployment?: boolean;
  auth?: boolean;
  packageManager: 'npm' | 'pnpm' | 'yarn';
}
```

## Generated Project Features

### Database Integration
- **Turso**: SQLite at the edge with libSQL adapter
  - Prisma with driver adapters preview feature
  - Drizzle with libSQL client
- **Supabase**: PostgreSQL with built-in auth
  - Direct database connection
  - Supabase client SDK integration

### Authentication (Better Auth)
- Session-based authentication
- Sign in/Sign up forms
- Protected routes
- User management
- Database schema integration

### Vercel Deployment Features
- **Vercel Blob Storage**: File upload system
  - Pre-configured upload API endpoint (`/api/upload`)
  - React file upload component
  - Blob client configuration
- **Deployment Scripts**:
  - `scripts/deploy.sh`: Automated deployment with environment setup
  - `scripts/destroy-deployment.sh`: Clean teardown of deployments
- **Environment Management**: Automatic env variable configuration

## Testing Infrastructure

### Test Suite
- **Vitest**: Unit and integration testing
- **Playwright**: E2E testing for generated projects
- **Coverage**: All 14 configuration combinations tested

### Running Tests
```bash
pnpm test              # Run all tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Generate coverage report
```

### Test Matrix
Tests verify:
- Project generation for all configurations
- Correct dependencies installation
- Build success for generated projects
- Linting and formatting compliance
- Script execution

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. CI Workflow (`.github/workflows/ci.yml`)
- Triggers on: Push and pull requests to develop/main
- Test matrix: Node.js 18, 20, 22
- Steps: Install, lint, format check, build, test

#### 2. Release Workflow (`.github/workflows/release.yml`)
- Triggers on: Release creation
- Publishes to npm automatically
- Uses NPM_TOKEN secret for authentication

#### 3. Publish Workflow (`.github/workflows/publish.yml`)
- Triggers on: Push to main branch
- Automatically publishes to npm
- Increments patch version if not manually set

### Setting Up Secrets
Required GitHub secrets:
- `NPM_TOKEN`: npm access token for publishing

## Development Workflow

### Making Changes
1. Create feature branch from `develop`
2. Make changes and add tests
3. Run `pnpm run check` to ensure quality
4. Commit (pre-commit hooks run automatically)
5. Push and create PR to `develop`
6. After review, merge to `develop`
7. When ready for release, merge `develop` to `main`

### Pre-commit Hooks
Husky runs automatically on commit:
1. Format code with Biome
2. Lint with Biome
3. Build TypeScript
4. Run tests (optional)

### Code Quality Standards
When contributing, ensure your code follows these standards:
- **TypeScript**: Use proper typing, avoid `any` types
- **Performance**: Use `for...of` loops instead of `forEach` for better performance
- **Error Handling**: Implement comprehensive error handling with meaningful messages
- **Testing**: Add tests for new features covering all configuration combinations
- **Documentation**: Update documentation for new features and configuration options