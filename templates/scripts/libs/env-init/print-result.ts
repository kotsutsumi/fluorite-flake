import type { InitResult } from "./types.js";

/**
 * 実行結果を表示
 *
 * @param result - 初期化結果
 */
export function printResult(result: InitResult): void {
  // 作成されたファイルを表示
  for (const { app, file } of result.created) {
    console.log(`✓ Created: apps/${app}/${file}`);
  }

  // スキップされたファイルを表示
  for (const { app, file } of result.skipped) {
    console.log(`⊘ Skipped: apps/${app}/${file} (already exists)`);
  }

  // サマリーを表示
  console.log("");
  const createdCount = result.created.length;
  const skippedCount = result.skipped.length;

  if (createdCount === 0 && skippedCount === 0) {
    console.log("No .env.*.example files found.");
  } else {
    const parts: string[] = [];
    if (createdCount > 0) {
      parts.push(`${createdCount} file${createdCount === 1 ? "" : "s"} created`);
    }
    if (skippedCount > 0) {
      parts.push(`${skippedCount} skipped`);
    }
    console.log(`Summary: ${parts.join(", ")}`);
  }
}

// EOF
