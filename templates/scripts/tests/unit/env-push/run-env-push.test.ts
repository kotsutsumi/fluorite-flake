import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type RunCommandFn, runEnvPush } from "../../../libs/env-push/index.js";

describe("runEnvPush", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "env-push-run-"));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("runs vercel commands for each variable", async () => {
    const projectRoot = join(dir, "apps", "web");
    await mkdir(join(projectRoot, ".vercel"), { recursive: true });
    await writeFile(
      join(projectRoot, ".vercel", "project.json"),
      JSON.stringify({ orgId: "team_cli", projectId: "prj_cli" })
    );

    const cwd = dir;
    await writeFile(join(cwd, ".env.preview"), "FOO=bar\n");

    const calls: Array<{ command: string; args: readonly string[]; input?: string }> = [];
    const runCommandMock = vi.fn<Parameters<RunCommandFn>, ReturnType<RunCommandFn>>(
      (command, args, options) => {
        calls.push({ command, args, input: options.input });
        return Promise.resolve();
      }
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
      /* mock */
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      /* mock */
    });

    await runEnvPush(
      {
        selection: "preview",
        projectRoot,
        cwd,
        environment: process.env,
      },
      {
        runCommand: runCommandMock as unknown as RunCommandFn,
      }
    );

    expect(runCommandMock).toHaveBeenCalledTimes(3);
    expect(calls[0]).toEqual({ command: "vercel", args: ["--version"], input: undefined });
    expect(calls[1]).toEqual({ command: "vercel", args: ["whoami"], input: undefined });
    expect(calls[2]).toEqual({
      command: "vercel",
      args: ["env", "add", "FOO", "preview", "--force"],
      input: "bar",
    });

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("processes all targets when selection is 'all'", async () => {
    const projectRoot = join(dir, "apps", "backend");
    await mkdir(join(projectRoot, ".vercel"), { recursive: true });
    await writeFile(
      join(projectRoot, ".vercel", "project.json"),
      JSON.stringify({ orgId: "team_all", projectId: "prj_all" })
    );

    const cwd = dir;
    await writeFile(join(cwd, ".env.preview"), "KEY1=val1\n");
    await writeFile(join(cwd, ".env.production"), "KEY2=val2\n");
    await writeFile(join(cwd, ".env.staging"), "KEY3=val3\n");

    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const runCommandMock = vi.fn<Parameters<RunCommandFn>, ReturnType<RunCommandFn>>(
      (command, args) => {
        calls.push({ command, args });
        return Promise.resolve();
      }
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
      /* mock */
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      /* mock */
    });

    await runEnvPush(
      {
        selection: "all",
        projectRoot,
        cwd,
        environment: process.env,
      },
      {
        runCommand: runCommandMock as unknown as RunCommandFn,
      }
    );

    // Should be called for: vercel --version, vercel whoami, and 3 env add commands (one per target)
    expect(runCommandMock).toHaveBeenCalledWith("vercel", ["--version"], expect.anything());
    expect(runCommandMock).toHaveBeenCalledWith("vercel", ["whoami"], expect.anything());
    expect(runCommandMock).toHaveBeenCalledWith(
      "vercel",
      ["env", "add", "KEY1", "preview", "--force"],
      expect.anything()
    );
    expect(runCommandMock).toHaveBeenCalledWith(
      "vercel",
      ["env", "add", "KEY2", "production", "--force"],
      expect.anything()
    );
    expect(runCommandMock).toHaveBeenCalledWith(
      "vercel",
      ["env", "add", "KEY3", "staging", "--force"],
      expect.anything()
    );

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
