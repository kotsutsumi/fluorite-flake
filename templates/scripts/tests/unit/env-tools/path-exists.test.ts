// pathExists ヘルパーのユースケースを検証するテスト。
import { access } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pathExists } from "../../../libs/env-tools/path-exists.js";

// fs/promises モジュールをモックする
vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
}));

describe("UT-SCRIPTS-04: pathExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パスが存在する場合は true を返すこと", async () => {
    vi.mocked(access).mockResolvedValue(undefined);

    const result = await pathExists("/test/path");

    expect(result).toBe(true);
    expect(access).toHaveBeenCalledWith("/test/path", expect.any(Number));
  });

  it("パスが存在しない場合は false を返すこと", async () => {
    vi.mocked(access).mockRejectedValue(new Error("ENOENT: no such file or directory"));

    const result = await pathExists("/nonexistent/path");

    expect(result).toBe(false);
  });

  it("権限エラーの場合は false を返すこと", async () => {
    vi.mocked(access).mockRejectedValue(new Error("EACCES: permission denied"));

    const result = await pathExists("/forbidden/path");

    expect(result).toBe(false);
  });

  it("さまざまなパス形式を処理できること", async () => {
    vi.mocked(access).mockResolvedValue(undefined);

    await expect(pathExists("/absolute/path")).resolves.toBe(true);
    await expect(pathExists("relative/path")).resolves.toBe(true);
    await expect(pathExists("./current/path")).resolves.toBe(true);
    await expect(pathExists("../parent/path")).resolves.toBe(true);

    expect(access).toHaveBeenCalledTimes(4);
  });
});

// EOF
