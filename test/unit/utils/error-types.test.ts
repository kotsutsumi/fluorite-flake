import { describe, expect, it } from 'vitest';

import {
    getErrorMessage,
    isAuthError,
    isDatabaseError,
    isErrorWithMessage,
    toErrorWithMessage,
} from '../../../src/utils/error-types.js';

describe('error-types utilities', () => {
    it('detects error objects with message', () => {
        expect(isErrorWithMessage({ message: 'hi' })).toBe(true);
        expect(isErrorWithMessage('nope')).toBe(false);
    });

    it('detects database errors', () => {
        expect(isDatabaseError({ message: 'db', code: 'SQLITE' })).toBe(true);
        expect(isDatabaseError({ message: 'db' })).toBe(false);
    });

    it('detects auth errors by code', () => {
        expect(isAuthError({ message: 'no', code: 'UNAUTHORIZED' })).toBe(true);
        expect(isAuthError({ message: 'no', code: 'SOMETHING_ELSE' })).toBe(false);
    });

    it('extracts error messages safely', () => {
        expect(getErrorMessage({ message: 'fail' })).toBe('fail');
        expect(getErrorMessage('literal')).toBe('literal');
        expect(getErrorMessage(42)).toBe('An unknown error occurred');
    });

    it('converts unknown values to ErrorWithMessage', () => {
        const result = toErrorWithMessage('oops');
        expect(result).toHaveProperty('message', 'oops');
        expect(toErrorWithMessage(new Error('boom')).message).toBe('boom');
    });
});
