import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create/types.js';
import { createScopedLogger } from '../utils/logger.js';

// Storybook用のスコープ付きロガーを作成
const logger = createScopedLogger('storybook');

/**
 * Storybookをセットアップするメイン関数
 * Next.jsプロジェクト用のStorybook 8.x設定、コンポーネントストーリー、Playwright統合を実装
 * @param config プロジェクト設定
 */
export async function setupStorybook(config: ProjectConfig) {
    // Storybookが有効でかつNext.jsプロジェクトのみ処理
    if (!config.storybook || config.framework !== 'nextjs') {
        return;
    }

    logger.step('Setting up Storybook with modern configuration...');

    // Storybookの各種設定ファイルとコンポーネントを作成
    await createStorybookConfig(config); // メイン設定ファイル
    await createStorybookMain(config); // メイン設定（代替）
    await createStorybookPreview(config); // プレビュー設定
    await createStorybookManager(config); // マネージャー設定
    await createExampleStories(config); // サンプルストーリー
    await setupStorybookScripts(config); // スクリプトと依存関係
    await createStorybookTests(config); // テスト設定

    logger.success('Storybook configured with Playwright integration');
}

/**
 * Storybookのメイン設定ファイルを作成する関数
 * Storybook 8.x用のモダン設定、Next.js統合、アドオン設定を含む
 * @param config プロジェクト設定
 */
async function createStorybookConfig(config: ProjectConfig) {
    // Storybookディレクトリ構造を作成
    const storybookDir = path.join(config.projectPath, '.storybook');
    await fs.ensureDir(storybookDir);

    // Viteを使用したStorybook 8.xのメイン設定
    const mainConfig = `import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/**/*.mdx'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-coverage',
    '@storybook/addon-viewport',
    '@storybook/addon-docs',
    {
      name: '@storybook/addon-styling-webpack',
      options: {
        rules: [
          {
            test: /\\.css$/,
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: { importLoaders: 1 },
              },
              'postcss-loader',
            ],
          },
        ],
      },
    },
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: '../next.config.mjs',
    },
  },
  features: {
    experimentalRSC: true,
    interactionDebugger: true,
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  core: {
    disableTelemetry: true,
  },
  staticDirs: ['../public'],
  build: {
    test: {
      disabledAddons: [
        '@storybook/addon-docs',
        '@storybook/addon-essentials/docs',
      ],
    },
  },
  env: (config) => ({
    ...config,
    // Storybook用の環境変数
    STORYBOOK_ENV: 'true',
  }),
};

export default config;
`;

    // メイン設定ファイルを書き込み
    await fs.writeFile(path.join(storybookDir, 'main.ts'), mainConfig);
}

/**
 * Storybookメイン設定関数（代替）
 * 現在はcreateStorybookConfigで処理されている
 * 将来の関心の分離のために保持
 * @param _config プロジェクト設定（未使用）
 */
async function createStorybookMain(_config: ProjectConfig) {
    // この関数は既にcreateStorybookConfigで処理されている
    // 将来の関心の分離のために保持
}

/**
 * Storybookプレビュー設定ファイルを作成する関数
 * テーマ、ビューポート、グローバルスタイル、デコレーター設定を含む
 * @param config プロジェクト設定
 */
async function createStorybookPreview(config: ProjectConfig) {
    const storybookDir = path.join(config.projectPath, '.storybook');

    const previewConfig = `import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
      defaultViewport: 'desktop',
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
  tags: ['autodocs'],
};

export default preview;
`;

    // プレビュー設定ファイルを書き込み
    await fs.writeFile(path.join(storybookDir, 'preview.ts'), previewConfig);
}

/**
 * Storybookマネージャー設定ファイルを作成する関数
 * UIテーマ、ブランド設定、サイドバー、ツールバーのカスタマイズ
 * @param config プロジェクト設定
 */
async function createStorybookManager(config: ProjectConfig) {
    const storybookDir = path.join(config.projectPath, '.storybook');

    const managerConfig = `import { addons } from '@storybook/manager-api';
import { themes } from '@storybook/theming';

addons.setConfig({
  theme: {
    ...themes.light,
    brandTitle: '${config.projectName} Components',
    brandUrl: 'http://localhost:3000',
    colorPrimary: '#0070f3',
    colorSecondary: '#1976d2',
  },
  sidebar: {
    showRoots: false,
    collapsedRoots: ['other'],
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});
`;

    // マネージャー設定ファイルを書き込み
    await fs.writeFile(path.join(storybookDir, 'manager.ts'), managerConfig);
}

/**
 * サンプルストーリーファイルを作成する関数
 * Button、Card、Introductionストーリーを含む包括的なサンプル
 * @param config プロジェクト設定
 */
async function createExampleStories(config: ProjectConfig) {
    // ストーリーディレクトリを作成
    const storiesDir = path.join(config.projectPath, 'src/stories');
    await fs.ensureDir(storiesDir);

    // Buttonコンポーネントストーリー
    const buttonStory = `import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from '../components/ui/button';

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and sizes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
};

export const Link: Story = {
  args: {
    children: 'Link',
    variant: 'link',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

// インタラクティブテストの例
export const InteractiveTest: Story = {
  args: {
    children: 'Click me!',
  },
  play: async ({ canvasElement, step }) => {
    const { within, userEvent, expect } = await import('@storybook/test');
    const canvas = within(canvasElement);

    await step('Button should be clickable', async () => {
      const button = canvas.getByRole('button');
      await expect(button).toBeInTheDocument();
      await userEvent.click(button);
    });
  },
};
`;

    // Buttonストーリーファイルを書き込み
    await fs.writeFile(path.join(storiesDir, 'Button.stories.tsx'), buttonStory);

    // Cardコンポーネントストーリー
    const cardStory = `import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component for displaying content.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
    </Card>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Card</CardTitle>
          <Badge variant="secondary">New</Badge>
        </div>
        <CardDescription>
          A sample project card with actions and status indicator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This is an example of a more complex card with multiple elements.
          </p>
          <div className="flex gap-2">
            <Button size="sm">View</Button>
            <Button size="sm" variant="outline">
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Click the button to test interactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => alert('Button clicked!')}>
          Click Me
        </Button>
      </CardContent>
    </Card>
  ),
  play: async ({ canvasElement, step }) => {
    const { within, userEvent, expect } = await import('@storybook/test');
    const canvas = within(canvasElement);

    await step('Card should contain interactive elements', async () => {
      const button = canvas.getByRole('button', { name: /click me/i });
      await expect(button).toBeInTheDocument();
      await expect(canvas.getByText('Interactive Card')).toBeInTheDocument();
    });
  },
};
`;

    // Cardストーリーファイルを書き込み
    await fs.writeFile(path.join(storiesDir, 'Card.stories.tsx'), cardStory);

    // イントロダクションストーリー
    const introStory = `import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Introduction',
  parameters: {
    layout: 'centered',
    docs: {
      page: () => (
        <div className="prose max-w-none">
          <h1>${config.projectName} Components</h1>
          <p>
            Welcome to the Storybook for <strong>${config.projectName}</strong>.
            This documentation showcases all available UI components with
            interactive examples and comprehensive documentation.
          </p>

          <h2>Features</h2>
          <ul>
            <li>🎨 <strong>Theme Support</strong> - Light and dark themes</li>
            <li>📱 <strong>Responsive Design</strong> - Mobile-first approach</li>
            <li>♿ <strong>Accessibility</strong> - WCAG compliant components</li>
            <li>🧪 <strong>Testing</strong> - Interaction tests with Playwright</li>
            <li>📖 <strong>Documentation</strong> - Auto-generated docs</li>
          </ul>

          <h2>Getting Started</h2>
          <p>
            Navigate through the sidebar to explore different components.
            Each component includes:
          </p>
          <ul>
            <li>Interactive controls to modify props</li>
            <li>Multiple usage examples</li>
            <li>Accessibility information</li>
            <li>Source code snippets</li>
          </ul>

          <h2>Development</h2>
          <pre><code>{${'`'}
# Start Storybook development server
${config.packageManager} run storybook

# Run Storybook tests
${config.packageManager} run test:storybook

# Build Storybook for production
${config.packageManager} run build-storybook
          {${'`'}}</code></pre>
        </div>
      ),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {};
`;

    // イントロダクションストーリーファイルを書き込み
    await fs.writeFile(path.join(storiesDir, 'Introduction.stories.tsx'), introStory);
}

/**
 * Storybook関連のスクリプトと依存関係をセットアップする関数
 * package.jsonにスクリプトとdevDependenciesを追加
 * @param config プロジェクト設定
 */
async function setupStorybookScripts(config: ProjectConfig) {
    const packageJsonPath = path.join(config.projectPath, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);

        // Storybookスクリプトを追加
        packageJson.scripts = {
            ...packageJson.scripts,
            storybook: 'storybook dev -p 6006', // 開発サーバー起動
            'build-storybook': 'storybook build', // プロダクションビルド
            'test:storybook': 'test-storybook', // ストーリーテスト実行
            'test:storybook:ci': // CI環境用テスト
                'concurrently -k -s first -n "SB,TEST" -c "magenta,blue" "pnpm build-storybook --quiet" "wait-on tcp:6006 && test-storybook"',
        };

        // Storybook依存関係をdevDependenciesに追加
        packageJson.devDependencies = {
            ...packageJson.devDependencies,
            '@storybook/addon-a11y': '^8.4.6', // アクセシビリティアドオン
            '@storybook/addon-coverage': '^1.0.4', // コードカバレッジアドオン
            '@storybook/addon-docs': '^8.4.6', // ドキュメント生成アドオン
            '@storybook/addon-essentials': '^8.4.6', // 基本アドオン集
            '@storybook/addon-interactions': '^8.4.6', // インタラクションテスト
            '@storybook/addon-styling-webpack': '^1.0.0', // CSSスタイリング
            '@storybook/addon-themes': '^8.4.6', // テーマ切り替え
            '@storybook/addon-viewport': '^8.4.6', // ビューポート設定
            '@storybook/blocks': '^8.4.6', // ドキュメントブロック
            '@storybook/nextjs': '^8.4.6', // Next.jsフレームワーク
            '@storybook/react': '^8.4.6', // Reactサポート
            '@storybook/test': '^8.4.6', // テストユーティリティ
            '@storybook/test-runner': '^0.19.1', // テストランナー
            concurrently: '^9.1.0', // 並行コマンド実行
            'wait-on': '^8.0.1', // サービス待機ユーティリティ
            storybook: '^8.4.6', // Storybookコア
        };

        // 更新されたpackage.jsonを書き込み
        await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    }
}

/**
 * Storybookテスト設定を作成する関数
 * test-runner設定とPlaywright統合設定を作成
 * @param config プロジェクト設定
 */
async function createStorybookTests(config: ProjectConfig) {
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
