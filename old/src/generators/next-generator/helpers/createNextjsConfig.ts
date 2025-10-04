/**
 * Next.js設定ファイルと環境変数ファイルを作成するヘルパー関数
 * プロジェクトの基本設定ファイルを生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeEnvironmentFiles } from './writeEnvironmentFiles.js';

/**
 * Next.js設定ファイルと環境変数ファイルを作成する
 * @param config プロジェクト設定
 */
export async function createNextjsConfig(config: ProjectConfig): Promise<void> {
    // Next.js設定ファイル
    const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 必要に応じて実験的な機能を有効化
  },
};

export default nextConfig;
`;

    await fs.writeFile(path.join(config.projectPath, 'next.config.mjs'), nextConfigContent);

    // 環境変数ファイルの生成
    await writeEnvironmentFiles(config);

    // .gitignoreファイル
    const gitignoreContent = `# Dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem
fluorite-cloud.json
env-files.zip
.env*.zip
.storage/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
`;

    await fs.writeFile(path.join(config.projectPath, '.gitignore'), gitignoreContent);
}
