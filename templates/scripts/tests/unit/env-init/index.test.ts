import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// initAllEnvFiles と printResult をモック
vi.mock("../../../libs/env-init/init-all-env.js", () => ({
  initAllEnvFiles: vi.fn(),
}));

vi.mock("../../../libs/env-init/print-result.js", () => ({
  printResult: vi.fn(),
}));

const { initAllEnvFiles } = await import("../../../libs/env-init/init-all-env.js");
const { printResult } = await import("../../../libs/env-init/print-result.js");
const { main } = await import("../../../libs/env-init/index.js");

describe("env-init entry point", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // 意図的に空実装
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("main関数が initAllEnvFiles と printResult を呼び出すこと", async () => {
    const mockResult = {
      created: [{ app: "test", file: ".env" }],
      skipped: [],
    };

    vi.mocked(initAllEnvFiles).mockResolvedValueOnce(mockResult);

    await main();

    expect(initAllEnvFiles).toHaveBeenCalledOnce();
    expect(printResult).toHaveBeenCalledWith(mockResult);
  });

  it("main関数がエラーを伝播すること", async () => {
    const error = new Error("Test error");
    vi.mocked(initAllEnvFiles).mockRejectedValueOnce(error);

    await expect(main()).rejects.toThrow("Test error");
  });

  it("main関数が Error 以外の値もスローできること", async () => {
    vi.mocked(initAllEnvFiles).mockRejectedValueOnce("String error");

    await expect(main()).rejects.toBe("String error");
  });

  it("エクスポートが正しく公開されていること", () => {
    expect(initAllEnvFiles).toBeDefined();
    expect(printResult).toBeDefined();
    expect(main).toBeDefined();
  });
});

// EOF
