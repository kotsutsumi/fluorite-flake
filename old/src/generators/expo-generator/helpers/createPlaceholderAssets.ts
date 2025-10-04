import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * プレースホルダーアセットとその説明用READMEファイルを作成する
 * 開発者が必要なアセットファイル（アイコン、スプラッシュ画面等）を理解できるように説明を提供
 * @param config プロジェクト設定
 */
export async function createPlaceholderAssets(config: ProjectConfig) {
    // 必要なアセットの説明用READMEファイルを作成
    const assetsReadme = `# Assets

Please add the following asset files:

## Images
- icon.png (1024x1024) - App icon
- splash-icon.png (400x400) - Splash screen icon
- adaptive-icon.png (1024x1024) - Android adaptive icon
- favicon.png (32x32) - Web favicon

## Fonts
Add custom fonts in this directory and reference them in app/_layout.tsx

## Current Status
Placeholder assets have been created. Replace with your actual design assets.
`;

    await fs.writeFile(path.join(config.projectPath, 'assets/README.md'), assetsReadme);
}
