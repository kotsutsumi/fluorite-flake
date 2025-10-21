import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  PushTargetDependencies,
  PushTargetOptions,
} from "../../../libs/env-push/push-target.js";
import { pushTarget } from "../../../libs/env-push/push-target.js";

vi.mock("../../../libs/env-push/read-env-map.js", () => ({
  readEnvMap: vi.fn(),
}));

const { readEnvMap } = await import("../../../libs/env-push/read-env-map.js");

describe("pushTarget", () => {
  let mockDependencies: PushTargetDependencies;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockDependencies = {
      runCommand: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(true),
    };
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // 意図的に空実装
    });
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // 意図的に空実装
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("環境変数をpushすること", async () => {
    const mockEnvMap = new Map([
      ["KEY1", "value1"],
      ["KEY2", "value2"],
    ]);
    vi.mocked(readEnvMap).mockResolvedValue(mockEnvMap);

    const options: PushTargetOptions = {
      cwd: "/test/cwd",
      projectRoot: "/test/root",
      projectConfig: {
        projectId: "test-project",
        orgId: "test-org",
      },
    };

    await pushTarget("preview", options, mockDependencies);

    expect(mockDependencies.runCommand).toHaveBeenCalledTimes(2);
    expect(mockDependencies.runCommand).toHaveBeenCalledWith(
      "vercel",
      ["env", "add", "KEY1", "preview", "--force"],
      expect.objectContaining({
        cwd: "/test/root",
        input: "value1",
      })
    );
  });

  it("空の環境変数ファイルの場合に警告を表示してスキップすること", async () => {
    vi.mocked(readEnvMap).mockResolvedValue(new Map());

    const options: PushTargetOptions = {
      cwd: "/test/cwd",
      projectRoot: "/test/root",
      projectConfig: null,
    };

    await pushTarget("preview", options, mockDependencies);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "⚠️  .env.preview does not contain any variables. Skipping."
    );
    expect(mockDependencies.runCommand).not.toHaveBeenCalled();
  });

  it("stagingカスタム環境に環境変数をpushすること", async () => {
    const mockEnvMap = new Map([["KEY", "value"]]);
    vi.mocked(readEnvMap).mockResolvedValue(mockEnvMap);

    const options: PushTargetOptions = {
      cwd: "/test/cwd",
      projectRoot: "/test/root",
      projectConfig: null,
    };

    await pushTarget("staging", options, mockDependencies);

    expect(mockDependencies.runCommand).toHaveBeenCalledWith(
      "vercel",
      ["env", "add", "KEY", "staging", "--force"],
      expect.any(Object)
    );
  });

  it("projectConfigがnullの場合にVERCEL_*環境変数を設定しないこと", async () => {
    const mockEnvMap = new Map([["KEY", "value"]]);
    vi.mocked(readEnvMap).mockResolvedValue(mockEnvMap);

    const options: PushTargetOptions = {
      cwd: "/test/cwd",
      projectRoot: "/test/root",
      projectConfig: null,
    };

    await pushTarget("preview", options, mockDependencies);

    expect(mockDependencies.runCommand).toHaveBeenCalledWith(
      "vercel",
      ["env", "add", "KEY", "preview", "--force"],
      expect.objectContaining({
        env: expect.not.objectContaining({
          VERCEL_ORG_ID: expect.anything(),
          VERCEL_PROJECT_ID: expect.anything(),
        }),
      })
    );
  });

  it("ファイルが存在しない場合にエラーをスローすること", async () => {
    mockDependencies.fileExists = vi.fn().mockResolvedValue(false);

    const options: PushTargetOptions = {
      cwd: "/test/cwd",
      projectRoot: "/test/root",
      projectConfig: null,
    };

    await expect(pushTarget("preview", options, mockDependencies)).rejects.toThrow(
      ".env.preview not found in /test/cwd"
    );
  });

  it("fileExistsが提供されない場合にデフォルト関数を使用すること", async () => {
    const mockEnvMap = new Map([["KEY", "value"]]);
    vi.mocked(readEnvMap).mockResolvedValue(mockEnvMap);

    // fileExistsを提供しない依存関係を作成
    const depsWithoutFileExists = {
      runCommand: mockDependencies.runCommand,
      // fileExists: undefined (意図的に省略)
    };

    const options: PushTargetOptions = {
      cwd: "/test/cwd",
      projectRoot: "/test/root",
      projectConfig: null,
    };

    // 実際のファイルシステムアクセスが発生するため、
    // 存在しないパスを使用してcatchブロックをカバー
    await expect(
      pushTarget("preview", { ...options, cwd: "/nonexistent/path" }, depsWithoutFileExists)
    ).rejects.toThrow(".env.preview not found in /nonexistent/path");
  });
});

// EOF
