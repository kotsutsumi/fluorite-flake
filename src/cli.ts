#!/usr/bin/env node
/**
 * Fluorite-flake CLI エントリーポイント
 */
import { defineCommand, runMain } from 'citty';

import { debugLog, isDevelopment, printDevelopmentInfo, setupDevelopmentWorkspace } from './debug.js';
import { printHeader } from './header.js';

// 開発環境での初期化
if (isDevelopment()) {
    printDevelopmentInfo();
    setupDevelopmentWorkspace();
}

const main = defineCommand({
    meta: {
        name: 'fluorite-flake',
        version: '1.0.0',
        description: 'Boilerplate generator CLI for Next.js, Expo, and Tauri projects',
    },
    args: {
        project: {
            type: 'positional',
            description: 'Project type (nextjs|expo|tauri)',
            required: false,
        },
        name: {
            type: 'string',
            description: 'Project name',
            alias: 'n',
        },
    },
    run({ args }: { args: { project?: string; name?: string } }) {
        // 開発モードでの詳細なデバッグ情報
        debugLog('Received arguments:', args);
        if (isDevelopment()) {
            console.log('');
        }

        // ヘッダー表示
        printHeader();

        if (!args.project) {
            console.log('Usage: fluorite-flake <project-type> [options]');
            console.log('Available project types: nextjs, expo, tauri');

            // if (isDevelopment) {
            //     console.log('💡 Development tip: Use --help for detailed options');
            // }
            return;
        }

        const projectName = args.name || 'my-project';
        console.log(`Generating ${args.project} project: ${projectName}`);

        // if (isDevelopment) {
        //     console.log(
        //         '🔍 Debug: Project type validation and generation will be implemented here'
        //     );
        //     console.log('📋 Debug: Project configuration:', {
        //         type: args.project,
        //         name: projectName,
        //         timestamp: new Date().toISOString(),
        //     });
        // }

        // ここにプロジェクト生成ロジックを追加
    },
});

runMain(main);

// EOF
