import { afterEach, describe, expect, it, vi } from "vitest";

describe("UT-SCRIPTS-13: zip/unzip instructions", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
    vi.resetModules();
  });

  it("win32 で実行する場合は Windows 固有の手順を含むこと", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    // モジュールをリセットして再読み込み
    vi.resetModules();
    const { getZipInstallInstructions } = await import(
      "../../../libs/env-tools/get-zip-install-instructions.js"
    );
    const { getUnzipInstallInstructions } = await import(
      "../../../libs/env-tools/get-unzip-install-instructions.js"
    );

    expect(getZipInstallInstructions()).toEqual(expect.arrayContaining(["  Windows options:"]));
    expect(getUnzipInstallInstructions()).toEqual(expect.arrayContaining(["  Windows options:"]));
  });

  it("非 Windows では基本的な手順のみを含むこと", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });

    // モジュールをリセットして再読み込み
    vi.resetModules();
    const { getZipInstallInstructions } = await import(
      "../../../libs/env-tools/get-zip-install-instructions.js"
    );
    const { getUnzipInstallInstructions } = await import(
      "../../../libs/env-tools/get-unzip-install-instructions.js"
    );

    expect(getZipInstallInstructions()).not.toContainEqual("  Windows options:");
    expect(getUnzipInstallInstructions()).not.toContainEqual("  Windows options:");
  });
});

// EOF
