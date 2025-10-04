/**
 * 各環境用の環境変数ファイルを作成するヘルパー関数
 * 開発・ステージング・本番環境の設定ファイルを生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplateWithReplacements } from '../../../utils/template-reader.js';
import { getProjectSlugs } from './getProjectSlugs.js';

/**
 * 各環境用の環境変数ファイルを作成する
 * @param config プロジェクト設定
 */
export async function writeEnvironmentFiles(config: ProjectConfig): Promise<void> {
    const { kebab, underscore } = getProjectSlugs(config.projectName);
    const replacements = {
        packageManager: config.packageManager,
        projectName: config.projectName,
        projectSlug: kebab,
        projectSlugUnderscore: underscore,
        usesTurso: String(config.database === 'turso'),
        usesSupabase: String(config.database === 'supabase'),
        storageProvider: config.storage,
    };

    const envTemplates: Record<string, string> = {
        '.env': 'next/env/base.env.template',
        '.env.local': 'next/env/local.env.template',
        '.env.development': 'next/env/development.env.template',
        '.env.staging': 'next/env/staging.env.template',
        '.env.production': 'next/env/production.env.template',
        '.env.prod': 'next/env/prod.env.template',
    };

    for (const [filename, template] of Object.entries(envTemplates)) {
        const content = await readTemplateWithReplacements(template, replacements);
        await fs.writeFile(path.join(config.projectPath, filename), content);
    }
}
