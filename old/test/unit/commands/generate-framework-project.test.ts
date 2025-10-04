/**
 * フレームワーク種別に応じて適切なジェネレーター関数へ処理を委譲する `generateFrameworkProject` のユニットテスト。
 * Next.js / Expo / Tauri / Flutter それぞれで正しいモジュールが呼び出されること、未対応フレームワークでは
 * 例外が発生することを確認する。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateFrameworkProject } from '../../../src/commands/create/generate-framework-project.js';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

// 各ジェネレーター呼び出しを監視するためのモック関数群
const spies = vi.hoisted(() => ({
    next: vi.fn(),
    expo: vi.fn(),
    tauri: vi.fn(),
    flutter: vi.fn(),
}));

vi.mock('../../../src/generators/next-generator/index.js', () => ({
    generateNextProject: spies.next,
}));
vi.mock('../../../src/generators/expo-generator/index.js', () => ({
    generateExpoProject: spies.expo,
}));
vi.mock('../../../src/generators/tauri-generator/index.js', () => ({
    generateTauriProject: spies.tauri,
}));
vi.mock('../../../src/generators/flutter-generator/index.js', () => ({
    generateFlutterProject: spies.flutter,
}));

// テスト全体で利用する共通設定
const baseConfig: ProjectConfig = {
    projectName: 'demo-app',
    projectPath: '/tmp/demo-app',
    framework: 'nextjs',
    database: 'none',
    deployment: false,
    storage: 'none',
    auth: false,
    packageManager: 'pnpm',
    mode: 'full',
};

describe('generateFrameworkProject の委譲先判定', () => {
    beforeEach(() => {
        spies.next.mockClear();
        spies.expo.mockClear();
        spies.tauri.mockClear();
        spies.flutter.mockClear();
    });

    it('Next.js 選択時に Next ジェネレーターへ委譲されること', async () => {
        const config = { ...baseConfig, framework: 'nextjs' } as ProjectConfig;
        await generateFrameworkProject(config);
        expect(spies.next).toHaveBeenCalledTimes(1);
        expect(spies.next).toHaveBeenCalledWith(config);
    });

    it('Expo 選択時に Expo ジェネレーターへ委譲されること', async () => {
        await generateFrameworkProject({ ...baseConfig, framework: 'expo' });
        expect(spies.expo).toHaveBeenCalledTimes(1);
    });

    it('Tauri 選択時に Tauri ジェネレーターへ委譲されること', async () => {
        await generateFrameworkProject({ ...baseConfig, framework: 'tauri' });
        expect(spies.tauri).toHaveBeenCalledTimes(1);
    });

    it('Flutter 選択時に Flutter ジェネレーターへ委譲されること', async () => {
        await generateFrameworkProject({ ...baseConfig, framework: 'flutter' });
        expect(spies.flutter).toHaveBeenCalledTimes(1);
    });

    it('未対応フレームワークでは例外が発生すること', async () => {
        await expect(
            generateFrameworkProject({
                ...baseConfig,
                // @ts-expect-error テスト用の意図的な無効フレームワーク
                framework: 'sveltekit',
            })
        ).rejects.toThrowError('Unsupported framework: sveltekit');
    });
});
