/**
 * `logger` ユーティリティが提供するロギングおよびスピナー制御の挙動を総合的に検証するユニットテスト。
 * 環境変数によるデバッグ出力の切り替えやスコープ付きロガー、ターミナルスピナーのライフサイクルなどを
 * モックしたコンソール出力を通じて再現し、CLI 実行時のログ体験が意図どおり維持されているかを確認する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createScopedLogger, createSpinner, logger } from '../../../src/utils/logger.js';

const originalEnv = { ...process.env };

function mockConsole() {
    return {
        log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
        error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    };
}

// ロガー関連の共通セットアップとクリーンアップを担うテストスイート
describe('logger utilities', () => {
    let spies: ReturnType<typeof mockConsole>;

    beforeEach(() => {
        spies = mockConsole();
    });

    afterEach(() => {
        spies.log.mockRestore();
        spies.warn.mockRestore();
        spies.error.mockRestore();
        process.env = { ...originalEnv };
    });

    // 通常の info/success/warn/error ログが適切なメソッドへ委譲されることを確認する
    it('logs info, success, warn, and error messages', () => {
        logger.info('info message');
        logger.success('great');
        logger.warn('caution');
        logger.error('bad');

        expect(spies.log).toHaveBeenCalledTimes(2);
        expect(spies.warn).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenCalledTimes(1);
    });

    // DEBUG フラグが有効な場合に debug ログが出力されることを検証する
    it('outputs debug messages when DEBUG is set', () => {
        process.env.DEBUG = '1';
        logger.debug('debugging');
        expect(spies.log).toHaveBeenCalled();
    });

    // スコープ付きロガーがプレフィックスを付加してログ出力することを確認する
    it('creates scoped loggers with prefixes', () => {
        const scoped = createScopedLogger('MyScope');
        scoped.info('hello');
        expect(spies.log).toHaveBeenCalledWith(expect.stringContaining('[MyScope] hello'));
    });

    // スピナーの start/stop/fail が stdout 書き込みや成功・失敗ログを適切に呼び分けることを検証する
    it('controls spinner lifecycle', () => {
        const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const successSpy = vi.spyOn(logger, 'success');
        const errorSpy = vi.spyOn(logger, 'error');

        const spinner = createSpinner();
        spinner.start('Working');
        spinner.stop('Done');
        spinner.start('Working');
        spinner.fail('Oops');

        expect(writeSpy).toHaveBeenCalled();
        expect(successSpy).toHaveBeenCalledWith('Done');
        expect(errorSpy).toHaveBeenCalledWith('Oops');

        writeSpy.mockRestore();
        successSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
