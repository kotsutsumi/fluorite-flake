/**
 * ファイル生成ユーティリティ群 (`file-generation`) の挙動を網羅的に検証するユニットテスト。
 * 設定ファイルやコードファイル、テンプレートレンダリング、package.json のマージ、.env/.gitignore 出力など
 * CLI 生成物の基本動作をテンポラリディレクトリ上で再現し、形式や並び順が期待どおりであるかを確認する。
 */
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import {
    GITIGNORE_PATTERNS,
    mergePackageJson,
    processTemplate,
    processTemplateFile,
    writeCodeFile,
    writeConfigFile,
    writeEnvFile,
    writeGitIgnore,
} from '../../../src/utils/file-generation.js';

// ファイル生成関連のユーティリティをケース別に検証するテストスイート
describe('file-generation utilities', () => {
    // JSON 設定ファイルをソート済みキーと指定スペースで出力できることを確認する
    it('writes config files with sorted keys when requested', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'filegen-'));
        const filePath = path.join(dir, 'config.json');

        await writeConfigFile(filePath, { b: 1, a: { z: 2, y: 1 } }, { sortKeys: true, spaces: 4 });
        const data = await fs.readJSON(filePath);

        expect(Object.keys(data)).toEqual(['a', 'b']);
        expect(await readFile(filePath, 'utf-8')).toContain('    ');
    });

    // ヘッダーコメント付きでコードファイルを書き出せることを検証する
    it('writes code files with optional header', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'filegen-'));
        const filePath = path.join(dir, 'index.ts');

        await writeCodeFile(filePath, 'export const value = 1;', {
            addHeader: true,
            headerComment: '/** header */\n',
        });

        const content = await readFile(filePath, 'utf-8');
        expect(content.startsWith('/** header */'));
        expect(content).toContain('export const value = 1;');
    });

    // テンプレート文字列およびファイルの処理が期待どおり置換されることを確認する
    it('processes templates and template files', async () => {
        const rendered = processTemplate('Hello {{name}}', { name: 'World' });
        expect(rendered).toBe('Hello World');

        const dir = await mkdtemp(path.join(os.tmpdir(), 'filegen-'));
        const templatePath = path.join(dir, 'template.txt');
        await fs.writeFile(templatePath, 'Value: {{value}}');
        const outputPath = path.join(dir, 'out.txt');

        await processTemplateFile(templatePath, { value: 42 }, outputPath);
        expect(await readFile(outputPath, 'utf-8')).toBe('Value: 42');
    });

    // 既存の package.json と差分マージできることを検証し、上書きと保持が両立するか確認する
    it('merges package.json content', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'filegen-'));
        const pkgPath = path.join(dir, 'package.json');
        await fs.writeJSON(pkgPath, { name: 'demo', dependencies: { react: '^18.0.0' } });

        await mergePackageJson(dir, {
            dependencies: { next: '^15.0.0' },
            devDependencies: { typescript: '^5.0.0' },
            scripts: { dev: 'next dev' },
        });

        const merged = await fs.readJSON(pkgPath);
        expect(merged.dependencies.next).toBe('^15.0.0');
        expect(merged.dependencies.react).toBe('^18.0.0');
        expect(merged.devDependencies.typescript).toBe('^5.0.0');
        expect(merged.scripts.dev).toBe('next dev');
    });

    // .env および .gitignore を所定のフォーマットで書き出せることを確認する
    it('writes env and gitignore files', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'filegen-'));

        await writeEnvFile(dir, { A: '1', B: '2' }, '.env');
        expect(await readFile(path.join(dir, '.env'), 'utf-8')).toBe('A=1\nB=2\n');

        await writeGitIgnore(dir, GITIGNORE_PATTERNS.os);
        expect(await readFile(path.join(dir, '.gitignore'), 'utf-8')).toContain('.DS_Store');
    });
});
