import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../libs/env-tools/run-env-tool.js", () => ({
  runEnvTool: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../../libs/env-tools/is-usage-error.js", () => ({
  isUsageError: (err: Error) => err.name === "UsageError",
}));
vi.mock("../../../libs/env-tools/is-env-tool-error.js", () => ({
  isEnvToolError: (err: Error) => err.name === "EnvToolError",
}));

const { runEnvTool } = await import("../../../libs/env-tools/run-env-tool.js");
const { handleEnvToolsError } = await import("../../../env-tools.js");

describe("UT-SCRIPTS-21: env-tools entry", () => {
  const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
    // 意図的に空実装
  });

  beforeEach(() => {
    vi.mocked(runEnvTool).mockResolvedValue(undefined);
    exitSpy.mockClear();
    errorSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("指定されたコマンドで runEnvTool を呼び出すこと", async () => {
    await handleEnvToolsError("encrypt");

    expect(runEnvTool).toHaveBeenCalledWith("encrypt");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("使い方エラーの場合は exit(1) すること", async () => {
    vi.mocked(runEnvTool).mockRejectedValueOnce(
      Object.assign(new Error("bad usage"), { name: "UsageError" })
    );

    await handleEnvToolsError("bad");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("ツール固有のエラーをログ出力して終了すること", async () => {
    vi.mocked(runEnvTool).mockRejectedValueOnce(
      Object.assign(new Error("boom"), { name: "EnvToolError" })
    );

    await handleEnvToolsError("decrypt");

    expect(errorSpy).toHaveBeenCalledWith("❌ boom");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("一般的な Error インスタンスを処理すること", async () => {
    vi.mocked(runEnvTool).mockRejectedValueOnce(new Error("generic error"));

    await handleEnvToolsError("test");

    expect(errorSpy).toHaveBeenCalledWith("generic error");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("Error インスタンスでない値を処理すること", async () => {
    vi.mocked(runEnvTool).mockRejectedValueOnce("string error");

    await handleEnvToolsError("test");

    expect(errorSpy).toHaveBeenCalledWith("string error");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

// EOF
