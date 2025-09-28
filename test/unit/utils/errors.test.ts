import { describe, expect, it } from 'vitest';

import { ProvisioningError } from '../../../src/utils/cloud/errors.js';

describe('ProvisioningError', () => {
    it('stores message and name', () => {
        const error = new ProvisioningError('failed to provision');
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('failed to provision');
        expect(error.name).toBe('ProvisioningError');
    });

    it('preserves cause when provided', () => {
        const cause = new Error('root');
        const error = new ProvisioningError('outer', cause);
        expect(error.cause).toBe(cause);
    });
});
