/**
 * CLI のバージョン表示機能を検証するテスト。
 * `--version` / `-v` フラグおよび `version` サブコマンドの 3 つの入口で
 * package.json のバージョン番号が正しく出力されることを確認する。
 */
import { describe, expect, it } from 'vitest';
import { runCli, expectSuccess, expectOutput } from '../../helpers/cli-runner.js';
import packageJson from '../../../package.json';

describe('CLI version 表示の機能確認', () => {
    it('--version フラグでバージョンが表示されること', async () => {
        const result = await runCli(['--version']);

        expectSuccess(result);
        expectOutput(result, packageJson.version);
    });

    it('-v フラグでバージョンが表示されること', async () => {
        const result = await runCli(['-v']);

        expectSuccess(result);
        expectOutput(result, packageJson.version);
    });

    it('version サブコマンドでバージョンが表示されること', async () => {
        const result = await runCli(['version']);

        expectSuccess(result);
        expectOutput(result, packageJson.version);
    });
});
