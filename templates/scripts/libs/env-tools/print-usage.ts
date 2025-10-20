// 利用可能な CLI の呼び出し方を表示し、ソースを読まなくてもコマンドが分かるようにする。
export function printUsage(): void {
  console.log("使用法:");
  console.log("  pnpm env:encrypt   # プロジェクトの環境変数ファイルを暗号化");
  console.log("  pnpm env:decrypt   # プロジェクトの環境変数ファイルを復号");
  console.log("");
  console.log("直接実行:");
  console.log("  tsx scripts/env-tools.ts encrypt");
  console.log("  tsx scripts/env-tools.ts decrypt");
}

// EOF
