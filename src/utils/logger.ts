/**
 * Standardized logging utility for consistent output across the CLI
 */

import chalk from 'chalk';

export interface LoggerOptions {
    prefix?: string;
    timestamp?: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Centralized logger with consistent styling
 */
export const logger = {
    /**
     * General information message
     */
    info: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.cyan(`ℹ ${prefix}${message}`));
    },

    /**
     * Success message
     */
    success: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.green(`✅ ${prefix}${message}`));
    },

    /**
     * Warning message
     */
    warn: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.warn(chalk.yellow(`⚠ ${prefix}${message}`));
    },

    /**
     * Error message
     */
    error: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.error(chalk.red(`✖ ${prefix}${message}`));
    },

    /**
     * Step in a process
     */
    step: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.blue(`  • ${prefix}${message}`));
    },

    /**
     * Debug message (only shown in debug mode)
     */
    debug: (message: string, options?: LoggerOptions) => {
        if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
            const prefix = options?.prefix ? `${options.prefix} ` : '';
            console.log(chalk.gray(`🐛 ${prefix}${message}`));
        }
    },

    /**
     * Progress indicator
     */
    progress: (message: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.blue(`⏳ ${prefix}${message}`));
    },

    /**
     * Command or code block
     */
    command: (command: string, options?: LoggerOptions) => {
        const prefix = options?.prefix ? `${options.prefix} ` : '';
        console.log(chalk.gray(`  $ ${prefix}${command}`));
    },

    /**
     * Section divider
     */
    section: (title: string) => {
        console.log();
        console.log(chalk.bold.blue(`━━━ ${title} ━━━`));
        console.log();
    },

    /**
     * Blank line for spacing
     */
    blank: () => {
        console.log();
    },

    /**
     * List item
     */
    item: (item: string, level = 0) => {
        const indent = '  '.repeat(level);
        console.log(chalk.gray(`${indent}• ${item}`));
    },

    /**
     * Key-value pair
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
 * Create a scoped logger with a prefix
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
 * Spinner utility for long-running operations
 */
export class LoggerSpinner {
    private interval: NodeJS.Timeout | null = null;
    private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    private current = 0;

    start(message: string): void {
        process.stdout.write(`${this.frames[0]} ${message}`);
        this.interval = setInterval(() => {
            this.current = (this.current + 1) % this.frames.length;
            process.stdout.write(`\r${this.frames[this.current]} ${message}`);
        }, 100);
    }

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
 * Create a spinner for long operations
 */
export function createSpinner(): LoggerSpinner {
    return new LoggerSpinner();
}
