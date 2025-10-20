import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { parseEnvPushArgs } from "../../../libs/env-push/index.js";

const SCRIPT_PATH = "scripts/env-push.ts";

describe("parseEnvPushArgs", () => {
  let baseDir: string;

  beforeAll(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "env-push-parse-"));
  });

  afterAll(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("picks the preview target and resolves apps/web when present", async () => {
    const webDir = join(baseDir, "apps", "web");
    await mkdir(webDir, { recursive: true });

    const argv = ["node", SCRIPT_PATH, "preview"];
    const parsed = parseEnvPushArgs(argv, { cwd: baseDir, scriptPath: SCRIPT_PATH });

    expect(parsed.selection).toBe("preview");
    expect(parsed.projectRoot).toBe(resolve(baseDir, "apps/web"));
  });

  it("falls back to cwd when apps/web does not exist", async () => {
    await rm(join(baseDir, "apps"), { recursive: true, force: true });

    const argv = ["node", SCRIPT_PATH, "production"];
    const parsed = parseEnvPushArgs(argv, { cwd: baseDir, scriptPath: SCRIPT_PATH });

    expect(parsed.selection).toBe("production");
    expect(parsed.projectRoot).toBe(baseDir);
  });

  it("accepts explicit project root via --project-root", async () => {
    const customDir = join(baseDir, "apps", "docs");
    await mkdir(customDir, { recursive: true });

    const argv = ["node", SCRIPT_PATH, "staging", "--project-root", customDir];
    const parsed = parseEnvPushArgs(argv, { cwd: baseDir, scriptPath: SCRIPT_PATH });

    expect(parsed.projectRoot).toBe(resolve(customDir));
  });

  it("throws and prints usage when target is missing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      /* mock */
    });

    expect(() => parseEnvPushArgs(["node", SCRIPT_PATH], { cwd: baseDir })).toThrow(
      /Target is required/
    );

    expect(errorSpy).toHaveBeenCalled();
  });

  it("throws on unknown option", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      /* mock */
    });

    expect(() =>
      parseEnvPushArgs(["node", SCRIPT_PATH, "preview", "--unknown"], { cwd: baseDir })
    ).toThrow(/Unknown option/);

    expect(errorSpy).toHaveBeenCalled();
  });

  it("throws when target is invalid", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      /* mock */
    });

    expect(() => parseEnvPushArgs(["node", SCRIPT_PATH, "invalid"], { cwd: baseDir })).toThrow(
      /Unknown target: invalid/
    );

    expect(errorSpy).toHaveBeenCalled();
  });

  it("throws when --project-root value is missing", () => {
    expect(() =>
      parseEnvPushArgs(["node", SCRIPT_PATH, "preview", "--project-root"], { cwd: baseDir })
    ).toThrow(/--project-root requires a value/);
  });

  it("accepts --project-root= format", async () => {
    const customDir = join(baseDir, "custom");
    await mkdir(customDir, { recursive: true });

    const argv = ["node", SCRIPT_PATH, "staging", `--project-root=${customDir}`];
    const parsed = parseEnvPushArgs(argv, { cwd: baseDir, scriptPath: SCRIPT_PATH });

    expect(parsed.projectRoot).toBe(resolve(customDir));
  });

  it("handles --project-root= with empty value", () => {
    const argv = ["node", SCRIPT_PATH, "staging", "--project-root="];
    const parsed = parseEnvPushArgs(argv, { cwd: baseDir, scriptPath: SCRIPT_PATH });

    // Empty string after = should resolve to cwd
    expect(parsed.projectRoot).toBe(resolve(baseDir, ""));
  });
});
