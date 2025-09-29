/**
 * 開発スクリプトをセットアップするヘルパー関数
 * .gitignoreとREADME.mdファイルを作成する
 */

import path from 'node:path';
import fs from 'fs-extra';

import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * 開発スクリプトのセットアップ
 */
export async function setupDevelopmentScripts(config: MonorepoConfig) {
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
