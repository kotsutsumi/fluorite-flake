/**
 * Nextraドキュメントテンプレートのコピー処理
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Nextraドキュメントテンプレートの設定オプション
 */
export interface DocsTemplateOptions {
    /** プロジェクト名 */
    projectName: string;
    /** 出力先ディレクトリパス */
    outputPath: string;
    /** モノレポ構造での配置かどうか */
    isMonorepo: boolean;
    /** ドキュメントサイトのタイトル */
    title?: string;
    /** ドキュメントサイトの説明 */
    description?: string;
}

/**
 * Nextraドキュメントテンプレートをコピーする
 *
 * @param options - テンプレート設定オプション
 * @returns コピーに成功した場合はtrue、失敗した場合はfalse
 */
export async function copyDocsTemplate(options: DocsTemplateOptions): Promise<boolean> {
    try {
        // テンプレートソースディレクトリの設定
        const templatePath = path.resolve(__dirname, "../../../templates/docs");

        // 出力先ディレクトリの設定
        const docsPath = options.isMonorepo
            ? path.join(options.outputPath, "apps", "docs")
            : path.join(options.outputPath, "docs");

        // テンプレートディレクトリの存在確認
        if (!fs.existsSync(templatePath)) {
            console.error(`❌ テンプレートディレクトリが見つかりません: ${templatePath}`);
            return false;
        }

        // 出力先ディレクトリの作成
        fs.mkdirSync(docsPath, { recursive: true });

        // テンプレートファイルを再帰的にコピー
        await copyDirectory(templatePath, docsPath, options);

        console.log(`✅ Nextraドキュメントテンプレートをコピーしました: ${docsPath}`);
        return true;
    } catch (error) {
        console.error("❌ ドキュメントテンプレートのコピーに失敗しました:", error);
        return false;
    }
}

/**
 * ディレクトリを再帰的にコピーする
 *
 * @param sourcePath - コピー元のディレクトリパス
 * @param targetPath - コピー先のディレクトリパス
 * @param options - テンプレート設定オプション
 */
async function copyDirectory(sourcePath: string, targetPath: string, options: DocsTemplateOptions): Promise<void> {
    // 対象ディレクトリの作成
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }

    // ディレクトリ内容の取得
    const entries = fs.readdirSync(sourcePath, { withFileTypes: true });

    // 各エントリーの処理
    for (const entry of entries) {
        const sourceEntryPath = path.join(sourcePath, entry.name);
        const targetEntryPath = path.join(targetPath, entry.name);

        if (entry.isDirectory()) {
            // ディレクトリの場合は再帰的にコピー
            await copyDirectory(sourceEntryPath, targetEntryPath, options);
        } else {
            // ファイルの場合はコピーと置換処理
            await copyAndReplaceFile(sourceEntryPath, targetEntryPath, options);
        }
    }
}

/**
 * ファイルをコピーし、必要に応じて内容を置換する
 *
 * @param sourcePath - コピー元のファイルパス
 * @param targetPath - コピー先のファイルパス
 * @param options - テンプレート設定オプション
 */
async function copyAndReplaceFile(sourcePath: string, targetPath: string, options: DocsTemplateOptions): Promise<void> {
    try {
        // ファイル内容の読み込み
        let content = fs.readFileSync(sourcePath, "utf-8");

        // 特定ファイルでの置換処理
        const fileName = path.basename(sourcePath);

        if (fileName === "package.json") {
            // package.jsonの場合は専用処理を使用
            return;
        }

        // README.mdやNext.js設定ファイルでの置換
        if (fileName === "README.md" || fileName.includes("next.config")) {
            content = replaceTemplateVariables(content, options);
        }

        // ファイルの書き込み
        fs.writeFileSync(targetPath, content, "utf-8");
    } catch (error) {
        console.error(`ファイルコピーエラー: ${sourcePath} -> ${targetPath}`, error);
        throw error;
    }
}

/**
 * テンプレート変数を実際の値に置換する
 *
 * @param content - 置換対象のコンテンツ
 * @param options - テンプレート設定オプション
 * @returns 置換済みのコンテンツ
 */
function replaceTemplateVariables(content: string, options: DocsTemplateOptions): string {
    const title = options.title || `${options.projectName} Documentation`;
    const description = options.description || `Documentation for ${options.projectName}`;

    return content
        .replace(/{{PROJECT_NAME}}/g, options.projectName)
        .replace(/{{DOCS_TITLE}}/g, title)
        .replace(/{{DOCS_DESCRIPTION}}/g, description);
}

// EOF
