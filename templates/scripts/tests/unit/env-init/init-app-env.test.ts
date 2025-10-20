import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initEnvFilesForApp } from "../../../libs/env-init/init-app-env.js";

describe("initEnvFilesForApp", () => {
  let testDir: string;
  let appDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "env-init-test-"));
    appDir = join(testDir, "test-app");
    await mkdir(appDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it(".env.*.example ファイルを .env.* にコピーすること", async () => {
    await writeFile(join(appDir, ".env.example"), "TEST_VAR=value");
    await writeFile(join(appDir, ".env.local.example"), "LOCAL_VAR=local");

    const result = await initEnvFilesForApp("test-app", appDir);

    expect(result.created).toEqual([
      { app: "test-app", file: ".env" },
      { app: "test-app", file: ".env.local" },
    ]);
    expect(result.skipped).toEqual([]);
  });

  it("既存の .env.* ファイルは上書きせずスキップすること", async () => {
    await writeFile(join(appDir, ".env.example"), "TEST_VAR=example");
    await writeFile(join(appDir, ".env"), "TEST_VAR=existing");

    const result = await initEnvFilesForApp("test-app", appDir);

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual([{ app: "test-app", file: ".env" }]);
  });

  it(".env.*.example パターンにマッチするファイルのみ処理すること", async () => {
    await writeFile(join(appDir, ".env.example"), "TEST_VAR=value");
    await writeFile(join(appDir, ".env"), "EXISTING_VAR=value");
    await writeFile(join(appDir, "README.md"), "# README");
    await writeFile(join(appDir, ".gitignore"), "node_modules");

    const result = await initEnvFilesForApp("test-app", appDir);

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual([{ app: "test-app", file: ".env" }]);
  });

  it("複数の .env.*.example ファイルを処理すること", async () => {
    await writeFile(join(appDir, ".env.example"), "VAR1=value1");
    await writeFile(join(appDir, ".env.local.example"), "VAR2=value2");
    await writeFile(join(appDir, ".env.preview.example"), "VAR3=value3");
    await writeFile(join(appDir, ".env.production.example"), "VAR4=value4");

    const result = await initEnvFilesForApp("test-app", appDir);

    expect(result.created).toHaveLength(4);
    expect(result.created.map((item) => item.file)).toEqual([
      ".env",
      ".env.local",
      ".env.preview",
      ".env.production",
    ]);
  });

  it("アプリディレクトリが存在しない場合はエラーをスローしないこと", async () => {
    const nonExistentDir = join(testDir, "non-existent");

    const result = await initEnvFilesForApp("non-existent", nonExistentDir);

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it(".env.*.example ファイルが存在しない場合は空の結果を返すこと", async () => {
    await writeFile(join(appDir, "README.md"), "# README");

    const result = await initEnvFilesForApp("test-app", appDir);

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it("サブディレクトリは処理しないこと", async () => {
    const subDir = join(appDir, "subdir");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, ".env.example"), "SUBDIR_VAR=value");
    await writeFile(join(appDir, ".env.example"), "ROOT_VAR=value");

    const result = await initEnvFilesForApp("test-app", appDir);

    expect(result.created).toEqual([{ app: "test-app", file: ".env" }]);
  });
});

// EOF
