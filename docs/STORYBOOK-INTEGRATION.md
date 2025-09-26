# Storybook Integration Guide

This guide covers the comprehensive Storybook integration available in fluorite-flake for Next.js projects.

## 🎨 Features

### Core Storybook Setup
- **Modern Storybook 8.x** with Vite builder for optimal performance
- **Next.js Integration** with full App Router support
- **TypeScript** configuration with proper type checking
- **Essential Addons** for development and testing
- **Theme Support** with light/dark mode switching
- **Responsive Design** testing with viewport controls

### Testing Integration
- **Playwright E2E Tests** for Storybook components
- **Interaction Testing** with @storybook/addon-interactions
- **Accessibility Testing** with @storybook/addon-a11y
- **Visual Regression Testing** support
- **Performance Monitoring** with CI integration

### CI/CD Optimization
- **Build Sharing** between test workers for faster CI
- **Parallel Test Execution** with Playwright sharding
- **Intelligent Caching** of Storybook builds
- **Performance Benchmarking** and monitoring

## 🚀 Getting Started

### During Project Creation

When creating a new Next.js project, you'll be prompted:

```bash
fluorite-flake create
# ... other prompts
? Setup Storybook for component development and testing? (y/N)
```

Select `y` to enable Storybook integration.

### Generated Project Structure

```
your-project/
├── .storybook/                 # Storybook configuration
│   ├── main.ts                 # Main Storybook config
│   ├── preview.ts              # Preview configuration
│   ├── manager.ts              # Manager UI customization
│   └── test-runner.ts          # Test runner configuration
├── src/
│   └── stories/                # Example stories
│       ├── Introduction.stories.tsx
│       ├── Button.stories.tsx
│       └── Card.stories.tsx
├── playwright-storybook.config.ts  # Playwright config for Storybook
└── package.json                # Updated with Storybook scripts
```

## 📚 Available Commands

### Development
```bash
# Start Storybook development server
pnpm run storybook

# Build Storybook for production
pnpm run build-storybook
```

### Testing
```bash
# Run Storybook interaction tests
pnpm run test:storybook

# Run Storybook tests in CI mode
pnpm run test:storybook:ci

# Run all E2E tests (including Storybook)
pnpm run test:e2e

# Run only Storybook E2E tests
pnpm run test:e2e:storybook
```

## 🧪 Writing Stories

### Basic Story Structure

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};
```

### Interactive Stories with Tests

```tsx
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
```

## 🎨 Theming and Design System

### Theme Configuration

The generated Storybook includes automatic theme switching:

```tsx
// .storybook/preview.ts
import { withThemeByClassName } from '@storybook/addon-themes';

export const decorators = [
  withThemeByClassName({
    themes: {
      light: 'light',
      dark: 'dark',
    },
    defaultTheme: 'light',
  }),
];
```

### Responsive Testing

Built-in viewport configurations for different screen sizes:

- **Mobile**: 375x667px
- **Tablet**: 768x1024px
- **Desktop**: 1440x900px

## 🧪 Testing Strategy

### Test Hierarchy

1. **Component Tests**: Individual component behavior
2. **Interaction Tests**: User interaction flows
3. **Visual Tests**: Visual regression detection
4. **E2E Tests**: Full application integration

### Example Interaction Test

```tsx
import { within, userEvent, expect } from '@storybook/test';

export const FormInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test form interaction
    const input = canvas.getByLabelText('Email');
    const button = canvas.getByRole('button', { name: /submit/i });

    await userEvent.type(input, 'test@example.com');
    await userEvent.click(button);

    await expect(canvas.getByText('Success')).toBeInTheDocument();
  },
};
```

## ⚡ Performance Optimization

### CI/CD Performance Features

#### Build Sharing
- Storybook builds are shared between test workers
- Reduces redundant build time by 60-80%
- Intelligent caching based on dependency changes

#### Parallel Execution
- Tests run in parallel across multiple shards
- Automatic load balancing
- Optimal resource utilization

#### Caching Strategy
```yaml
# Example GitHub Actions cache configuration
- name: Cache Storybook builds
  uses: actions/cache@v4
  with:
    path: .temp-shared-storybook
    key: storybook-builds-${{ github.sha }}
```

### Local Development Optimization

#### Fast Refresh
- Hot module replacement for instant updates
- Optimized webpack configuration
- Memory-efficient development server

#### Intelligent Rebuilding
- Only rebuilds changed components
- Dependency graph optimization
- Incremental compilation

## 🔧 Configuration

### Storybook Main Configuration

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-coverage',
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
};
```

### Playwright Configuration

```typescript
// playwright-storybook.config.ts
export default defineConfig({
  testDir: './.storybook',
  use: {
    baseURL: 'http://localhost:6006',
  },
  webServer: {
    command: 'pnpm run storybook',
    port: 6006,
  },
});
```

## 🚀 Deployment

### Building for Production

```bash
# Build Storybook for deployment
pnpm run build-storybook

# Deploy to Vercel, Netlify, or any static host
npx vercel deploy storybook-static
```

### Environment Variables

```bash
# .env.local
STORYBOOK_ENV=production
STORYBOOK_BASE_URL=https://your-storybook.com
```

## 🔍 Troubleshooting

### Common Issues

#### Storybook Not Starting
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run storybook
```

#### TypeScript Errors
```bash
# Regenerate TypeScript definitions
pnpm run build
pnpm run storybook
```

#### Test Failures
```bash
# Run tests with verbose output
pnpm run test:storybook --verbose

# Check Playwright logs
PWDEBUG=1 pnpm run test:e2e:storybook
```

### Performance Issues

#### Slow Build Times
- Enable webpack caching in development
- Reduce story complexity
- Use code splitting for large components

#### Memory Issues
- Limit concurrent stories
- Use story loading optimization
- Monitor webpack bundle analyzer

## 📊 Metrics and Monitoring

### Performance Metrics
- **Build Time**: Target < 30s for development
- **Test Execution**: Target < 2min for full suite
- **Bundle Size**: Monitor component bundle impact
- **Memory Usage**: Track development server efficiency

### Quality Metrics
- **Story Coverage**: Aim for 100% component coverage
- **Accessibility Score**: Target WCAG AA compliance
- **Interaction Test Coverage**: Cover critical user flows
- **Visual Regression**: Track UI consistency

## 🤝 Contributing

### Adding New Stories
1. Create story file following naming convention
2. Include comprehensive examples
3. Add interaction tests for critical flows
4. Update documentation for complex components

### Improving Performance
1. Profile existing bottlenecks
2. Implement optimization with metrics
3. Test impact across different scenarios
4. Document performance improvements

### Testing Enhancements
1. Identify testing gaps
2. Add comprehensive test coverage
3. Ensure cross-browser compatibility
4. Validate accessibility compliance

## 📚 Additional Resources

- [Storybook Documentation](https://storybook.js.org/)
- [Playwright Testing](https://playwright.dev/)
- [Next.js Integration](https://storybook.js.org/docs/react/get-started/nextjs)
- [Accessibility Testing](https://storybook.js.org/addons/@storybook/addon-a11y)
- [Interaction Testing](https://storybook.js.org/docs/react/writing-tests/interaction-testing)