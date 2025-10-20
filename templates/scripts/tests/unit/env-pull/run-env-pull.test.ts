import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import type { RunEnvPullDependencies } from "../../../libs/env-pull/run-env-pull.js";
import { runEnvPull } from "../../../libs/env-pull/run-env-pull.js";

const sandboxes: string[] = [];

async function createProjectSkeleton(
  apps: readonly string[] = ["web", "docs", "backend"]
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "env-pull-root-"));
  sandboxes.push(root);
  for (const app of apps) {
    await mkdir(join(root, "apps", app), { recursive: true });
  }
  return root;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createDependencies(): RunEnvPullDependencies & {
  pullTarget: ReturnType<typeof vi.fn>;
  ensurePrerequisites: ReturnType<typeof vi.fn>;
} {
  const runCommand = vi.fn();
  const ensurePrerequisites = vi.fn(async () => ({ orgId: "org", projectId: "proj" }));
  const pullTarget = vi.fn().mockResolvedValue(undefined);
  return { runCommand, ensurePrerequisites, pullTarget };
}

describe("runEnvPull", () => {
  it("invokes pullTarget for every app and environment by default", async () => {
    const projectRoot = await createProjectSkeleton();
    const dependencies = createDependencies();

    await runEnvPull(
      {
        projectRoot,
        cwd: projectRoot,
        environment: {},
        selection: "all",
      },
      dependencies
    );

    expect(dependencies.ensurePrerequisites).toHaveBeenCalledTimes(3);
    expect(dependencies.pullTarget).toHaveBeenCalledTimes(9);
  });

  it("filters apps when --apps option is provided", async () => {
    const projectRoot = await createProjectSkeleton(["web", "backend"]);
    const dependencies = createDependencies();

    await runEnvPull(
      {
        projectRoot,
        cwd: projectRoot,
        environment: {},
        selection: "all",
        apps: ["web", "backend"],
      },
      dependencies
    );

    expect(dependencies.ensurePrerequisites).toHaveBeenCalledTimes(2);
    expect(dependencies.pullTarget).toHaveBeenCalledTimes(6);
  });

  it("filters environments when target selection is provided", async () => {
    const projectRoot = await createProjectSkeleton();
    const dependencies = createDependencies();

    await runEnvPull(
      {
        projectRoot,
        cwd: projectRoot,
        environment: {},
        selection: "production",
      },
      dependencies
    );

    expect(dependencies.pullTarget).toHaveBeenCalledTimes(3);
  });

  it("throws when an app directory is missing", async () => {
    const projectRoot = await createProjectSkeleton(["web", "backend"]);
    const dependencies = createDependencies();

    await expect(
      runEnvPull(
        {
          projectRoot,
          cwd: projectRoot,
          environment: {},
        },
        dependencies
      )
    ).rejects.toThrow(/Application directory not found/);
  });

  it("throws for unknown target selection", async () => {
    const projectRoot = await createProjectSkeleton();
    const dependencies = createDependencies();

    await expect(
      runEnvPull(
        {
          projectRoot,
          cwd: projectRoot,
          selection: "invalid" as any,
        },
        dependencies
      )
    ).rejects.toThrow(/Unknown target/);
  });
});
