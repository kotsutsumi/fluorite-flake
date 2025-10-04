/**
 * CLI の `list` コマンドに関する機能テスト。
 * 各種サブコマンドでフレームワーク・データベース・ORM・ストレージ候補が適切に表示されること、
 * また不正な指定やサブコマンド省略時の挙動を確認する。
 */
import { describe, expect, it } from 'vitest';
import { runCli, expectSuccess, expectOutput } from '../../helpers/cli-runner.js';

describe('CLI list コマンドの機能確認', () => {
    it('利用可能なフレームワーク一覧を表示できること', async () => {
        const result = await runCli(['list', 'frameworks']);

        expectSuccess(result);
        expectOutput(result, 'nextjs');
        expectOutput(result, 'expo');
        expectOutput(result, 'tauri');
        expectOutput(result, 'flutter');
    });

    it('利用可能なデータベース一覧を表示できること', async () => {
        const result = await runCli(['list', 'databases']);

        expectSuccess(result);
        expectOutput(result, 'turso');
        expectOutput(result, 'supabase');
    });

    it('利用可能な ORM 一覧を表示できること', async () => {
        const result = await runCli(['list', 'orms']);

        expectSuccess(result);
        expectOutput(result, 'prisma');
        expectOutput(result, 'drizzle');
    });

    it('利用可能なストレージ選択肢を表示できること', async () => {
        const result = await runCli(['list', 'storage']);

        expectSuccess(result);
        expectOutput(result, 'vercel-blob');
        expectOutput(result, 'aws-s3');
        expectOutput(result, 'cloudflare-r2');
        expectOutput(result, 'supabase-storage');
    });

    it('サブコマンド未指定時にヘルプを表示すること', async () => {
        const result = await runCli(['list']);

        expectSuccess(result);
        expectOutput(result, /list.*<type>/i);
    });

    it('不正な種別を指定した場合でも利用可能な種別を案内すること', async () => {
        const result = await runCli(['list', 'invalid-type']);

        // エラーにはせず、利用可能な種別の案内メッセージを返すことを確認する
        expectSuccess(result);
        expectOutput(result, /frameworks|databases|orms|storage/i);
    });
});
