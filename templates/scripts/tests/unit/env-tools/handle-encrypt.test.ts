import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleEncrypt } from "../../../libs/env-tools/handle-encrypt.js";

vi.mock("../../../libs/env-tools/assert-command-available.js", () => ({
  assertCommandAvailable: vi.fn(),
}));
vi.mock("../../../libs/env-tools/prompt-password.js", () => ({ promptPassword: vi.fn() }));
vi.mock("../../../libs/env-tools/get-env-projects.js", () => ({ getEnvProjects: vi.fn() }));
vi.mock("../../../libs/env-tools/encrypt-project-env.js", () => ({ encryptProjectEnv: vi.fn() }));
vi.mock("../../../libs/env-tools/log-operation-result.js", () => ({ logOperationResult: vi.fn() }));
vi.mock("../../../libs/env-tools/print-summary.js", () => ({ printSummary: vi.fn() }));

const { assertCommandAvailable } = await import(
  "../../../libs/env-tools/assert-command-available.js"
);
const { promptPassword } = await import("../../../libs/env-tools/prompt-password.js");
const { getEnvProjects } = await import("../../../libs/env-tools/get-env-projects.js");
const { encryptProjectEnv } = await import("../../../libs/env-tools/encrypt-project-env.js");
const { logOperationResult } = await import("../../../libs/env-tools/log-operation-result.js");
const { printSummary } = await import("../../../libs/env-tools/print-summary.js");

describe("UT-SCRIPTS-14: handleEncrypt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定されたすべてのプロジェクトを暗号化すること", async () => {
    vi.mocked(promptPassword).mockResolvedValueOnce("password").mockResolvedValueOnce("password");
    vi.mocked(getEnvProjects).mockReturnValue([{ name: "web", relativePath: "apps/web" }]);
    vi.mocked(encryptProjectEnv).mockResolvedValue({
      kind: "encrypt",
      project: { name: "web", relativePath: "apps/web" },
      status: "success",
      files: [".env"],
    });

    await handleEncrypt();

    expect(assertCommandAvailable).toHaveBeenCalledWith(
      "zip",
      expect.arrayContaining([expect.stringContaining("Please install zip")])
    );
    expect(encryptProjectEnv).toHaveBeenCalledTimes(1);
    expect(logOperationResult).toHaveBeenCalledTimes(1);
    expect(printSummary).toHaveBeenCalled();
  });

  it("パスワードが一致しない場合はエラーをスローすること", async () => {
    vi.mocked(promptPassword).mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    vi.mocked(getEnvProjects).mockReturnValue([{ name: "web", relativePath: "apps/web" }]);

    await expect(handleEncrypt()).rejects.toThrow("Passwords do not match");
    expect(encryptProjectEnv).not.toHaveBeenCalled();
  });

  it("プロジェクトエラーを EnvToolError として表面化すること", async () => {
    vi.mocked(promptPassword).mockResolvedValueOnce("password").mockResolvedValueOnce("password");
    vi.mocked(getEnvProjects).mockReturnValue([{ name: "web", relativePath: "apps/web" }]);
    vi.mocked(encryptProjectEnv).mockRejectedValue(new Error("failed"));

    await expect(handleEncrypt()).rejects.toThrow("failed");
  });

  it("Error インスタンスでないエラーを処理すること", async () => {
    vi.mocked(promptPassword).mockResolvedValueOnce("password").mockResolvedValueOnce("password");
    vi.mocked(getEnvProjects).mockReturnValue([{ name: "web", relativePath: "apps/web" }]);
    vi.mocked(encryptProjectEnv).mockRejectedValue("string error");

    await expect(handleEncrypt()).rejects.toThrow("string error");
  });
});

// EOF
