// Vercel のプロジェクト ID / 組織 ID を特定するためのユーティリティ。
// `.vercel/project.json` と `.vercel/repo.json` のどちらが用意されていても
// 安定して情報を取得できるよう、探索順序と異常系をここでカプセル化する。
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import type { ProjectConfig } from "./types.js";

type RepoJson = {
  readonly orgId?: string;
  readonly projects?: ReadonlyArray<{
    readonly id?: string;
    readonly directory?: string;
  }>;
};

type ProjectJson = {
  readonly orgId?: string;
  readonly projectId?: string;
};

// Regex patterns for directory normalization
const BACKSLASH_REGEX = /\\/g;
const LEADING_DOT_SLASH_REGEX = /^\.\//;
const TRAILING_SLASH_REGEX = /\/$/;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizeDirectory(value: string | undefined): string {
  if (!value) {
    return ".";
  }

  const normalized = value
    .replace(BACKSLASH_REGEX, "/")
    .replace(LEADING_DOT_SLASH_REGEX, "")
    .replace(TRAILING_SLASH_REGEX, "");
  return normalized || ".";
}

async function tryReadProjectJson(path: string): Promise<ProjectConfig | null> {
  try {
    const json = await readFile(path, "utf8");
    const data = JSON.parse(json) as ProjectJson;
    if (data.orgId && data.projectId) {
      return { orgId: data.orgId, projectId: data.projectId };
    }
  } catch {
    // 解析に失敗した場合は次の候補を探す。
  }
  return null;
}

async function tryReadRepoJson(
  path: string,
  repoRoot: string,
  startDir: string
): Promise<ProjectConfig | null> {
  try {
    const json = await readFile(path, "utf8");
    const data = JSON.parse(json) as RepoJson;
    if (!(data.orgId && Array.isArray(data.projects))) {
      return null;
    }

    const targetDirectory = normalizeDirectory(relative(repoRoot, resolve(startDir)) || ".");

    const matched = data.projects.find(
      (project) => normalizeDirectory(project.directory) === targetDirectory
    );

    if (matched?.id) {
      return { orgId: data.orgId, projectId: matched.id };
    }

    if (targetDirectory === "." && data.projects.length === 1 && data.projects[0]?.id) {
      return { orgId: data.orgId, projectId: data.projects[0].id as string };
    }
  } catch {
    // repo.json を読み取れない場合は別の候補を探す。
  }
  return null;
}

async function searchProjectJson(startDir: string): Promise<ProjectConfig | null> {
  let current = resolve(startDir);
  const visitedDirectories: string[] = [];

  while (true) {
    visitedDirectories.push(current);
    const projectJsonPath = join(current, ".vercel", "project.json");
    if (await fileExists(projectJsonPath)) {
      const config = await tryReadProjectJson(projectJsonPath);
      if (config) {
        return config;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
}

async function searchRepoJson(
  visitedDirectories: string[],
  startDir: string
): Promise<ProjectConfig | null> {
  for (const directory of visitedDirectories) {
    const repoJsonPath = join(directory, ".vercel", "repo.json");
    if (!(await fileExists(repoJsonPath))) {
      continue;
    }

    const config = await tryReadRepoJson(repoJsonPath, directory, startDir);
    if (config) {
      return config;
    }
  }

  return null;
}

export async function resolveProjectConfig(startDir: string): Promise<ProjectConfig | null> {
  const config = await searchProjectJson(startDir);
  if (config) {
    return config;
  }

  // Collect visited directories from searchProjectJson
  let current = resolve(startDir);
  const visitedDirectories: string[] = [];
  while (true) {
    visitedDirectories.push(current);
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return searchRepoJson(visitedDirectories, startDir);
}

// EOF
