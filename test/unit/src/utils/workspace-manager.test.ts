/**
 * WorkspaceManager ユーティリティのユニットテスト
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
    syncRootScripts,
    WorkspaceManager,
} from "../../../../src/utils/workspace-manager/index.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fluorite-workspace-"));
    tempDirs.push(dir);
    return dir;
}

describe("WorkspaceManager", () => {
    describe("generateRootScripts", () => {
        test("pnpm --filter run 形式でスクリプトを生成する", () => {
            const manager = new WorkspaceManager();
            const workspace = {
                rootPath: "/repo",
                workspaceFile: "/repo/pnpm-workspace.yaml",
                apps: [
                    {
                        name: "web",
                        type: "nextjs" as const,
                        path: "/repo/apps/web",
                        scripts: {
                            dev: "next dev",
                            build: "next build",
                            lint: "pnpm lint",
                            "env:apply": "node scripts/env-apply",
                        },
                        packageJson: {},
                    },
                    {
                        name: "mobile",
                        type: "expo" as const,
                        path: "/repo/apps/mobile",
                        scripts: {
                            start: "expo start",
                            build: "expo build",
                        },
                        packageJson: {},
                    },
                ],
                packages: [],
            } as const;

            const scripts = manager.generateRootScripts(workspace);

            expect(scripts["web:dev"]).toBe("pnpm --filter web run dev");
            expect(scripts["web:env:apply"]).toBe(
                "pnpm --filter web run env:apply"
            );
            expect(scripts["mobile:start"]).toBe(
                "pnpm --filter mobile run start"
            );
            expect(scripts.dev).toBe(
                "pnpm --filter web run dev & pnpm --filter mobile run start"
            );
            expect(scripts["build:all"]).toBe(
                "pnpm --filter web run build && pnpm --filter mobile run build"
            );
            expect(scripts["lint:all"]).toBe("pnpm --filter web run lint");
        });
    });
});

describe("syncRootScripts", () => {
    let projectRoot: string;

    beforeAll(async () => {
        projectRoot = await createTempDir();

        await fs.mkdir(path.join(projectRoot, "apps", "web"), {
            recursive: true,
        });
        await fs.mkdir(path.join(projectRoot, "apps", "mobile"), {
            recursive: true,
        });

        await fs.writeFile(
            path.join(projectRoot, "package.json"),
            `${JSON.stringify(
                {
                    name: "demo-workspace",
                    private: true,
                    scripts: {
                        build: "turbo run build",
                    },
                },
                null,
                2
            )}\n`
        );

        await fs.writeFile(
            path.join(projectRoot, "apps", "web", "package.json"),
            `${JSON.stringify(
                {
                    name: "web",
                    scripts: {
                        dev: "next dev",
                        build: "next build",
                        lint: "pnpm lint",
                    },
                },
                null,
                2
            )}\n`
        );

        await fs.writeFile(
            path.join(projectRoot, "apps", "mobile", "package.json"),
            `${JSON.stringify(
                {
                    name: "mobile",
                    scripts: {
                        start: "expo start",
                        build: "expo build",
                    },
                },
                null,
                2
            )}\n`
        );
    });

    afterAll(async () => {
        await Promise.all(
            tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true }))
        );
    });

    test("生成したスクリプトをルートpackage.jsonへ同期する", async () => {
        await syncRootScripts(projectRoot);

        const updatedPackageJson = JSON.parse(
            await fs.readFile(path.join(projectRoot, "package.json"), "utf-8")
        );

        expect(updatedPackageJson.scripts.build).toBe("turbo run build");
        const devScript = updatedPackageJson.scripts.dev as string;
        expect(devScript.split(" & ").sort()).toEqual(
            [
                "pnpm --filter mobile run start",
                "pnpm --filter web run dev",
            ].sort()
        );
        expect(updatedPackageJson.scripts["web:dev"]).toBe(
            "pnpm --filter web run dev"
        );
        expect(updatedPackageJson.scripts["mobile:start"]).toBe(
            "pnpm --filter mobile run start"
        );
        const buildAll = updatedPackageJson.scripts["build:all"] as string;
        expect(buildAll.split(" && ").sort()).toEqual(
            [
                "pnpm --filter mobile run build",
                "pnpm --filter web run build",
            ].sort()
        );
    });
});
