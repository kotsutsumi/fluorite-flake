import type { Stats } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { directoryExists } from "../../../libs/env-tools/directory-exists.js";

vi.mock("node:fs/promises", () => ({
  stat: vi.fn(),
}));

const { stat } = await import("node:fs/promises");

describe("UT-SCRIPTS-09: directoryExists", () => {
  it("stat がディレクトリを返す場合は true を返すこと", async () => {
    vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as unknown as Stats);

    await expect(directoryExists("/tmp")).resolves.toBe(true);
  });

  it("stat がファイルを返す場合は false を返すこと", async () => {
    vi.mocked(stat).mockResolvedValue({ isDirectory: () => false } as unknown as Stats);

    await expect(directoryExists("/tmp")).resolves.toBe(false);
  });

  it("stat がエラーをスローした場合は false を返すこと", async () => {
    vi.mocked(stat).mockRejectedValue(new Error("ENOENT"));

    await expect(directoryExists("/missing")).resolves.toBe(false);
  });
});

// EOF
