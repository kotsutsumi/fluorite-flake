import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Storybookサンプルストーリーファイル作成
 * Button、Card、Introductionストーリーを含む包括的なサンプル
 */

/**
 * サンプルストーリーファイルを作成する関数
 * Button、Card、Introductionストーリーを含む包括的なサンプル
 * @param config プロジェクト設定
 */
export async function createExampleStories(config: ProjectConfig) {
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
