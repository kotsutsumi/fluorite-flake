import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// biome-ignore lint/performance/noNamespaceImport: vi.spyOnでモックするためにネームスペースインポートが必要
import * as constants from "../../../libs/env-init/constants.js";
import { initAllEnvFiles } from "../../../libs/env-init/init-all-env.js";

describe("initAllEnvFiles", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "env-init-all-test-"));

    // APPS_DIR を一時ディレクトリに置き換える
    vi.spyOn(constants, "APPS_DIR", "get").mockReturnValue(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("複数のアプリの .env.*.example ファイルを処理すること", async () => {
    // app1 ディレクトリとファイルを作成
    const app1Dir = join(testDir, "app1");
    await mkdir(app1Dir, { recursive: true });
    await writeFile(join(app1Dir, ".env.example"), "APP1_VAR=value1");

    // app2 ディレクトリとファイルを作成
    const app2Dir = join(testDir, "app2");
    await mkdir(app2Dir, { recursive: true });
    await writeFile(join(app2Dir, ".env.local.example"), "APP2_VAR=value2");

    const result = await initAllEnvFiles();

    expect(result.created).toHaveLength(2);
    expect(result.created).toContainEqual({ app: "app1", file: ".env" });
    expect(result.created).toContainEqual({ app: "app2", file: ".env.local" });
    expect(result.skipped).toEqual([]);
  });

  it("既存ファイルは上書きせずスキップすること", async () => {
    const appDir = join(testDir, "backend");
    await mkdir(appDir, { recursive: true });
    await writeFile(join(appDir, ".env.example"), "VAR=example");
    await writeFile(join(appDir, ".env"), "VAR=existing");

    const result = await initAllEnvFiles();

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual([{ app: "backend", file: ".env" }]);
  });

  it(".env.*.example がないアプリはスキップすること", async () => {
    // アプリディレクトリを作成するが .env.*.example ファイルは作成しない
    const app1Dir = join(testDir, "app1");
    await mkdir(app1Dir, { recursive: true });
    await writeFile(join(app1Dir, "README.md"), "# App1");

    const result = await initAllEnvFiles();

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it("ファイルのみは処理せずディレクトリのみ処理すること", async () => {
    // ディレクトリとファイルを混在させる
    const appDir = join(testDir, "web");
    await mkdir(appDir, { recursive: true });
    await writeFile(join(appDir, ".env.example"), "WEB_VAR=value");
    await writeFile(join(testDir, "README.md"), "# Root README");

    const result = await initAllEnvFiles();

    expect(result.created).toEqual([{ app: "web", file: ".env" }]);
  });

  it("apps ディレクトリが存在しない場合はエラーをスローすること", async () => {
    const nonExistentDir = join(testDir, "non-existent-apps");
    vi.spyOn(constants, "APPS_DIR", "get").mockReturnValue(nonExistentDir);

    await expect(initAllEnvFiles()).rejects.toThrow(`apps/ directory not found: ${nonExistentDir}`);
  });

  it("空の apps ディレクトリの場合は空の結果を返すこと", async () => {
    // testDir は既に存在するが、中にはアプリディレクトリがない状態

    const result = await initAllEnvFiles();

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it("複数のアプリの結果を集約すること", async () => {
    // backend: 作成1つ、スキップ1つ
    const backendDir = join(testDir, "backend");
    await mkdir(backendDir, { recursive: true });
    await writeFile(join(backendDir, ".env.example"), "VAR1=value1");
    await writeFile(join(backendDir, ".env.local.example"), "VAR2=value2");
    await writeFile(join(backendDir, ".env.local"), "VAR2=existing");

    // web: 作成2つ
    const webDir = join(testDir, "web");
    await mkdir(webDir, { recursive: true });
    await writeFile(join(webDir, ".env.preview.example"), "VAR3=value3");
    await writeFile(join(webDir, ".env.production.example"), "VAR4=value4");

    const result = await initAllEnvFiles();

    expect(result.created).toHaveLength(3);
    expect(result.created).toContainEqual({ app: "backend", file: ".env" });
    expect(result.created).toContainEqual({ app: "web", file: ".env.preview" });
    expect(result.created).toContainEqual({ app: "web", file: ".env.production" });

    expect(result.skipped).toEqual([{ app: "backend", file: ".env.local" }]);
  });
});

// EOF
