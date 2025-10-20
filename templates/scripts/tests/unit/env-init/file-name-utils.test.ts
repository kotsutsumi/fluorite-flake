import { describe, expect, it } from "vitest";

import { getTargetEnvFileName } from "../../../libs/env-init/file-name-utils.js";

describe("getTargetEnvFileName", () => {
  it(".example 拡張子を除去すること", () => {
    expect(getTargetEnvFileName(".env.example")).toBe(".env");
  });

  it(".env.local.example から .env.local を生成すること", () => {
    expect(getTargetEnvFileName(".env.local.example")).toBe(".env.local");
  });

  it(".env.preview.example から .env.preview を生成すること", () => {
    expect(getTargetEnvFileName(".env.preview.example")).toBe(".env.preview");
  });

  it(".env.production.example から .env.production を生成すること", () => {
    expect(getTargetEnvFileName(".env.production.example")).toBe(".env.production");
  });

  it(".env.staging.example から .env.staging を生成すること", () => {
    expect(getTargetEnvFileName(".env.staging.example")).toBe(".env.staging");
  });

  it(".env.test.example から .env.test を生成すること", () => {
    expect(getTargetEnvFileName(".env.test.example")).toBe(".env.test");
  });

  it(".example 拡張子がない場合はそのまま返すこと", () => {
    expect(getTargetEnvFileName(".env")).toBe(".env");
  });

  it("複数の .example が含まれる場合は最後の .example のみ除去すること", () => {
    expect(getTargetEnvFileName(".env.example.example")).toBe(".env.example");
  });
});

// EOF
