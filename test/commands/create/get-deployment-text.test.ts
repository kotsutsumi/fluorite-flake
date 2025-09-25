import { describe, expect, it } from 'vitest';

import { getDeploymentText } from '../../../src/commands/create/get-deployment-text.js';

describe('getDeploymentText', () => {
    it('returns Vercel for Next.js', () => {
        expect(getDeploymentText('nextjs')).toBe('Vercel');
    });

    it('returns GitHub Releases for Tauri', () => {
        expect(getDeploymentText('tauri')).toBe('GitHub Releases');
    });

    it('returns Store Distribution for Flutter', () => {
        expect(getDeploymentText('flutter')).toBe('Store Distribution');
    });

    it('returns default Custom for unknown frameworks', () => {
        expect(getDeploymentText('unknown')).toBe('Custom');
    });
});
