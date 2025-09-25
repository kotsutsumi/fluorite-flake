import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

const nextGeneratorMock = vi.fn();
const expoGeneratorMock = vi.fn();
const tauriGeneratorMock = vi.fn();
const flutterGeneratorMock = vi.fn();

vi.mock('../../../src/generators/next-generator.js', () => ({
    generateNextProject: nextGeneratorMock,
}));

vi.mock('../../../src/generators/expo-generator.js', () => ({
    generateExpoProject: expoGeneratorMock,
}));

vi.mock('../../../src/generators/tauri-generator.js', () => ({
    generateTauriProject: tauriGeneratorMock,
}));

vi.mock('../../../src/generators/flutter-generator.js', () => ({
    generateFlutterProject: flutterGeneratorMock,
}));

const { generateFrameworkProject } = await import(
    '../../../src/commands/create/generate-framework-project.js'
);

const baseConfig: ProjectConfig = {
    projectName: 'sample-app',
    projectPath: './sample-app',
    framework: 'nextjs',
    database: 'none',
    deployment: false,
    storage: 'none',
    auth: false,
    packageManager: 'pnpm',
    mode: 'full',
};

const frameworkScenarios: Array<{
    framework: ProjectConfig['framework'];
    mock: ReturnType<typeof vi.fn>;
}> = [
    { framework: 'nextjs', mock: nextGeneratorMock },
    { framework: 'expo', mock: expoGeneratorMock },
    { framework: 'tauri', mock: tauriGeneratorMock },
    { framework: 'flutter', mock: flutterGeneratorMock },
];

afterEach(() => {
    vi.clearAllMocks();
});

describe('generateFrameworkProject', () => {
    for (const scenario of frameworkScenarios) {
        it(`calls the correct generator for ${scenario.framework} projects`, async () => {
            await generateFrameworkProject({ ...baseConfig, framework: scenario.framework });

            expect(scenario.mock).toHaveBeenCalledTimes(1);
            for (const { mock, framework } of frameworkScenarios) {
                if (framework !== scenario.framework) {
                    expect(mock).not.toHaveBeenCalled();
                }
            }
        });
    }

    it('throws when framework is unsupported', async () => {
        const invalidConfig = {
            ...baseConfig,
            framework: 'svelte',
        } as ProjectConfig;

        await expect(generateFrameworkProject(invalidConfig)).rejects.toThrow(
            'Unsupported framework: svelte'
        );
    });
});
