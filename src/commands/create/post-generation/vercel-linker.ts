import fs from "node:fs";
import path from "node:path";

import { debugLog } from "../../../debug.js";
import { getMessages } from "../../../i18n.js";
import type { ProjectConfig } from "../types.js";
import type { VercelProjectConfig } from "../confirmation/index.js";

/**
 * .vercelディレクトリを生成
 */
function ensureVercelDirectory(projectRoot: string): string {
    const vercelDir = path.join(projectRoot, ".vercel");
    fs.mkdirSync(vercelDir, { recursive: true });
    return vercelDir;
}

/**
 * JSONファイルを書き込む
 */
function writeJsonFile(filePath: string, data: unknown): void {
    const content = `${JSON.stringify(data, null, 2)}\n`;
    fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Vercelプロジェクト設定に基づいて.vercelディレクトリとファイルを生成
 *
 * @param config - プロジェクト設定
 * @param vercelConfig - Vercelプロジェクト設定（入力収集フェーズで取得済み）
 */
export function linkVercelProject(config: ProjectConfig, vercelConfig: VercelProjectConfig): void {
    const { create } = getMessages();

    console.log("\n🔗 Vercelプロジェクトとのリンクファイルを生成中...");
    debugLog("linkVercelProject called", { config, vercelConfig });

    // .vercelディレクトリは常にプロジェクトルートに作成
    const projectRoot = path.resolve(config.directory);
    debugLog("Creating .vercel directory at project root", {
        projectRoot,
        vercelConfigDirectory: vercelConfig.directory,
        shouldCreateRepo: vercelConfig.shouldCreateRepo,
        isMonorepo: config.monorepo,
    });
    const vercelDir = ensureVercelDirectory(projectRoot);

    // モノレポの場合はrepo.jsonのみ、シングルプロジェクトの場合はproject.jsonのみを生成
    if (vercelConfig.shouldCreateRepo) {
        // モノレポ構成: repo.jsonを生成
        const repoJsonPath = path.join(vercelDir, "repo.json");
        writeJsonFile(repoJsonPath, {
            orgId: vercelConfig.orgId,
            remoteName: vercelConfig.remoteName || "origin",
            projects: [
                {
                    id: vercelConfig.projectId,
                    name: vercelConfig.projectName,
                    directory: vercelConfig.directory || ".",
                },
            ],
        });
        console.log(`✅ ${repoJsonPath} を作成しました（モノレポ構成）`);
    } else {
        // シングルプロジェクト構成: project.jsonを生成
        const projectJsonPath = path.join(vercelDir, "project.json");
        writeJsonFile(projectJsonPath, {
            projectId: vercelConfig.projectId,
            orgId: vercelConfig.orgId,
        });
        console.log(`✅ ${projectJsonPath} を作成しました（シングルプロジェクト構成）`);
    }

    console.log(create.vercelLinkSuccess(vercelConfig.projectName));
}

// EOF
