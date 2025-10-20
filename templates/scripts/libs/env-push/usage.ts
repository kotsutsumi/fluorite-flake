// env-push CLI の利用方法をまとめたヘルパー。
// CLI 側で直接コンソール出力の文言を持たないように切り出し、
// 今後の国際化やヘルプ内容の拡張を容易にしている。

export function printEnvPushUsage(scriptPath: string): void {
  const targets = "preview | production | staging | all";
  console.error(
    `Usage: tsx ${scriptPath} <${targets}> [--project-root <path>]\n\n` +
      "Options:\n" +
      "  --project-root <path>  Directory whose .vercel config should be used (defaults to repository root)\n"
  );
}

// EOF
