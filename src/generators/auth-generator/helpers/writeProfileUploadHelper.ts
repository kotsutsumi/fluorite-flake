import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { renderTemplate } from './renderTemplate.js';

/**
 * プロフィール画像アップロード用のヘルパー関数を生成する
 * ストレージ設定に応じてローカル保存またはクラウドストレージに対応
 */
export async function writeProfileUploadHelper(config: ProjectConfig) {
    const helperPath = path.join(config.projectPath, 'src/lib/profile-upload.ts');

    if (config.storage === 'none') {
        const uploadsDir = path.join(config.projectPath, 'public/uploads');
        await fs.ensureDir(uploadsDir);
        await fs.outputFile(path.join(uploadsDir, '.gitkeep'), '');
    }

    const content = await renderTemplate('auth/lib/profile-upload.ts.template', {
        flags: { useStorage: config.storage !== 'none' },
    });

    await fs.outputFile(helperPath, content);
}
