import { describe, expect, it, vi } from "vitest";
import { printSummary } from "../../../libs/env-tools/print-summary.js";

describe("UT-SCRIPTS-17: printSummary", () => {
  it("処理済みとスキップされた件数を含む合計を表示すること", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // 意図的に空実装
    });

    printSummary([
      {
        kind: "encrypt",
        project: { name: "web", relativePath: "apps/web" },
        status: "success",
        files: [".env"],
      },
      {
        kind: "encrypt",
        project: { name: "mobile", relativePath: "apps/mobile" },
        status: "skipped",
        message: "No env files",
      },
    ]);

    expect(consoleSpy).toHaveBeenCalledWith("\n====================");
    expect(consoleSpy).toHaveBeenCalledWith("  ✓ Processed: 1");
    expect(consoleSpy).toHaveBeenCalledWith("  ⚠️  Skipped: 1");

    consoleSpy.mockRestore();
  });
});

// EOF
