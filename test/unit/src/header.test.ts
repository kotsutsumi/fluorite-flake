import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { printHeader } from '../../../src/header.js';

// Mock chalk
vi.mock('chalk', () => ({
    default: {
        bold: {
            cyan: vi.fn((text: string) => `[BOLD_CYAN]${text}[/BOLD_CYAN]`),
        },
        gray: vi.fn((text: string) => `[GRAY]${text}[/GRAY]`),
        cyan: vi.fn((text: string) => `[CYAN]${text}[/CYAN]`),
        white: vi.fn((text: string) => `[WHITE]${text}[/WHITE]`),
    },
}));

// Mock package.json
vi.mock('../../../package.json', () => ({
    default: {
        version: '0.5.0',
    },
}));

describe('header utilities', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
            /* intentionally empty - mock console.log */
        });
        vi.clearAllMocks();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('printHeader', () => {
        it('should print header with correct formatting', () => {
            printHeader();

            // Check that console.log was called multiple times
            expect(consoleSpy).toHaveBeenCalledTimes(5);

            // Check the calls in order
            const calls = consoleSpy.mock.calls;

            // First call: empty line
            expect(calls[0]).toEqual(['']);

            // Second call: title line with name and version
            expect(calls[1][0]).toContain('[CYAN]>[/CYAN]');
            expect(calls[1][0]).toContain('[BOLD_CYAN]Fluorite Flake[/BOLD_CYAN]');
            expect(calls[1][0]).toContain('[GRAY]v0.5.0[/GRAY]');

            // Third call: underline (should be white dashes)
            expect(calls[2][0]).toContain('[WHITE]');
            expect(calls[2][0]).toContain('─');

            // Fourth call: tagline with proper indentation
            expect(calls[3][0]).toContain('  [GRAY]Boilerplate generator CLI for Fluorite[/GRAY]');

            // Fifth call: empty line
            expect(calls[4]).toEqual(['']);
        });

        it('should use correct colors for each element', () => {
            printHeader();

            const calls = consoleSpy.mock.calls;
            const titleLine = calls[1][0];
            const underline = calls[2][0];
            const tagline = calls[3][0];

            // Title line should contain colored elements
            expect(titleLine).toContain('[CYAN]>[/CYAN]'); // Arrow
            expect(titleLine).toContain('[BOLD_CYAN]Fluorite Flake[/BOLD_CYAN]'); // Name
            expect(titleLine).toContain('[GRAY]v0.5.0[/GRAY]'); // Version

            // Underline should be white
            expect(underline).toContain('[WHITE]');
            expect(underline).toContain('─');

            // Tagline should be gray
            expect(tagline).toContain('[GRAY]Boilerplate generator CLI for Fluorite[/GRAY]');
        });

        it('should format the version correctly', () => {
            printHeader();

            const calls = consoleSpy.mock.calls;
            const titleLine = calls[1][0];

            // Version should have 'v' prefix and be in gray
            expect(titleLine).toContain('[GRAY]v0.5.0[/GRAY]');
        });

        it('should include proper spacing and indentation', () => {
            printHeader();

            const calls = consoleSpy.mock.calls;

            // Should start with empty line
            expect(calls[0]).toEqual(['']);

            // Tagline should have 2-space indentation
            expect(calls[3][0]).toMatch(/^ {2}/);

            // Should end with empty line
            expect(calls[4]).toEqual(['']);
        });

        it('should generate underline with appropriate length', () => {
            printHeader();

            const calls = consoleSpy.mock.calls;
            const underline = calls[2][0];

            // Underline should contain multiple dash characters
            expect(underline).toMatch(/─+/);
            expect(underline).toContain('[WHITE]');
        });
    });
});
