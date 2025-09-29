import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';

/**
 * ファイルアップロード用のReactコンポーネントを作成する関数
 * @param config プロジェクト設定
 */
export async function createUploadComponent(config: ProjectConfig) {
    // テンプレートからアップロードコンポーネントを作成
    const componentContent = await readTemplate(
        'storage/common/components/file-upload.tsx.template'
    );
    const componentPath = path.join(config.projectPath, 'src/components/file-upload.tsx');
    await fs.ensureDir(path.dirname(componentPath));
    await fs.writeFile(componentPath, componentContent);
}
