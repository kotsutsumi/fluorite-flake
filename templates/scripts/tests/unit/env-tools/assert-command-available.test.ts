import { describe, expect, it, vi } from "vitest";
import { assertCommandAvailable } from "../../../libs/env-tools/assert-command-available.js";
import { isCommandAvailable } from "../../../libs/env-tools/is-command-available.js";

vi.mock("../../../libs/env-tools/is-command-available.js", () => ({
  isCommandAvailable: vi.fn(),
}));

describe("UT-SCRIPTS-08: assertCommandAvailable", () => {
  it("コマンドが存在する場合は静かに解決すること", async () => {
    vi.mocked(isCommandAvailable).mockResolvedValue(true);

    await expect(assertCommandAvailable("zip", undefined)).resolves.toBeUndefined();
    expect(isCommandAvailable).toHaveBeenCalledWith("zip");
  });

  it("コマンドが見つからない場合はインストラクション付きでエラーをスローすること", async () => {
    vi.mocked(isCommandAvailable).mockResolvedValue(false);
    const instructions = ["Install zip via package manager."];

    await expect(assertCommandAvailable("zip", instructions)).rejects.toThrow(
      /Install zip via package manager\./
    );
  });

  it("コマンドが見つからずインストラクションが未定義の場合もエラーをスローすること", async () => {
    vi.mocked(isCommandAvailable).mockResolvedValue(false);

    await expect(assertCommandAvailable("zip", undefined)).rejects.toThrow(
      "zip command not found."
    );
  });
});

// EOF
