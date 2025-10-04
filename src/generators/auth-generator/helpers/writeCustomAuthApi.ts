import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * カスタム認証 API ルート（サインイン・サインアウト）を生成する
 * Better Auth のデフォルト実装を拡張したカスタムエンドポイント
 */
export async function writeCustomAuthApi(config: ProjectConfig) {
    const signInDir = path.join(config.projectPath, 'src/app/api/auth/sign-in/email');
    const signOutDir = path.join(config.projectPath, 'src/app/api/auth/sign-out');
    await fs.ensureDir(signInDir);
    await fs.ensureDir(signOutDir);

    await writeTemplateFile(
        path.join(signInDir, 'route.ts'),
        'auth/api/auth/sign-in/email/route.ts.template'
    );
    await writeTemplateFile(
        path.join(signOutDir, 'route.ts'),
        'auth/api/auth/sign-out/route.ts.template'
    );
}
