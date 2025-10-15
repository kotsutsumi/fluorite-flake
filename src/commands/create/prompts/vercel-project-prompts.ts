/**
 * Vercelプロジェクト選択のプロンプト処理
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import prompts, { type Options as PromptsOptions } from "prompts";

import { debugLog } from "../../../debug.js";
import { getMessages } from "../../../i18n.js";
import { VercelCLI } from "../../../utils/vercel-cli/index.js";
import type { VercelProjectConfig } from "../confirmation/index.js";

// プロンプトがキャンセルされた際の定数
const PROMPTS_CANCELLED = "PROMPTS_CANCELLED";

// プロンプトオプション（キャンセル時の処理を含む）
const PROMPTS_OPTIONS: PromptsOptions = {
    onCancel: () => {
        throw new Error(PROMPTS_CANCELLED);
    },
};

// Vercelプロジェクトサマリー型
type VercelProjectSummary = {
    id: string;
    name: string;
};

/**
 * Vercel CLIのプロジェクト一覧レスポンスを解析
 */
function parseProjectList(rawOutput: string | undefined): {
    projects: VercelProjectSummary[];
    contextName?: string;
} {
    if (!rawOutput) {
        return { projects: [] };
    }

    try {
        const parsed = JSON.parse(rawOutput) as {
            projects?: Array<{ id?: string; name?: string }>;
            contextName?: string;
        };
        const projects = Array.isArray(parsed.projects)
            ? parsed.projects
                  .filter(
                      (project): project is { id: string; name: string } =>
                          Boolean(project?.id) && Boolean(project?.name)
                  )
                  .map((project) => ({ id: project.id, name: project.name }))
            : [];

        return {
            projects,
            contextName: parsed.contextName,
        };
    } catch (error) {
        debugLog("Failed to parse Vercel project list output", { error, rawOutput });
        return { projects: [] };
    }
}

/**
 * 一時ディレクトリを作成
 */
function createTemporaryDirectory(): string {
    const prefix = path.join(os.tmpdir(), "fluorite-vercel-link-");
    return fs.mkdtempSync(prefix);
}

/**
 * 一時ディレクトリを安全に削除
 */
function cleanTemporaryDirectory(tempDir: string): void {
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
        debugLog("Failed to clean temporary directory", { tempDir, error });
    }
}

/**
 * Vercel CLIを利用してorgIdを解決
 */
function resolveOrgIdViaTempLink(projectName: string, scope: string | undefined): string | undefined {
    const tempDir = createTemporaryDirectory();

    try {
        const linkResult = VercelCLI.link(undefined, {
            project: projectName,
            yes: true,
            cwd: tempDir,
            scope,
        });

        if (!linkResult.success) {
            debugLog("Temporary link failed while resolving orgId", {
                projectName,
                scope,
                exitCode: linkResult.exitCode,
                stderr: linkResult.stderr,
            });
            return undefined;
        }

        const projectJsonPath = path.join(tempDir, ".vercel", "project.json");
        if (!fs.existsSync(projectJsonPath)) {
            debugLog("Temporary link did not create project.json", { projectName, scope, projectJsonPath });
            return undefined;
        }

        try {
            const projectJsonRaw = fs.readFileSync(projectJsonPath, "utf8");
            const parsed = JSON.parse(projectJsonRaw) as { orgId?: string };
            if (typeof parsed.orgId === "string" && parsed.orgId.trim() !== "") {
                return parsed.orgId;
            }
        } catch (error) {
            debugLog("Failed to parse project.json for orgId", { error, projectJsonPath });
        }

        return undefined;
    } finally {
        cleanTemporaryDirectory(tempDir);
    }
}

/**
 * プロジェクト情報を手入力で取得
 */
async function promptProjectDetails(defaultProjectName: string): Promise<
    | {
          projectId: string;
          projectName: string;
      }
    | undefined
> {
    const { create } = getMessages();

    const responses = await prompts(
        [
            {
                type: "text",
                name: "projectId",
                message: create.vercelLinkProjectIdPrompt,
                validate: (value: string) => (value?.trim() ? true : create.vercelLinkProjectIdError),
            },
            {
                type: "text",
                name: "projectName",
                message: create.vercelLinkProjectNamePrompt,
                initial: defaultProjectName,
                validate: (value: string) => (value?.trim() ? true : create.vercelLinkProjectNameError),
            },
        ],
        PROMPTS_OPTIONS
    );

    if (!responses?.projectId || !responses?.projectName) {
        return undefined;
    }

    return {
        projectId: responses.projectId.trim(),
        projectName: responses.projectName.trim(),
    };
}

/**
 * プロジェクト選択のプロンプト
 */
async function selectProject(
    projects: VercelProjectSummary[],
    defaultProjectName: string
): Promise<{ projectId: string; projectName: string } | undefined> {
    const { create } = getMessages();

    if (projects.length === 0) {
        return promptProjectDetails(defaultProjectName);
    }

    const choices: Array<{ title: string; value: VercelProjectSummary | "manual" }> = projects
        .slice(0, 25)
        .map((project) => ({
            title: `${project.name} (${project.id})`,
            value: project,
        }));

    choices.push({
        title: create.vercelLinkManualChoice,
        value: "manual",
    });

    const { selected } = await prompts(
        {
            type: "select",
            name: "selected",
            message: create.vercelLinkSelectProject,
            choices,
            initial: 0,
        },
        PROMPTS_OPTIONS
    );

    if (!selected) {
        return undefined;
    }

    if (selected === "manual") {
        return promptProjectDetails(defaultProjectName);
    }

    const project = selected as VercelProjectSummary;
    return { projectId: project.id, projectName: project.name };
}

/**
 * リポジトリ設定の入力
 */
async function promptRepositoryPreferences(monorepo: boolean): Promise<
    | {
          directory: string;
          remoteName: string;
          shouldCreateRepo: boolean;
      }
    | undefined
> {
    const { create } = getMessages();
    const defaultDirectory = monorepo ? "apps/web" : ".";

    const responses = await prompts(
        [
            {
                type: "toggle",
                name: "shouldCreateRepo",
                message: create.vercelLinkCreateRepoPrompt,
                initial: Boolean(monorepo),
                active: create.vercelLinkToggleYes,
                inactive: create.vercelLinkToggleNo,
            },
            {
                type: (prev: boolean) => (prev ? "text" : null),
                name: "directory",
                message: create.vercelLinkDirectoryPrompt,
                initial: defaultDirectory,
                validate: (value: string) => (value?.trim() ? true : create.vercelLinkDirectoryError),
            },
            {
                type: (prev: boolean) => (prev ? "text" : null),
                name: "remoteName",
                message: create.vercelLinkRemotePrompt,
                initial: "origin",
                validate: (value: string) => (value?.trim() ? true : create.vercelLinkRemoteError),
            },
        ],
        PROMPTS_OPTIONS
    );

    if (!responses) {
        return undefined;
    }

    const shouldCreateRepo = Boolean(responses.shouldCreateRepo);
    let directory = typeof responses.directory === "string" ? responses.directory.trim() : defaultDirectory;
    if (!directory) {
        directory = defaultDirectory;
    }

    const remoteName = typeof responses.remoteName === "string" ? responses.remoteName.trim() : "origin";

    return {
        directory: directory === "" ? "." : directory,
        remoteName: remoteName === "" ? "origin" : remoteName,
        shouldCreateRepo,
    };
}

/**
 * Vercelプロジェクトの選択を対話的に収集
 *
 * @param projectName - デフォルトプロジェクト名
 * @param monorepo - モノレポ構成かどうか
 * @returns Vercelプロジェクト設定情報、またはキャンセル時はundefined
 */
export async function promptVercelProjectSelection(
    projectName: string,
    monorepo: boolean
): Promise<VercelProjectConfig | undefined> {
    const { create } = getMessages();

    try {
        console.log("\n🔗 Vercelプロジェクトの選択");
        console.log("🔍 Vercelプロジェクト一覧を取得中...");

        const listResult = VercelCLI.projectList({ json: true });
        if (!listResult.success) {
            console.warn(create.vercelLinkProjectListFailed);
            debugLog("Vercel project list command failed", {
                exitCode: listResult.exitCode,
                stderr: listResult.stderr,
            });
            return undefined;
        }

        const { projects, contextName } = parseProjectList(listResult.stdout);
        console.log(
            `✅ ${projects.length}件のプロジェクトを取得しました${contextName ? ` (組織: ${contextName})` : ""}`
        );

        const selectedProject = await selectProject(projects, projectName);
        if (!selectedProject) {
            console.log(create.vercelLinkCancelled);
            return undefined;
        }

        console.log(`\n📋 選択されたプロジェクト: ${selectedProject.projectName}`);

        let orgId: string | undefined = resolveOrgIdViaTempLink(selectedProject.projectName, contextName);
        if (!orgId) {
            const { manualOrgId } = await prompts(
                {
                    type: "text",
                    name: "manualOrgId",
                    message: create.vercelLinkOrgIdPrompt,
                    initial: process.env.VERCEL_ORG_ID ?? "",
                    validate: (value: string) => (value?.trim() ? true : create.vercelLinkOrgIdError),
                },
                PROMPTS_OPTIONS
            );

            if (!manualOrgId || typeof manualOrgId !== "string") {
                console.log(create.vercelLinkCancelled);
                return undefined;
            }

            orgId = manualOrgId.trim();
        }

        // ここまで来た場合、orgIdは確実にstringになっている
        if (!orgId) {
            console.error("❌ 組織IDを取得できませんでした");
            return undefined;
        }

        console.log(`✅ 組織ID: ${orgId}`);

        const repoPreferences = await promptRepositoryPreferences(monorepo);
        if (!repoPreferences) {
            console.log(create.vercelLinkCancelled);
            return undefined;
        }

        return {
            projectId: selectedProject.projectId,
            projectName: selectedProject.projectName,
            orgId,
            directory: repoPreferences.directory,
            remoteName: repoPreferences.remoteName,
            shouldCreateRepo: repoPreferences.shouldCreateRepo,
        };
    } catch (error) {
        if (error instanceof Error && error.message === PROMPTS_CANCELLED) {
            console.log(create.vercelLinkCancelled);
            return undefined;
        }
        throw error;
    }
}

// EOF
