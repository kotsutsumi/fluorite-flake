import { describe, expect, it } from "vitest";

import { parseDbCloudArgs } from "../../../libs/db-cloud/cli-parser.js";

describe("parseDbCloudArgs", () => {
  it("parses command and defaults", () => {
    const parsed = parseDbCloudArgs(["node", "script", "migrate"]);
    expect(parsed.command).toBe("migrate");
    expect(parsed.environment).toBe("all");
    expect(parsed.yes).toBe(false);
  });

  it("parses environment option", () => {
    const parsed = parseDbCloudArgs(["node", "script", "migrate", "staging", "--yes"]);
    expect(parsed.environment).toBe("staging");
    expect(parsed.yes).toBe(true);
  });

  it("throws when command is missing", () => {
    expect(() => parseDbCloudArgs(["node", "script"])).toThrowError(/サブコマンド/);
  });

  it("throws on unknown environment", () => {
    expect(() => parseDbCloudArgs(["node", "script", "push", "demo"])).toThrowError(/不明な環境名/);
  });

  it("parses seed command", () => {
    const parsed = parseDbCloudArgs(["node", "script", "seed", "preview"]);
    expect(parsed.command).toBe("seed");
    expect(parsed.environment).toBe("preview");
  });

  it("parses reset command", () => {
    const parsed = parseDbCloudArgs(["node", "script", "reset", "staging"]);
    expect(parsed.command).toBe("reset");
    expect(parsed.environment).toBe("staging");
  });

  it("throws on unknown command", () => {
    expect(() => parseDbCloudArgs(["node", "script", "unknown"])).toThrowError(
      /不明なサブコマンドです/
    );
  });

  it("parses create command with name and primary-region", () => {
    const parsed = parseDbCloudArgs([
      "node",
      "script",
      "create",
      "--name",
      "test-db",
      "--primary-region",
      "fra",
    ]);
    expect(parsed.command).toBe("create");
    expect(parsed.environment).toBe("all"); // create always uses "all"
    expect(parsed.name).toBe("test-db");
    expect(parsed.primaryRegion).toBe("fra");
  });

  it("parses command without primary-region option", () => {
    const parsed = parseDbCloudArgs(["node", "script", "migrate", "preview"]);
    expect(parsed.primaryRegion).toBeUndefined();
  });

  it("defaults yes to false when not provided", () => {
    const parsed = parseDbCloudArgs(["node", "script", "seed", "production"]);
    expect(parsed.yes).toBe(false);
    expect(parsed.yes).not.toBeUndefined();
  });
});

// EOF
