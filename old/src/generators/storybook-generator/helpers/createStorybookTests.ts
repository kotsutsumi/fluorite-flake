import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Storybookテスト設定作成
 * test-runner設定とPlaywright統合設定を作成
 */

/**
 * Storybookテスト設定を作成する関数
 * test-runner設定とPlaywright統合設定を作成
 * @param config プロジェクト設定
 */
export async function createStorybookTests(config: ProjectConfig) {
    // テストランナー設定を作成
    const testRunnerConfig = `import type { TestRunnerConfig } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  setup() {
    // グローバルテストセットアップ
  },
  async preVisit(page, context) {
    // 各ストーリー訪問前に実行するアクション
    await page.setViewportSize({ width: 1280, height: 720 });
  },
  async postVisit(page, context) {
    // 各ストーリー訪問後に実行するアクション
    // コンソールエラーをチェック
    const logs = await page.evaluate(() => {
      return window.console;
    });

    // ここにカスタムアサーションを追加できます
  },
  tags: {
    include: ['test'],
    exclude: ['skip-test'],
    skip: ['broken'],
  },
};

export default config;
`;

    // テストランナー設定ファイルを書き込み
    await fs.writeFile(
        path.join(config.projectPath, '.storybook/test-runner.ts'),
        testRunnerConfig
    );

    // Storybook用Playwright設定を作成
    const storybookPlaywrightConfig = `import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Storybook tests
 * This runs in addition to main E2E tests
 */
export default defineConfig({
  testDir: './.storybook',
  testMatch: '**/*.test.ts',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/storybook-html' }],
    ['junit', { outputFile: 'test-results/storybook-junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:6006',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: '${config.packageManager} run storybook',
    port: 6006,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  outputDir: 'test-results/storybook/',
});
`;

    // Storybook用Playwright設定ファイルを書き込み
    await fs.writeFile(
        path.join(config.projectPath, 'playwright-storybook.config.ts'),
        storybookPlaywrightConfig
    );
}
