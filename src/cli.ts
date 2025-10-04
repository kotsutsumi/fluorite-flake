#!/usr/bin/env node
/**
 * Fluorite-flake CLI エントリーポイント
 */
import { defineCommand, runMain } from 'citty';

// 開発環境での追加ロギングとデバッグ機能
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
    console.log('🔧 Development mode enabled');
    console.log('📍 Current working directory:', process.cwd());
    console.log('🔗 Node version:', process.version);
    console.log('📦 CLI arguments:', process.argv);
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
        if (isDevelopment) {
            console.log('🐛 Debug: Received arguments:', args);
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
