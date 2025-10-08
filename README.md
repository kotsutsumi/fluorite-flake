<div align="center">
  <img src="web/public/fluorite-flake-logo.png" alt="Fluorite-flake" width="200" height="200" />

  # Fluorite-flake 🚀

  [![CI](https://github.com/kotsutsumi/fluorite-flake/actions/workflows/ci.yml/badge.svg)](https://github.com/kotsutsumi/fluorite-flake/actions/workflows/ci.yml)
  [![npm version](https://badge.fury.io/js/fluorite-flake.svg)](https://badge.fury.io/js/fluorite-flake)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

A powerful multi-framework project generator and CLI utility that creates production-ready applications with modern best practices, comprehensive testing, mobile support, and integrated documentation. Now includes advanced resource management, sophisticated spinner controls, and localized user interfaces.

## ✨ Features

- **🎯 Multi-Framework Support**: Create projects with Next.js, Expo (React Native), Tauri v2 (Cross-Platform Desktop + Mobile)
- **📱 Mobile Testing**: Built-in Maestro (Expo) and Patrol (Flutter) E2E testing with CI/CD integration
- **🗄️ Flexible Database Options**: Choose between Turso (SQLite edge), Supabase (PostgreSQL), or local SQLite
- **🔐 Authentication Ready**: Framework-specific auth solutions with Better Auth integration
- **☁️ Storage Solutions**: Multiple storage providers (Vercel Blob, AWS S3, Cloudflare R2, Supabase)
- **🚀 Deployment Ready**: Pre-configured for Vercel, GitHub Releases, and app stores
- **🎨 Design System Ready**: Next.js scaffolds bundle the full shadcn/ui registry and Kibo UI components with Tailwind CSS v4
- **🧪 Comprehensive Testing**: 32 test files covering unit, integration, and E2E testing
- **📚 Documentation Site**: Integrated Next.js documentation site with Nextra and i18n support
- **🔄 Resource Management**: Advanced cleanup and resource discovery capabilities
- **⚡ Spinner Control**: Sophisticated progress indication with conflict resolution
- **🌍 Internationalization**: Native support for English and Japanese with automatic locale detection
- **🛠️ Developer Experience**: Enhanced debugging, logging, and development workflow tools

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

> ℹ️ **Locale**: CLI output follows your OS locale (Japanese or English). Override it with `-L, --locale <en|ja>` or set `FLUORITE_LOCALE` when testing.

The CLI will guide you through:

1. **Framework Selection**: Next.js, Expo, Tauri, or Flutter
2. **Project Configuration**: Name, database, authentication, storage
3. **Deployment Setup**: Platform-specific deployment configurations
4. **Package Manager**: Choose your preferred package manager

## 📚 Framework Features

### Next.js

- **App Router**: Modern React Server Components and streaming
- **Database Support**: Prisma or Drizzle ORM with Turso/Supabase/SQLite
- **Authentication**: Better Auth integration with session management and organization support
- **Storage**: Multiple providers with pre-built upload components
- **Styling**: Tailwind CSS v4 with shadcn/ui plus the full Kibo UI component library
- **Deployment**: Vercel-optimized configuration
- **Templates**: Standard TypeScript, App Router, Pages Router, and Full-Stack Admin

### Expo (React Native)

- **Cross-Platform**: iOS, Android, and Web support
- **Navigation**: Expo Router with file-based routing
- **State Management**: Jotai for reactive state
- **Testing**: Maestro E2E tests with comprehensive `.maestro/` test flows
- **Database**: Drizzle ORM with Turso or Supabase client
- **Native Features**: Camera, location, push notifications ready
- **Templates**: TypeScript, Tabs Navigation, Stack Navigation, Full-Stack GraphQL

### Tauri v2 (Cross-Platform)

- **Desktop + Mobile**: Unified codebase for Windows, macOS, Linux, iOS, Android
- **Performance**: Rust backend + React frontend with native performance
- **Auto-Updates**: GitHub Releases integration with security
- **Security**: Secure IPC and system access with fine-grained permissions
- **Small Bundles**: ~10MB desktop installers, native mobile apps
- **Templates**: TypeScript, React, Vanilla, Desktop-Only, Desktop-Admin, Cross-Platform

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
# 全テスト実行（推奨）
pnpm test:all

# ユニットテスト・統合テスト（ウォッチモード）
pnpm test

# ユニットテスト・統合テスト（1回実行）
pnpm test:run

# カバレッジ付きテスト
pnpm test:coverage

# E2Eテスト（ウォッチモード）
pnpm test:e2e

# E2Eテスト（1回実行）
pnpm test:e2e:run

# 特定プロジェクトのテスト
pnpm test --project unit           # ユニットテストのみ
pnpm test --project integration    # 統合テストのみ
```

#### テスト種別と実行範囲

| コマンド             | 対象            | ファイル数 | 実行時間 | カバレッジ |
| -------------------- | --------------- | ---------- | -------- | ---------- |
| `pnpm test:all`      | 全テスト        | 32ファイル | 約40秒   | 完全       |
| `pnpm test:run`      | ユニット + 統合 | 29ファイル | 約35秒   | 高         |
| `pnpm test:e2e:run`  | E2E             | 3ファイル  | 約10秒   | E2E        |
| `pnpm test:coverage` | カバレッジ付き  | 29ファイル | 約40秒   | 詳細       |

#### 新機能のテスト

- **リソース管理**: `src/utils/resource-manager/` の完全テストカバレッジ
- **スピナー制御**: `src/utils/spinner-control/` の競合状況テスト
- **国際化**: 英語・日本語のメッセージバリデーション
- **環境変数暗号化**: セキュアな暗号化・復号化テスト
- **GitHub CLI統合**: 認証、リポジトリ操作、エラーハンドリング
- **Turso/Supabase CLI**: データベースプロビジョニングと認証

### CI/CD

The project includes comprehensive GitHub Actions workflows:

- **CI**: Runs on every PR (lint, format, build, unit tests)
- **E2E**: Automated E2E testing for all frameworks
- **Release**: Automatic npm publishing on releases
- **Publish**: Auto-publish to npm on main branch

## 🛠️ Development

### Prerequisites

- **Node.js**: 20.0.0 or later (required)
- **pnpm**: 9.0.0 or later (recommended)
- **Optional (for testing and advanced features)**:
  - Rust toolchain (for Tauri v2 cross-platform projects)
  - Maestro CLI (for Expo mobile testing)
  - GitHub CLI (for repository operations)
  - Turso CLI (for Turso database management)
  - Supabase CLI (for Supabase database management)

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
# Development
pnpm dev         # Run CLI in development mode with debug output
pnpm build       # Build TypeScript to dist/ and copy templates

# Testing
pnpm test        # Run unit tests in watch mode
pnpm test:run    # Run all unit and integration tests once
pnpm test:e2e    # Run E2E tests in watch mode
pnpm test:all    # Run complete test suite (unit + integration + E2E)
pnpm test:coverage # Run tests with detailed coverage report

# Code Quality
pnpm lint        # Lint with Ultracite (Biome)
pnpm format      # Format with Ultracite (Biome)
pnpm check       # Run lint and format checks

# Documentation Site
cd web && pnpm dev    # Run documentation site locally
cd web && pnpm build  # Build documentation for deployment
```

## 🌐 Documentation Site

Fluorite-flake includes an integrated documentation site built with Next.js and Nextra:

```bash
# Run documentation site locally
cd web
pnpm install
pnpm dev  # Available at http://localhost:3000
```

### Documentation Features

- **Multi-language Support**: English and Japanese with automatic locale detection
- **Modern Design**: Built with Nextra theme and responsive design
- **Static Export**: Optimized for GitHub Pages and CDN deployment
- **Search Integration**: Full-text search with multi-language support
- **Interactive Examples**: Live code examples and API documentation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. Run `pnpm check` before committing (lint + format)
2. Ensure all tests pass: `pnpm test:all` (32 test files)
3. For new features, add appropriate tests with Japanese comments
4. Update documentation as needed (both README and web docs)
5. Test resource management and spinner control features
6. Verify internationalization for new user-facing strings

## 📄 License

MIT © Fluorite-flake Contributors

## 🙏 Acknowledgments

- Built with TypeScript and modern web technologies
- Inspired by create-t3-app, create-expo-app, and other great generators
- Mobile testing powered by Maestro and Patrol
- Documentation powered by Nextra and Next.js
- Code quality maintained with Ultracite (Biome)
- Testing infrastructure built on Vitest and Playwright
- Database solutions: Turso (SQLite edge), Supabase (PostgreSQL)
- UI components: shadcn/ui and Kibo UI with Tailwind CSS v4

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/kotsutsumi/fluorite-flake/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kotsutsumi/fluorite-flake/discussions)

---

Made with ❤️ by the Fluorite-flake team

<!-- EOF -->
