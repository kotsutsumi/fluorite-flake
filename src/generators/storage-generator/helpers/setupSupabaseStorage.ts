import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';
import { appendEnv } from './appendEnv.js';
import { ensureSupabaseClient } from './ensureSupabaseClient.js';
import { writeStorageLib } from './writeStorageLib.js';

/**
 * Supabaseストレージの設定を行う関数
 * 環境変数、Supabaseクライアント、ストレージライブラリを設定
 * @param config プロジェクト設定
 */
export async function setupSupabaseStorage(config: ProjectConfig) {
    // Supabase Storageの環境変数を追加
    await appendEnv(
        config.projectPath,
        `\n# Supabase Storage\nNEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"\nNEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"\nSUPABASE_SERVICE_ROLE_KEY="[service-role-key]"\nSUPABASE_STORAGE_BUCKET="uploads"\n`,
        config.framework
    );

    // Supabaseクライアントが存在することを確認
    await ensureSupabaseClient(config);

    // テンプレートからSupabase用ストレージライブラリを作成
    const storageContent = await readTemplate('storage/supabase/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);
}
