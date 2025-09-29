import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Expo用.gitignoreファイルを作成する
 * Expo開発で生成される一時ファイル、ビルド成果物、機密情報を含むファイルを除外設定
 * @param config プロジェクト設定
 */
export async function createExpoGitignore(config: ProjectConfig) {
    const gitignoreContent = `# Learn more https://docs.github.io/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo
`;

    await fs.writeFile(path.join(config.projectPath, '.gitignore'), gitignoreContent);
}
