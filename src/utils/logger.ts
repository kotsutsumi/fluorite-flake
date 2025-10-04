/**
 * CLI全体で一貫した出力を実現する標準化されたログユーティリティ
 */

import chalk from 'chalk';

/**
 * ロガーのオプション設定
 */
export interface LoggerOptions {
    /** メッセージのプレフィックス */
    prefix?: string;
    /** タイムスタンプを表示するかどうか */
    timestamp?: boolean;
    /** ログレベル */
    level?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 一貫したスタイリングを持つ中央集中型ロガー
 */
export const logger = {
    /**
     * 一般的な情報メッセージを出力します
     * @param message 表示するメッセージ
     * @param options ログオプション
     */
    info: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.cyan(`ℹ ${prefix}${message}`));
    },

    /**
     * 成功メッセージを出力します
     * @param message 表示するメッセージ
     * @param options ログオプション
     */
    success: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.green(`✅ ${prefix}${message}`));
    },

    /**
     * 警告メッセージを出力します
     * @param message 表示するメッセージ
     * @param options ログオプション
     */
    warn: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.warn(chalk.yellow(`⚠ ${prefix}${message}`));
    },

    /**
     * エラーメッセージを出力します
     * @param message 表示するメッセージ
     * @param options ログオプション
     */
    error: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.error(chalk.red(`✖ ${prefix}${message}`));
    },

    /**
     * プロセスのステップを表示します
     * @param message 表示するメッセージ
     * @param options ログオプション
     */
    step: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.blue(`  • ${prefix}${message}`));
    },

    /**
     * デバッグメッセージを出力します（デバッグモードでのみ表示）
     * @param message 表示するメッセージ
     * @param options ログオプション
     */
    debug: (message: string, options?: LoggerOptions) => {
        if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
            const prefix = options?.prefix ? `${options.prefix} ` : '';
            console.log(chalk.gray(`🐛 ${prefix}${message}`));
        }
    },

    /**
     * 進行状況を表示します
     * @param message 表示するメッセージ
     * @param options ログオプション
     */
    progress: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.blue(`⏳ ${prefix}${message}`));
    },

    /**
     * コマンドやコードブロックを表示します
     * @param command 表示するコマンド
     * @param options ログオプション
     */
    command: (command: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.gray(`  $ ${prefix}${command}`));
    },

    /**
     * セクションの区切り線を表示します
     * @param title セクションのタイトル
     */
    section: (title: string) => {
        console.log();
        console.log(chalk.bold.blue(`━━━ ${title} ━━━`));
        console.log();
    },

    /**
     * 空行を出力して間隔をあけます
     */
    blank: () => {
        console.log();
    },

    /**
     * リストアイテムを表示します
     * @param item アイテムの内容
     * @param level インデントレベル（デフォルト: 0）
     */
    item: (item: string, level = 0) => {
        const indent = '  '.repeat(level);
        console.log(chalk.gray(`${indent}• ${item}`));
    },

    /**
     * キー・値ペアを表示します
     * @param key キー名
     * @param value 値
     * @param options 表示オプション
     * @param options.color 値の色
     */
    keyValue: (
        key: string,
        value: string,
        options?: { color?: 'green' | 'blue' | 'yellow' | 'gray' }
    ) => {
        const color = options?.color || 'blue';
        const colorFn = chalk[color] as typeof chalk.blue;
        console.log(`  ${chalk.gray(`${key}:`)} ${colorFn(value)}`);
    },
};

/**
 * プレフィックス付きのスコープロガーを作成します
 * @param scope スコープ名
 * @returns スコープ付きロガー
 */
export function createScopedLogger(scope: string): typeof logger {
    return {
        info: (message: string, options?: LoggerOptions) =>
            logger.info(message, { ...options, prefix: `[${scope}]` }),
        success: (message: string, options?: LoggerOptions) =>
            logger.success(message, { ...options, prefix: `[${scope}]` }),
        warn: (message: string, options?: LoggerOptions) =>
            logger.warn(message, { ...options, prefix: `[${scope}]` }),
        error: (message: string, options?: LoggerOptions) =>
            logger.error(message, { ...options, prefix: `[${scope}]` }),
        step: (message: string, options?: LoggerOptions) =>
            logger.step(message, { ...options, prefix: `[${scope}]` }),
        debug: (message: string, options?: LoggerOptions) =>
            logger.debug(message, { ...options, prefix: `[${scope}]` }),
        progress: (message: string, options?: LoggerOptions) =>
            logger.progress(message, { ...options, prefix: `[${scope}]` }),
        command: (command: string, options?: LoggerOptions) =>
            logger.command(command, { ...options, prefix: `[${scope}]` }),
        section: logger.section,
        blank: logger.blank,
        item: logger.item,
        keyValue: logger.keyValue,
    };
}

/**
 * 長時間実行される操作のためのスピナーユーティリティ
 */
export class LoggerSpinner {
    /** タイマーのID */
    private interval: NodeJS.Timeout | null = null;
    /** スピナーのアニメーションフレーム */
    private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    /** 現在のフレームインデックス */
    private current = 0;

    /**
     * スピナーを開始します
     * @param message 表示するメッセージ
     */
    start(message: string): void {
        process.stdout.write(`${this.frames[0]} ${message}`);
        // 100ms毎にフレームを更新
        this.interval = setInterval(() => {
            this.current = (this.current + 1) % this.frames.length;
            process.stdout.write(`\r${this.frames[this.current]} ${message}`);
        }, 100);
    }

    /**
     * スピナーを停止し、成功メッセージを表示します
     * @param message 表示する成功メッセージ
     */
    stop(message?: string): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        process.stdout.write('\r');
        if (message) {
            logger.success(message);
        }
    }

    /**
     * スピナーを停止し、エラーメッセージを表示します
     * @param message 表示するエラーメッセージ
     */
    fail(message?: string): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        process.stdout.write('\r');
        if (message) {
            logger.error(message);
        }
    }
}

/**
 * 長時間操作用のスピナーを作成します
 * @returns スピナーインスタンス
 */
export function createSpinner(): LoggerSpinner {
    return new LoggerSpinner();
}
