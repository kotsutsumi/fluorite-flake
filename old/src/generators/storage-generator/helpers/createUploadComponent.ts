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
        config.framework === 'expo'
            ? 'storage/expo/components/FileUpload.tsx.template'
            : 'storage/common/components/file-upload.tsx.template'
    );
    const componentsDir = config.framework === 'expo' ? 'components' : 'src/components';
    const fileName = config.framework === 'expo' ? 'FileUpload.tsx' : 'file-upload.tsx';
    const componentPath = path.join(config.projectPath, componentsDir, fileName);
    await fs.ensureDir(path.dirname(componentPath));
    await fs.writeFile(componentPath, componentContent);
}
