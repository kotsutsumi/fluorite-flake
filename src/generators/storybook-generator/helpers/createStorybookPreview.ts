import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Storybookプレビュー設定ファイル作成
 * テーマ、ビューポート、グローバルスタイル、デコレーター設定を含む
 */

/**
 * Storybookプレビュー設定ファイルを作成する関数
 * テーマ、ビューポート、グローバルスタイル、デコレーター設定を含む
 * @param config プロジェクト設定
 */
export async function createStorybookPreview(config: ProjectConfig) {
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
