import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    debugLog,
    isDevelopment,
    printDevelopmentInfo,
    setupDevelopmentWorkspace,
} from '../../../src/debug.js';

// Mock external dependencies
vi.mock('node:fs');
vi.mock('node:path');
vi.mock('chalk', () => ({
    default: {
        gray: vi.fn((text: string) => `[GRAY]${text}[/GRAY]`),
    },
}));

describe('debug utilities', () => {
    let originalEnv: string | undefined;
    let originalCwd: string;
    let originalChdir: typeof process.chdir;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Save original environment
        originalEnv = process.env.NODE_ENV;
        originalCwd = process.cwd();
        originalChdir = process.chdir;

        // Setup mocks
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
            /* intentionally empty - mock console.log */
        });
        vi.mocked(process).cwd = vi.fn().mockReturnValue('/test/current/dir');
        vi.mocked(process).chdir = vi.fn();
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.rmSync).mockImplementation(() => {
            /* intentionally empty - mock fs.rmSync */
        });
        vi.mocked(fs.mkdirSync).mockImplementation(() => {
            /* intentionally empty - mock fs.mkdirSync */
        });
        vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

        // Clear all mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore original environment
        if (originalEnv !== undefined) {
            process.env.NODE_ENV = originalEnv;
        } else {
            process.env.NODE_ENV = undefined;
        }
        process.cwd = () => originalCwd;
        process.chdir = originalChdir;
        consoleSpy.mockRestore();
    });

    describe('isDevelopment', () => {
        it('should return true when NODE_ENV is development', () => {
            process.env.NODE_ENV = 'development';
            expect(isDevelopment()).toBe(true);
        });

        it('should return false when NODE_ENV is production', () => {
            process.env.NODE_ENV = 'production';
            expect(isDevelopment()).toBe(false);
        });

        it('should return false when NODE_ENV is undefined', () => {
            process.env.NODE_ENV = undefined;
            expect(isDevelopment()).toBe(false);
        });

        it('should return false when NODE_ENV is empty string', () => {
            process.env.NODE_ENV = '';
            expect(isDevelopment()).toBe(false);
        });
    });

    describe('printDevelopmentInfo', () => {
        it('should print development information with gray styling', () => {
            printDevelopmentInfo();

            expect(consoleSpy).toHaveBeenCalledWith('[GRAY]🔧 Development mode enabled[/GRAY]');
            expect(consoleSpy).toHaveBeenCalledWith(
                '[GRAY]📍 Current working directory:[/GRAY]',
                '[GRAY]/test/current/dir[/GRAY]'
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                '[GRAY]🔗 Node version:[/GRAY]',
                expect.stringContaining('[GRAY]v')
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                '[GRAY]📦 CLI arguments:[/GRAY]',
                expect.stringContaining('[GRAY][')
            );
        });

        it('should format CLI arguments as JSON', () => {
            printDevelopmentInfo();

            const argsCall = consoleSpy.mock.calls.find((call) =>
                call[0]?.toString().includes('📦 CLI arguments:')
            );
            expect(argsCall).toBeDefined();
            expect(argsCall?.[1]).toContain('[GRAY][');
        });
    });

    describe('setupDevelopmentWorkspace', () => {
        it('should create temp/dev directory when it does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            setupDevelopmentWorkspace();

            expect(path.join).toHaveBeenCalledWith('/test/current/dir', 'temp', 'dev');
            expect(fs.existsSync).toHaveBeenCalledWith('/test/current/dir/temp/dev');
            expect(fs.rmSync).not.toHaveBeenCalled();
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/current/dir/temp/dev', {
                recursive: true,
            });
            expect(process.chdir).toHaveBeenCalledWith('/test/current/dir/temp/dev');
        });

        it('should remove existing temp/dev directory before creating new one', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);

            setupDevelopmentWorkspace();

            expect(fs.existsSync).toHaveBeenCalledWith('/test/current/dir/temp/dev');
            expect(fs.rmSync).toHaveBeenCalledWith('/test/current/dir/temp/dev', {
                recursive: true,
            });
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/current/dir/temp/dev', {
                recursive: true,
            });
            expect(process.chdir).toHaveBeenCalledWith('/test/current/dir/temp/dev');
        });

        it('should log directory change with gray styling', () => {
            setupDevelopmentWorkspace();

            expect(consoleSpy).toHaveBeenCalledWith(
                '[GRAY]📂 Changed working directory to:[/GRAY]',
                '[GRAY]/test/current/dir[/GRAY]'
            );
        });
    });

    describe('debugLog', () => {
        it('should log debug message when in development mode', () => {
            process.env.NODE_ENV = 'development';

            debugLog('Test message');

            expect(consoleSpy).toHaveBeenCalledWith('[GRAY]🐛 Debug: Test message[/GRAY]', '');
        });

        it('should log debug message with data when in development mode', () => {
            process.env.NODE_ENV = 'development';
            const testData = { foo: 'bar', nested: { value: 123 } };

            debugLog('Test with data', testData);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[GRAY]🐛 Debug: Test with data[/GRAY]',
                expect.stringContaining('[GRAY]{')
            );
        });

        it('should not log anything when not in development mode', () => {
            process.env.NODE_ENV = 'production';

            debugLog('Test message');

            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should handle undefined data parameter', () => {
            process.env.NODE_ENV = 'development';

            debugLog('Test message', undefined);

            expect(consoleSpy).toHaveBeenCalledWith('[GRAY]🐛 Debug: Test message[/GRAY]', '');
        });

        it('should handle null data parameter', () => {
            process.env.NODE_ENV = 'development';

            debugLog('Test message', null);

            expect(consoleSpy).toHaveBeenCalledWith('[GRAY]🐛 Debug: Test message[/GRAY]', '');
        });
    });
});
