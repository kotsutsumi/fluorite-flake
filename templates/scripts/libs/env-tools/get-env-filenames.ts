// Default set of environment files we protect for every project.
// 既定で扱う環境変数ファイルの一覧。
const ENV_FILENAMES = [
  ".env",
  ".env.local",
  ".env.preview",
  ".env.production",
  ".env.staging",
  ".env.test",
] as const;

export function getEnvFilenames(): readonly string[] {
  // 呼び出し側で順番を変えたりしても元データに影響しないよう定義済み配列を返す。
  return ENV_FILENAMES;
}

// EOF
