import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * ダッシュボード関連のページとコンポーネントを生成する
 * レイアウト、組織管理、ユーザー管理、プロフィール管理の画面を作成
 */
export async function writeDashboardScaffolding(config: ProjectConfig) {
    const appDir = path.join(config.projectPath, 'src/app');
    const groupDir = path.join(appDir, '(app)');
    const componentsDir = path.join(config.projectPath, 'src/components/dashboard');

    await fs.ensureDir(groupDir);
    await fs.ensureDir(componentsDir);

    const rootPagePath = path.join(appDir, 'page.tsx');
    if (await fs.pathExists(rootPagePath)) {
        await fs.remove(rootPagePath);
    }

    await writeTemplateFile(
        path.join(groupDir, 'layout.tsx'),
        'auth/app/(app)/layout.tsx.template'
    );
    await writeTemplateFile(path.join(groupDir, 'page.tsx'), 'auth/app/(app)/page.tsx.template');
    await writeTemplateFile(
        path.join(groupDir, 'organizations/page.tsx'),
        'auth/app/(app)/organizations/page.tsx.template'
    );
    await writeTemplateFile(
        path.join(groupDir, 'users/page.tsx'),
        'auth/components/users-page.ts.template'
    );
    await writeTemplateFile(
        path.join(groupDir, 'profile/page.tsx'),
        'auth/components/profile-page.ts.template'
    );

    await writeTemplateFile(
        path.join(componentsDir, 'sidebar.tsx'),
        'auth/components/dashboard/sidebar.tsx.template'
    );
    await writeTemplateFile(
        path.join(componentsDir, 'dashboard-header.tsx'),
        'auth/components/dashboard/dashboard-header.tsx.template'
    );
    await writeTemplateFile(
        path.join(componentsDir, 'organizations-client.tsx'),
        'auth/lib/organizations-client.ts.template'
    );
    await writeTemplateFile(
        path.join(componentsDir, 'users-client.tsx'),
        'auth/components/dashboard/users-client.tsx.template'
    );
    await writeTemplateFile(
        path.join(componentsDir, 'profile-form.tsx'),
        'auth/components/profile-form.tsx.template'
    );

    await writeTemplateFile(
        path.join(appDir, 'login/page.tsx'),
        'auth/app/login/page.tsx.template'
    );
}
