import { afterEach, describe, expect, it, vi } from "vitest";
import { logOperationResult } from "../../../libs/env-tools/log-operation-result.js";

describe("UT-SCRIPTS-16: logOperationResult", () => {
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
    // 意図的に空実装
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  it("スキップされた操作をログ出力すること", () => {
    logOperationResult({
      kind: "encrypt",
      project: { name: "web", relativePath: "apps/web" },
      status: "skipped",
      message: "No env files",
    });

    expect(consoleSpy).toHaveBeenCalledWith("⚠️  [web] Skipped - No env files");
  });

  it("暗号化のサマリーをログ出力すること", () => {
    logOperationResult({
      kind: "encrypt",
      project: { name: "web", relativePath: "apps/web" },
      status: "success",
      files: [".env"],
    });

    expect(consoleSpy).toHaveBeenCalledWith("✅ [web] Created env.encrypted.zip with: .env");
  });

  it("復号のサマリーをログ出力すること", () => {
    logOperationResult({
      kind: "decrypt",
      project: { name: "web", relativePath: "apps/web" },
      status: "success",
      files: [".env", ".env.production"],
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "✅ [web] Restored environment files: .env, .env.production"
    );
  });
});

// EOF
