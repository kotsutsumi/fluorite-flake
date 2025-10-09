/**
 * ドキュメント生成選択のプロンプト
 */

import prompts from "prompts";

/**
 * ユーザーにドキュメントサイト生成の選択を求める
 *
 * @returns ユーザーの選択結果（true: 生成する、false: 生成しない）
 */
export async function promptForDocsGeneration(): Promise<boolean> {
    try {
        const response = await prompts({
            type: "confirm",
            name: "shouldGenerateDocs",
            message: "📚 Nextraベースのドキュメントサイトを生成しますか？",
            initial: false, // デフォルトは「いいえ」
        });

        // キャンセルされた場合はfalseを返す
        if (response.shouldGenerateDocs === undefined) {
            return false;
        }

        return Boolean(response.shouldGenerateDocs);
    } catch (error) {
        console.error("ドキュメント生成の選択中にエラーが発生しました:", error);
        return false;
    }
}

// EOF
