import { describe, expect, it, vi } from "vitest";

import { printEnvPullUsage } from "../../../libs/env-pull/usage.js";

describe("printEnvPullUsage", () => {
  it("prints usage with script path substituted", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    printEnvPullUsage("scripts/env-pull.ts");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toContain("tsx scripts/env-pull.ts");
    spy.mockRestore();
  });

  it("prints usage without script path", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    printEnvPullUsage();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toContain("pnpm env:pull");
    spy.mockRestore();
  });
});
