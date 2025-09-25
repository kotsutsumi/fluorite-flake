import { describe, expect, it } from 'vitest';

import { slugify } from '../../src/utils/slugify.js';

describe('slugify', () => {
    it('normalizes strings into url-friendly slugs', () => {
        expect(slugify('Hello World')).toBe('hello-world');
        expect(slugify('  Hello---World  ')).toBe('hello-world');
        expect(slugify('FOO_bar Baz')).toBe('foo-bar-baz');
    });
});
