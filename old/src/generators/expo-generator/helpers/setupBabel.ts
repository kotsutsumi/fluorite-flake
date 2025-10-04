import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Babel設定ファイルを作成する（Expo用トランスパイル設定）
 * Expo用のプリセットとReact Native Reanimatedプラグインを含むBabel設定
 * @param config プロジェクト設定
 */
export async function setupBabel(config: ProjectConfig) {
    const babelConfig = {
        presets: ['babel-preset-expo'],
        plugins: ['react-native-reanimated/plugin'],
    };

    await fs.writeJSON(path.join(config.projectPath, 'babel.config.js'), babelConfig, {
        spaces: 2,
    });
}
