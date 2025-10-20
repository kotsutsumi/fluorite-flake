/**
 * ファイル内の文字列を置換する
 */
import fs from "node:fs";

/**
 * ファイル内の文字列を置換するマップ
 */
export type ReplacementMap = Map<string, string>;

/**
 * ファイル内の文字列を置換する関数
 * @param filePath - 置換対象のファイルパス
 * @param replacements - 置換マップ（置換前の文字列 → 置換後の文字列）
 * @returns 置換を実行したかどうか
 */
export function replaceInFile(filePath: string, replacements: ReplacementMap): boolean {
    try {
        // ファイルの存在確認
        if (!fs.existsSync(filePath)) {
            return false;
        }

        // ファイルの読み込み
        let content = fs.readFileSync(filePath, "utf-8");

        // 置換の実行（より具体的なパターンから優先的に置換）
        // replacements マップを配列に変換し、長さでソート（長い方から先に置換）
        const sortedReplacements = Array.from(replacements.entries()).sort((a, b) => b[0].length - a[0].length);

        // 各置換パターンを適用
        for (const [searchValue, replaceValue] of sortedReplacements) {
            // replaceAll を使用して全ての出現箇所を置換
            content = content.replaceAll(searchValue, replaceValue);
        }

        // ファイルへの書き込み
        fs.writeFileSync(filePath, content, "utf-8");

        return true;
    } catch (error) {
        // エラーが発生した場合は false を返す
        console.error(`Error replacing in file ${filePath}:`, error);
        return false;
    }
}

// EOF
