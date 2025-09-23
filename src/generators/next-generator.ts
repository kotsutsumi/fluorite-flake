import path from 'node:path';
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

  // Setup shadcn/ui and Kibo UI
  await setupUILibraries(config);

  // Setup Jotai and next-themes
  await setupStateManagement(config);

  // Setup Husky
  await setupHusky(config);

  // Create initial pages
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
  // TailwindCSS v4 config
  const tailwindContent = `@import "tailwindcss";

@theme {
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/styles/globals.css'), tailwindContent);

  // PostCSS config for TailwindCSS v4
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
  // components.json for shadcn/ui
  const componentsConfig = {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: true,
    tsx: true,
    tailwind: {
      config: 'tailwind.config.ts',
      css: 'src/styles/globals.css',
      baseColor: 'zinc',
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

  // Create utils.ts
  const utilsContent = `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/lib/utils.ts'), utilsContent);
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

import { useTheme } from 'next-themes';
import { useAtom } from 'jotai';
import { countAtom } from '@/lib/store';
import { useEffect, useState } from 'react';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [count, setCount] = useAtom(countAtom);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Welcome to ${config.projectName}
        </h1>

        <div className="flex flex-col items-center gap-8">
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Toggle Theme: {theme}
            </button>

            <button
              onClick={() => setCount(count + 1)}
              className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              Count: {count}
            </button>
          </div>

          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>✨ Next.js + TailwindCSS v4 + shadcn/ui + Kibo UI</p>
            <p>🎨 Theme switching with next-themes</p>
            <p>⚡ State management with Jotai</p>
            <p>🔧 Formatted with Biome + Ultracite</p>
          </div>
        </div>
      </div>
    </main>
  );
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/app/page.tsx'), pageContent);

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
