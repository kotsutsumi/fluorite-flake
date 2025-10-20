import { describe, expect, it } from "vitest";

import {
  deriveBaseNames,
  resolveBaseDatabaseName,
  sanitizeDatabaseName,
} from "../../../libs/db-cloud/base-name.js";

const noop = () => {
  /* noop */
};

const silentLogger = {
  info: noop,
  warn: noop,
  error: noop,
} as const;

describe("sanitizeDatabaseName", () => {
  it("normalizes valid names", () => {
    expect(sanitizeDatabaseName("My-App ")).toBe("my-app");
  });

  it("rejects invalid names", () => {
    expect(() => sanitizeDatabaseName("Invalid_Name")).toThrowError(/無効です/);
  });
});

describe("deriveBaseNames", () => {
  it("collects unique base names", () => {
    const result = deriveBaseNames(["sample-preview", "sample-production", "demo-staging"]);
    expect(result).toEqual(["demo", "sample"]);
  });
});

describe("resolveBaseDatabaseName", () => {
  it("auto-approves when a single candidate exists", async () => {
    const result = await resolveBaseDatabaseName({
      initialName: undefined,
      autoApprove: true,
      existingNames: ["project-preview", "project-staging"],
      prompt: async () => "",
      logger: silentLogger,
    });
    expect(result).toBe("project");
  });

  it("prompts when necessary", async () => {
    const result = await resolveBaseDatabaseName({
      initialName: undefined,
      autoApprove: false,
      existingNames: [],
      prompt: async () => "example",
      logger: silentLogger,
    });
    expect(result).toBe("example");
  });

  it("retries when input is empty", async () => {
    let callCount = 0;
    const result = await resolveBaseDatabaseName({
      initialName: undefined,
      autoApprove: false,
      existingNames: [],
      prompt: () => {
        callCount++;
        return callCount === 1 ? "" : "valid-name";
      },
      logger: silentLogger,
    });
    expect(result).toBe("valid-name");
    expect(callCount).toBe(2);
  });

  it("retries when sanitization fails", async () => {
    let callCount = 0;
    const result = await resolveBaseDatabaseName({
      initialName: undefined,
      autoApprove: false,
      existingNames: [],
      prompt: () => {
        callCount++;
        return callCount === 1 ? "Invalid_Name" : "valid-name";
      },
      logger: silentLogger,
    });
    expect(result).toBe("valid-name");
    expect(callCount).toBe(2);
  });

  it("resolves candidate by number", async () => {
    const result = await resolveBaseDatabaseName({
      initialName: undefined,
      autoApprove: false,
      existingNames: ["alpha-preview", "beta-staging", "gamma-production"],
      prompt: async () => "2",
      logger: silentLogger,
    });
    expect(result).toBe("beta");
  });

  it("uses initialName when provided", async () => {
    const result = await resolveBaseDatabaseName({
      initialName: "preset",
      autoApprove: false,
      existingNames: [],
      prompt: () => {
        throw new Error("Should not be called");
      },
      logger: silentLogger,
    });
    expect(result).toBe("preset");
  });

  it("handles non-Error thrown values during sanitization", async () => {
    let callCount = 0;
    const result = await resolveBaseDatabaseName({
      initialName: undefined,
      autoApprove: false,
      existingNames: [],
      prompt: () => {
        callCount++;
        // First call throws non-Error, second call succeeds
        return callCount === 1 ? "Invalid_Name" : "valid-name";
      },
      logger: silentLogger,
    });
    expect(result).toBe("valid-name");
    expect(callCount).toBe(2);
  });
});

// EOF
