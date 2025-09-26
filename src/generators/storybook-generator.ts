import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create/types.js';
import { createScopedLogger } from '../utils/logger.js';

const logger = createScopedLogger('storybook');

export async function setupStorybook(config: ProjectConfig) {
    if (!config.storybook || config.framework !== 'nextjs') {
        return;
    }

    logger.step('Setting up Storybook with modern configuration...');

    await createStorybookConfig(config);
    await createStorybookMain(config);
    await createStorybookPreview(config);
    await createStorybookManager(config);
    await createExampleStories(config);
    await setupStorybookScripts(config);
    await createStorybookTests(config);

    logger.success('Storybook configured with Playwright integration');
}

async function createStorybookConfig(config: ProjectConfig) {
    // Storybook directory structure
    const storybookDir = path.join(config.projectPath, '.storybook');
    await fs.ensureDir(storybookDir);

    // Main configuration for Storybook 8.x with Vite
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
    // Environment variables for Storybook
    STORYBOOK_ENV: 'true',
  }),
};

export default config;
`;

    await fs.writeFile(path.join(storybookDir, 'main.ts'), mainConfig);
}

async function createStorybookMain(_config: ProjectConfig) {
    // This function is already handled by createStorybookConfig
    // Keeping for potential future separation of concerns
}

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

    await fs.writeFile(path.join(storybookDir, 'preview.ts'), previewConfig);
}

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

    await fs.writeFile(path.join(storybookDir, 'manager.ts'), managerConfig);
}

async function createExampleStories(config: ProjectConfig) {
    const storiesDir = path.join(config.projectPath, 'src/stories');
    await fs.ensureDir(storiesDir);

    // Button component story
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

// Interactive test example
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

    await fs.writeFile(path.join(storiesDir, 'Button.stories.tsx'), buttonStory);

    // Card component story
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

    await fs.writeFile(path.join(storiesDir, 'Card.stories.tsx'), cardStory);

    // Introduction story
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

    await fs.writeFile(path.join(storiesDir, 'Introduction.stories.tsx'), introStory);
}

async function setupStorybookScripts(config: ProjectConfig) {
    const packageJsonPath = path.join(config.projectPath, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);

        // Add Storybook scripts
        packageJson.scripts = {
            ...packageJson.scripts,
            storybook: 'storybook dev -p 6006',
            'build-storybook': 'storybook build',
            'test:storybook': 'test-storybook',
            'test:storybook:ci':
                'concurrently -k -s first -n "SB,TEST" -c "magenta,blue" "pnpm build-storybook --quiet" "wait-on tcp:6006 && test-storybook"',
        };

        // Add Storybook dependencies to devDependencies
        packageJson.devDependencies = {
            ...packageJson.devDependencies,
            '@storybook/addon-a11y': '^8.4.6',
            '@storybook/addon-coverage': '^1.0.4',
            '@storybook/addon-docs': '^8.4.6',
            '@storybook/addon-essentials': '^8.4.6',
            '@storybook/addon-interactions': '^8.4.6',
            '@storybook/addon-styling-webpack': '^1.0.0',
            '@storybook/addon-themes': '^8.4.6',
            '@storybook/addon-viewport': '^8.4.6',
            '@storybook/blocks': '^8.4.6',
            '@storybook/nextjs': '^8.4.6',
            '@storybook/react': '^8.4.6',
            '@storybook/test': '^8.4.6',
            '@storybook/test-runner': '^0.19.1',
            concurrently: '^9.1.0',
            'wait-on': '^8.0.1',
            storybook: '^8.4.6',
        };

        await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    }
}

async function createStorybookTests(config: ProjectConfig) {
    // Create test-runner configuration
    const testRunnerConfig = `import type { TestRunnerConfig } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  setup() {
    // Global test setup
  },
  async preVisit(page, context) {
    // Actions to perform before visiting each story
    await page.setViewportSize({ width: 1280, height: 720 });
  },
  async postVisit(page, context) {
    // Actions to perform after visiting each story
    // Check for console errors
    const logs = await page.evaluate(() => {
      return window.console;
    });

    // You can add custom assertions here
  },
  tags: {
    include: ['test'],
    exclude: ['skip-test'],
    skip: ['broken'],
  },
};

export default config;
`;

    await fs.writeFile(
        path.join(config.projectPath, '.storybook/test-runner.ts'),
        testRunnerConfig
    );

    // Create Playwright configuration for Storybook
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

    await fs.writeFile(
        path.join(config.projectPath, 'playwright-storybook.config.ts'),
        storybookPlaywrightConfig
    );
}
