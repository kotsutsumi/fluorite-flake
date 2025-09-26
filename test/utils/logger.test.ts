import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createScopedLogger, createSpinner, logger } from '../../src/utils/logger.js';

const originalEnv = { ...process.env };

function mockConsole() {
    return {
        log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
        error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    };
}

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

    it('logs info, success, warn, and error messages', () => {
        logger.info('info message');
        logger.success('great');
        logger.warn('caution');
        logger.error('bad');

        expect(spies.log).toHaveBeenCalledTimes(2);
        expect(spies.warn).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenCalledTimes(1);
    });

    it('outputs debug messages when DEBUG is set', () => {
        process.env.DEBUG = '1';
        logger.debug('debugging');
        expect(spies.log).toHaveBeenCalled();
    });

    it('creates scoped loggers with prefixes', () => {
        const scoped = createScopedLogger('MyScope');
        scoped.info('hello');
        expect(spies.log).toHaveBeenCalledWith(expect.stringContaining('[MyScope] hello'));
    });

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
