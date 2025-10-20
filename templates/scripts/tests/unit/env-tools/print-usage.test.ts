import { describe, expect, it, vi } from "vitest";
import { printUsage } from "../../../libs/env-tools/print-usage.js";

describe("UT-SCRIPTS-18: printUsage", () => {
  it("利用可能な CLI コマンドを一覧表示すること", () => {
    const logs: string[] = [];
    const consoleSpy = vi.spyOn(console, "log").mockImplementation((msg?: string) => {
      if (msg) logs.push(msg);
      return;
    });

    printUsage();

    expect(logs[0]).toBe("使用法:");
    expect(logs).toContain("  pnpm env:encrypt   # プロジェクトの環境変数ファイルを暗号化");
    expect(logs).toContain("  tsx scripts/env-tools.ts decrypt");

    consoleSpy.mockRestore();
  });
});

// EOF
