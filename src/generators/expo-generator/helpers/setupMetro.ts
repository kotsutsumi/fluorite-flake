import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Metro バンドラーの設定ファイルを作成する
 * ExpoのデフォルトMetro設定を使用し、React Nativeアプリのバンドリングを設定
 * @param config プロジェクト設定
 */
export async function setupMetro(config: ProjectConfig) {
    const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
`;

    await fs.writeFile(path.join(config.projectPath, 'metro.config.js'), metroConfig);
}
