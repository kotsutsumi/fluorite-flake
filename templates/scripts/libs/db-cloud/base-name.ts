import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { DATABASE_NAME_PATTERN } from "./constants.js";
import type { DbEnvironment, ResolveBaseNameOptions } from "./types.js";

const NUMBER_PATTERN = /^\d+$/;

export function deriveBaseNames(databaseNames: readonly string[]): string[] {
  const result = new Set<string>();
  for (const name of databaseNames) {
    for (const env of [
      "preview",
      "staging",
      "production",
    ] as const satisfies readonly DbEnvironment[]) {
      if (name.endsWith(`-${env}`)) {
        result.add(name.slice(0, name.length - (env.length + 1)));
      }
    }
  }
  return [...result].sort();
}

export function sanitizeDatabaseName(raw: string): string {
  const normalized = raw.toLowerCase().trim();
  if (!DATABASE_NAME_PATTERN.test(normalized)) {
    throw new Error(
      `データベース名 "${raw}" が無効です。英小文字・数字・ハイフンのみで 2〜32 文字に収めてください。`
    );
  }
  return normalized;
}

function resolveBaseNameFromAnswer(
  answer: string,
  candidates: readonly string[]
): string | undefined {
  if (!answer) {
    return;
  }
  if (NUMBER_PATTERN.test(answer)) {
    const index = Number.parseInt(answer, 10) - 1;
    if (index >= 0 && index < candidates.length) {
      return candidates[index];
    }
  }
  return answer;
}

export async function resolveBaseDatabaseName(options: ResolveBaseNameOptions): Promise<string> {
  const { initialName, autoApprove, existingNames, prompt, logger } = options;
  if (initialName) {
    return sanitizeDatabaseName(initialName);
  }

  const baseCandidates = deriveBaseNames(existingNames);
  if (autoApprove && baseCandidates.length === 1) {
    logger.info(`ℹ️  既存のベース名を自動採用します: ${baseCandidates[0]}`);
    return baseCandidates[0];
  }

  logger.info("🔧 Turso のデータベース名を設定します");
  if (baseCandidates.length > 0) {
    logger.info("既存のベース名:");
    baseCandidates.forEach((candidate, index) => {
      logger.info(`  [${index + 1}] ${candidate}`);
    });
  } else {
    logger.info("既存のベース名は見つかりませんでした。");
  }
  logger.info(
    "環境サフィックスを除いたベース名を入力すると、<name>-preview / -staging / -production を自動生成します。"
  );

  while (true) {
    const answer = (await prompt("ベース名を入力してください: ")).trim();
    const resolved = resolveBaseNameFromAnswer(answer, baseCandidates);
    if (!resolved) {
      logger.warn("⚠️ 入力が空です。候補番号または新しい名前を入力してください。");
      continue;
    }

    try {
      return sanitizeDatabaseName(resolved);
    } catch (error) {
      logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}

/* c8 ignore start */
/**
 * Readlineインタラクションを行うユーティリティ関数。
 * 統合テストでテストすべきため、ユニットテストのカバレッジ対象から除外しています。
 */
export async function createReadlinePrompt(message: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(message);
  } finally {
    rl.close();
  }
}
/* c8 ignore stop */

// EOF
