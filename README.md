# Fluorite-flake 🚀

[![CI](https://github.com/kotsutsumi/fluorite-flake/actions/workflows/ci.yml/badge.svg)](https://github.com/kotsutsumi/fluorite-flake/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/kotsutsumi/fluorite-flake/actions/workflows/e2e.yml/badge.svg)](https://github.com/kotsutsumi/fluorite-flake/actions/workflows/e2e.yml)
[![npm version](https://badge.fury.io/js/fluorite-flake.svg)](https://badge.fury.io/js/fluorite-flake)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful multi-framework project generator and CLI utility that creates production-ready applications with modern best practices, comprehensive testing, and mobile support.

## ✨ Features

- **🎯 Multi-Framework Support**: Create projects with Next.js, Expo (React Native), Tauri (Desktop), or Flutter
- **📱 Mobile Testing**: Built-in Maestro (Expo) and Patrol (Flutter) E2E testing
- **🗄️ Flexible Database Options**: Choose between Turso (SQLite edge) or Supabase (PostgreSQL)
- **🔐 Authentication Ready**: Framework-specific auth solutions pre-configured
- **☁️ Storage Solutions**: Multiple storage providers (Vercel Blob, AWS S3, Cloudflare R2, Supabase)
- **🚀 Deployment Ready**: Pre-configured for Vercel, GitHub Releases, and app stores
- **🎨 Design System Ready**: Next.js scaffolds bundle the full shadcn/ui registry and Kibo UI components with Tailwind CSS v4
- **🧪 Comprehensive Testing**: Unit tests, E2E tests, and mobile testing support

## 📦 Installation

```bash
# Install globally
npm install -g fluorite-flake

# Or use directly with npx
npx fluorite-flake create

# Or with pnpm
pnpm add -g fluorite-flake
```

## 🚀 Quick Start

### Create a New Project

```bash
# Interactive mode (recommended)
fluorite-flake create

# Or use the alias
fluorite-flake new
```

The CLI will guide you through:
1. **Framework Selection**: Next.js, Expo, Tauri, or Flutter
2. **Project Configuration**: Name, database, authentication, storage
3. **Deployment Setup**: Platform-specific deployment configurations
4. **Package Manager**: Choose your preferred package manager

## 📚 Framework Features

### Next.js
- **App Router**: Modern React Server Components and streaming
- **Database Support**: Prisma or Drizzle ORM with Turso/Supabase
- **Authentication**: Better Auth integration with session management
- **Storage**: Multiple providers with pre-built upload components
- **Styling**: Tailwind CSS v4 with shadcn/ui plus the full Kibo UI component library
- **Deployment**: Vercel-optimized configuration

### Expo (React Native)
- **Cross-Platform**: iOS, Android, and Web support
- **Navigation**: Expo Router with file-based routing
- **State Management**: Jotai for reactive state
- **Testing**: Maestro E2E tests with `.maestro/` test flows
- **Database**: Drizzle ORM with Turso or Supabase client
- **Native Features**: Camera, location, push notifications ready

### Tauri
- **Desktop Apps**: Rust backend + React frontend
- **Cross-Platform**: Windows, macOS, Linux support
- **Auto-Updates**: GitHub Releases integration
- **Security**: Secure IPC and system access
- **Small Bundles**: ~10MB installers
- **Native Performance**: Direct OS integration

### Flutter
- **Native Performance**: Compiled to native ARM/x64 code
- **Rich UI**: Material Design 3 with dynamic theming
- **Navigation**: Go Router for declarative routing
- **Testing**: Patrol E2E tests with native automation
- **State Management**: Provider pattern
- **Hot Reload**: Instant UI updates during development

## 📱 Mobile Testing

### Maestro (Expo Projects)

Generated Expo projects include Maestro test flows:

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run tests
cd your-expo-project
maestro test .maestro/smoke-test.yaml
maestro test .maestro/navigation-test.yaml
maestro test .maestro/  # Run all tests
```

Generated test files:
- `smoke-test.yaml` - Basic app launch verification
- `navigation-test.yaml` - Tab navigation testing
- `auth-test.yaml` - Authentication flow (if auth enabled)
- `ci-test-suite.yaml` - CI/CD automation suite

### Patrol (Flutter Projects)

Generated Flutter projects include Patrol integration tests:

```bash
# Install Patrol CLI
dart pub global activate patrol_cli

# Bootstrap Patrol (one-time setup)
cd your-flutter-project
patrol bootstrap

# Run tests
patrol test --target integration_test/app_test.dart
patrol test --target integration_test/smoke_test.dart
```

Generated test files:
- `app_test.dart` - Comprehensive app testing
- `smoke_test.dart` - Quick smoke tests
- `ci_test_suite.dart` - CI-specific tests

## 🏗️ Generated Project Structures

### Next.js Structure
```
my-nextjs-app/
├── src/
│   ├── app/              # App Router pages
│   │   └── api/         # API routes (auth, upload)
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── auth/        # Auth components
│   ├── lib/             # Utilities and configs
│   └── styles/          # Global styles
├── prisma/              # Prisma schema (if selected)
├── drizzle/             # Drizzle config (if selected)
├── public/              # Static assets
└── scripts/             # Deployment scripts
```

### Expo Structure
```
my-expo-app/
├── app/                 # Expo Router navigation
│   ├── (tabs)/         # Tab navigation screens
│   ├── _layout.tsx     # Root layout
│   └── +not-found.tsx  # 404 screen
├── components/          # React Native components
├── hooks/              # Custom React hooks
├── assets/             # Images and fonts
├── .maestro/           # Maestro E2E test flows
│   ├── smoke-test.yaml
│   ├── navigation-test.yaml
│   └── config.yaml
└── expo-env.d.ts       # TypeScript definitions
```

### Flutter Structure
```
my-flutter-app/
├── lib/
│   ├── main.dart       # App entry point
│   ├── screens/        # Screen widgets
│   ├── widgets/        # Reusable widgets
│   ├── models/         # Data models
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
├── integration_test/   # Patrol E2E tests
│   ├── app_test.dart
│   └── smoke_test.dart
├── test/              # Unit/widget tests
├── assets/            # Images and fonts
├── patrol.yaml        # Patrol configuration
└── pubspec.yaml       # Dependencies
```

## 🧪 Testing

### Running Tests (Development)

```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:coverage

# E2E tests (all frameworks)
pnpm test:e2e

# E2E tests (specific framework)
pnpm test:e2e:nextjs
pnpm test:e2e:expo
pnpm test:e2e:tauri
pnpm test:e2e:flutter

# Local E2E testing with options
./scripts/test-local.sh --framework expo --mobile
./scripts/test-local.sh --headed --keep --debug
```

### CI/CD

The project includes comprehensive GitHub Actions workflows:

- **CI**: Runs on every PR (lint, format, build, unit tests)
- **E2E**: Automated E2E testing for all frameworks
- **Release**: Automatic npm publishing on releases
- **Publish**: Auto-publish to npm on main branch

## 🛠️ Development

### Prerequisites

- **Node.js**: 18.0.0 or later
- **pnpm**: 9.0.0 or later (recommended)
- **Optional (for testing)**:
  - Flutter SDK (for Flutter projects)
  - Rust toolchain (for Tauri projects)
  - Maestro CLI (for Expo mobile testing)
  - Patrol CLI (for Flutter mobile testing)

### Setup

```bash
# Clone the repository
git clone https://github.com/kotsutsumi/fluorite-flake.git
cd fluorite-flake

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run in development mode
pnpm dev
```

### Development Commands

```bash
pnpm dev         # Run CLI in development mode
pnpm build       # Build TypeScript to dist/
pnpm test        # Run unit tests
pnpm test:e2e    # Run E2E tests
pnpm lint        # Lint with Biome
pnpm format      # Format with Biome
pnpm check       # Run lint and format checks
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. Run `pnpm check` before committing
2. Ensure all tests pass: `pnpm test`
3. For new features, add appropriate tests
4. Update documentation as needed

## 📄 License

MIT © Fluorite-flake Contributors

## 🙏 Acknowledgments

- Built with TypeScript and modern web technologies
- Inspired by create-t3-app, create-expo-app, and other great generators
- Mobile testing powered by Maestro and Patrol

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/kotsutsumi/fluorite-flake/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kotsutsumi/fluorite-flake/discussions)

---

Made with ❤️ by the Fluorite-flake team