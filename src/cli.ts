#!/usr/bin/env node
/**
 * Fluorite-flake CLI エントリーポイント
 */
import { defineCommand, runMain } from 'citty';
import fs from 'node:fs';
import path from 'node:path';

// 開発環境での追加ロギングとデバッグ機能
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
    console.log('🔧 Development mode enabled');
    console.log('📍 Current working directory:', process.cwd());
    console.log('🔗 Node version:', process.version);
    console.log('📦 CLI arguments:', process.argv);

    // temp/devディレクトリが無ければ作成、存在すれば1度クリアしてから作成
    const tempDir = path.join(process.cwd(), 'temp', 'dev');
    if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // カレントディレクトリをtemp/devに変更
    process.chdir(tempDir);
    console.log('📂 Changed working directory to:', process.cwd());
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
        if (isDevelopment) {
            console.log('🐛 Debug: Received arguments:', args);

            console.log('');
        }

        console.log('Welcome to Fluorite-flake! Your boilerplate generator CLI.');

        if (!args.project) {
            console.log('Usage: fluorite-flake <project-type> [options]');
            console.log('Available project types: nextjs, expo, tauri');

            if (isDevelopment) {
                console.log('💡 Development tip: Use --help for detailed options');
            }
            return;
        }

        const projectName = args.name || 'my-project';
        console.log(`Generating ${args.project} project: ${projectName}`);

        if (isDevelopment) {
            console.log(
                '🔍 Debug: Project type validation and generation will be implemented here'
            );
            console.log('📋 Debug: Project configuration:', {
                type: args.project,
                name: projectName,
                timestamp: new Date().toISOString(),
            });
        }

        // ここにプロジェクト生成ロジックを追加
    },
});

runMain(main);

// EOF
