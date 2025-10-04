import { randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { appendEnv } from './appendEnv.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * Better Auth の中核ファイル（auth.ts, auth-client.ts, auth-server.ts など）を生成する
 * 認証システムの基本設定とシークレットキーの生成も行う
 */
export async function writeAuthCore(config: ProjectConfig) {
    const provider = config.database === 'supabase' ? 'postgresql' : 'sqlite';
    const libDir = path.join(config.projectPath, 'src/lib');
    await fs.ensureDir(libDir);

    await writeTemplateFile(path.join(libDir, 'roles.ts'), 'auth/lib/roles.ts.template');
    await writeTemplateFile(path.join(libDir, 'auth.ts'), 'auth/lib/auth.ts.template', {
        replacements: { provider },
    });
    await writeTemplateFile(
        path.join(libDir, 'auth-client.ts'),
        'auth/lib/auth-client.ts.template'
    );
    await writeTemplateFile(
        path.join(libDir, 'auth-server.ts'),
        'auth/lib/auth-server.ts.template'
    );
    await writeTemplateFile(path.join(libDir, 'to-slug.ts'), 'auth/lib/to-slug.ts.template');

    const authSecret = randomBytes(32).toString('hex');

    await appendEnv(
        config,
        `# Authentication\nBETTER_AUTH_SECRET="${authSecret}"\nBETTER_AUTH_URL="http://localhost:3000"\nNEXT_PUBLIC_APP_URL="http://localhost:3000"\n`
    );
}
