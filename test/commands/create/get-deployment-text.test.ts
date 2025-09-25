import { describe, expect, it } from 'vitest';

import { getDeploymentText } from '../../../src/commands/create/get-deployment-text.js';

describe('getDeploymentText', () => {
    it('maps known frameworks to friendly deployment names', () => {
        expect(getDeploymentText('nextjs')).toBe('Vercel');
        expect(getDeploymentText('tauri')).toBe('GitHub Releases');
        expect(getDeploymentText('flutter')).toBe('Store Distribution');
        expect(getDeploymentText('expo')).toBe('EAS Build');
    });

    it('returns Custom for unrecognised frameworks', () => {
        expect(getDeploymentText('svelte')).toBe('Custom');
    });
});
