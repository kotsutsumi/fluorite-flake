/**
 * プロジェクト内の全ファイルで文字列置換を実行する
 */
import fs from "node:fs";
import path from "node:path";
import { createReplacementMap, replaceInFile, shouldProcessFile } from "../string-replacer/index.js";

/**
 * ディレクトリ内の全ファイルを再帰的に取得する関数
 * @param dirPath - 検索対象のディレクトリパス
 * @param fileList - ファイルリスト（再帰用）
 * @returns ファイルパスの配列
 */
function getAllFiles(dirPath: string, fileList: string[] = []): string[] {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // node_modules, .git などの除外ディレクトリをスキップ
            if (
                entry.name === "node_modules" ||
                entry.name === ".git" ||
                entry.name === "dist" ||
                entry.name === ".next" ||
                entry.name === ".turbo" ||
                entry.name === "coverage"
            ) {
                continue;
            }
            // ディレクトリの場合は再帰的に処理
            getAllFiles(fullPath, fileList);
        } else if (entry.isFile()) {
            // ファイルの場合はリストに追加
            fileList.push(fullPath);
        }
    }

    return fileList;
}

/**
 * プロジェクト内の全ファイルで文字列置換を実行する関数
 * @param projectDir - プロジェクトディレクトリのパス
 * @param projectName - 新しいプロジェクト名
 * @returns 処理したファイル数
 */
export function replaceInProject(projectDir: string, projectName: string): number {
    // 置換マップを作成
    const replacements = createReplacementMap(projectName);

    // プロジェクト内の全ファイルを取得
    const allFiles = getAllFiles(projectDir);

    // 処理したファイル数をカウント
    let processedCount = 0;

    // 各ファイルで置換を実行
    for (const filePath of allFiles) {
        // 処理対象のファイルかどうかを判定
        if (shouldProcessFile(filePath)) {
            // 文字列置換を実行
            const replaced = replaceInFile(filePath, replacements);
            if (replaced) {
                processedCount++;
            }
        }
    }

    return processedCount;
}

// EOF
