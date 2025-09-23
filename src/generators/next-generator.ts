import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';
import { generatePackageJson } from '../utils/package-json.js';

export async function generateNextProject(config: ProjectConfig) {
  await fs.ensureDir(config.projectPath);

  const isMinimal = config.mode === 'minimal';

  await createNextAppStructure(config);
  await generatePackageJson(config);
  await setupTypeScript(config);
  await setupTailwind(config);
  await setupLinters(config);
  await createNextjsConfig(config);

  if (isMinimal) {
    await setupMinimalUILibraries(config);
  } else {
    await installDependencies(config);
    await setupUILibraries(config);
  }

  await setupStateManagement(config);

  if (!isMinimal) {
    await setupHusky(config);
  }

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
  // Tailwind CSS v4 uses PostCSS config instead of tailwind.config.ts
  const postcssConfig = `const config = {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};

export default config;
`;

  await fs.writeFile(path.join(config.projectPath, 'postcss.config.mjs'), postcssConfig);

  const tailwindContent = `@import "tailwindcss";

/* Tailwind v4 dark mode with class selector */
@variant dark (&:is(.dark *));

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* Custom theme colors for shadcn/ui */
  --color-border: hsl(214.3 31.8% 91.4%);
  --color-ring: hsl(222.2 84% 61.3%);
  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-primary-foreground: hsl(210 40% 98%);
  --color-secondary: hsl(210 40% 96.1%);
  --color-secondary-foreground: hsl(222.2 47.4% 11.2%);
  --color-accent: hsl(210 40% 96.1%);
  --color-accent-foreground: hsl(222.2 47.4% 11.2%);
  --color-destructive: hsl(0 84.2% 60.2%);
  --color-destructive-foreground: hsl(210 40% 98%);
  --color-muted: hsl(210 40% 96.1%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  --color-input: hsl(214.3 31.8% 91.4%);
}

/* Dark mode colors with .dark class selector */
:root.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
}

/* System preference dark mode */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}

/* Dark mode theme colors update */
.dark {
  --background: #0a0a0a;
  --foreground: #ededed;

  /* Update theme colors for dark mode */
  --color-border: hsl(240 3.7% 15.9%);
  --color-input: hsl(240 3.7% 15.9%);
  --color-ring: hsl(217.2 91.2% 59.8%);
  --color-primary: hsl(210 40% 98%);
  --color-primary-foreground: hsl(222.2 47.4% 11.2%);
  --color-secondary: hsl(240 3.7% 15.9%);
  --color-secondary-foreground: hsl(210 40% 98%);
  --color-destructive: hsl(0 62.8% 30.6%);
  --color-destructive-foreground: hsl(210 40% 98%);
  --color-muted: hsl(240 3.7% 15.9%);
  --color-muted-foreground: hsl(240 5% 64.9%);
  --color-accent: hsl(240 3.7% 15.9%);
  --color-accent-foreground: hsl(210 40% 98%);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/app/globals.css'), tailwindContent);

  // PostCSS not needed with Next.js 15.5+ and Tailwind CSS v4
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

async function setupMinimalUILibraries(config: ProjectConfig) {
  console.log('  • Creating minimal UI component stubs...');

  const utilsContent = `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

  await fs.outputFile(path.join(config.projectPath, 'src/lib/utils.ts'), utilsContent);

  const componentsConfig = {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: true,
    tsx: true,
    tailwind: {
      css: 'src/app/globals.css',
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
  } as const;

  await fs.writeJSON(path.join(config.projectPath, 'components.json'), componentsConfig, {
    spaces: 2,
  });

  const files: Record<string, string> = {
    'src/components/ui/button.tsx': `import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline';
}

export function Button({ variant: _variant, ...props }: ButtonProps) {
  return <button {...props} />;
}

export default Button;
`,
    'src/components/ui/card.tsx': `import type { HTMLAttributes } from 'react';

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function CardHeader(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function CardTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} />;
}

export function CardDescription(props: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} />;
}

export function CardContent(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
`,
    'src/components/ui/badge.tsx': `import type { HTMLAttributes } from 'react';

export function Badge(props: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} />;
}
`,
    'src/components/ui/dialog.tsx': `import type { HTMLAttributes } from 'react';

export function Dialog(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function DialogContent(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function DialogHeader(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function DialogFooter(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function DialogTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 {...props} />;
}
`,
    'src/components/ui/input.tsx': `import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return <input ref={ref} {...props} />;
});
`,
    'src/components/ui/textarea.tsx': `import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  props,
  ref,
) {
  return <textarea ref={ref} {...props} />;
});
`,
    'src/components/ui/table.tsx': `import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} />;
}

export function TableHeader(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}

export function TableHead(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} />;
}

export function TableCell(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} />;
}
`,
    'src/components/ui/select.tsx': `import type { ChangeEvent, HTMLAttributes, ReactNode } from 'react';

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <div data-select="root" data-value={value}>
      {typeof children === 'function'
        ? (children as unknown as () => ReactNode)()
        : children}
    </div>
  );
}

export interface SelectTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value?: string;
}

export function SelectTrigger({ value, ...props }: SelectTriggerProps) {
  return <button data-select="trigger" data-value={value} type="button" {...props} />;
}

export function SelectContent({ children }: { children?: ReactNode }) {
  return <div data-select="content">{children}</div>;
}

export function SelectItem({ value, children }: { value: string; children?: ReactNode }) {
  return (
    <div data-select="item" data-value={value}>
      {children}
    </div>
  );
}

export function SelectValue({ placeholder, value }: { placeholder?: string; value?: string }) {
  return <span data-select="value">{value ?? placeholder ?? ''}</span>;
}
`,
    'src/components/ui/label.tsx': `import type { LabelHTMLAttributes } from 'react';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label(props: LabelProps) {
  return <label {...props} />;
}
`,
    'src/components/ui/alert.tsx': `import type { HTMLAttributes } from 'react';

export function Alert(props: HTMLAttributes<HTMLDivElement>) {
  return <div role="alert" {...props} />;
}

export function AlertDescription(props: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} />;
}
`,
    'src/components/ui/separator.tsx': `import type { HTMLAttributes } from 'react';

export function Separator(props: HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} />;
}
`,
    'src/components/ui/avatar.tsx': `import type { HTMLAttributes, ImgHTMLAttributes } from 'react';

export function Avatar(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function AvatarImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img alt={props.alt ?? ''} {...props} />;
}

export function AvatarFallback(props: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} />;
}
`,
    'src/components/ui/kibo-ui/announcement.tsx': `import type { HTMLAttributes } from 'react';

export function Announcement(props: HTMLAttributes<HTMLDivElement>) {
  return <div role="status" {...props} />;
}

export function AnnouncementTag(props: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} />;
}

export function AnnouncementTitle(props: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} />;
}
`,
    'src/components/ui/kibo-ui/theme-switcher.tsx': `import type { ChangeEvent } from 'react';

export interface ThemeSwitcherProps {
  value: 'light' | 'dark' | 'system';
  onChange?: (value: ThemeSwitcherProps['value']) => void;
}

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange?.(event.target.value as ThemeSwitcherProps['value']);
  }

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">Theme</span>
      <select value={value} onChange={handleChange}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
`,
  };

  for (const [relativePath, content] of Object.entries(files)) {
    await fs.outputFile(path.join(config.projectPath, relativePath), content);
  }
}

async function setupUILibraries(config: ProjectConfig) {
  // Create utils.ts file
  const utilsContent = `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/lib/utils.ts'), utilsContent);

  const runner = getShadcnRunner(config.packageManager);

  console.log('  • Setting up shadcn/ui configuration...');

  // Create components.json manually instead of using init to avoid ALL prompts
  const componentsJsonPath = path.join(config.projectPath, 'components.json');
  const componentsConfig = {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: true,
    tsx: true,
    tailwind: {
      css: 'src/app/globals.css',
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

  await fs.writeJSON(componentsJsonPath, componentsConfig, { spaces: 2 });

  // Skip init completely - we've already created all necessary files

  console.log('  • Installing shadcn/ui component collection...');

  await runShadcnCommand(
    config,
    runner,
    ['add', '--all', '--yes', '--overwrite'],
    'install shadcn/ui components'
  );

  // Fix shadcn/ui button component to properly export ButtonProps
  console.log('  • Fixing shadcn/ui button component exports...');
  const buttonPath = path.join(config.projectPath, 'src/components/ui/button.tsx');
  const buttonContent = `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

Button.displayName = "Button"

export { Button, buttonVariants }
export type { ButtonProps }
`;

  await fs.writeFile(buttonPath, buttonContent);

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

  // Fix Kibo UI import paths: @repo/shadcn-ui/ -> @/
  console.log('  • Fixing Kibo UI import paths...');
  const kiboUiDir = path.join(config.projectPath, 'src/components/ui/kibo-ui');

  if (await fs.pathExists(kiboUiDir)) {
    const files = await fs.readdir(kiboUiDir, { recursive: true });
    let fixedCount = 0;

    for (const file of files) {
      if (typeof file === 'string' && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
        const filePath = path.join(kiboUiDir, file);
        let content = await fs.readFile(filePath, 'utf-8');

        // Replace @repo/shadcn-ui/ with @/
        if (content.includes('@repo/shadcn-ui/')) {
          content = content.replace(/@repo\/shadcn-ui\//g, '@/');
          await fs.writeFile(filePath, content);
          fixedCount++;
        }
      }
    }

    if (fixedCount > 0) {
      console.log(`  • Fixed import paths in ${fixedCount} Kibo UI files`);
    }
  }

  // Fix Kibo UI theme-switcher bug: icon names don't match imports
  const themeSwitcherPath = path.join(
    config.projectPath,
    'src/components/ui/kibo-ui/theme-switcher/index.tsx'
  );

  if (await fs.pathExists(themeSwitcherPath)) {
    let content = await fs.readFile(themeSwitcherPath, 'utf-8');

    // The Kibo UI component imports SunIcon, MoonIcon from @radix-ui/react-icons but uses Sun, Moon
    // We need to fix the icon references to match the imports
    const replacements = [
      { from: 'icon: Sun,', to: 'icon: SunIcon,' },
      { from: 'icon: Moon,', to: 'icon: MoonIcon,' },
    ];

    let modified = false;
    for (const { from, to } of replacements) {
      if (content.includes(from)) {
        content = content.replace(new RegExp(from, 'g'), to);
        modified = true;
      }
    }

    if (modified) {
      await fs.writeFile(themeSwitcherPath, content);
      console.log('  • Fixed Kibo UI theme-switcher icon names');
    }
  }
}

function getShadcnRunner(packageManager: ProjectConfig['packageManager']) {
  // React 19 compatibility: use environment variables for pnpm
  switch (packageManager) {
    case 'npm':
      return { command: 'npx', args: ['--yes', 'shadcn@latest'] };
    case 'yarn':
      return { command: 'yarn', args: ['dlx', 'shadcn@latest'] };
    case 'bun':
      return { command: 'bunx', args: ['shadcn@latest'] };
    default:
      // For pnpm, we'll use environment variables in runShadcnCommand to handle React 19
      return { command: 'pnpm', args: ['dlx', 'shadcn@latest'] };
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
  // Initialize husky (prepare script is already in package.json)
  try {
    await execa(config.packageManager, ['run', 'prepare'], {
      cwd: config.projectPath,
      stdio: 'inherit',
    });
  } catch (_error) {
    // If husky init fails, it's not critical - continue with setup
    console.log('  • Note: Husky initialization will complete on next install');
  }

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
import './globals.css';

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
