import { join } from "node:path";

import type { EnvUpdateResult, VercelLinkDeps } from "./types.js";

const NEXT_PUBLIC_APP_URL_REGEX = /^NEXT_PUBLIC_APP_URL=(.*)$/m;

/**
 * 環境変数ファイルの URL を更新
 */
async function updateEnvFile(
  filePath: string,
  urls: Record<string, string>,
  deps: VercelLinkDeps
): Promise<EnvUpdateResult> {
  try {
    let content = "";

    // ファイルが存在する場合は読み込む
    if (deps.exists(filePath)) {
      content = await deps.readFile(filePath);
    }

    // 各 URL キーを更新
    let updated = false;
    for (const [key, value] of Object.entries(urls)) {
      const regex = new RegExp(`^${key}=.*$`, "m");

      if (regex.test(content)) {
        // 既存のキーを置換
        const newContent = content.replace(regex, `${key}=${value}`);
        if (newContent !== content) {
          content = newContent;
          updated = true;
        }
      } else {
        // 新しいキーを追加
        content = content.trim() ? `${content}\n${key}=${value}\n` : `${key}=${value}\n`;
        updated = true;
      }
    }

    if (updated) {
      await deps.writeFile(filePath, content);
    }

    return {
      file: filePath,
      updated,
    };
  } catch (error) {
    return {
      file: filePath,
      updated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * backend の環境ファイルから NEXT_PUBLIC_APP_URL を取得
 */
async function getBackendApiUrl(
  projectRoot: string,
  envType: "preview" | "production" | "staging",
  deps: VercelLinkDeps
): Promise<string | null> {
  try {
    const backendEnvPath = join(projectRoot, "apps", "backend", `.env.${envType}`);
    if (!deps.exists(backendEnvPath)) {
      return null;
    }

    const content = await deps.readFile(backendEnvPath);
    const match = content.match(NEXT_PUBLIC_APP_URL_REGEX);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * アプリディレクトリの全環境ファイルを更新
 */
export async function updateAllEnvFiles(
  appDir: string,
  projectName: string,
  teamSlug: string,
  deps: VercelLinkDeps
): Promise<EnvUpdateResult[]> {
  const results: EnvUpdateResult[] = [];

  // backend の API URL を取得
  const backendProductionUrl = await getBackendApiUrl(deps.projectRoot, "production", deps);
  const backendStagingUrl = await getBackendApiUrl(deps.projectRoot, "staging", deps);
  const backendPreviewUrl = await getBackendApiUrl(deps.projectRoot, "preview", deps);

  // .env.production 更新
  const productionUrls = {
    NEXT_PUBLIC_APP_URL: `https://${projectName}.vercel.app`,
    BETTER_AUTH_URL: `https://${projectName}.vercel.app`,
    NEXT_PUBLIC_API_URL: backendProductionUrl || `https://${projectName}.vercel.app`,
  };

  const productionPath = join(appDir, ".env.production");
  results.push(await updateEnvFile(productionPath, productionUrls, deps));

  deps.logger.info(`  📝 ${productionPath}:`);
  for (const [key, value] of Object.entries(productionUrls)) {
    deps.logger.info(`     ${key}=${value}`);
  }

  // .env.staging 更新
  const stagingUrls = {
    NEXT_PUBLIC_APP_URL: `https://${projectName}-env-staging-${teamSlug}.vercel.app`,
    BETTER_AUTH_URL: `https://${projectName}-env-staging-${teamSlug}.vercel.app`,
    NEXT_PUBLIC_API_URL:
      backendStagingUrl || `https://${projectName}-env-staging-${teamSlug}.vercel.app`,
  };

  const stagingPath = join(appDir, ".env.staging");
  results.push(await updateEnvFile(stagingPath, stagingUrls, deps));

  deps.logger.info(`  📝 ${stagingPath}:`);
  for (const [key, value] of Object.entries(stagingUrls)) {
    deps.logger.info(`     ${key}=${value}`);
  }

  // .env.preview 更新
  const previewUrls = {
    NEXT_PUBLIC_APP_URL: `https://${projectName}-${teamSlug}.vercel.app`,
    BETTER_AUTH_URL: `https://${projectName}-${teamSlug}.vercel.app`,
    NEXT_PUBLIC_API_URL: backendPreviewUrl || `https://${projectName}-${teamSlug}.vercel.app`,
  };

  const previewPath = join(appDir, ".env.preview");
  results.push(await updateEnvFile(previewPath, previewUrls, deps));

  deps.logger.info(`  📝 ${previewPath}:`);
  for (const [key, value] of Object.entries(previewUrls)) {
    deps.logger.info(`     ${key}=${value}`);
  }

  return results;
}

// EOF
