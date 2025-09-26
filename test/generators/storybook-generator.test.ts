import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProjectConfig } from '../../src/commands/create/types.js';
import { setupStorybook } from '../../src/generators/storybook-generator.js';

describe('Storybook Generator', () => {
    const tempDir = path.join(__dirname, '../temp-storybook-generator');
    let testConfig: ProjectConfig;

    beforeEach(async () => {
        await fs.ensureDir(tempDir);
        testConfig = {
            projectName: 'test-storybook-project',
            projectPath: tempDir,
            framework: 'nextjs',
            database: 'none',
            storage: 'none',
            deployment: false,
            auth: false,
            storybook: true,
            packageManager: 'pnpm',
            mode: 'full',
        };
    });

    afterEach(async () => {
        await fs.remove(tempDir);
    });

    it('should setup Storybook files for Next.js project with storybook enabled', async () => {
        await setupStorybook(testConfig);

        // Verify Storybook configuration files
        expect(await fs.pathExists(path.join(tempDir, '.storybook/main.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(tempDir, '.storybook/preview.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(tempDir, '.storybook/manager.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(tempDir, '.storybook/test-runner.ts'))).toBe(true);

        // Verify Playwright configuration for Storybook
        expect(await fs.pathExists(path.join(tempDir, 'playwright-storybook.config.ts'))).toBe(
            true
        );

        // Verify story files
        expect(await fs.pathExists(path.join(tempDir, 'src/stories/Button.stories.tsx'))).toBe(
            true
        );
        expect(await fs.pathExists(path.join(tempDir, 'src/stories/Card.stories.tsx'))).toBe(true);
        expect(
            await fs.pathExists(path.join(tempDir, 'src/stories/Introduction.stories.tsx'))
        ).toBe(true);
    });

    it('should create proper Storybook main configuration', async () => {
        await setupStorybook(testConfig);

        const mainConfigPath = path.join(tempDir, '.storybook/main.ts');
        const mainConfig = await fs.readFile(mainConfigPath, 'utf-8');

        // Verify essential Storybook configuration
        expect(mainConfig).toContain('@storybook/nextjs');
        expect(mainConfig).toContain('@storybook/addon-essentials');
        expect(mainConfig).toContain('@storybook/addon-interactions');
        expect(mainConfig).toContain('@storybook/addon-a11y');
        expect(mainConfig).toContain('@storybook/addon-coverage');
        expect(mainConfig).toContain('../src/**/*.stories.@(js|jsx|mjs|ts|tsx)');
        expect(mainConfig).toContain('experimentalRSC: true');
        expect(mainConfig).toContain('interactionDebugger: true');
    });

    it('should create proper preview configuration with theming', async () => {
        await setupStorybook(testConfig);

        const previewConfigPath = path.join(tempDir, '.storybook/preview.ts');
        const previewConfig = await fs.readFile(previewConfigPath, 'utf-8');

        // Verify theme configuration
        expect(previewConfig).toContain('withThemeByClassName');
        expect(previewConfig).toContain(
            "themes: {\n        light: 'light',\n        dark: 'dark',"
        );
        expect(previewConfig).toContain("defaultTheme: 'light'");

        // Verify viewport configuration
        expect(previewConfig).toContain('viewport:');
        expect(previewConfig).toContain('mobile:', 'tablet:', 'desktop:');

        // Verify global CSS import
        expect(previewConfig).toContain("import '../src/app/globals.css'");
    });

    it('should create manager configuration with project branding', async () => {
        await setupStorybook(testConfig);

        const managerConfigPath = path.join(tempDir, '.storybook/manager.ts');
        const managerConfig = await fs.readFile(managerConfigPath, 'utf-8');

        // Verify project branding
        expect(managerConfig).toContain(`brandTitle: '${testConfig.projectName} Components'`);
        expect(managerConfig).toContain("brandUrl: 'http://localhost:3000'");
        expect(managerConfig).toContain("colorPrimary: '#0070f3'");
    });

    it('should create Button story with comprehensive variants', async () => {
        await setupStorybook(testConfig);

        const buttonStoryPath = path.join(tempDir, 'src/stories/Button.stories.tsx');
        const buttonStory = await fs.readFile(buttonStoryPath, 'utf-8');

        // Verify story structure
        expect(buttonStory).toContain("title: 'UI/Button'");
        expect(buttonStory).toContain('component: Button');
        expect(buttonStory).toContain("tags: ['autodocs']");

        // Verify button variants
        expect(buttonStory).toContain('export const Default:');
        expect(buttonStory).toContain('export const Secondary:');
        expect(buttonStory).toContain('export const Outline:');
        expect(buttonStory).toContain('export const Destructive:');
        expect(buttonStory).toContain('export const Ghost:');
        expect(buttonStory).toContain('export const Link:');

        // Verify interaction test
        expect(buttonStory).toContain('export const InteractiveTest:');
        expect(buttonStory).toContain('play: async');
        expect(buttonStory).toContain('userEvent.click(button)');
    });

    it('should create Card story with complex examples', async () => {
        await setupStorybook(testConfig);

        const cardStoryPath = path.join(tempDir, 'src/stories/Card.stories.tsx');
        const cardStory = await fs.readFile(cardStoryPath, 'utf-8');

        // Verify story structure
        expect(cardStory).toContain("title: 'UI/Card'");
        expect(cardStory).toContain('component: Card');

        // Verify card examples
        expect(cardStory).toContain('export const Default:');
        expect(cardStory).toContain('export const WithActions:');
        expect(cardStory).toContain('export const Interactive:');

        // Verify card components usage
        expect(cardStory).toContain('CardHeader');
        expect(cardStory).toContain('CardTitle');
        expect(cardStory).toContain('CardDescription');
        expect(cardStory).toContain('CardContent');
    });

    it('should create Introduction story with project information', async () => {
        await setupStorybook(testConfig);

        const introStoryPath = path.join(tempDir, 'src/stories/Introduction.stories.tsx');
        const introStory = await fs.readFile(introStoryPath, 'utf-8');

        // Verify project information
        expect(introStory).toContain(`<strong>${testConfig.projectName}</strong>`);
        expect(introStory).toContain(`<h1>${testConfig.projectName} Components</h1>`);
        expect(introStory).toContain('pnpm run storybook');
        expect(introStory).toContain('📱 <strong>Responsive Design</strong>');
        expect(introStory).toContain('♿ <strong>Accessibility</strong>');
        expect(introStory).toContain('🧪 <strong>Testing</strong>');
    });

    it('should create test-runner configuration', async () => {
        await setupStorybook(testConfig);

        const testRunnerPath = path.join(tempDir, '.storybook/test-runner.ts');
        const testRunnerConfig = await fs.readFile(testRunnerPath, 'utf-8');

        // Verify test runner configuration
        expect(testRunnerConfig).toContain('TestRunnerConfig');
        expect(testRunnerConfig).toContain('preVisit(page, context)');
        expect(testRunnerConfig).toContain('postVisit(page, context)');
        expect(testRunnerConfig).toContain('width: 1280, height: 720');
        expect(testRunnerConfig).toContain('tags:');
        expect(testRunnerConfig).toContain("include: ['test']");
    });

    it('should create Playwright Storybook configuration', async () => {
        await setupStorybook(testConfig);

        const playwrightConfigPath = path.join(tempDir, 'playwright-storybook.config.ts');
        const playwrightConfig = await fs.readFile(playwrightConfigPath, 'utf-8');

        // Verify Playwright configuration
        expect(playwrightConfig).toContain("testDir: './.storybook'");
        expect(playwrightConfig).toContain("baseURL: 'http://localhost:6006'");
        expect(playwrightConfig).toContain("command: 'pnpm run storybook'");
        expect(playwrightConfig).toContain('port: 6006');
        expect(playwrightConfig).toContain("outputDir: 'test-results/storybook/'");
    });

    it('should not setup Storybook when storybook is false', async () => {
        testConfig.storybook = false;
        await setupStorybook(testConfig);

        // Verify no Storybook files are created
        expect(await fs.pathExists(path.join(tempDir, '.storybook'))).toBe(false);
        expect(await fs.pathExists(path.join(tempDir, 'src/stories'))).toBe(false);
        expect(await fs.pathExists(path.join(tempDir, 'playwright-storybook.config.ts'))).toBe(
            false
        );
    });

    it('should not setup Storybook for non-Next.js frameworks', async () => {
        testConfig.framework = 'expo';
        testConfig.storybook = true;
        await setupStorybook(testConfig);

        // Verify no Storybook files are created for non-Next.js frameworks
        expect(await fs.pathExists(path.join(tempDir, '.storybook'))).toBe(false);
        expect(await fs.pathExists(path.join(tempDir, 'src/stories'))).toBe(false);
    });

    it('should create package.json with Storybook scripts and dependencies', async () => {
        // Create a basic package.json first
        const packageJson = {
            name: testConfig.projectName,
            version: '1.0.0',
            scripts: {
                dev: 'next dev',
                build: 'next build',
            },
            dependencies: {},
            devDependencies: {},
        };

        await fs.writeJSON(path.join(tempDir, 'package.json'), packageJson);

        await setupStorybook(testConfig);

        const updatedPackageJson = await fs.readJSON(path.join(tempDir, 'package.json'));

        // Verify Storybook scripts
        expect(updatedPackageJson.scripts.storybook).toBe('storybook dev -p 6006');
        expect(updatedPackageJson.scripts['build-storybook']).toBe('storybook build');
        expect(updatedPackageJson.scripts['test:storybook']).toBe('test-storybook');
        expect(updatedPackageJson.scripts['test:storybook:ci']).toBe(
            'concurrently -k -s first -n "SB,TEST" -c "magenta,blue" "pnpm build-storybook --quiet" "wait-on tcp:6006 && test-storybook"'
        );

        // Verify Storybook dependencies
        expect(updatedPackageJson.devDependencies).toHaveProperty('@storybook/addon-a11y');
        expect(updatedPackageJson.devDependencies).toHaveProperty('@storybook/addon-coverage');
        expect(updatedPackageJson.devDependencies).toHaveProperty('@storybook/addon-essentials');
        expect(updatedPackageJson.devDependencies).toHaveProperty('@storybook/addon-interactions');
        expect(updatedPackageJson.devDependencies).toHaveProperty('@storybook/nextjs');
        expect(updatedPackageJson.devDependencies).toHaveProperty('@storybook/test-runner');
        expect(updatedPackageJson.devDependencies).toHaveProperty('storybook');
    });

    it('should handle different package managers in scripts', async () => {
        testConfig.packageManager = 'yarn';

        // Create a basic package.json first
        const packageJson = {
            name: testConfig.projectName,
            version: '1.0.0',
            scripts: {},
            dependencies: {},
            devDependencies: {},
        };

        await fs.writeJSON(path.join(tempDir, 'package.json'), packageJson);

        await setupStorybook(testConfig);

        const updatedPackageJson = await fs.readJSON(path.join(tempDir, 'package.json'));

        // Verify scripts still use the default commands (package manager is handled at runtime)
        expect(updatedPackageJson.scripts.storybook).toBe('storybook dev -p 6006');
        expect(updatedPackageJson.scripts['test:storybook:ci']).toContain('pnpm build-storybook');
    });
});
