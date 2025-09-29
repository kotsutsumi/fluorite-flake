import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../commands/create/types.js';
import { createScopedLogger } from '../utils/logger.js';
import { readTemplate } from '../utils/template-reader.js';
import { generateNextProject } from './next-generator.js';
import { generateExpoProject } from './expo-generator.js';
import { generateFlutterProject } from './flutter-generator.js';
import { generateTauriProject } from './tauri-generator.js';

// Monorepoジェネレーター用のロガーを作成
const logger = createScopedLogger('monorepo');

export interface MonorepoConfig extends ProjectConfig {
    isMonorepo: true;
    workspaceTool: 'turborepo' | 'nx' | 'pnpm-workspace';
    includeBackend: boolean;
    frontendFramework: 'expo' | 'flutter' | 'tauri';
    backendConfig?: ProjectConfig;
    frontendConfig?: ProjectConfig;
}

/**
 * Monorepoプロジェクトを生成するメイン関数
 * @param config Monorepo設定
 */
export async function generateMonorepoProject(config: MonorepoConfig) {
    logger.info('Creating monorepo project structure...');

    // プロジェクトディレクトリの確保
    await fs.ensureDir(config.projectPath);

    // Workspace構成の作成
    await createWorkspaceStructure(config);

    // Backend (Next.js) の生成
    if (config.includeBackend && config.backendConfig) {
        logger.info('Generating backend (Next.js) application...');
        await generateNextProjectForMonorepo(config);
        await setupGraphQLBackend(config);
    }

    // Frontend の生成
    if (config.frontendConfig) {
        logger.info(`Generating frontend (${config.frontendFramework}) application...`);

        switch (config.frontendFramework) {
            case 'expo':
                await generateExpoProjectForMonorepo(config);
                break;
            case 'flutter':
                await generateFlutterProjectForMonorepo(config);
                break;
            case 'tauri':
                await generateTauriProjectForMonorepo(config);
                break;
        }

        await setupGraphQLClient(config, config.frontendFramework);
    }

    // 共有パッケージの作成
    await createSharedPackages(config);

    // ルートpackage.jsonの生成
    await createRootPackageJson(config);

    // Workspace設定ファイルの生成
    await createWorkspaceConfig(config);

    // 開発スクリプトの追加
    await setupDevelopmentScripts(config);

    logger.success('Monorepo project created successfully!');
}

/**
 * Workspace構造を作成する
 */
async function createWorkspaceStructure(config: MonorepoConfig) {
    const dirs = [
        path.join(config.projectPath, 'apps'),
        path.join(config.projectPath, 'packages'),
        path.join(config.projectPath, 'packages', 'graphql-types'),
        path.join(config.projectPath, 'packages', 'shared-types'),
        path.join(config.projectPath, 'packages', 'config'),
    ];

    for (const dir of dirs) {
        await fs.ensureDir(dir);
    }
}

/**
 * Monorepo用にNext.jsプロジェクトを生成
 */
async function generateNextProjectForMonorepo(config: MonorepoConfig) {
    // GraphQL対応の設定を追加
    const enhancedConfig = {
        ...config,
        graphql: true,
        adminPanel: true,
    };

    // 既存のNext.jsジェネレーターを利用
    await generateNextProject(enhancedConfig);
}

/**
 * GraphQL バックエンドのセットアップ
 */
async function setupGraphQLBackend(config: MonorepoConfig) {
    const backendPath = config.projectPath;

    // GraphQL関連の依存関係を追加
    const graphqlDeps = {
        '@apollo/server': '^4.9.5',
        graphql: '^16.8.1',
        'graphql-scalars': '^1.22.4',
        '@graphql-tools/schema': '^10.0.2',
        'graphql-tag': '^2.12.6',
    };

    const devDeps = {
        '@graphql-codegen/cli': '^5.0.0',
        '@graphql-codegen/typescript': '^4.0.1',
        '@graphql-codegen/typescript-resolvers': '^4.0.1',
        '@graphql-codegen/typescript-operations': '^4.0.1',
    };

    // package.jsonの更新
    const packageJsonPath = path.join(backendPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.dependencies = { ...packageJson.dependencies, ...graphqlDeps };
    packageJson.devDependencies = { ...packageJson.devDependencies, ...devDeps };

    // GraphQL関連スクリプトの追加
    packageJson.scripts = {
        ...packageJson.scripts,
        codegen: 'graphql-codegen',
        'codegen:watch': 'graphql-codegen --watch',
    };

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // GraphQL設定ファイルとスキーマを作成
    await createGraphQLFiles(backendPath, config);
}

/**
 * GraphQL関連ファイルの作成
 */
async function createGraphQLFiles(backendPath: string, _config: MonorepoConfig) {
    // GraphQL スキーマディレクトリ
    const graphqlDir = path.join(backendPath, 'lib', 'graphql');
    await fs.ensureDir(graphqlDir);

    // GraphQL スキーマファイル
    const schemaContent = await readTemplate('graphql/schema.graphql.template');
    await fs.writeFile(path.join(graphqlDir, 'schema.graphql'), schemaContent);

    // リゾルバーファイル
    const resolversContent = await readTemplate('graphql/resolvers.ts.template');
    await fs.writeFile(path.join(graphqlDir, 'resolvers.ts'), resolversContent);

    // GraphQL APIルート
    const apiDir = path.join(backendPath, 'app', 'api', 'graphql');
    await fs.ensureDir(apiDir);

    const routeContent = await readTemplate('graphql/route.ts.template');
    await fs.writeFile(path.join(apiDir, 'route.ts'), routeContent);

    // GraphQL Codegen設定
    const codegenConfig = await readTemplate('graphql/codegen.yml.template');
    await fs.writeFile(path.join(backendPath, 'codegen.yml'), codegenConfig);
}

/**
 * Monorepo用にExpoプロジェクトを生成
 */
async function generateExpoProjectForMonorepo(config: MonorepoConfig) {
    await generateExpoProject(config);
}

/**
 * Monorepo用にFlutterプロジェクトを生成
 */
async function generateFlutterProjectForMonorepo(config: MonorepoConfig) {
    await generateFlutterProject(config);
}

/**
 * Monorepo用にTauriプロジェクトを生成
 */
async function generateTauriProjectForMonorepo(config: MonorepoConfig) {
    await generateTauriProject(config);
}

/**
 * GraphQLクライアントのセットアップ
 */
async function setupGraphQLClient(config: MonorepoConfig, framework: 'expo' | 'flutter' | 'tauri') {
    const frontendPath = config.projectPath;

    switch (framework) {
        case 'expo':
            await setupExpoGraphQLClient(frontendPath);
            break;
        case 'flutter':
            await setupFlutterGraphQLClient(frontendPath);
            break;
        case 'tauri':
            await setupTauriGraphQLClient(frontendPath);
            break;
    }
}

/**
 * Expo用GraphQLクライアントのセットアップ
 */
async function setupExpoGraphQLClient(frontendPath: string) {
    // Apollo Client関連の依存関係を追加
    const apolloDeps = {
        '@apollo/client': '^3.8.8',
        graphql: '^16.8.1',
    };

    const packageJsonPath = path.join(frontendPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.dependencies = { ...packageJson.dependencies, ...apolloDeps };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // GraphQLクライアント設定ファイルを作成
    const graphqlDir = path.join(frontendPath, 'src', 'graphql');
    await fs.ensureDir(graphqlDir);

    const clientContent = await readTemplate('expo/graphql-client.ts.template');
    await fs.writeFile(path.join(graphqlDir, 'client.ts'), clientContent);

    // 認証関連のクエリ/ミューテーション
    const authQueriesContent = await readTemplate('expo/auth-queries.ts.template');
    await fs.writeFile(path.join(graphqlDir, 'auth-queries.ts'), authQueriesContent);
}

/**
 * Flutter用GraphQLクライアントのセットアップ
 */
async function setupFlutterGraphQLClient(frontendPath: string) {
    // pubspec.yamlの更新
    const pubspecPath = path.join(frontendPath, 'pubspec.yaml');
    const pubspecContent = await fs.readFile(pubspecPath, 'utf-8');

    // GraphQL関連の依存関係を追加
    const updatedPubspec = pubspecContent.replace(
        'dependencies:',
        `dependencies:
  graphql_flutter: ^5.1.2
  flutter_secure_storage: ^9.0.0`
    );

    await fs.writeFile(pubspecPath, updatedPubspec);

    // GraphQLクライアント設定ファイルを作成
    const graphqlDir = path.join(frontendPath, 'lib', 'graphql');
    await fs.ensureDir(graphqlDir);

    const clientContent = await readTemplate('flutter/graphql_client.dart.template');
    await fs.writeFile(path.join(graphqlDir, 'graphql_client.dart'), clientContent);

    // 認証関連のクエリ/ミューテーション
    const authQueriesContent = await readTemplate('flutter/auth_queries.dart.template');
    await fs.writeFile(path.join(graphqlDir, 'auth_queries.dart'), authQueriesContent);
}

/**
 * Tauri用GraphQLクライアントのセットアップ
 */
async function setupTauriGraphQLClient(frontendPath: string) {
    // Apollo Client関連の依存関係を追加（Reactベースの場合）
    const apolloDeps = {
        '@apollo/client': '^3.8.8',
        graphql: '^16.8.1',
    };

    const packageJsonPath = path.join(frontendPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.dependencies = { ...packageJson.dependencies, ...apolloDeps };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // GraphQLクライアント設定ファイルを作成
    const graphqlDir = path.join(frontendPath, 'src', 'graphql');
    await fs.ensureDir(graphqlDir);

    const clientContent = await readTemplate('tauri/graphql-client.ts.template');
    await fs.writeFile(path.join(graphqlDir, 'client.ts'), clientContent);

    // 認証関連のクエリ/ミューテーション
    const authQueriesContent = await readTemplate('tauri/auth-queries.ts.template');
    await fs.writeFile(path.join(graphqlDir, 'auth-queries.ts'), authQueriesContent);
}

/**
 * 共有パッケージの作成
 */
async function createSharedPackages(config: MonorepoConfig) {
    // GraphQL Types package
    const graphqlTypesPath = path.join(config.projectPath, 'packages', 'graphql-types');
    const graphqlTypesPackageJson = {
        name: '@monorepo/graphql-types',
        version: '1.0.0',
        private: true,
        main: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: {
            build: 'tsc',
            clean: 'rm -rf dist',
        },
        devDependencies: {
            typescript: '^5.3.3',
        },
    };
    await fs.writeJSON(path.join(graphqlTypesPath, 'package.json'), graphqlTypesPackageJson, {
        spaces: 2,
    });

    // TypeScript設定
    const tsConfig = {
        compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            lib: ['ES2020'],
            declaration: true,
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
        },
        include: ['src'],
        exclude: ['node_modules', 'dist'],
    };
    await fs.writeJSON(path.join(graphqlTypesPath, 'tsconfig.json'), tsConfig, { spaces: 2 });

    // srcディレクトリとindex.ts
    await fs.ensureDir(path.join(graphqlTypesPath, 'src'));
    await fs.writeFile(
        path.join(graphqlTypesPath, 'src', 'index.ts'),
        '// 生成されたGraphQL型定義がここに置かれます\n'
    );

    // Shared Types package
    const sharedTypesPath = path.join(config.projectPath, 'packages', 'shared-types');
    const sharedTypesPackageJson = {
        name: '@monorepo/shared-types',
        version: '1.0.0',
        private: true,
        main: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: {
            build: 'tsc',
            clean: 'rm -rf dist',
        },
        devDependencies: {
            typescript: '^5.3.3',
        },
    };
    await fs.writeJSON(path.join(sharedTypesPath, 'package.json'), sharedTypesPackageJson, {
        spaces: 2,
    });
    await fs.writeJSON(path.join(sharedTypesPath, 'tsconfig.json'), tsConfig, { spaces: 2 });
    await fs.ensureDir(path.join(sharedTypesPath, 'src'));
    await fs.writeFile(
        path.join(sharedTypesPath, 'src', 'index.ts'),
        '// 共有型定義がここに置かれます\n'
    );

    // Config package
    const configPath = path.join(config.projectPath, 'packages', 'config');
    const configPackageJson = {
        name: '@monorepo/config',
        version: '1.0.0',
        private: true,
        files: ['*.js', '*.json'],
    };
    await fs.writeJSON(path.join(configPath, 'package.json'), configPackageJson, { spaces: 2 });
}

/**
 * ルートpackage.jsonの作成
 */
async function createRootPackageJson(config: MonorepoConfig) {
    const rootPackageJson = {
        name: config.projectName,
        version: '0.0.1',
        private: true,
        workspaces: ['apps/*', 'packages/*'],
        scripts: {
            dev: config.workspaceTool === 'turborepo' ? 'turbo dev' : 'nx run-many --target=dev',
            build:
                config.workspaceTool === 'turborepo' ? 'turbo build' : 'nx run-many --target=build',
            lint: config.workspaceTool === 'turborepo' ? 'turbo lint' : 'nx run-many --target=lint',
            test: config.workspaceTool === 'turborepo' ? 'turbo test' : 'nx run-many --target=test',
            'dev:backend': `${config.packageManager} --filter=backend dev`,
            'dev:frontend': `${config.packageManager} --filter=frontend dev`,
            'build:backend': `${config.packageManager} --filter=backend build`,
            'build:frontend': `${config.packageManager} --filter=frontend build`,
            clean: 'rm -rf apps/*/node_modules packages/*/node_modules node_modules',
        },
        devDependencies: {
            ...(config.workspaceTool === 'turborepo' && { turbo: '^1.11.3' }),
            ...(config.workspaceTool === 'nx' && { nx: '^17.2.8' }),
            prettier: '^3.1.1',
            typescript: '^5.3.3',
        },
        packageManager: `${config.packageManager}@latest`,
    };

    await fs.writeJSON(path.join(config.projectPath, 'package.json'), rootPackageJson, {
        spaces: 2,
    });
}

/**
 * Workspace設定ファイルの作成
 */
async function createWorkspaceConfig(config: MonorepoConfig) {
    if (config.workspaceTool === 'turborepo') {
        const turboConfig = {
            $schema: 'https://turbo.build/schema.json',
            globalDependencies: ['**/.env.*local'],
            pipeline: {
                build: {
                    dependsOn: ['^build'],
                    outputs: ['.next/**', '!.next/cache/**', 'dist/**'],
                },
                dev: {
                    cache: false,
                    persistent: true,
                },
                lint: {},
                test: {},
            },
        };
        await fs.writeJSON(path.join(config.projectPath, 'turbo.json'), turboConfig, { spaces: 2 });
    } else if (config.workspaceTool === 'nx') {
        const nxConfig = {
            extends: 'nx/presets/npm.json',
            tasksRunnerOptions: {
                default: {
                    runner: 'nx/tasks-runners/default',
                    options: {
                        cacheableOperations: ['build', 'lint', 'test'],
                    },
                },
            },
        };
        await fs.writeJSON(path.join(config.projectPath, 'nx.json'), nxConfig, { spaces: 2 });
    }

    // PNPM workspace設定（PNPM使用時）
    if (config.packageManager === 'pnpm') {
        const pnpmWorkspace = `packages:
  - 'apps/*'
  - 'packages/*'
`;
        await fs.writeFile(path.join(config.projectPath, 'pnpm-workspace.yaml'), pnpmWorkspace);
    }
}

/**
 * 開発スクリプトのセットアップ
 */
async function setupDevelopmentScripts(config: MonorepoConfig) {
    // .gitignore
    const gitignoreContent = `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
.next/
out/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment variables
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# Turborepo
.turbo/

# Nx
.nx/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Mobile
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.expo/

# Flutter
**/doc/api/
**/ios/Flutter/.last_build_id
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
/build/

# Tauri
src-tauri/target/
`;
    await fs.writeFile(path.join(config.projectPath, '.gitignore'), gitignoreContent);

    // README.md
    const readmeContent = `# ${config.projectName}

A monorepo project with backend API and ${config.frontendFramework} frontend.

## Structure

\`\`\`
apps/
  backend/     - Next.js backend with GraphQL API and admin panel
  frontend/    - ${config.frontendFramework} application
packages/
  graphql-types/  - Generated GraphQL types
  shared-types/   - Shared TypeScript types
  config/         - Shared configurations
\`\`\`

## Getting Started

### Prerequisites

- Node.js 20+
- ${config.packageManager}
${config.frontendFramework === 'flutter' ? '- Flutter SDK' : ''}
${config.frontendFramework === 'tauri' ? '- Rust' : ''}

### Installation

\`\`\`bash
${config.packageManager} install
\`\`\`

### Development

Start all applications:
\`\`\`bash
${config.packageManager} run dev
\`\`\`

Start specific app:
\`\`\`bash
${config.packageManager} run dev:backend
${config.packageManager} run dev:frontend
\`\`\`

### Build

Build all applications:
\`\`\`bash
${config.packageManager} run build
\`\`\`

## Environment Variables

### Backend (.env.local)
\`\`\`env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:3000/api/graphql
\`\`\`

### Frontend (.env)
\`\`\`env
${config.frontendFramework === 'expo' ? 'EXPO_PUBLIC_API_URL=http://localhost:3000' : ''}
${config.frontendFramework === 'expo' ? 'EXPO_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:3000/api/graphql' : ''}
${config.frontendFramework === 'flutter' ? 'API_URL=http://localhost:3000' : ''}
${config.frontendFramework === 'tauri' ? 'VITE_API_URL=http://localhost:3000' : ''}
\`\`\`

## Technologies

- **Backend**: Next.js, GraphQL (Apollo Server), BetterAuth, ${config.database === 'turso' ? 'Turso' : 'Supabase'}
- **Frontend**: ${config.frontendFramework}
- **Monorepo Tool**: ${config.workspaceTool}
- **Package Manager**: ${config.packageManager}
`;
    await fs.writeFile(path.join(config.projectPath, 'README.md'), readmeContent);
}
