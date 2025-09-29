import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Tauri用.gitignoreファイルを作成する
 * @param config プロジェクト設定
 */
export async function createTauriGitignore(config: ProjectConfig) {
    const gitignoreContent = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Tauri
/src-tauri/target
/src-tauri/Cargo.lock
`;

    await fs.writeFile(path.join(config.projectPath, '.gitignore'), gitignoreContent);
}
