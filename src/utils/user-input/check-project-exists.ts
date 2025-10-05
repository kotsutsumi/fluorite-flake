/**
 * プロジェクトディレクトリの存在確認機能
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 指定されたプロジェクト名でディレクトリが存在するかをチェックする
 * @param projectName プロジェクト名
 * @param baseDir ベースディレクトリ（デフォルトは現在のディレクトリ）
 * @returns ディレクトリが存在する場合はtrue
 */
export function checkProjectExists(
    projectName: string,
    baseDir: string = process.cwd()
): boolean {
    // プロジェクト名を使ってディレクトリパスを構築
    const projectPath = resolve(baseDir, projectName);

    // ディレクトリの存在確認
    return existsSync(projectPath);
}

// EOF
