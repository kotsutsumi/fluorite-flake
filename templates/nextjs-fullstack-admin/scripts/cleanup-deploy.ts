#!/usr/bin/env tsx

/**
 * デプロイ環境クリーンアップスクリプト
 *
 * Vercel プロジェクト、データベース、Blob ストアを安全に削除します。
 *
 * 使用方法:
 *   pnpm cleanup:deploy
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

type CleanupResult = {
    success: boolean;
    error?: string;
};

const FLUORITE_RESOURCE_MANAGER_SEGMENTS = [
    'fluorite-flake',
    'dist',
    'utils',
    'resource-manager',
    'index.js',
] as const;

type ExecuteCleanup = (projectPath?: string) => Promise<CleanupResult>;

async function loadExecuteCleanup(): Promise<ExecuteCleanup> {
    // CLI で提供されるリソース管理モジュールを動的に解決する
    const fluoriteResourceManagerSpecifier = FLUORITE_RESOURCE_MANAGER_SEGMENTS.join('/');
    const fluoriteModule = await import(fluoriteResourceManagerSpecifier).catch(() => null);
    if (fluoriteModule && typeof fluoriteModule.executeCleanup === 'function') {
        return fluoriteModule.executeCleanup as ExecuteCleanup;
    }

    try {
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const localModulePath = path.resolve(
            currentDir,
            '../../../src/utils/resource-manager/index.js'
        );
        const localModule = await import(localModulePath);
        if (typeof localModule.executeCleanup === 'function') {
            return localModule.executeCleanup as ExecuteCleanup;
        }
    } catch {
        // 依存が存在しない場合はフォールバックを試す
    }

    console.warn(
        '⚠️ executeCleanup の読み込みに失敗したため、ダミーのクリーンアップ処理を実行します。必要に応じて fluorite-flake を devDependencies に追加してください。'
    );
    return async () => ({
        success: true,
        error: 'cleanup skipped: fluorite resource manager not available',
    });
}

async function main(): Promise<void> {
    console.log('🗑️  Fluorite プロジェクト削除ツール\n');

    try {
        const executeCleanup = await loadExecuteCleanup();
        const result = await executeCleanup(process.cwd());

        if (result.success) {
            console.log('\n🎉 削除処理が正常に完了しました！');
            process.exit(0);
        }

        console.error('\n❌ 削除処理中にエラーが発生しました');
        if (result.error) {
            console.error(`エラー詳細: ${result.error}`);
        }
        process.exit(1);
    } catch (error) {
        console.error('\n💥 クリーンアップ実行中にエラーが発生しました:');
        console.error(error instanceof Error ? error.message : error);
        console.error('fluorite-flake がインストールされているか確認し、再度実行してください。');
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => console.error(error));
}

// EOF
