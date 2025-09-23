import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';
import { generatePackageJson } from '../utils/package-json.js';

export async function generateNextProject(config: ProjectConfig) {
  // Create project directory
  await fs.ensureDir(config.projectPath);

  // Create Next.js app structure
  await createNextAppStructure(config);

  // Setup package.json
  await generatePackageJson(config);

  // Setup TypeScript
  await setupTypeScript(config);

  // Setup TailwindCSS v4
  await setupTailwind(config);

  // Setup Biome and Ultracite
  await setupLinters(config);

  // Create Next.js configuration files BEFORE shadcn/ui
  await createNextjsConfig(config);

  // Install dependencies so shadcn/ui can detect the framework
  await installDependencies(config);

  // Setup shadcn/ui and Kibo UI (now after Next.js is properly configured)
  await setupUILibraries(config);

  // Setup Jotai and next-themes
  await setupStateManagement(config);

  // Setup Husky
  await setupHusky(config);

  // Create initial pages and remaining files
  await createInitialPages(config);
}

async function createNextAppStructure(config: ProjectConfig) {
  const dirs = [
    'src/app',
    'src/components',
    'src/components/ui',
    'src/lib',
    'src/hooks',
    'src/styles',
    'public',
  ];

  for (const dir of dirs) {
    await fs.ensureDir(path.join(config.projectPath, dir));
  }
}

async function setupTypeScript(config: ProjectConfig) {
  const tsConfig = {
    compilerOptions: {
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [
        {
          name: 'next',
        },
      ],
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  };

  await fs.writeJSON(path.join(config.projectPath, 'tsconfig.json'), tsConfig, { spaces: 2 });

  // Create next-env.d.ts
  const nextEnvContent = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.
`;

  await fs.writeFile(path.join(config.projectPath, 'next-env.d.ts'), nextEnvContent);
}

async function setupTailwind(config: ProjectConfig) {
  const tailwindConfig = `import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [tailwindcssAnimate],
};

export default config;
`;

  await fs.writeFile(path.join(config.projectPath, 'tailwind.config.ts'), tailwindConfig);

  const tailwindContent = `@import "tailwindcss";

@theme {
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/styles/globals.css'), tailwindContent);

  const postcssConfig = {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  };

  await fs.writeJSON(path.join(config.projectPath, 'postcss.config.json'), postcssConfig, {
    spaces: 2,
  });
}

async function setupLinters(config: ProjectConfig) {
  // Biome config
  const biomeConfig = {
    $schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
    vcs: {
      enabled: true,
      clientKind: 'git',
      useIgnoreFile: true,
    },
    files: {
      ignore: ['node_modules', '.next', 'dist', '*.min.js', 'coverage'],
    },
    formatter: {
      enabled: true,
      formatWithErrors: false,
      indentStyle: 'space',
      indentWidth: 2,
      lineEnding: 'lf',
      lineWidth: 100,
    },
    organizeImports: {
      enabled: true,
    },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
        complexity: {
          noExtraBooleanCast: 'error',
          noMultipleSpacesInRegularExpressionLiterals: 'error',
          noUselessCatch: 'error',
          noWith: 'error',
          useArrowFunction: 'error',
        },
        correctness: {
          noConstAssign: 'error',
          noConstantCondition: 'error',
          noEmptyCharacterClassInRegex: 'error',
          noEmptyPattern: 'error',
          noGlobalObjectCalls: 'error',
          noInvalidConstructorSuper: 'error',
          noInvalidUseBeforeDeclaration: 'error',
          noNewSymbol: 'error',
          noPrecisionLoss: 'error',
          noSelfAssign: 'error',
          noSetterReturn: 'error',
          noSwitchDeclarations: 'error',
          noUndeclaredVariables: 'error',
          noUnreachable: 'error',
          noUnreachableSuper: 'error',
          noUnsafeFinally: 'error',
          noUnsafeOptionalChaining: 'error',
          noUnusedLabels: 'error',
          noUnusedVariables: 'error',
          useIsNan: 'error',
          useValidForDirection: 'error',
          useYield: 'error',
        },
        style: {
          noCommaOperator: 'error',
          noNamespace: 'error',
          noNonNullAssertion: 'warn',
          noParameterAssign: 'error',
          noVar: 'error',
          useAsConstAssertion: 'error',
          useBlockStatements: 'error',
          useConst: 'error',
          useDefaultParameterLast: 'error',
          useExponentiationOperator: 'error',
          useNumericLiterals: 'error',
          useShorthandAssign: 'error',
          useSingleVarDeclarator: 'error',
          useTemplate: 'error',
        },
        suspicious: {
          noAsyncPromiseExecutor: 'error',
          noCatchAssign: 'error',
          noClassAssign: 'error',
          noCompareNegZero: 'error',
          noConfusingLabels: 'error',
          noControlCharactersInRegex: 'error',
          noDebugger: 'error',
          noDoubleEquals: 'error',
          noDuplicateCase: 'error',
          noDuplicateClassMembers: 'error',
          noDuplicateJsxProps: 'error',
          noDuplicateObjectKeys: 'error',
          noDuplicateParameters: 'error',
          noEmptyBlockStatements: 'error',
          noFallthroughSwitchClause: 'error',
          noFunctionAssign: 'error',
          noGlobalAssign: 'error',
          noImportAssign: 'error',
          noLabelVar: 'error',
          noMisleadingCharacterClass: 'error',
          noPrototypeBuiltins: 'error',
          noRedeclare: 'error',
          noSelfCompare: 'error',
          noShadowRestrictedNames: 'error',
          noUnsafeNegation: 'error',
          useDefaultSwitchClauseLast: 'error',
          useValidTypeof: 'error',
        },
      },
    },
    javascript: {
      formatter: {
        quoteStyle: 'single',
        jsxQuoteStyle: 'double',
        quoteProperties: 'asNeeded',
        trailingCommas: 'es5',
        semicolons: 'always',
        arrowParentheses: 'always',
        bracketSameLine: false,
        bracketSpacing: true,
      },
    },
  };

  await fs.writeJSON(path.join(config.projectPath, 'biome.json'), biomeConfig, { spaces: 2 });
}

async function setupUILibraries(config: ProjectConfig) {
  const runner = getShadcnRunner(config.packageManager);

  console.log('  • Initializing shadcn/ui (this may take a moment)...');

  await runShadcnCommand(
    config,
    runner,
    ['init', '--template', 'next', '--src-dir', '--force', '--yes', '--base-color', 'neutral'],
    'initialize shadcn/ui'
  );

  console.log('  • Installing shadcn/ui component collection...');

  await runShadcnCommand(
    config,
    runner,
    ['add', '--all', '--yes', '--overwrite'],
    'install shadcn/ui components'
  );

  console.log('  • Installing Kibo UI component library...');

  const kiboComponents = [
    'announcement',
    'avatar-stack',
    'banner',
    'calendar',
    'choicebox',
    'code-block',
    'color-picker',
    'combobox',
    'comparison',
    'contribution-graph',
    'credit-card',
    'cursor',
    'deck',
    'dialog-stack',
    'dropzone',
    'editor',
    'gantt',
    'glimpse',
    'image-crop',
    'image-zoom',
    'kanban',
    'kbd',
    'list',
    'marquee',
    'mini-calendar',
    'pill',
    'qr-code',
    'rating',
    'reel',
    'relative-time',
    'sandbox',
    'shadcn-ui',
    'snippet',
    'spinner',
    'status',
    'stories',
    'table',
    'tags',
    'theme-switcher',
    'ticker',
    'tree',
    'typescript-config',
    'typography',
    'video-player',
  ];

  for (const component of kiboComponents) {
    const registryUrl = `https://www.kibo-ui.com/r/${component}.json`;
    console.log(`    • ${component}`);
    await runShadcnCommand(
      config,
      runner,
      ['add', registryUrl, '--yes', '--overwrite'],
      `install Kibo UI component ${component}`
    );
  }

  const componentsConfig = {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: true,
    tsx: true,
    tailwind: {
      config: 'tailwind.config.ts',
      css: 'src/styles/globals.css',
      baseColor: 'neutral',
      cssVariables: true,
      prefix: '',
    },
    aliases: {
      components: '@/components',
      utils: '@/lib/utils',
      ui: '@/components/ui',
      lib: '@/lib',
      hooks: '@/hooks',
    },
  };

  await fs.writeJSON(path.join(config.projectPath, 'components.json'), componentsConfig, {
    spaces: 2,
  });

  const utilsContent = `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/lib/utils.ts'), utilsContent);
}

function getShadcnRunner(packageManager: ProjectConfig['packageManager']) {
  // React 19 compatibility: add force flags for all package managers
  switch (packageManager) {
    case 'npm':
      return { command: 'npx', args: ['--yes', 'shadcn@latest'] };
    case 'yarn':
      return { command: 'yarn', args: ['dlx', 'shadcn@latest'] };
    case 'bun':
      return { command: 'bunx', args: ['shadcn@latest'] };
    default:
      // Add --force for React 19 compatibility with pnpm
      return { command: 'pnpm', args: ['dlx', '--force', 'shadcn@latest'] };
  }
}

async function runShadcnCommand(
  config: ProjectConfig,
  runner: { command: string; args: string[] },
  extraArgs: string[],
  description: string
) {
  try {
    await execa(runner.command, [...runner.args, ...extraArgs], {
      cwd: config.projectPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        CI: 'true',
        // Set package manager flags for React 19 compatibility
        npm_config_force: 'true',
        npm_config_legacy_peer_deps: 'true',
      },
    });
  } catch (error) {
    throw new Error(`Failed to ${description}: ${(error as Error).message}`);
  }
}

async function setupStateManagement(config: ProjectConfig) {
  // Jotai store
  const storeContent = `import { atom } from 'jotai';

export const countAtom = atom(0);
export const themeAtom = atom<'light' | 'dark'>('light');
`;

  await fs.writeFile(path.join(config.projectPath, 'src/lib/store.ts'), storeContent);

  // Providers
  const providersContent = `'use client';

import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </JotaiProvider>
  );
}
`;

  await fs.writeFile(
    path.join(config.projectPath, 'src/components/providers.tsx'),
    providersContent
  );
}

async function setupHusky(config: ProjectConfig) {
  // Create .husky directory
  const huskyDir = path.join(config.projectPath, '.husky');
  await fs.ensureDir(huskyDir);

  // Pre-commit hook
  const preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run format check
echo "📝 Checking formatting..."
${config.packageManager} run format

# Run lint
echo "🔎 Running linter..."
${config.packageManager} run lint

# Run build
echo "🔨 Building project..."
${config.packageManager} run build

echo "✅ Pre-commit checks completed!"
`;

  const preCommitPath = path.join(huskyDir, 'pre-commit');
  await fs.writeFile(preCommitPath, preCommitContent);
  await fs.chmod(preCommitPath, '755');
}

async function createNextjsConfig(config: ProjectConfig) {
  // Next.js config
  const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enable experimental features as needed
  },
};

export default nextConfig;
`;

  await fs.writeFile(path.join(config.projectPath, 'next.config.mjs'), nextConfigContent);

  // Environment variables
  const envContent = `# Environment variables
NODE_ENV=development
`;

  await fs.writeFile(path.join(config.projectPath, '.env.local'), envContent);

  // Gitignore
  const gitignoreContent = `# Dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
`;

  await fs.writeFile(path.join(config.projectPath, '.gitignore'), gitignoreContent);
}

async function createInitialPages(config: ProjectConfig) {
  // Layout
  const layoutContent = `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${config.projectName}',
  description: 'Generated by fluorite-flake',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/app/layout.tsx'), layoutContent);

  // Homepage
  const pageContent = `'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useAtom } from 'jotai';
import { countAtom } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from '@/components/ui/kibo-ui/announcement';
import { ThemeSwitcher } from '@/components/ui/kibo-ui/theme-switcher';

type ThemeOption = 'light' | 'dark' | 'system';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [count, setCount] = useAtom(countAtom);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (theme ?? 'system') as ThemeOption;

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto flex flex-col gap-10 py-16">
        <Card className="mx-auto w-full max-w-4xl border-border/60 shadow-sm">
          <CardHeader className="flex flex-col gap-4">
            <Badge variant="outline" className="self-start uppercase tracking-wide">
              fluorite-flake
            </Badge>
            <CardTitle className="text-4xl">Your shadcn/ui + Kibo UI starter</CardTitle>
            <CardDescription>
              Scaffolded with themeable components, state management, and auth-ready patterns.
            </CardDescription>
            <Announcement themed>
              <AnnouncementTag>New</AnnouncementTag>
              <AnnouncementTitle>
                Storage, auth, and deployment tooling lands out of the box.
              </AnnouncementTitle>
            </Announcement>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <ThemeSwitcher
                value={currentTheme}
                onChange={(nextValue) => setTheme(nextValue)}
              />
              <div className="flex items-center gap-3">
                <Button onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}>
                  Toggle theme
                </Button>
                <Button variant="secondary" onClick={() => setCount(count + 1)}>
                  Interactions: {count}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Powered by shadcn/ui components enriched with the Kibo UI collection for product-ready
                experiences.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-border/70 p-4">
                <p className="font-medium text-foreground">Toolkit</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>• Tailwind CSS v4 with Biome linting</li>
                  <li>• Better Auth, Jotai, next-themes integration</li>
                  <li>• Storage, database, and deployment workflows</li>
                </ul>
              </div>
              <div className="rounded-lg border border-dashed border-border/70 p-4">
                <p className="font-medium text-foreground">Next Steps</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>• Update branding in <code>src/app/layout.tsx</code></li>
                  <li>• Customize components under <code>src/components/ui</code></li>
                  <li>• Configure environment secrets in <code>.env.local</code></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/app/page.tsx'), pageContent);
}

async function installDependencies(config: ProjectConfig) {
  console.log('  • Installing dependencies...');

  try {
    await execa(config.packageManager, ['install'], {
      cwd: config.projectPath,
      stdio: 'inherit',
    });
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${(error as Error).message}`);
  }
}
