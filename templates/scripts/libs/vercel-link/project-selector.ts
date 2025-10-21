import { cancel, isCancel, select } from "@clack/prompts";

import type { Logger, RunCommandCaptureFn, VercelProject } from "./types.js";

const WHITESPACE_REGEX = /\s+/;
const MIN_PROJECT_PARTS = 2;

/**
 * Vercel CLI からプロジェクト一覧を取得
 */
export async function fetchVercelProjects(
  runCommandCapture: RunCommandCaptureFn,
  teamSlug: string,
  logger: Logger
): Promise<VercelProject[]> {
  try {
    const output = await runCommandCapture("vercel", [
      "projects",
      "list",
      "--scope",
      teamSlug,
      "--no-color",
    ]);

    // Parse the output - format similar to teams list
    const lines = output.split("\n").filter((line) => line.trim());

    // Skip header lines - find the line with "name" header
    const headerIndex = lines.findIndex((line) => line.toLowerCase().includes("name"));
    if (headerIndex === -1) {
      logger.warn("プロジェクト一覧のヘッダーが見つかりませんでした");
      return [];
    }

    const dataLines = lines.slice(headerIndex + 1);

    const projects: VercelProject[] = [];
    for (const line of dataLines) {
      const cleanedLine = line.trim();
      const parts = cleanedLine.split(WHITESPACE_REGEX);

      if (parts.length >= MIN_PROJECT_PARTS) {
        const [name, framework, ...updatedParts] = parts;
        projects.push({
          name,
          framework: framework || "N/A",
          updated: updatedParts.join(" ") || "N/A",
        });
      }
    }

    return projects;
  } catch (error) {
    logger.error("プロジェクト一覧の取得に失敗しました");
    throw error;
  }
}

/**
 * カーソル選択でプロジェクトを選ぶ
 */
export async function selectProjectInteractive(
  projects: VercelProject[],
  logger: Logger
): Promise<string> {
  if (projects.length === 0) {
    throw new Error("利用可能なプロジェクトが見つかりませんでした");
  }

  const selected = await select({
    message: "既存のプロジェクトを選択してください:",
    options: projects.map((project) => ({
      value: project.name,
      label: project.name,
      hint: `${project.framework} - ${project.updated}`,
    })),
  });

  if (isCancel(selected)) {
    cancel("操作がキャンセルされました");
    process.exit(0);
  }

  const projectName = selected as string;
  logger.success(`選択されたプロジェクト: ${projectName}`);
  return projectName;
}

// EOF
