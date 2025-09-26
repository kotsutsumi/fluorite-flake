import ora, { type Ora } from 'ora';
import chalk from 'chalk';

/**
 * Manages spinner lifecycle to prevent double spinners and interference with prompts
 */
export class SpinnerManager {
    private static instance: SpinnerManager;
    private activeSpinner?: Ora;
    private suspended = false;

    private constructor() {}

    static getInstance(): SpinnerManager {
        if (!SpinnerManager.instance) {
            SpinnerManager.instance = new SpinnerManager();
        }
        return SpinnerManager.instance;
    }

    /**
     * Start a spinner with the given message
     * If a spinner is already active, updates its text instead
     */
    start(message: string): void {
        if (this.suspended) {
            // Just print the message when suspended (for interactive prompts)
            console.log(chalk.cyan(`\n${message}`));
            return;
        }

        if (this.activeSpinner) {
            // Update existing spinner text instead of creating a new one
            this.activeSpinner.text = message;
        } else {
            // Create new spinner
            this.activeSpinner = ora(message).start();
        }
    }

    /**
     * Update spinner text
     */
    update(message: string): void {
        if (this.suspended) {
            console.log(chalk.gray(`  ${message}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.text = message;
        } else {
            console.log(chalk.gray(`  ${message}`));
        }
    }

    /**
     * Stop spinner with success message
     */
    succeed(message?: string): void {
        if (this.suspended) {
            console.log(chalk.green(`✅ ${message || 'Done'}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.succeed(message);
            this.activeSpinner = undefined;
        } else {
            console.log(chalk.green(`✅ ${message || 'Done'}`));
        }
    }

    /**
     * Stop spinner with failure message
     */
    fail(message?: string): void {
        if (this.suspended) {
            console.log(chalk.red(`❌ ${message || 'Failed'}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.fail(message);
            this.activeSpinner = undefined;
        } else {
            console.log(chalk.red(`❌ ${message || 'Failed'}`));
        }
    }

    /**
     * Stop spinner with warning message
     */
    warn(message?: string): void {
        if (this.suspended) {
            console.log(chalk.yellow(`⚠️  ${message || 'Warning'}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.warn(message);
            this.activeSpinner = undefined;
        } else {
            console.log(chalk.yellow(`⚠️  ${message || 'Warning'}`));
        }
    }

    /**
     * Stop spinner with info message
     */
    info(message?: string): void {
        if (this.suspended) {
            console.log(chalk.blue(`ℹ️  ${message || 'Info'}`));
            return;
        }

        if (this.activeSpinner) {
            this.activeSpinner.info(message);
            this.activeSpinner = undefined;
        } else {
            console.log(chalk.blue(`ℹ️  ${message || 'Info'}`));
        }
    }

    /**
     * Stop spinner without any message
     */
    stop(): void {
        if (this.activeSpinner) {
            this.activeSpinner.stop();
            this.activeSpinner = undefined;
        }
    }

    /**
     * Temporarily stop spinner for interactive prompts
     */
    suspend(): void {
        if (this.activeSpinner) {
            this.activeSpinner.stop();
            this.activeSpinner = undefined;
        }
        this.suspended = true;
    }

    /**
     * Resume spinner after interactive prompts
     */
    resume(message?: string): void {
        this.suspended = false;
        if (message) {
            this.start(message);
        }
    }

    /**
     * Check if spinner is currently active
     */
    isActive(): boolean {
        return !!this.activeSpinner && !this.suspended;
    }

    /**
     * Check if spinner is suspended
     */
    isSuspended(): boolean {
        return this.suspended;
    }

    /**
     * Clear any active spinner and reset state
     */
    clear(): void {
        this.stop();
        this.suspended = false;
    }
}

// Export singleton instance
export const spinner = SpinnerManager.getInstance();
