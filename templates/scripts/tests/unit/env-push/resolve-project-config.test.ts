import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveProjectConfig } from "../../../libs/env-push/index.js";

describe("resolveProjectConfig", () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "env-push-config-"));
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it("reads .vercel/project.json when present", async () => {
    const projectDir = join(repoDir, "apps", "web");
    await mkdir(join(projectDir, ".vercel"), { recursive: true });
    await writeFile(
      join(projectDir, ".vercel", "project.json"),
      JSON.stringify({ orgId: "team_test", projectId: "prj_test" })
    );

    const result = await resolveProjectConfig(projectDir);
    expect(result).toEqual({ orgId: "team_test", projectId: "prj_test" });
  });

  it("falls back to repo.json and matches directory", async () => {
    const docsDir = join(repoDir, "apps", "docs");
    await mkdir(join(repoDir, ".vercel"), { recursive: true });
    await mkdir(docsDir, { recursive: true });

    await writeFile(
      join(repoDir, ".vercel", "repo.json"),
      JSON.stringify({
        orgId: "team_repo",
        projects: [
          { id: "prj_web", directory: "apps/web" },
          { id: "prj_docs", directory: "apps/docs" },
        ],
      })
    );

    const result = await resolveProjectConfig(docsDir);
    expect(result).toEqual({ orgId: "team_repo", projectId: "prj_docs" });
  });

  it("returns null when repo.json has no matching project", async () => {
    const unmatchedDir = join(repoDir, "unmatched", "project");
    await mkdir(join(repoDir, ".vercel"), { recursive: true });
    await mkdir(unmatchedDir, { recursive: true });

    await writeFile(
      join(repoDir, ".vercel", "repo.json"),
      JSON.stringify({
        orgId: "team_repo",
        projects: [{ id: "prj_other", directory: "other/path" }],
      })
    );

    const result = await resolveProjectConfig(unmatchedDir);
    expect(result).toBeNull();
  });

  it("returns null when repo.json is invalid JSON", async () => {
    const invalidDir = join(repoDir, "invalid", "json");
    await mkdir(join(repoDir, ".vercel"), { recursive: true });
    await mkdir(invalidDir, { recursive: true });

    await writeFile(join(repoDir, ".vercel", "repo.json"), "{ invalid json }");

    const result = await resolveProjectConfig(invalidDir);
    expect(result).toBeNull();
  });

  it("uses single project when at root directory", async () => {
    const rootProjectDir = await mkdtemp(join(tmpdir(), "single-root-"));
    await mkdir(join(rootProjectDir, ".vercel"), { recursive: true });

    // Create repo.json with single project that has a specific directory
    await writeFile(
      join(rootProjectDir, ".vercel", "repo.json"),
      JSON.stringify({
        orgId: "team_single",
        projects: [{ id: "prj_single", directory: "apps/web" }],
      })
    );

    // Search from root - no exact directory match, but should use the single project as fallback
    const result = await resolveProjectConfig(rootProjectDir);
    expect(result).toEqual({ orgId: "team_single", projectId: "prj_single" });

    await rm(rootProjectDir, { recursive: true, force: true });
  });

  it("returns null when repo.json has no projects array", async () => {
    const noProjectsDir = join(repoDir, "no-projects");
    await mkdir(join(noProjectsDir, ".vercel"), { recursive: true });

    await writeFile(
      join(noProjectsDir, ".vercel", "repo.json"),
      JSON.stringify({ orgId: "team_no_projects" })
    );

    const result = await resolveProjectConfig(noProjectsDir);
    expect(result).toBeNull();
  });

  it("returns null when project.json has incomplete data", async () => {
    const incompleteDir = join(repoDir, "incomplete");
    await mkdir(join(incompleteDir, ".vercel"), { recursive: true });

    // Missing projectId
    await writeFile(
      join(incompleteDir, ".vercel", "project.json"),
      JSON.stringify({ orgId: "team_incomplete" })
    );

    const result = await resolveProjectConfig(incompleteDir);
    expect(result).toBeNull();
  });

  it("returns null when project.json is invalid JSON", async () => {
    const invalidProjectDir = join(repoDir, "invalid-project");
    await mkdir(join(invalidProjectDir, ".vercel"), { recursive: true });

    await writeFile(join(invalidProjectDir, ".vercel", "project.json"), "{ invalid }");

    const result = await resolveProjectConfig(invalidProjectDir);
    expect(result).toBeNull();
  });

  it("handles projects with undefined directory in repo.json", async () => {
    const undefinedDirProject = await mkdtemp(join(tmpdir(), "undefined-dir-"));
    await mkdir(join(undefinedDirProject, ".vercel"), { recursive: true });

    await writeFile(
      join(undefinedDirProject, ".vercel", "repo.json"),
      JSON.stringify({
        orgId: "team_undefined",
        projects: [{ id: "prj_undefined", directory: undefined }],
      })
    );

    const result = await resolveProjectConfig(undefinedDirProject);
    expect(result).toEqual({ orgId: "team_undefined", projectId: "prj_undefined" });

    await rm(undefinedDirProject, { recursive: true, force: true });
  });
});
