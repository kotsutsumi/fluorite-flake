/**
 * ファイルが文字列置換の対象かどうかを判定する
 */
import path from "node:path";

/**
 * 文字列置換対象のファイル拡張子リスト
 */
const TEXT_FILE_EXTENSIONS = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".yaml",
    ".yml",
    ".md",
    ".mdx",
    ".txt",
    ".env",
    ".gitignore",
    ".npmrc",
    ".editorconfig",
    ".prisma",
    ".graphql",
    ".gql",
    ".css",
    ".scss",
    ".html",
    ".svg",
    ".xml",
    ".toml",
    ".sh",
    ".bash",
    ".zsh",
];

/**
 * バイナリファイルとして除外する拡張子リスト
 */
const BINARY_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".webp",
    ".zip",
    ".gz",
    ".tar",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".otf",
];

/**
 * ファイルが文字列置換の対象かどうかを判定する関数
 * @param filePath - 判定対象のファイルパス
 * @returns 対象の場合は true、それ以外は false
 */
export function shouldProcessFile(filePath: string): boolean {
    // 拡張子を取得
    const ext = path.extname(filePath).toLowerCase();

    // 拡張子がない場合（例: Dockerfile, Makefile など）は対象とする
    if (!ext) {
        return true;
    }

    // バイナリファイルは除外
    if (BINARY_EXTENSIONS.includes(ext)) {
        return false;
    }

    // テキストファイル拡張子リストに含まれる場合は対象
    if (TEXT_FILE_EXTENSIONS.includes(ext)) {
        return true;
    }

    // それ以外の場合は対象外
    return false;
}

// EOF
