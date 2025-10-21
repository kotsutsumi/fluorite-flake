import { cancel, isCancel, select } from "@clack/prompts";

import type { Logger, PromptFn, RunCommandCaptureFn, VercelTeam } from "./types.js";

const WHITESPACE_REGEX = /\s+/;
const MIN_TEAM_PARTS = 2;
const CHECKMARK = "✔";

/**
 * Vercel CLI からチーム一覧を取得
 */
export async function fetchVercelTeams(
  runCommandCapture: RunCommandCaptureFn,
  logger: Logger
): Promise<VercelTeam[]> {
  try {
    const output = await runCommandCapture("vercel", ["teams", "ls", "--no-color"]);

    // Parse the output - actual format:
    // Vercel CLI 48.4.1
    //
    //   id                                Team name
    // ✔ omega-code-s-team                 omega-code's Team
    //   kazuhiro-kotsutsumis-projects     Kazuhiro Kotsutsumi's projects
    const lines = output.split("\n").filter((line) => line.trim());

    // Skip header lines - find the line with "id" header
    const headerIndex = lines.findIndex(
      (line) => line.toLowerCase().includes("id") && line.toLowerCase().includes("team")
    );
    if (headerIndex === -1) {
      logger.warn("チーム一覧のヘッダーが見つかりませんでした");
      return [];
    }

    const dataLines = lines.slice(headerIndex + 1);

    const teams: VercelTeam[] = [];
    for (const line of dataLines) {
      // Remove checkmark and trim
      const cleanedLine = line.replace(CHECKMARK, "").trim();
      const parts = cleanedLine.split(WHITESPACE_REGEX);

      if (parts.length >= MIN_TEAM_PARTS) {
        const [idSlug, ...nameParts] = parts;
        teams.push({
          id: idSlug,
          slug: idSlug,
          name: nameParts.join(" "),
        });
      }
    }

    return teams;
  } catch (error) {
    logger.error("チーム一覧の取得に失敗しました");
    throw error;
  }
}

/**
 * ユーザーにチームを選択させる
 */
export async function selectTeam(
  teams: VercelTeam[],
  prompt: PromptFn,
  logger: Logger
): Promise<VercelTeam> {
  if (teams.length === 0) {
    throw new Error("利用可能なチームが見つかりませんでした");
  }

  if (teams.length === 1) {
    logger.info(`ℹ️  チームを自動選択: ${teams[0].name} (${teams[0].slug})`);
    return teams[0];
  }

  logger.info("\n🔧 Vercel チームを選択してください:");
  for (let index = 0; index < teams.length; index++) {
    const team = teams[index];
    logger.info(`  [${index + 1}] ${team.name} (${team.slug})`);
  }

  while (true) {
    const answer = (await prompt("\nチーム番号を入力してください: ")).trim();

    if (!answer) {
      logger.warn("入力が空です。チーム番号を入力してください。");
      continue;
    }

    const index = Number.parseInt(answer, 10) - 1;
    if (Number.isNaN(index) || index < 0 || index >= teams.length) {
      logger.warn(`無効な番号です。1〜${teams.length} の範囲で入力してください。`);
      continue;
    }

    const selected = teams[index];
    logger.success(`選択されたチーム: ${selected.name} (${selected.slug})`);
    return selected;
  }
}

/**
 * カーソル選択でチームを選ぶ
 */
export async function selectTeamInteractive(
  teams: VercelTeam[],
  logger: Logger
): Promise<VercelTeam> {
  if (teams.length === 0) {
    throw new Error("利用可能なチームが見つかりませんでした");
  }

  if (teams.length === 1) {
    logger.info(`ℹ️  チームを自動選択: ${teams[0].name} (${teams[0].slug})`);
    return teams[0];
  }

  const selected = await select({
    message: "Vercel チームを選択してください:",
    options: teams.map((team) => ({
      value: team.id,
      label: team.name,
      hint: team.slug,
    })),
  });

  if (isCancel(selected)) {
    cancel("操作がキャンセルされました");
    process.exit(0);
  }

  const selectedTeam = teams.find((team) => team.id === selected);
  if (!selectedTeam) {
    throw new Error("選択されたチームが見つかりませんでした");
  }

  logger.success(`選択されたチーム: ${selectedTeam.name} (${selectedTeam.slug})`);
  return selectedTeam;
}

/**
 * 選択したチームに切り替える
 */
export async function switchToTeam(
  teamSlug: string,
  runCommandCapture: RunCommandCaptureFn,
  logger: Logger
): Promise<void> {
  try {
    logger.info(`🔄 チームに切り替え中: ${teamSlug}`);
    logger.info(`   実行コマンド: vercel switch ${teamSlug}`);
    await runCommandCapture("vercel", ["switch", teamSlug, "--no-color"]);
    logger.success("チームの切り替えが完了しました");
  } catch (error) {
    logger.error("チームの切り替えに失敗しました");
    throw error;
  }
}

// EOF
