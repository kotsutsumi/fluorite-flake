import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleDecrypt } from "../../../libs/env-tools/handle-decrypt.js";

vi.mock("../../../libs/env-tools/assert-command-available.js", () => ({
  assertCommandAvailable: vi.fn(),
}));
vi.mock("../../../libs/env-tools/prompt-password.js", () => ({ promptPassword: vi.fn() }));
vi.mock("../../../libs/env-tools/get-env-projects.js", () => ({ getEnvProjects: vi.fn() }));
vi.mock("../../../libs/env-tools/decrypt-project-env.js", () => ({ decryptProjectEnv: vi.fn() }));
vi.mock("../../../libs/env-tools/log-operation-result.js", () => ({ logOperationResult: vi.fn() }));
vi.mock("../../../libs/env-tools/print-summary.js", () => ({ printSummary: vi.fn() }));
vi.mock("../../../libs/env-tools/create-env-tool-error.js", () => ({
  createEnvToolError: (msg: string) => new Error(msg),
}));

const { assertCommandAvailable } = await import(
  "../../../libs/env-tools/assert-command-available.js"
);
const { promptPassword } = await import("../../../libs/env-tools/prompt-password.js");
const { getEnvProjects } = await import("../../../libs/env-tools/get-env-projects.js");
const { decryptProjectEnv } = await import("../../../libs/env-tools/decrypt-project-env.js");
const { logOperationResult } = await import("../../../libs/env-tools/log-operation-result.js");
const { printSummary } = await import("../../../libs/env-tools/print-summary.js");

describe("UT-SCRIPTS-15: handleDecrypt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(promptPassword).mockResolvedValue("password");
    vi.mocked(getEnvProjects).mockReturnValue([{ name: "web", relativePath: "apps/web" }]);
    vi.mocked(decryptProjectEnv).mockResolvedValue({
      kind: "decrypt",
      project: { name: "web", relativePath: "apps/web" },
      status: "success",
      files: [".env"],
    });
  });

  it("提供されたパスワードを使用して各プロジェクトを復号すること", async () => {
    await handleDecrypt();

    expect(assertCommandAvailable).toHaveBeenCalledWith(
      "unzip",
      expect.arrayContaining([expect.stringContaining("Please install unzip")])
    );
    expect(decryptProjectEnv).toHaveBeenCalledWith(
      { name: "web", relativePath: "apps/web" },
      expect.objectContaining({ password: "password" })
    );
    expect(logOperationResult).toHaveBeenCalledTimes(1);
    expect(printSummary).toHaveBeenCalled();
  });

  it("プロジェクトエラーを EnvToolError として再スローすること", async () => {
    vi.mocked(decryptProjectEnv).mockRejectedValue(new Error("boom"));

    await expect(handleDecrypt()).rejects.toThrow("boom");
  });

  it("Error インスタンスでないエラーを処理すること", async () => {
    vi.mocked(decryptProjectEnv).mockRejectedValue("string error");

    await expect(handleDecrypt()).rejects.toThrow("string error");
  });
});

// EOF
