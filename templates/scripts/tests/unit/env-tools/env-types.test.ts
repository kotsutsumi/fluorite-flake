import { describe, expect, it } from "vitest";
import { __envTypesRuntimeMarker } from "../../../libs/env-tools/env-types.js";

describe("UT-SCRIPTS-22: env-types", () => {
  it("ランタイムマーカーが定義されていること", () => {
    expect(__envTypesRuntimeMarker).toBe(true);
  });
});

// EOF
