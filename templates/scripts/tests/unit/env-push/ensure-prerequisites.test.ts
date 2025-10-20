import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EnsurePrerequisitesDependencies } from "../../../libs/env-push/ensure-prerequisites.js";
import { ensurePrerequisites } from "../../../libs/env-push/ensure-prerequisites.js";
import type { ProjectConfig } from "../../../libs/env-push/types.js";

vi.mock("../../../libs/env-push/resolve-project-config.js", () => ({
  resolveProjectConfig: vi.fn(),
}));

const { resolveProjectConfig } = await import("../../../libs/env-push/resolve-project-config.js");

describe("ensurePrerequisites", () => {
  let mockDependencies: EnsurePrerequisitesDependencies;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockDependencies = {
      runCommand: vi.fn(),
    };
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // 意図的に空実装
    });
    vi.mocked(resolveProjectConfig).mockResolvedValue({
      projectId: "test-project",
      orgId: "test-org",
    } as ProjectConfig);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("すべての前提条件が満たされている場合にプロジェクト設定を返すこと", async () => {
    const result = await ensurePrerequisites("/test/root", undefined, mockDependencies);

    expect(mockDependencies.runCommand).toHaveBeenCalledWith("vercel", ["--version"], {
      cwd: "/test/root",
      env: process.env,
    });
    expect(mockDependencies.runCommand).toHaveBeenCalledWith("vercel", ["whoami"], {
      cwd: "/test/root",
      env: process.env,
    });
    expect(result).toEqual({ projectId: "test-project", orgId: "test-org" });
  });

  it("環境変数が提供された場合に使用すること", async () => {
    const customEnv = { CUSTOM: "value" };
    await ensurePrerequisites("/test/root", customEnv, mockDependencies);

    expect(mockDependencies.runCommand).toHaveBeenCalledWith("vercel", ["--version"], {
      cwd: "/test/root",
      env: customEnv,
    });
    expect(mockDependencies.runCommand).toHaveBeenCalledWith("vercel", ["whoami"], {
      cwd: "/test/root",
      env: customEnv,
    });
  });

  it("vercel --versionが失敗した場合にErrorインスタンスでエラーをスローすること", async () => {
    vi.mocked(mockDependencies.runCommand).mockRejectedValueOnce(new Error("Command not found"));

    await expect(ensurePrerequisites("/test/root", undefined, mockDependencies)).rejects.toThrow(
      "vercel command not found or failed. Please install Vercel CLI and ensure it is accessible.\nCommand not found"
    );
  });

  it("vercel --versionが失敗した場合に文字列エラーをスローすること", async () => {
    vi.mocked(mockDependencies.runCommand).mockRejectedValueOnce("string error");

    await expect(ensurePrerequisites("/test/root", undefined, mockDependencies)).rejects.toThrow(
      "vercel command not found or failed. Please install Vercel CLI and ensure it is accessible.\nstring error"
    );
  });

  it("vercel --versionが失敗した場合に任意のエラー型を処理すること", async () => {
    vi.mocked(mockDependencies.runCommand).mockRejectedValueOnce({ custom: "error" });

    await expect(ensurePrerequisites("/test/root", undefined, mockDependencies)).rejects.toThrow(
      "vercel command not found or failed. Please install Vercel CLI and ensure it is accessible.\n[object Object]"
    );
  });

  it("vercel whoamiが失敗した場合に警告とエラーをスローすること", async () => {
    vi.mocked(mockDependencies.runCommand)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Not authenticated"));

    await expect(ensurePrerequisites("/test/root", undefined, mockDependencies)).rejects.toThrow(
      "Vercel authentication required"
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "⚠️  You are not logged into Vercel CLI. Run 'vercel login' before retrying."
    );
  });
});

// EOF
