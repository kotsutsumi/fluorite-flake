import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Storybookメイン設定ファイル作成
 * Storybook 8.x用のモダン設定、Next.js統合、アドオン設定を含む
 */

/**
 * Storybookのメイン設定ファイルを作成する関数
 * Storybook 8.x用のモダン設定、Next.js統合、アドオン設定を含む
 * @param config プロジェクト設定
 */
export async function createStorybookConfig(config: ProjectConfig) {
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
