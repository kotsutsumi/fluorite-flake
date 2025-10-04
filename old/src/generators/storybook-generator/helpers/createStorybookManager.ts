import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Storybookマネージャー設定ファイル作成
 * UIテーマ、ブランド設定、サイドバー、ツールバーのカスタマイズ
 */

/**
 * Storybookマネージャー設定ファイルを作成する関数
 * UIテーマ、ブランド設定、サイドバー、ツールバーのカスタマイズ
 * @param config プロジェクト設定
 */
export async function createStorybookManager(config: ProjectConfig) {
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
