#!/usr/bin/env tsx
// 全アプリの環境変数を一括で Vercel にプッシュするラッパースクリプト。
// .vercel/repo.json に定義されたプロジェクトのみを対象とし、env-push.ts を実行する。
// どのディレクトリから実行しても動作するようにプロジェクトルートを自動検出。

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Regex patterns for directory normalization
const BACKSLASH_REGEX = /\\/g;
const LEADING_DOT_SLASH_REGEX = /^\.\//;
const TRAILING_SLASH_REGEX = /\/$/;

type EnvPushResult = {
  readonly app: string;
  readonly success: boolean;
  readonly error?: string;
};

type RepoJson = {
  readonly orgId?: string;
  readonly projects?: ReadonlyArray<{
    readonly id?: string;
    readonly name?: string;
    readonly directory?: string;
  }>;
};

/**
 * プロジェクトルートディレクトリを取得
 * scripts/ の親ディレクトリがプロジェクトルート
 */
function getProjectRoot(): string {
  return resolve(__dirname, "..");
}

/**
 * ディレクトリパスを正規化（resolve-project-config.ts と同じロジック）
 */
function normalizeDirectory(value: string | undefined): string {
  if (!value) {
    return ".";
  }

  const normalized = value
    .replace(BACKSLASH_REGEX, "/")
    .replace(LEADING_DOT_SLASH_REGEX, "")
    .replace(TRAILING_SLASH_REGEX, "");
  return normalized || ".";
}

/**
 * .vercel/repo.json を読み込み、設定されたプロジェクトディレクトリの一覧を取得
 */
async function getConfiguredProjects(projectRoot: string): Promise<Set<string>> {
  const repoJsonPath = join(projectRoot, ".vercel", "repo.json");

  try {
    const json = await readFile(repoJsonPath, "utf8");
    const data = JSON.parse(json) as RepoJson;

    if (!Array.isArray(data.projects)) {
      console.warn("⚠️  .vercel/repo.json に projects 配列が定義されていません");
      return new Set();
    }

    const configuredDirs = new Set<string>();
    for (const project of data.projects) {
      if (project.directory) {
        // プロジェクトルートからの相対パスを正規化
        const normalized = normalizeDirectory(project.directory);
        const absolutePath = resolve(projectRoot, normalized);
        configuredDirs.add(absolutePath);
      }
    }

    return configuredDirs;
  } catch (error) {
    console.warn(
      `⚠️  .vercel/repo.json の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`
    );
    console.warn("⚠️  全てのアプリをスキップします");
    return new Set();
  }
}

/**
 * apps/ 配下のディレクトリ一覧を取得
 */
async function getAppDirectories(projectRoot: string): Promise<string[]> {
  const appsDir = join(projectRoot, "apps");

  try {
    const entries = await readdir(appsDir, { withFileTypes: true });
    const appDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(appsDir, entry.name));

    return appDirs;
  } catch (error) {
    throw new Error(
      `apps/ ディレクトリの読み取りに失敗しました: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 指定されたディレクトリに必要な .env ファイルが存在するかチェック
 */
async function hasEnvFiles(appDir: string): Promise<boolean> {
  const requiredEnvFiles = [".env.preview", ".env.production", ".env.staging"];

  for (const envFile of requiredEnvFiles) {
    try {
      const filePath = join(appDir, envFile);
      await stat(filePath);
    } catch {
      // いずれか1つでも存在しない場合はスキップ
      return false;
    }
  }

  return true;
}

/**
 * 指定されたアプリディレクトリで env-push.ts を実行
 */
async function pushEnvForApp(
  appDir: string,
  selection: string,
  projectRoot: string
): Promise<EnvPushResult> {
  const appName = appDir.split("/").pop() || "unknown";

  console.log(`\n📦 ${appName} の環境変数をプッシュ中...`);

  try {
    // env-push.ts を動的インポート
    const envPushModule = await import("./env-push.ts");

    // 元の cwd を保存
    const originalCwd = process.cwd();

    // appDir に移動
    process.chdir(appDir);

    try {
      // process.exitCode をリセット（handleEnvPush が設定する可能性があるため）
      process.exitCode = 0;

      // handleEnvPush を実行（selection と projectRoot を引数として渡す）
      await envPushModule.handleEnvPush([
        "node",
        "env-push.ts",
        selection,
        "--project-root",
        projectRoot,
      ]);

      console.log(`✅ ${appName} の環境変数プッシュが完了しました`);

      // process.exitCode をリセット（次のアプリに影響しないように）
      process.exitCode = 0;

      return { app: appName, success: true };
    } finally {
      // 元の cwd に戻す
      process.chdir(originalCwd);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${appName} のプッシュ中にエラーが発生しました:`, errorMessage);

    return { app: appName, success: false, error: errorMessage };
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const selection = args[0] || "all";

  // サポートされている選択肢をチェック
  const validSelections = ["preview", "production", "staging", "all"];
  if (!validSelections.includes(selection)) {
    console.error(`❌ 無効な引数です: ${selection}\n使用可能な引数: ${validSelections.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(`🚀 設定されたアプリの環境変数を Vercel にプッシュします (${selection})`);

  const projectRoot = getProjectRoot();
  console.log(`📁 プロジェクトルート: ${projectRoot}`);

  // .vercel/repo.json から設定されたプロジェクト一覧を取得
  const configuredProjects = await getConfiguredProjects(projectRoot);

  if (configuredProjects.size === 0) {
    console.warn("⚠️  .vercel/repo.json に設定されたプロジェクトが見つかりませんでした");
    return;
  }

  console.log(`🔧 設定されたプロジェクト: ${configuredProjects.size}個`);

  // apps/ 配下のディレクトリを取得
  const appDirs = await getAppDirectories(projectRoot);

  if (appDirs.length === 0) {
    console.warn("⚠️  apps/ 配下にディレクトリが見つかりませんでした");
    return;
  }

  console.log(`📂 検出されたアプリ: ${appDirs.length}個`);

  // 各アプリディレクトリで env-push を実行
  const results: EnvPushResult[] = [];

  for (const appDir of appDirs) {
    const appName = appDir.split("/").pop() || "unknown";

    // .vercel/repo.json に定義されているかチェック
    if (!configuredProjects.has(appDir)) {
      console.log(`⏭️  ${appName} をスキップ（.vercel/repo.json に未定義）`);
      continue;
    }

    // .env ファイルの存在チェック
    const hasEnv = await hasEnvFiles(appDir);
    if (!hasEnv) {
      console.log(`⏭️  ${appName} をスキップ（必要な .env ファイルが存在しません）`);
      continue;
    }

    const result = await pushEnvForApp(appDir, selection, projectRoot);
    results.push(result);
  }

  // 結果サマリーを表示
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 実行結果サマリー");
  console.log("=".repeat(60));

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(`✅ 成功: ${successCount}個`);
  console.log(`❌ 失敗: ${failureCount}個`);

  if (failureCount > 0) {
    console.log("\n失敗したアプリ:");
    const failures = results.filter((r) => !r.success);
    for (const r of failures) {
      console.log(`  - ${r.app}: ${r.error}`);
    }

    process.exitCode = 1;
  } else {
    console.log("\n🎉 すべてのアプリの環境変数プッシュが完了しました！");
    // 全て成功した場合は exit code を明示的に 0 に設定
    process.exitCode = 0;
  }
}

// 実行
main().catch((error) => {
  console.error("❌ 予期しないエラーが発生しました:", error);
  process.exitCode = 1;
});

// EOF
