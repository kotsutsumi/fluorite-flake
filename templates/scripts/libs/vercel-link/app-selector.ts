import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { cancel, isCancel, multiselect } from "@clack/prompts";

import type { AppDirectory, Logger, PromptFn } from "./types.js";

/**
 * apps/ 配下のディレクトリ一覧を取得
 */
export async function discoverApps(projectRoot: string, logger: Logger): Promise<AppDirectory[]> {
  try {
    const appsDir = join(projectRoot, "apps");
    const entries = await readdir(appsDir, { withFileTypes: true });

    const apps: AppDirectory[] = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        path: join(appsDir, entry.name),
        name: entry.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return apps;
  } catch (error) {
    logger.error("apps/ ディレクトリの読み取りに失敗しました");
    throw error;
  }
}

/**
 * ユーザーに処理対象のアプリを選択させる
 */
export async function selectApps(
  apps: AppDirectory[],
  prompt: PromptFn,
  logger: Logger
): Promise<AppDirectory[]> {
  if (apps.length === 0) {
    throw new Error("apps/ 配下にディレクトリが見つかりませんでした");
  }

  logger.info("\n📦 検出されたアプリケーション:");
  apps.forEach((app, index) => {
    logger.info(`  [${index + 1}] ${app.name}`);
  });

  logger.info("\n処理方法を選択してください:");
  logger.info("  - Enter キーのみ: 全アプリを処理");
  logger.info("  - スキップしたいアプリの番号をカンマ区切りで入力 (例: 1,3)");

  const answer = (await prompt("\n選択: ")).trim();

  if (!answer) {
    logger.success("全アプリを処理対象に設定しました");
    return apps;
  }

  // Parse skip indices
  const skipIndices = new Set<number>();
  const parts = answer.split(",").map((p) => p.trim());

  for (const part of parts) {
    const index = Number.parseInt(part, 10) - 1;
    if (!Number.isNaN(index) && index >= 0 && index < apps.length) {
      skipIndices.add(index);
    } else {
      logger.warn(`無効な番号をスキップ: ${part}`);
    }
  }

  const selectedApps = apps.filter((_, index) => !skipIndices.has(index));

  if (selectedApps.length === 0) {
    throw new Error("処理対象のアプリが選択されませんでした");
  }

  logger.info("\n処理対象のアプリ:");
  for (const app of selectedApps) {
    logger.info(`  - ${app.name}`);
  }

  const skippedApps = apps.filter((_, index) => skipIndices.has(index));
  if (skippedApps.length > 0) {
    logger.info("\nスキップするアプリ:");
    for (const app of skippedApps) {
      logger.info(`  - ${app.name}`);
    }
  }

  return selectedApps;
}

/**
 * カーソル選択でアプリを選ぶ（複数選択可能）
 */
export async function selectAppsInteractive(
  apps: AppDirectory[],
  logger: Logger
): Promise<AppDirectory[]> {
  if (apps.length === 0) {
    throw new Error("apps/ 配下にディレクトリが見つかりませんでした");
  }

  if (apps.length === 1) {
    logger.info(`ℹ️  アプリを自動選択: ${apps[0].name}`);
    return apps;
  }

  logger.info("\n📦 検出されたアプリケーション:");
  for (const [index, app] of apps.entries()) {
    logger.info(`  [${index + 1}] ${app.name} (${app.path})`);
  }

  const selected = await multiselect({
    message: "処理対象のアプリを選択してください:",
    options: apps.map((app) => ({
      value: app.name,
      label: app.name,
      hint: app.path,
    })),
    required: false,
  });

  if (isCancel(selected)) {
    cancel("操作がキャンセルされました");
    process.exit(0);
  }

  // 何も選択されなかった場合は全アプリを選択
  const selectedValues = selected as string[];
  const selectedApps =
    selectedValues.length === 0 ? apps : apps.filter((app) => selectedValues.includes(app.name));

  logger.success(`\n${selectedApps.length}個のアプリを選択しました`);
  logger.info("処理対象:");
  for (const app of selectedApps) {
    logger.info(`  - ${app.name}`);
  }

  return selectedApps;
}

// EOF
