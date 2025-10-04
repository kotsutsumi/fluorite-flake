/**
 * スピナーマネージャー (src/utils/spinner-manager.ts) のユニットテスト
 * start/update/succeed/fail/warn/info/suspend/resume/clear の状態遷移とコンソール出力を検証
 */
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import chalk from 'chalk';
import ora from 'ora';

// oraのモック
vi.mock('ora', () => ({
    default: vi.fn(() => ({
        start: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
        warn: vi.fn().mockReturnThis(),
        info: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        text: '',
    })),
}));

describe('スピナーマネージャー', () => {
    let consoleLogSpy: MockInstance;
    let oraSpy: MockInstance;
    let mockOraInstance: ReturnType<typeof ora>;

    beforeEach(() => {
        // モジュールキャッシュをクリア（シングルトンのリセット）
        vi.resetModules();

        // コンソール出力のモック
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {
            /* no-op */
        });

        // oraのモックインスタンス
        mockOraInstance = {
            start: vi.fn().mockReturnThis(),
            succeed: vi.fn().mockReturnThis(),
            fail: vi.fn().mockReturnThis(),
            warn: vi.fn().mockReturnThis(),
            info: vi.fn().mockReturnThis(),
            stop: vi.fn().mockReturnThis(),
            text: '',
        };

        oraSpy = vi.mocked(ora).mockReturnValue(mockOraInstance);
    });

    afterEach(() => {
        vi.clearAllMocks();
        consoleLogSpy.mockRestore();
    });

    describe('シングルトン動作', () => {
        /**
         * SpinnerManagerがシングルトンとして動作することを確認
         */
        it('同じインスタンスを返す', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');

            const instance1 = SpinnerManager.getInstance();
            const instance2 = SpinnerManager.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('start メソッド', () => {
        /**
         * スピナー開始の動作を検証
         */
        it('新しいスピナーを作成して開始', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Loading...');

            expect(oraSpy).toHaveBeenCalledWith('Loading...');
            expect(mockOraInstance.start).toHaveBeenCalled();
        });

        it('既存のスピナーがある場合はテキストを更新', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('First message');
            manager.start('Second message');

            // oraは一度だけ呼ばれる
            expect(oraSpy).toHaveBeenCalledTimes(1);
            // テキストが更新される
            expect(mockOraInstance.text).toBe('Second message');
        });

        it('サスペンド状態では単純にメッセージを表示', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.suspend();
            manager.start('Suspended message');

            // oraは呼ばれない
            expect(oraSpy).not.toHaveBeenCalled();
            // コンソールに出力される
            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.cyan('\nSuspended message'));
        });
    });

    describe('update メソッド', () => {
        /**
         * スピナーテキスト更新の動作を検証
         */
        it('アクティブなスピナーのテキストを更新', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Initial');
            manager.update('Updated');

            expect(mockOraInstance.text).toBe('Updated');
        });

        it('スピナーがない場合はコンソール出力', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.update('No spinner');

            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray('  No spinner'));
        });

        it('サスペンド状態ではコンソール出力', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Initial');
            manager.suspend();
            manager.update('Suspended update');

            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray('  Suspended update'));
        });
    });

    describe('succeed メソッド', () => {
        /**
         * 成功終了の動作を検証
         */
        it('スピナーを成功メッセージで停止', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Processing');
            manager.succeed('Success!');

            expect(mockOraInstance.succeed).toHaveBeenCalledWith('Success!');
            expect(manager.isActive()).toBe(false);
        });

        it('メッセージ未指定時のデフォルト動作', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Processing');
            manager.succeed();

            expect(mockOraInstance.succeed).toHaveBeenCalledWith(undefined);
        });

        it('スピナーがない場合はコンソール出力', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.succeed('Direct success');

            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('✅ Direct success'));
        });

        it('サスペンド状態ではコンソール出力', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.suspend();
            manager.succeed('Suspended success');

            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('✅ Suspended success'));
        });
    });

    describe('fail メソッド', () => {
        /**
         * 失敗終了の動作を検証
         */
        it('スピナーを失敗メッセージで停止', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Processing');
            manager.fail('Error occurred');

            expect(mockOraInstance.fail).toHaveBeenCalledWith('Error occurred');
            expect(manager.isActive()).toBe(false);
        });

        it('スピナーがない場合はコンソール出力', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.fail('Direct failure');

            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.red('❌ Direct failure'));
        });

        it('サスペンド状態ではコンソール出力', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.suspend();
            manager.fail('Suspended failure');

            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.red('❌ Suspended failure'));
        });
    });

    describe('warn メソッド', () => {
        /**
         * 警告終了の動作を検証
         */
        it('スピナーを警告メッセージで停止', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Processing');
            manager.warn('Warning message');

            expect(mockOraInstance.warn).toHaveBeenCalledWith('Warning message');
            expect(manager.isActive()).toBe(false);
        });

        it('スピナーがない場合はコンソール出力', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.warn('Direct warning');

            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  Direct warning'));
        });
    });

    describe('info メソッド', () => {
        /**
         * 情報終了の動作を検証
         */
        it('スピナーを情報メッセージで停止', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Processing');
            manager.info('Information');

            expect(mockOraInstance.info).toHaveBeenCalledWith('Information');
            expect(manager.isActive()).toBe(false);
        });

        it('スピナーがない場合はコンソール出力', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.info('Direct info');

            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.blue('ℹ️  Direct info'));
        });
    });

    describe('suspend/resume メソッド', () => {
        /**
         * 一時停止と再開の動作を検証
         */
        it('スピナーを一時停止', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Processing');
            manager.suspend();

            expect(mockOraInstance.stop).toHaveBeenCalled();
            expect(manager.isSuspended()).toBe(true);
            expect(manager.isActive()).toBe(false);
        });

        it('スピナーを再開（メッセージあり）', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Initial');
            manager.suspend();

            // oraインスタンスをリセット
            oraSpy.mockClear();
            mockOraInstance.start.mockClear();

            manager.resume('Resumed');

            expect(manager.isSuspended()).toBe(false);
            expect(oraSpy).toHaveBeenCalledWith('Resumed');
            expect(mockOraInstance.start).toHaveBeenCalled();
        });

        it('スピナーを再開（メッセージなし）', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.suspend();
            manager.resume();

            expect(manager.isSuspended()).toBe(false);
            expect(manager.isActive()).toBe(false);
        });
    });

    describe('clear メソッド', () => {
        /**
         * 状態リセットの動作を検証
         */
        it('アクティブなスピナーをクリアし状態をリセット', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Processing');
            manager.suspend();
            manager.clear();

            expect(mockOraInstance.stop).toHaveBeenCalled();
            expect(manager.isActive()).toBe(false);
            expect(manager.isSuspended()).toBe(false);
        });
    });

    describe('状態チェックメソッド', () => {
        /**
         * isActive/isSuspended の動作を検証
         */
        it('isActive が正しく動作', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            expect(manager.isActive()).toBe(false);

            manager.start('Processing');
            expect(manager.isActive()).toBe(true);

            manager.suspend();
            expect(manager.isActive()).toBe(false);

            manager.resume('Resumed');
            expect(manager.isActive()).toBe(true);

            manager.succeed();
            expect(manager.isActive()).toBe(false);
        });

        it('isSuspended が正しく動作', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            expect(manager.isSuspended()).toBe(false);

            manager.suspend();
            expect(manager.isSuspended()).toBe(true);

            manager.resume();
            expect(manager.isSuspended()).toBe(false);
        });
    });

    describe('stop メソッド', () => {
        /**
         * スピナー停止の動作を検証
         */
        it('メッセージなしでスピナーを停止', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Processing');
            manager.stop();

            expect(mockOraInstance.stop).toHaveBeenCalled();
            expect(manager.isActive()).toBe(false);
        });

        it('スピナーがない場合は何もしない', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            // エラーを投げないことを確認
            expect(() => manager.stop()).not.toThrow();
        });
    });

    describe('複数の状態遷移', () => {
        /**
         * 複雑な状態遷移シーケンスを検証
         */
        it('start → update → suspend → resume → succeed のフロー', async () => {
            const { SpinnerManager } = await import('../../../src/utils/spinner-manager.js');
            const manager = SpinnerManager.getInstance();

            manager.start('Step 1');
            expect(manager.isActive()).toBe(true);

            manager.update('Step 2');
            expect(mockOraInstance.text).toBe('Step 2');

            manager.suspend();
            expect(manager.isActive()).toBe(false);
            expect(manager.isSuspended()).toBe(true);

            manager.resume('Step 3');
            expect(manager.isActive()).toBe(true);
            expect(manager.isSuspended()).toBe(false);

            manager.succeed('Complete');
            expect(manager.isActive()).toBe(false);
        });
    });
});
