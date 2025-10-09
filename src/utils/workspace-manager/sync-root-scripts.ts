/**
 * ルートpackage.jsonのスクリプト同期ユーティリティ
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { ScriptMap } from "./types.js";
import { WorkspaceManager } from "./workspace-manager.js";

/**
 * ワークスペース構造を検出し、ルートスクリプトを同期
 */
export async function syncRootScripts(projectRoot: string): Promise<void> {
    const workspaceManager = new WorkspaceManager();
    const workspace = await workspaceManager.detectWorkspaces(projectRoot);

    if (workspace.apps.length === 0) {
        return;
    }

    const generatedScripts = workspaceManager.generateRootScripts(workspace);
    if (Object.keys(generatedScripts).length === 0) {
        return;
    }

    const packageJsonPath = path.join(projectRoot, "package.json");

    let packageJson: any;
    try {
        const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
        packageJson = JSON.parse(packageJsonContent);
    } catch {
        // ルートのpackage.jsonが存在しない場合は同期をスキップ
        return;
    }

    const originalScripts = isRecord(packageJson.scripts) ? (packageJson.scripts as ScriptMap) : {};

    const shouldUpdate = Object.entries(generatedScripts).some(([key, value]) => originalScripts[key] !== value);

    if (!shouldUpdate) {
        return;
    }

    packageJson.scripts = {
        ...originalScripts,
        ...generatedScripts,
    } satisfies ScriptMap;

    await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

/**
 * レコード型チェック
 */
function isRecord(value: unknown): value is Record<string, string> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

// EOF
