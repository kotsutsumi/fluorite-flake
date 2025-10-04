/**
 * Tailwind CSS v4の設定とグローバルCSSファイルを作成するヘルパー関数
 * Next.jsとTailwind CSS v4の統合を行う
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Tailwind CSS v4の設定とグローバルCSSファイルを作成する
 * @param config プロジェクト設定
 */
export async function setupTailwind(config: ProjectConfig): Promise<void> {
    // Tailwind CSS v4はtailwind.config.tsの代わりにPostCSS設定を使用
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

    // Next.js 15.5+とTailwind CSS v4ではPostCSS設定は不要
}
