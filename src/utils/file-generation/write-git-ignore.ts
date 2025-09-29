import path from 'node:path';
import fs from 'fs-extra';

/**
 * .gitignoreファイルを生成します
 * @param projectPath プロジェクトのパス
 * @param patterns 無視するパターンの配列
 */
export async function writeGitIgnore(projectPath: string, patterns: string[]): Promise<void> {
    const gitignoreContent = `${patterns.join('\n')}\n`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
}
