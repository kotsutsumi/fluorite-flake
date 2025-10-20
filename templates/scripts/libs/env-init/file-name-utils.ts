/**
 * .example を除くための正規表現パターン
 */
const EXAMPLE_SUFFIX_PATTERN = /\.example$/;

/**
 * .env.*.example ファイルから .example を除いたファイル名を生成
 *
 * @param exampleFileName - 元のファイル名（例: ".env.local.example"）
 * @returns .example を除いたファイル名（例: ".env.local"）
 */
export function getTargetEnvFileName(exampleFileName: string): string {
  return exampleFileName.replace(EXAMPLE_SUFFIX_PATTERN, "");
}

// EOF
