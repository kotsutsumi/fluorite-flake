/**
 * `generatePackageJson` がプロジェクト設定に応じた依存関係とスクリプトを出力できるか検証するユニットテスト。
 * 選択された機能 (データベース・ストレージ・認証など) を反映した package.json がテンポラリディレクトリに生成されることを確認する。
 */
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import type { ProjectConfig } from '../../../src/commands/create/types.js';
import { generatePackageJson } from '../../../src/utils/package-json.js';

const baseConfig: ProjectConfig = {
    projectName: 'feature-app',
    projectPath: '',
    framework: 'nextjs',
    database: 'turso',
    orm: 'prisma',
    deployment: true,
    storage: 'vercel-blob',
    auth: true,
    packageManager: 'pnpm',
};

// package.json 生成ロジックが機能選択を正しく反映するか確認するテスト
describe('generatePackageJson', () => {
    // フル機能構成で必要な依存関係と devDependencies が書き出されることを検証する
    it('writes package.json with selected features', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'pkgjson-'));
        const config = { ...baseConfig, projectPath: dir };

        await generatePackageJson(config);

        const pkg = await fs.readJSON(path.join(dir, 'package.json'));
        expect(pkg.name).toBe('feature-app');
        expect(pkg.dependencies.next).toBeDefined();
        expect(pkg.dependencies['@vercel/blob']).toBeDefined();
        expect(pkg.dependencies['@vercel/analytics']).toBeDefined();
        expect(pkg.dependencies['better-auth']).toBeDefined();
        expect(pkg.devDependencies.prisma).toBeDefined();
    });
});
