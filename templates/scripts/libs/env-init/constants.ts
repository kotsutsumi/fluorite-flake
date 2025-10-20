import path from "node:path";

/**
 * apps ディレクトリの絶対パス
 */
export const APPS_DIR = path.resolve(process.cwd(), "apps");

/**
 * .env.*.example ファイルを識別するための正規表現パターン
 */
export const ENV_EXAMPLE_PATTERN = /^\.env.*\.example$/;

// EOF
