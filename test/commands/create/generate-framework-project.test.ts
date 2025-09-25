import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateFrameworkProject } from '../../../src/commands/create/generate-framework-project.js';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

const spies = vi.hoisted(() => ({
    next: vi.fn(),
    expo: vi.fn(),
    tauri: vi.fn(),
    flutter: vi.fn(),
}));

vi.mock('../../../src/generators/next-generator.js', () => ({
    generateNextProject: spies.next,
}));
vi.mock('../../../src/generators/expo-generator.js', () => ({
    generateExpoProject: spies.expo,
}));
vi.mock('../../../src/generators/tauri-generator.js', () => ({
    generateTauriProject: spies.tauri,
}));
vi.mock('../../../src/generators/flutter-generator.js', () => ({
    generateFlutterProject: spies.flutter,
}));

const baseConfig: ProjectConfig = {
    projectName: 'demo-app',
    projectPath: '/tmp/demo-app',
    framework: 'nextjs',
    database: 'none',
    deployment: false,
    storage: 'none',
    auth: false,
    packageManager: 'pnpm',
    mode: 'full',
};

describe('generateFrameworkProject', () => {
    beforeEach(() => {
        spies.next.mockClear();
        spies.expo.mockClear();
        spies.tauri.mockClear();
        spies.flutter.mockClear();
    });

    it('delegates to Next.js generator', async () => {
        const config = { ...baseConfig, framework: 'nextjs' } as ProjectConfig;
        await generateFrameworkProject(config);
        expect(spies.next).toHaveBeenCalledTimes(1);
        expect(spies.next).toHaveBeenCalledWith(config);
    });

    it('delegates to Expo generator', async () => {
        await generateFrameworkProject({ ...baseConfig, framework: 'expo' });
        expect(spies.expo).toHaveBeenCalledTimes(1);
    });

    it('delegates to Tauri generator', async () => {
        await generateFrameworkProject({ ...baseConfig, framework: 'tauri' });
        expect(spies.tauri).toHaveBeenCalledTimes(1);
    });

    it('delegates to Flutter generator', async () => {
        await generateFrameworkProject({ ...baseConfig, framework: 'flutter' });
        expect(spies.flutter).toHaveBeenCalledTimes(1);
    });

    it('throws for unsupported frameworks', async () => {
        await expect(
            generateFrameworkProject({
                ...baseConfig,
                // @ts-expect-error intentional invalid framework for test
                framework: 'sveltekit',
            })
        ).rejects.toThrowError('Unsupported framework: sveltekit');
    });
});
