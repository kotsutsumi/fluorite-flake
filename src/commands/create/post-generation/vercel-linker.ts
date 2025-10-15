import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import prompts, { type Options as PromptsOptions } from "prompts";

import { debugLog } from "../../../debug.js";
import { getMessages } from "../../../i18n.js";
import { confirm } from "../../../utils/user-input/confirm.js";
import { VercelCLI } from "../../../utils/vercel-cli/index.js";
import type { ProjectConfig } from "../types.js";

type VercelProjectSummary = {
    id: string;
    name: string;
};

type SelectedProject = {
    projectId: string;
    projectName: string;
};

type RepositoryPreferences = {
    directory: string;
    remoteName: string;
    shouldCreateRepo: boolean;
};

const PROMPTS_CANCELLED = "PROMPTS_CANCELLED";
const PROMPTS_OPTIONS: PromptsOptions = {
    onCancel: () => {
        throw new Error(PROMPTS_CANCELLED);
    },
};

/**
 * 対話可能な端末かどうかを判定
 */
function isInteractiveEnvironment(): boolean {
    const ciValue = process.env.CI?.toLowerCase();
    if (ciValue === "true" || ciValue === "1" || ciValue === "yes") {
        return false;
    }

    const stdinInteractive = typeof process.stdin.isTTY === "boolean" ? process.stdin.isTTY : true;
    const stdoutInteractive = typeof process.stdout.isTTY === "boolean" ? process.stdout.isTTY : true;

    return stdinInteractive || stdoutInteractive;
}

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
 * プロジェクト選択のプロンプト
 */
async function selectProject(
    projects: VercelProjectSummary[],
    defaultProjectName: string
): Promise<SelectedProject | undefined> {
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
 * プロジェクト情報を手入力で取得
 */
async function promptProjectDetails(defaultProjectName: string): Promise<SelectedProject | undefined> {
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
 * リポジトリ設定の入力
 */
async function promptRepositoryPreferences(config: ProjectConfig): Promise<RepositoryPreferences | undefined> {
    const { create } = getMessages();
    const defaultDirectory = config.monorepo ? "apps/web" : ".";

    const responses = await prompts(
        [
            {
                type: "toggle",
                name: "shouldCreateRepo",
                message: create.vercelLinkCreateRepoPrompt,
                initial: Boolean(config.monorepo),
                active: create.vercelLinkToggleYes,
                inactive: create.vercelLinkToggleNo,
            },
            {
                type: (prev: { shouldCreateRepo: boolean }) => (prev.shouldCreateRepo ? "text" : null),
                name: "directory",
                message: create.vercelLinkDirectoryPrompt,
                initial: defaultDirectory,
                validate: (value: string) => (value?.trim() ? true : create.vercelLinkDirectoryError),
            },
            {
                type: (prev: { shouldCreateRepo: boolean }) => (prev.shouldCreateRepo ? "text" : null),
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

    // 絶対パスが入力された場合はルートからの相対パスへ変換
    if (path.isAbsolute(directory)) {
        directory = path.relative(path.resolve(config.directory), path.resolve(directory)) || ".";
    }

    const remoteName = typeof responses.remoteName === "string" ? responses.remoteName.trim() : "origin";

    return {
        directory: directory === "" ? "." : directory,
        remoteName: remoteName === "" ? "origin" : remoteName,
        shouldCreateRepo,
    };
}

/**
 * Vercelプロジェクトとリンクするかを確認し、必要なファイルを生成
 */
export async function promptAndLinkVercelProject(config: ProjectConfig): Promise<void> {
    const { create } = getMessages();

    if (config.type !== "nextjs") {
        debugLog("Skip Vercel linking prompt for non-Next.js project", { type: config.type });
        return;
    }

    if (!isInteractiveEnvironment()) {
        debugLog("Skip Vercel linking prompt due to non-interactive environment");
        return;
    }

    const shouldLink = await confirm(create.vercelLinkConfirm, false);
    if (!shouldLink) {
        console.log(create.vercelLinkSkipped);
        return;
    }

    const projectRoot = path.resolve(config.directory);
    const listResult = VercelCLI.projectList({ json: true, cwd: projectRoot });
    if (!listResult.success) {
        console.warn(create.vercelLinkProjectListFailed);
        debugLog("Vercel project list command failed", {
            exitCode: listResult.exitCode,
            stderr: listResult.stderr,
        });
        return;
    }

    const { projects, contextName } = parseProjectList(listResult.stdout);

    let selectedProject: SelectedProject | undefined;
    try {
        selectedProject = await selectProject(projects, config.name);
    } catch (error) {
        if (error instanceof Error && error.message === PROMPTS_CANCELLED) {
            console.log(create.vercelLinkCancelled);
            return;
        }
        throw error;
    }

    if (!selectedProject) {
        console.log(create.vercelLinkCancelled);
        return;
    }

    let orgId = resolveOrgIdViaTempLink(selectedProject.projectName, contextName);
    if (!orgId) {
        try {
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

            if (!manualOrgId) {
                console.log(create.vercelLinkCancelled);
                return;
            }

            orgId = manualOrgId.trim();
        } catch (error) {
            if (error instanceof Error && error.message === PROMPTS_CANCELLED) {
                console.log(create.vercelLinkCancelled);
                return;
            }
            throw error;
        }
    }

    let repoPreferences: RepositoryPreferences | undefined;
    try {
        repoPreferences = await promptRepositoryPreferences(config);
    } catch (error) {
        if (error instanceof Error && error.message === PROMPTS_CANCELLED) {
            console.log(create.vercelLinkCancelled);
            return;
        }
        throw error;
    }

    if (!repoPreferences) {
        console.log(create.vercelLinkCancelled);
        return;
    }

    const vercelDir = ensureVercelDirectory(projectRoot);
    const projectJsonPath = path.join(vercelDir, "project.json");
    writeJsonFile(projectJsonPath, {
        projectId: selectedProject.projectId,
        projectName: selectedProject.projectName,
        orgId,
    });

    if (repoPreferences.shouldCreateRepo) {
        const repoJsonPath = path.join(vercelDir, "repo.json");
        writeJsonFile(repoJsonPath, {
            orgId,
            remoteName: repoPreferences.remoteName,
            projects: [
                {
                    id: selectedProject.projectId,
                    name: selectedProject.projectName,
                    directory: repoPreferences.directory,
                },
            ],
        });
    }

    console.log(create.vercelLinkSuccess(selectedProject.projectName));
}

// EOF
