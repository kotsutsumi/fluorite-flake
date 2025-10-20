import type { ProjectOperationResult } from "./env-types.js";

// 処理済みプロジェクトとスキップされたプロジェクトの件数を要約表示し、
// オペレーターが結果を素早く確認できるようにする。
export function printSummary(results: readonly ProjectOperationResult[]): void {
  // 成功件数は実際に暗号化・復号を実行したものだけを数える。
  const processed = results.filter((result) => result.status === "success").length;
  const skipped = results.length - processed;

  console.log("\n====================");
  console.log(`Completed operation for ${results.length} projects.`);
  console.log(`  ✓ Processed: ${processed}`);
  console.log(`  ⚠️  Skipped: ${skipped}`);
}

// EOF
