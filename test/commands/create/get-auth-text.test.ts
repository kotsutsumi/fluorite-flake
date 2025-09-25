import { describe, expect, it } from 'vitest';

import { getAuthText } from '../../../src/commands/create/get-auth-text.js';

describe('getAuthText', () => {
    it('returns Better Auth for Next.js projects', () => {
        expect(getAuthText('nextjs')).toBe('Better Auth');
    });

    it('returns Expo Auth Session for Expo projects', () => {
        expect(getAuthText('expo')).toBe('Expo Auth Session');
    });

    it('falls back to Custom Auth for other frameworks', () => {
        expect(getAuthText('unknown')).toBe('Custom Auth');
    });
});
