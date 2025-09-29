import path from 'node:path';
import fs from 'fs-extra';

/**
 * 環境変数ファイルを生成します
 * @param projectPath プロジェクトのパス
 * @param envVars 環境変数のキー・値ペア
 * @param filename 生成するファイル名（デフォルト: .env.example）
 */
export async function writeEnvFile(
    projectPath: string,
    envVars: Record<string, string>,
    filename: '.env' | '.env.local' | '.env.example' = '.env.example'
): Promise<void> {
    // 環境変数を KEY=VALUE 形式で連結
    const envContent = `${Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')}\n`;

    await fs.writeFile(path.join(projectPath, filename), envContent);
}
