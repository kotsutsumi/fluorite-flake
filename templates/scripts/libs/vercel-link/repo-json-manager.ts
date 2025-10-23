import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { normalize, join, relative } from "node:path";

import type { Logger } from "./logger.js";

/**
 * repo.json のプロジェクト設定
 */
export interface RepoProjectConfig {
  id: string;
  name: string;
  directory: string;
}

/**
 * repo.json の全体構造
 */
export interface RepoJson {
  orgId: string;
  remoteName: string;
  projects: RepoProjectConfig[];
}

/**
 * updateRepoJson 関数のパラメータ
 */
export interface UpdateRepoJsonParams {
  projectDirectory: string; // "apps/backend" など
  vercelProjectId: string; // "prj_xxx"
  vercelProjectName: string;
  orgId: string; // "team_xxx"
  logger: Logger;
}

/**
 * .git/config ファイルからリモート名とURLを取得する
 *
 * @param gitConfigPath - .git/config ファイルのパス
 * @returns リモート名とURLのマップ、またはundefined
 */
async function parseGitConfig(gitConfigPath: string): Promise<Record<string, string> | undefined> {
  try {
    const content = await readFile(gitConfigPath, "utf-8");
    const remotes: Record<string, string> = {};

    // [remote "origin"] セクションを探す
    const lines = content.split("\n");
    let currentRemote: string | null = null;

    for (const line of lines) {
      const remoteMatch = line.match(/^\[remote "([^"]+)"\]$/);
      if (remoteMatch) {
        currentRemote = remoteMatch[1];
        continue;
      }

      if (currentRemote) {
        const urlMatch = line.match(/^\s*url\s*=\s*(.+)$/);
        if (urlMatch) {
          remotes[currentRemote] = urlMatch[1].trim();
          currentRemote = null;
        }
      }
    }

    return Object.keys(remotes).length > 0 ? remotes : undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * 現在のGitリポジトリからremoteName（"origin"など）を取得
 *
 * @param repoRoot - リポジトリルートディレクトリ
 * @returns リモート名（デフォルト: "origin"）
 */
async function getGitRemoteName(repoRoot: string): Promise<string> {
  const gitConfigPath = join(repoRoot, ".git", "config");

  try {
    const remotes = await parseGitConfig(gitConfigPath);
    if (!remotes) {
      return "origin";
    }

    const remoteNames = Object.keys(remotes);
    if (remoteNames.length === 0) {
      return "origin";
    }

    // "origin" が存在すればそれを返す
    if (remoteNames.includes("origin")) {
      return "origin";
    }

    // それ以外は最初のリモート名を返す
    return remoteNames[0];
  } catch {
    return "origin";
  }
}

/**
 * Gitリポジトリのルートディレクトリを見つける
 *
 * @param startPath - 検索開始パス
 * @returns リポジトリルートのパス、見つからない場合はundefined
 */
async function findRepoRoot(startPath: string): Promise<string | undefined> {
  try {
    // git rev-parse --show-toplevel でリポジトリルートを取得
    const repoRoot = execSync("git rev-parse --show-toplevel", {
      cwd: startPath,
      encoding: "utf-8",
    }).trim();
    return repoRoot;
  } catch {
    return undefined;
  }
}

/**
 * 既存のrepo.jsonを読み込み、パースする
 *
 * @param repoConfigPath - repo.json のパス
 * @returns RepoJson オブジェクト、またはnull
 */
async function loadExistingRepoJson(repoConfigPath: string): Promise<RepoJson | null> {
  try {
    if (!existsSync(repoConfigPath)) {
      return null;
    }

    const content = await readFile(repoConfigPath, "utf-8");
    const data = JSON.parse(content) as RepoJson;
    return data;
  } catch (error) {
    // パースエラーの場合はnullを返す
    return null;
  }
}

/**
 * RepoJsonオブジェクトを.vercel/repo.jsonに書き込む
 *
 * @param repoConfigPath - repo.json のパス
 * @param data - RepoJson データ
 */
async function saveRepoJson(repoConfigPath: string, data: RepoJson): Promise<void> {
  // .vercel ディレクトリが存在しない場合は作成
  const vercelDir = join(repoConfigPath, "..");
  if (!existsSync(vercelDir)) {
    await mkdir(vercelDir, { recursive: true });
  }

  // JSON を整形して書き込み（Vercel CLIと同じ形式）
  const json = JSON.stringify(data, null, 2);
  await writeFile(repoConfigPath, json, "utf-8");
}

/**
 * .vercel/repo.json を作成または更新する
 *
 * この関数は Vercel CLI の --repo オプションと同等の機能を提供します。
 * 既存のrepo.jsonがあれば読み込み、新しいプロジェクト情報をマージします。
 *
 * @param params - 更新パラメータ
 */
export async function updateRepoJson(params: UpdateRepoJsonParams): Promise<void> {
  const { projectDirectory, vercelProjectId, vercelProjectName, orgId, logger } = params;

  // 1. リポジトリルートを見つける
  logger.info("\n🔍 Gitリポジトリのルートを検索中...");
  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    throw new Error("Gitリポジトリのルートが見つかりませんでした");
  }
  logger.success(`  リポジトリルート: ${repoRoot}`);

  // 2. Git リモート名を取得
  logger.info("\n🌐 Gitリモート情報を取得中...");
  const remoteName = await getGitRemoteName(repoRoot);
  logger.success(`  リモート名: ${remoteName}`);

  // 3. repo.json のパスを決定
  const repoConfigPath = join(repoRoot, ".vercel", "repo.json");
  logger.info(`\n📄 repo.json のパス: ${repoConfigPath}`);

  // 4. 既存のrepo.jsonを読み込む
  const existingRepoJson = await loadExistingRepoJson(repoConfigPath);
  if (existingRepoJson) {
    logger.info("  既存のrepo.jsonを読み込みました");
  } else {
    logger.info("  repo.jsonが存在しないため、新規作成します");
  }

  // 5. プロジェクトディレクトリを正規化（リポジトリルートからの相対パス）
  // projectDirectory は既に相対パス（例: "apps/backend"）として渡される
  let relativeDirectory = normalize(projectDirectory);

  // ルートディレクトリの場合は "." にする
  if (relativeDirectory === "" || relativeDirectory === ".") {
    relativeDirectory = ".";
  }

  logger.info(`\n📂 プロジェクトディレクトリ: ${relativeDirectory}`);

  // 6. 新しいプロジェクト情報を作成
  const newProject: RepoProjectConfig = {
    id: vercelProjectId,
    name: vercelProjectName,
    directory: relativeDirectory,
  };

  // 7. 既存のプロジェクトリストとマージ
  let projects: RepoProjectConfig[] = existingRepoJson?.projects ?? [];

  // 同じディレクトリのプロジェクトがあれば上書き、なければ追加
  const existingProjectIndex = projects.findIndex((p) => p.directory === relativeDirectory);
  if (existingProjectIndex >= 0) {
    logger.info(`  既存のプロジェクト "${projects[existingProjectIndex].name}" を更新します`);
    projects[existingProjectIndex] = newProject;
  } else {
    logger.info(`  新しいプロジェクト "${vercelProjectName}" を追加します`);
    projects.push(newProject);
  }

  // 8. repo.json を構築
  const repoJson: RepoJson = {
    orgId,
    remoteName,
    projects,
  };

  // 9. repo.json を保存
  logger.info("\n💾 repo.jsonを保存中...");
  await saveRepoJson(repoConfigPath, repoJson);
  logger.success(`  repo.jsonを保存しました: ${repoConfigPath}`);
  logger.success(`  プロジェクト数: ${projects.length}`);
}

// EOF
