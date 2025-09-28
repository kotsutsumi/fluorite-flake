/**
 * プロジェクト構造ユーティリティ (`project-structure`) がディレクトリ生成・テンプレートコピー・命名変換などを
 * 正しく行えるかを検証するユニットテスト。テンポラリ環境でファイル操作を行い、CLI が出力する骨組みの整合性を確認する。
 */
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import {
    DIRECTORY_STRUCTURES,
    copyTemplateFiles,
    createDirectoryStructure,
    createFrameworkDirectories,
    getProjectRelativePath,
    isDirectoryEmpty,
    normalizeProjectName,
    removeDirectoryIfExists,
    writeFileWithDirs,
} from '../../../src/utils/project-structure.js';

// プロジェクトの土台を構築する各ユーティリティを検証するテストスイート
describe('project-structure utilities', () => {
    // ディレクトリの生成と空判定が正しく動作することを確認する
    it('creates directory structures and detects emptiness', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'structure-'));
        await createDirectoryStructure(dir, ['one', 'two']);
        expect(await fs.pathExists(path.join(dir, 'one'))).toBe(true);

        expect(await isDirectoryEmpty(path.join(dir, 'one'))).toBe(true);
        await writeFile(path.join(dir, 'one/file.txt'), 'hello');
        expect(await isDirectoryEmpty(path.join(dir, 'one'))).toBe(false);
    });

    // フレームワーク別ディレクトリ構成が定義どおり作られることを検証する
    it('creates framework directories', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'structure-'));
        await createFrameworkDirectories(dir, 'nextjs');
        for (const sub of DIRECTORY_STRUCTURES.nextjs) {
            expect(await fs.pathExists(path.join(dir, sub))).toBe(true);
        }
    });

    // removeDirectoryIfExists が安全にディレクトリを削除できることを確認する
    it('removes directories safely', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'structure-'));
        const target = path.join(dir, 'to-remove');
        await fs.ensureDir(target);
        await removeDirectoryIfExists(target);
        expect(await fs.pathExists(target)).toBe(false);
    });

    // テンプレートコピーおよび親ディレクトリ込みでのファイル書き込みが行えることを検証する
    it('copies templates and writes files with parent directories', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'structure-'));
        const source = path.join(dir, 'src');
        const destination = path.join(dir, 'dest');
        await fs.ensureDir(source);
        await writeFile(path.join(source, 'file.txt'), 'content');

        await copyTemplateFiles(source, destination, { overwrite: true });
        expect(await readFile(path.join(destination, 'file.txt'), 'utf-8')).toBe('content');

        const nestedFile = path.join(dir, 'nested/dir/file.ts');
        await writeFileWithDirs(nestedFile, 'export {}');
        expect(await fs.pathExists(nestedFile)).toBe(true);
    });

    // 相対パス算出と命名正規化ユーティリティが期待どおり機能することを確認する
    it('calculates relative paths and normalizes names', () => {
        const relative = getProjectRelativePath('/project', '/project/src/index.ts');
        expect(relative).toBe(path.join('src', 'index.ts'));

        expect(normalizeProjectName('Hello World!', 'package')).toBe('hello-world');
        expect(normalizeProjectName('Hello World!', 'directory')).toBe('hello_world');
        expect(normalizeProjectName('123 hi', 'class')).toBe('A23hi');
    });
});
