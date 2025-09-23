# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fluorite-flake is a comprehensive multi-framework project generator and CLI utility that provides:
1. **Multi-Framework Support**: Create projects with Next.js, Expo (React Native), Tauri (Desktop), or Flutter
2. **Interactive Project Generator**: Production-ready applications with customizable configurations
3. **Terminal Styling**: Beautiful terminal output with ANSI colors and animations
4. **Modern Stack**: Latest framework versions with TypeScript and cutting-edge tooling
5. **Flexible Database Support**: Choose between Turso (SQLite edge) or Supabase (PostgreSQL) for supported frameworks
6. **ORM Options**: Prisma or Drizzle ORM integration for database-enabled projects
7. **Authentication**: Framework-specific auth solutions (Better Auth for Next.js, Expo Auth Session for Expo)
8. **Deployment Ready**: Framework-appropriate deployment configurations

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
1. **Framework**: Choose your technology stack:
   - **Next.js**: React web framework for production
   - **Expo**: React Native for mobile apps (iOS/Android/Web)
   - **Tauri**: Desktop applications with Rust backend + Web frontend
   - **Flutter**: Cross-platform apps (Mobile/Web/Desktop) with Dart
2. **Project Name**: Name of your new application
3. **Database** (Next.js/Expo only):
   - None (no database)
   - Turso (SQLite at the edge)
   - Supabase (PostgreSQL)
4. **ORM** (if database selected):
   - Prisma (type-safe database client)
   - Drizzle (TypeScript ORM)
5. **Deployment** (framework-specific):
   - Next.js: Vercel deployment
   - Tauri: GitHub Releases setup
   - Flutter: Store distribution configuration
6. **Storage** (Next.js/Expo only):
   - None
   - Vercel Blob
   - Cloudflare R2
   - AWS S3
   - Supabase Storage
7. **Authentication** (Next.js/Expo with database):
   - Next.js: Better Auth integration
   - Expo: Expo Auth Session
8. **Package Manager** (JavaScript frameworks only):
   - pnpm (recommended)
   - npm
   - yarn
   - bun

### Framework Capabilities
- **Next.js**: Full-stack web apps with all features (database, auth, storage, deployment)
- **Expo**: Mobile apps with database and storage support
- **Tauri**: Desktop apps with deployment configuration
- **Flutter**: Cross-platform apps with Flutter-specific tooling

### Generated Project Structures

#### Next.js Project Structure
```
project-name/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   └── api/         # API routes (auth, upload endpoints)
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── auth/        # Auth components (if selected)
│   │   └── file-upload.tsx # File upload component (if storage selected)
│   ├── lib/             # Utility functions and configurations
│   │   ├── auth.ts      # Better Auth server config (if selected)
│   │   ├── storage.ts   # Storage client (if selected)
│   │   └── store.ts     # Jotai state management
│   ├── hooks/           # Custom React hooks
│   └── styles/          # Global styles and Tailwind CSS v4
├── prisma/              # Prisma schema (if selected)
├── drizzle/             # Drizzle config (if selected)
├── public/              # Static assets
├── scripts/             # Deployment scripts (if selected)
└── Configuration files (next.config.mjs, tsconfig.json, etc.)
```

#### Expo Project Structure
```
project-name/
├── app/                 # Expo Router navigation
│   ├── (tabs)/         # Tab navigation screens
│   ├── _layout.tsx     # Root layout with providers
│   └── +not-found.tsx  # 404 screen
├── components/          # React Native components
│   └── ui/             # Reusable UI components
├── constants/           # App constants
├── hooks/              # Custom React hooks
├── assets/             # Images, fonts, and other assets
│   ├── images/
│   └── fonts/
└── Configuration files (app.json, tsconfig.json, babel.config.js)
```

#### Tauri Project Structure
```
project-name/
├── src/                 # Frontend (React + TypeScript)
│   ├── components/      # React components
│   ├── styles/         # CSS styles
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main React app
│   └── main.tsx        # Entry point
├── src-tauri/          # Backend (Rust)
│   ├── src/
│   │   └── main.rs     # Rust application logic
│   ├── icons/          # App icons for different platforms
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
├── public/             # Static assets
└── Configuration files (vite.config.ts, tsconfig.json)
```

#### Flutter Project Structure
```
project-name/
├── lib/                # Dart source code
│   ├── screens/        # Screen widgets
│   ├── widgets/        # Reusable widgets
│   ├── models/         # Data models
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── main.dart       # App entry point
├── test/               # Unit and widget tests
├── assets/             # Images, fonts, and other assets
│   ├── images/
│   └── fonts/
├── android/            # Android-specific code
├── ios/                # iOS-specific code
├── web/                # Web-specific code
├── linux/              # Linux desktop code
├── macos/              # macOS desktop code
├── windows/            # Windows desktop code
└── Configuration files (pubspec.yaml, analysis_options.yaml)
```

## Generator Architecture

### Modular Generators
The project uses a modular architecture with separate generators:

```
src/generators/
├── next-generator.ts      # Next.js project setup with App Router
├── expo-generator.ts      # Expo (React Native) project setup
├── tauri-generator.ts     # Tauri desktop app setup with Rust backend
├── flutter-generator.ts   # Flutter cross-platform project setup
├── database-generator.ts  # Database and ORM configuration (framework-aware)
├── deployment-generator.ts # Deployment setup (Vercel, GitHub Releases, etc.)
├── auth-generator.ts      # Authentication integration (Better Auth, Expo Auth)
└── storage-generator.ts   # Storage provider setup (Blob, S3, R2, Supabase)

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
  framework: 'nextjs' | 'expo' | 'tauri' | 'flutter';
  database: 'none' | 'turso' | 'supabase';
  orm?: 'prisma' | 'drizzle';
  deployment: boolean;
  storage: 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage';
  auth: boolean;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
}
```

## Framework-Specific Requirements

### Next.js
- **Node.js**: 18.18.0 or later
- **Package Manager**: npm, pnpm, yarn, or bun
- **Development Commands**:
  ```bash
  pnpm run dev       # Start development server
  pnpm run build     # Build for production
  pnpm run start     # Start production server
  pnpm run lint      # Run linting
  ```

### Expo (React Native)
- **Node.js**: 18.0.0 or later
- **Expo CLI**: Installed automatically with the project
- **Platform Requirements**:
  - iOS: Xcode (macOS only) for iOS simulator
  - Android: Android Studio or Android SDK
- **Development Commands**:
  ```bash
  pnpm start         # Start Expo development server
  pnpm run ios       # Run on iOS simulator
  pnpm run android   # Run on Android emulator
  pnpm run web       # Run in web browser
  ```

### Tauri
- **Node.js**: 18.0.0 or later
- **Rust**: Latest stable version (install from rustup.rs)
- **Platform Dependencies**:
  - Linux: Various system packages (webkit2gtk, etc.)
  - Windows: WebView2 (usually pre-installed)
  - macOS: Xcode Command Line Tools
- **Development Commands**:
  ```bash
  pnpm run dev       # Start Tauri development mode
  pnpm run build     # Build for production
  pnpm run tauri dev # Alternative dev command
  ```

### Flutter
- **Flutter SDK**: 3.2.0 or later (install from flutter.dev)
- **Dart**: Included with Flutter SDK
- **Platform Requirements**:
  - iOS: Xcode (macOS only)
  - Android: Android Studio with Android SDK
  - Web: Chrome browser
  - Desktop: Platform-specific requirements
- **Development Commands**:
  ```bash
  flutter pub get    # Install dependencies
  flutter run        # Run on connected device
  flutter build apk  # Build Android APK
  flutter build ios  # Build iOS app
  flutter build web  # Build for web
  flutter test       # Run tests
  ```

## Generated Project Features

### Database Integration
- **Turso**: SQLite at the edge with libSQL adapter
  - Prisma with driver adapters preview feature
  - Drizzle with libSQL client
- **Supabase**: PostgreSQL with built-in auth
  - Direct database connection
  - Supabase client SDK integration

### Authentication
- **Next.js (Better Auth)**:
  - Session-based authentication
  - Sign in/Sign up forms
  - Protected routes
  - User management
  - Database schema integration
- **Expo (Expo Auth Session)**:
  - OAuth 2.0 authentication flow
  - Secure token storage
  - Social login integration

### Deployment Features
- **Next.js (Vercel)**:
  - Automatic deployment configuration
  - Environment variable management
  - Deployment scripts for automation
- **Tauri (GitHub Releases)**:
  - Cross-platform desktop binaries
  - Auto-update configuration
  - Release workflow setup
- **Flutter (Store Distribution)**:
  - iOS App Store configuration
  - Google Play Store setup
  - Web deployment options
- **Expo (EAS Build)**:
  - Over-the-air updates
  - Native build service
  - Store submission preparation

### Storage Solutions (Next.js/Expo)
- **Vercel Blob**: Simple file storage with CDN
- **Cloudflare R2**: S3-compatible object storage
- **AWS S3**: Industry-standard object storage
- **Supabase Storage**: Integrated with Supabase auth/database
- Pre-configured upload components and API endpoints

## Testing Infrastructure

### Test Suite
- **Vitest**: Unit and integration testing
- **Playwright**: E2E testing for generated projects
- **Coverage**: Multiple framework and configuration combinations

### Running Tests
```bash
pnpm test              # Run all tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Generate coverage report
```

### Test Matrix
Tests verify:
- Project generation for all frameworks (Next.js, Expo, Tauri, Flutter)
- Framework-specific configurations and features
- Correct dependencies installation
- Build success for generated projects
- Framework-appropriate file structures
- Conditional prompt flows based on framework

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