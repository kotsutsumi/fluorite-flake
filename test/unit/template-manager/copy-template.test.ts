/**
 * テンプレートコピーの基本動作を確認するテスト
 */

import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copyTemplateDirectory } from "../../../src/utils/template-manager/index.js";

/**
 * テンプレートコピーがファイル生成と置換・権限付与を行うことを検証
 */
describe("copyTemplateDirectory", () => {
    let workDir: string;

    beforeEach(async () => {
        workDir = await mkdtemp(join(tmpdir(), "fluorite-template-"));
    });

    afterEach(async () => {
        await rm(workDir, { recursive: true, force: true });
    });

    it("テンプレートをコピーしプレースホルダーと権限を適用する", async () => {
        const targetDirectory = join(workDir, "project");
        const result = await copyTemplateDirectory({
            templateName: "nextjs-fullstack-admin",
            targetDirectory,
            variableFiles: ["package.json"],
            variables: { "{{PROJECT_NAME}}": "test-app" },
            executableFiles: ["scripts/vercel-env-setup.sh"],
        });

        expect(result.files).toContain("package.json");
        expect(result.directories).toContain("app");

        const packageJson = JSON.parse(
            await readFile(join(targetDirectory, "package.json"), "utf8")
        );
        expect(packageJson.name).toBe("test-app");

        const scriptStats = await stat(
            join(targetDirectory, "scripts", "vercel-env-setup.sh")
        );
        // biome-ignore lint/suspicious/noBitwiseOperators: ファイルの実行権限チェックに必要
        expect(scriptStats.mode & 0o100).toBeGreaterThan(0);
    });
});

// EOF
