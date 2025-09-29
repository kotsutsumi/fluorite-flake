import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';

/**
 * Supabaseクライアントの存在を確認し、必要に応じて作成する関数
 * @param config プロジェクト設定
 */
export async function ensureSupabaseClient(config: ProjectConfig) {
    const supabasePath = path.join(config.projectPath, 'src/lib/supabase.ts');
    if (await fs.pathExists(supabasePath)) {
        return;
    }

    // テンプレートからSupabaseクライアントを作成
    const clientContent = await readTemplate('storage/supabase/lib/client.ts.template');
    await fs.ensureDir(path.dirname(supabasePath));
    await fs.writeFile(supabasePath, clientContent);
}
