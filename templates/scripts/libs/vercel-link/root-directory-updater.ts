/**
 * Vercel プロジェクトの Root Directory 設定を更新するモジュール
 * モノレポで各アプリのプロジェクトルートを正しく設定する
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Logger, VercelProjectInfo } from "./types.js";

/**
 * .vercel/project.json から projectId と orgId を取得
 */
async function readProjectInfo(appPath: string): Promise<VercelProjectInfo> {
  const projectJsonPath = resolve(appPath, ".vercel", "project.json");
  const content = await readFile(projectJsonPath, "utf8");
  const data = JSON.parse(content);

  if (!data.projectId || !data.orgId) {
    throw new Error(`.vercel/project.json に projectId または orgId が見つかりません: ${projectJsonPath}`);
  }

  return {
    projectId: data.projectId,
    orgId: data.orgId,
  };
}

/**
 * Vercel API を使って Root Directory を設定
 */
async function updateRootDirectory(
  projectId: string,
  orgId: string,
  rootDirectory: string,
  token: string,
  logger: Logger
): Promise<void> {
  const apiUrl = `https://api.vercel.com/v9/projects/${projectId}`;

  logger.info(`\n🔧 Root Directory を設定中...`);
  logger.info(`   API URL: ${apiUrl}`);
  logger.info(`   Root Directory: ${rootDirectory}`);

  const response = await fetch(apiUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rootDirectory,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Vercel API エラー (${response.status}): ${errorText}`
    );
  }

  logger.success("Root Directory を設定しました");
}

/**
 * Vercel トークンを取得
 */
async function getVercelToken(): Promise<string> {
  // 環境変数から取得
  const token = process.env.VERCEL_TOKEN;
  if (token) {
    return token;
  }

  // ~/.vercel/auth.json から取得
  try {
    const authPath = resolve(process.env.HOME || "~", ".vercel", "auth.json");
    const authContent = await readFile(authPath, "utf8");
    const authData = JSON.parse(authContent);
    if (authData.token) {
      return authData.token;
    }
  } catch {
    // auth.json が読めない場合は続行
  }

  throw new Error(
    "Vercel トークンが見つかりません。環境変数 VERCEL_TOKEN を設定するか、vercel login を実行してください"
  );
}

/**
 * アプリの Root Directory を相対パスで取得
 * 例: /home/user/project/apps/backend → apps/backend
 */
function getRelativeRootDirectory(projectRoot: string, appPath: string): string {
  const relativePath = appPath.replace(projectRoot + "/", "");
  return relativePath;
}

/**
 * Root Directory を設定するメイン関数
 */
export async function setRootDirectory(
  projectRoot: string,
  appPath: string,
  logger: Logger
): Promise<void> {
  try {
    // プロジェクト情報を取得
    const projectInfo = await readProjectInfo(appPath);

    // 相対パスを計算
    const rootDirectory = getRelativeRootDirectory(projectRoot, appPath);

    // Vercel トークンを取得
    const token = await getVercelToken();

    // Root Directory を設定
    await updateRootDirectory(
      projectInfo.projectId,
      projectInfo.orgId,
      rootDirectory,
      token,
      logger
    );
  } catch (error) {
    logger.error(`Root Directory の設定に失敗しました: ${error}`);
    throw error;
  }
}

// EOF
