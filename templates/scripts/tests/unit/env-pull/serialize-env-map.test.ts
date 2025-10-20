import { describe, expect, it } from "vitest";

import { serializeEnvMap } from "../../../libs/env-pull/serialize-env-map.js";

describe("serializeEnvMap", () => {
  it("serializes simple maps without quoting", () => {
    const map = new Map<string, string>([
      ["ALPHA", "value"],
      ["BETA", "123"],
    ]);
    const serialized = serializeEnvMap(map);
    expect(serialized).toBe("ALPHA=value\nBETA=123\n");
  });

  it("quotes and escapes complex values", () => {
    const map = new Map<string, string>([
      ["WITH_SPACE", "hello world"],
      ["WITH_NEWLINE", "line1\nline2"],
      ["EMPTY_VALUE", ""],
      ["WITH_QUOTES", 'say "hi"'],
      ["UNDEFINED_VALUE", undefined as unknown as string],
    ]);
    const serialized = serializeEnvMap(map);
    expect(serialized.split("\n")).toContain('WITH_SPACE="hello world"');
    expect(serialized.split("\n")).toContain('WITH_NEWLINE="line1\\nline2"');
    expect(serialized.split("\n")).toContain("EMPTY_VALUE=");
    expect(serialized.split("\n")).toContain('WITH_QUOTES="say \\"hi\\""');
    expect(serialized.split("\n")).toContain("UNDEFINED_VALUE=");
  });
});
