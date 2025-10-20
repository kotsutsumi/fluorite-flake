import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { type ParsedEnvPullArgs, parseEnvPullArgs } from "../../../libs/env-pull/parse-args.js";

const CWD = process.cwd();

function run(argv: string[]): ParsedEnvPullArgs {
  return parseEnvPullArgs(argv, { cwd: CWD, scriptPath: "scripts/env-pull.ts" });
}

describe("parseEnvPullArgs", () => {
  it("returns defaults when no arguments are provided", () => {
    const parsed = run(["node", "env-pull.ts"]);
    expect(parsed.projectRoot).toBe(CWD);
    expect(parsed.selection).toBe("all");
    expect(parsed.apps).toBeUndefined();
  });

  it("resolves project root from --project-root flag", () => {
    const parsed = parseEnvPullArgs(["node", "env-pull.ts", "--project-root", ".."], { cwd: CWD });
    expect(parsed.projectRoot).toBe(resolve(CWD, ".."));
  });

  it("resolves project root from --project-root= flag", () => {
    const parsed = parseEnvPullArgs(["node", "env-pull.ts", "--project-root=.."], {
      cwd: CWD,
    });
    expect(parsed.projectRoot).toBe(resolve(CWD, ".."));
  });

  it("defaults to cwd when default project subdir does not exist", () => {
    const parsed = parseEnvPullArgs(["node", "env-pull.ts"], {
      cwd: CWD,
      defaultProjectSubdir: "non-existent-subdir-123",
    });
    expect(parsed.projectRoot).toBe(CWD);
  });

  it("parses app filters with --apps", () => {
    const parsed = run(["node", "env-pull.ts", "--apps", "web, backend ,web"]);
    expect(parsed.apps).toEqual(["web", "backend"]);
  });

  it("throws when --apps value is empty", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    expect(() => run(["node", "env-pull.ts", "--apps="])).toThrow(/At least one app name/);
    spy.mockRestore();
  });

  it("throws when --apps flag is missing a value", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    expect(() => run(["node", "env-pull.ts", "--apps"])).toThrow(/requires a comma separated list/);
    spy.mockRestore();
  });

  it("parses app filters with --apps= syntax", () => {
    const parsed = run(["node", "env-pull.ts", "--apps=docs"]);
    expect(parsed.apps).toEqual(["docs"]);
  });

  it("normalises full app list back to undefined", () => {
    const parsed = run(["node", "env-pull.ts", "--apps", "web,docs,backend"]);
    expect(parsed.apps).toBeUndefined();
  });

  it("throws for unknown app names", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    expect(() => run(["node", "env-pull.ts", "--apps", "unknown"])).toThrow(/Unknown app name/);
    spy.mockRestore();
  });

  it("parses target selection via --target", () => {
    const parsed = run(["node", "env-pull.ts", "--target", "preview"]);
    expect(parsed.selection).toBe("preview");
  });

  it("throws when --target flag is missing a value", () => {
    expect(() => run(["node", "env-pull.ts", "--target"])).toThrow(/--target requires a value/);
  });

  it("parses target selection via --target= syntax", () => {
    const parsed = run(["node", "env-pull.ts", "--target=staging"]);
    expect(parsed.selection).toBe("staging");
  });

  it("throws for invalid target selection", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    expect(() => run(["node", "env-pull.ts", "--target", "invalid"])).toThrow(/Unknown target/);
    spy.mockRestore();
  });

  it("throws when --help is provided", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    expect(() => run(["node", "env-pull.ts", "--help"])).toThrow(/Help requested/);
    spy.mockRestore();
  });

  it("throws on unknown options", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    expect(() => run(["node", "env-pull.ts", "--unknown"])).toThrow(/Unknown option/);
    spy.mockRestore();
  });

  it("throws on arguments that don't start with --", () => {
    const spy = vi.spyOn(console, "log").mockReturnValue(undefined);
    expect(() => run(["node", "env-pull.ts", "invalid-arg"])).toThrow(
      /Unknown option: invalid-arg/
    );
    spy.mockRestore();
  });

  it("throws when --project-root flag is missing a value", () => {
    expect(() => parseEnvPullArgs(["node", "env-pull.ts", "--project-root"], { cwd: CWD })).toThrow(
      /--project-root requires a value/
    );
  });
});
