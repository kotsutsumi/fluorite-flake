// runEnvTool のコマンド分岐を検証するテスト。
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUsageError } from "../../../libs/env-tools/create-usage-error.js";
import { handleDecrypt } from "../../../libs/env-tools/handle-decrypt.js";
import { handleEncrypt } from "../../../libs/env-tools/handle-encrypt.js";
import { printUsage } from "../../../libs/env-tools/print-usage.js";
import { runEnvTool } from "../../../libs/env-tools/run-env-tool.js";

// 依存モジュールをモックする
vi.mock("../../../libs/env-tools/handle-encrypt.js", () => ({
  handleEncrypt: vi.fn(),
}));

vi.mock("../../../libs/env-tools/handle-decrypt.js", () => ({
  handleDecrypt: vi.fn(),
}));

vi.mock("../../../libs/env-tools/print-usage.js", () => ({
  printUsage: vi.fn(),
}));

vi.mock("../../../libs/env-tools/create-usage-error.js", () => ({
  createUsageError: vi.fn((message: string) => {
    const error = new Error(message);
    error.name = "UsageError";
    return error;
  }),
}));

describe("UT-SCRIPTS-07: runEnvTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("encrypt command", () => {
    it("encrypt コマンドに対して handleEncrypt を呼び出すこと", async () => {
      vi.mocked(handleEncrypt).mockResolvedValue();

      await runEnvTool("encrypt");

      expect(handleEncrypt).toHaveBeenCalledOnce();
      expect(handleDecrypt).not.toHaveBeenCalled();
    });

    it("handleEncrypt からのエラーを伝播すること", async () => {
      const testError = new Error("Encryption failed");
      vi.mocked(handleEncrypt).mockRejectedValue(testError);

      await expect(runEnvTool("encrypt")).rejects.toThrow("Encryption failed");
    });
  });

  describe("decrypt command", () => {
    it("decrypt コマンドに対して handleDecrypt を呼び出すこと", async () => {
      vi.mocked(handleDecrypt).mockResolvedValue();

      await runEnvTool("decrypt");

      expect(handleDecrypt).toHaveBeenCalledOnce();
      expect(handleEncrypt).not.toHaveBeenCalled();
    });

    it("handleDecrypt からのエラーを伝播すること", async () => {
      const testError = new Error("Decryption failed");
      vi.mocked(handleDecrypt).mockRejectedValue(testError);

      await expect(runEnvTool("decrypt")).rejects.toThrow("Decryption failed");
    });
  });

  describe("invalid command", () => {
    it("undefined コマンドに対して使用方法を表示し UsageError をスローすること", async () => {
      await expect(runEnvTool(undefined)).rejects.toMatchObject({
        name: "UsageError",
        message: "Invalid command",
      });

      expect(printUsage).toHaveBeenCalledOnce();
      expect(createUsageError).toHaveBeenCalledWith("Invalid command");
    });

    it("未知のコマンドに対して使用方法を表示し UsageError をスローすること", async () => {
      await expect(runEnvTool("unknown")).rejects.toMatchObject({
        name: "UsageError",
        message: "Invalid command",
      });

      expect(printUsage).toHaveBeenCalledOnce();
    });

    it("無効なコマンドに対して encrypt または decrypt ハンドラーを呼び出さないこと", async () => {
      await expect(runEnvTool("invalid")).rejects.toThrow();

      expect(handleEncrypt).not.toHaveBeenCalled();
      expect(handleDecrypt).not.toHaveBeenCalled();
    });
  });
});

// EOF
