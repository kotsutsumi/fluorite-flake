import { relative } from "node:path";

import { cancel, isCancel, select, text } from "@clack/prompts";

import { discoverApps, selectAppsInteractive } from "./app-selector.js";
import { updateAllEnvFiles } from "./env-updater.js";
import { fetchVercelProjects, selectProjectInteractive } from "./project-selector.js";
import { updateRepoJson } from "./repo-json-manager.js";
import { setRootDirectory } from "./root-directory-updater.js";
import { fetchVercelTeams, selectTeamInteractive, switchToTeam } from "./team-selector.js";
import type { VercelLinkDeps, VercelProject, VercelProjectInfo } from "./types.js";

/**
 * Vercel CLI ログインチェック
 */
async function checkVercelLogin(deps: VercelLinkDeps): Promise<void> {
  try {
    await deps.runCommandCapture("vercel", ["whoami", "--no-color"]);
    deps.logger.success("Vercel CLI にログイン済みです");
  } catch {
    deps.logger.error("Vercel CLI にログインしていません");
    deps.logger.info("以下のコマンドを実行してログインしてください:");
    deps.logger.info("  vercel login");
    throw new Error("Vercel CLI にログインが必要です");
  }
}

/**
 * .vercel/project.json からプロジェクト情報を読み取る
 */
async function readProjectInfo(appPath: string, deps: VercelLinkDeps): Promise<VercelProjectInfo> {
  const projectJsonPath = `${appPath}/.vercel/project.json`;

  if (!deps.exists(projectJsonPath)) {
    throw new Error(`プロジェクト情報ファイルが見つかりません: ${projectJsonPath}`);
  }

  const content = await deps.readFile(projectJsonPath);
  const projectInfo = JSON.parse(content) as VercelProjectInfo;

  if (!projectInfo.projectId || !projectInfo.orgId) {
    throw new Error(`プロジェクト情報が不正です: ${projectJsonPath}`);
  }

  return projectInfo;
}

/**
 * 単一アプリのリンク処理（プロジェクト名を返す）
 */
async function processAppLink(
  app: { name: string; path: string },
  vercelProjects: { name: string; framework: string; updated: string }[],
  selectedTeam: { id: string; slug: string; name: string },
  deps: VercelLinkDeps
): Promise<string> {
  deps.logger.info(`\n📦 処理中: ${app.name}`);
  deps.logger.info(`   パス: ${app.path}`);

  // アプリごとに既存プロジェクトへのリンクか新規作成かを選択
  const linkMode = await select({
    message: `${app.name} の処理方法を選択してください:`,
    options: [
      {
        value: "link",
        label: "既存のプロジェクトへリンク",
        hint: "Vercel上の既存プロジェクトに接続",
      },
      {
        value: "create",
        label: "新規プロジェクトを作成",
        hint: "新しいVercelプロジェクトを作成してリンク",
      },
    ],
  });

  /* v8 ignore next 4 */
  if (isCancel(linkMode)) {
    cancel("操作がキャンセルされました");
    throw new Error("User cancelled link mode selection");
  }

  let projectName: string;

  if (linkMode === "link") {
    deps.logger.info("→ 既存のプロジェクトへリンクします\n");
    projectName = await selectProjectInteractive(vercelProjects, deps.logger);
  } else {
    deps.logger.info("→ 新規プロジェクトを作成します");

    const inputProjectName = await text({
      message: "新規プロジェクト名を入力してください:",
      placeholder: app.name,
      validate: (value) => {
        if (!value || value.trim() === "") {
          return "プロジェクト名を入力してください";
        }
      },
    });

    if (isCancel(inputProjectName)) {
      cancel("操作がキャンセルされました");
      process.exit(0);
    }

    projectName = inputProjectName as string;

    deps.logger.info(`\n🆕 プロジェクト "${projectName}" を作成中...`);
    deps.logger.info(
      `   実行コマンド: vercel project add ${projectName} --scope ${selectedTeam.slug}`
    );
    try {
      await deps.runCommand("vercel", [
        "project",
        "add",
        projectName,
        "--scope",
        selectedTeam.slug,
      ]);
      deps.logger.success(`プロジェクト "${projectName}" を作成しました`);
    } catch (error) {
      deps.logger.error(`プロジェクトの作成に失敗しました: ${error}`);
      throw error;
    }
  }

  // vercel link を実行（各アプリディレクトリに .vercel を作成）
  deps.logger.info(`\n🔗 プロジェクト "${projectName}" にリンク中...`);
  deps.logger.info(
    `   実行コマンド: vercel link --project ${projectName} --scope ${selectedTeam.slug} --yes`
  );
  deps.logger.info(`   作業ディレクトリ: ${app.path}`);
  try {
    await deps.runCommand(
      "vercel",
      ["link", "--project", projectName, "--scope", selectedTeam.slug, "--yes"],
      { cwd: app.path }
    );
    deps.logger.success(`プロジェクト "${projectName}" にリンクしました`);
    deps.logger.info(`   .vercel ディレクトリが作成されました: ${app.path}/.vercel`);
  } catch (error) {
    deps.logger.error(`リンクに失敗しました: ${error}`);
    throw error;
  }

  // Root Directory を設定（モノレポ対応）
  try {
    await setRootDirectory(deps.projectRoot, app.path, deps.logger);
  } catch (error) {
    deps.logger.warn(`Root Directory の設定をスキップしました: ${error}`);
    deps.logger.info("   Vercel ダッシュボードで手動設定してください");
  }

  // .vercel/repo.json を作成/更新
  deps.logger.info("\n📋 repo.json を更新中...");
  try {
    // .vercel/project.json からプロジェクト情報を読み取る
    const projectInfo = await readProjectInfo(app.path, deps);

    // プロジェクトルートからの相対パスに変換（例: "apps/backend"）
    const relativeProjectPath = relative(deps.projectRoot, app.path);

    // repo.json を更新
    await updateRepoJson({
      projectDirectory: relativeProjectPath,
      vercelProjectId: projectInfo.projectId,
      vercelProjectName: projectName,
      orgId: projectInfo.orgId,
      logger: deps.logger,
    });

    deps.logger.success("  ✅ repo.json の更新が完了しました");
  } catch (error) {
    deps.logger.warn(`repo.json の更新をスキップしました: ${error}`);
    deps.logger.info("   手動で .vercel/repo.json を編集してください");
  }

  // 環境変数ファイルを更新（第1段階：自身の URL のみ）
  deps.logger.info("\n📝 環境変数ファイルを更新中（第1段階）...");
  try {
    const envResults = await updateAllEnvFiles(app.path, projectName, selectedTeam.slug, deps);

    const updatedCount = envResults.filter((result) => result.updated).length;
    const failedCount = envResults.filter((result) => result.error).length;

    if (failedCount > 0) {
      deps.logger.warn(`  ⚠️  ${failedCount}個のファイル更新に失敗しました`);
      for (const result of envResults) {
        if (result.error) {
          deps.logger.error(`     ${result.file}: ${result.error}`);
        }
      }
    }

    if (updatedCount > 0) {
      deps.logger.success(`  ✅ ${updatedCount}個のファイルを更新しました`);
    } else {
      deps.logger.info("  ℹ️  更新が必要なファイルはありませんでした");
    }
  } catch (error) {
    deps.logger.error(`環境変数ファイルの更新に失敗しました: ${error}`);
    throw error;
  }

  deps.logger.success(`\n✅ ${app.name} の処理が完了しました`);

  return projectName;
}

/**
 * メインの実行ロジック
 */
export async function runVercelLink(deps: VercelLinkDeps): Promise<void> {
  deps.logger.info("🚀 Vercel プロジェクトリンク\n");

  // 1. ログインチェック
  await checkVercelLogin(deps);

  // 2. チーム一覧を取得
  deps.logger.info("\n📋 Vercel チーム情報を取得中...");
  const teams = await fetchVercelTeams(deps.runCommandCapture, deps.logger);

  if (teams.length === 0) {
    deps.logger.warn("利用可能なチームが見つかりませんでした");
    process.exitCode = 1;
    return;
  }

  deps.logger.success(`${teams.length}個のチームを取得しました\n`);

  // 3. チームをカーソル選択
  const selectedTeam = await selectTeamInteractive(teams, deps.logger);

  // 4. 選択結果を表示
  deps.logger.info("\n選択されたチーム情報:");
  deps.logger.info(`  ID: ${selectedTeam.id}`);
  deps.logger.info(`  Name: ${selectedTeam.name}`);
  deps.logger.info(`  Slug: ${selectedTeam.slug}`);

  // 5. 選択したチームに切り替え
  deps.logger.info("");
  await switchToTeam(selectedTeam.slug, deps.runCommandCapture, deps.logger);

  // 6. apps/ 配下のプロジェクト一覧を取得
  deps.logger.info("\n📦 apps/ 配下のプロジェクト一覧を取得中...");
  const apps = await discoverApps(deps.projectRoot, deps.logger);

  if (apps.length === 0) {
    deps.logger.warn("apps/ 配下にプロジェクトが見つかりませんでした");
    process.exitCode = 1;
    return;
  }

  deps.logger.success(`${apps.length}個のプロジェクトを検出しました\n`);

  // 7. Vercel のプロジェクト一覧を取得
  deps.logger.info("\n📋 Vercel プロジェクト一覧を取得中...");
  let vercelProjects: VercelProject[];
  try {
    vercelProjects = await fetchVercelProjects(
      deps.runCommandCapture,
      selectedTeam.slug,
      deps.logger
    );
    deps.logger.success(`${vercelProjects.length}個のプロジェクトを取得しました`);
  } catch (error) {
    deps.logger.error("Vercel プロジェクト一覧の取得に失敗しました");
    throw error;
  }

  // 8. アプリをカーソル選択（複数選択可能）
  const selectedApps = await selectAppsInteractive(apps, deps.logger);

  // 9. 選択されたアプリをループ処理（第1段階：リンクと基本環境変数更新）
  deps.logger.info("\n🔗 Vercel プロジェクトへのリンク処理を開始...\n");

  const appProjectMap = new Map<string, string>();

  for (const app of selectedApps) {
    try {
      const projectName = await processAppLink(app, vercelProjects, selectedTeam, deps);
      appProjectMap.set(app.path, projectName);
    } catch (error) {
      deps.logger.error(`\n❌ ${app.name} の処理中にエラーが発生しました`);
      deps.logger.error(`   ${error}`);
      deps.logger.warn(`   ${app.name} をスキップして続行します\n`);
      // Continue processing other apps
    }
  }

  // 10. 環境変数の再更新（第2段階：backend の API URL を参照）
  deps.logger.info("\n\n🔄 環境変数ファイルを再更新中（第2段階）...");
  deps.logger.info("   backend の API URL を参照して NEXT_PUBLIC_API_URL を更新します\n");

  for (const app of selectedApps) {
    const projectName = appProjectMap.get(app.path);
    if (!projectName) {
      continue;
    }

    deps.logger.info(`\n📝 ${app.name} の環境変数を更新中...`);
    try {
      const envResults = await updateAllEnvFiles(app.path, projectName, selectedTeam.slug, deps);

      const updatedCount = envResults.filter((result) => result.updated).length;
      const failedCount = envResults.filter((result) => result.error).length;

      if (failedCount > 0) {
        deps.logger.warn(`  ⚠️  ${failedCount}個のファイル更新に失敗しました`);
        for (const result of envResults) {
          if (result.error) {
            deps.logger.error(`     ${result.file}: ${result.error}`);
          }
        }
      }

      if (updatedCount > 0) {
        deps.logger.success(`  ✅ ${updatedCount}個のファイルを更新しました`);
      } else {
        deps.logger.info("  ℹ️  更新が必要なファイルはありませんでした");
      }
    } catch (error) {
      deps.logger.error(`環境変数ファイルの更新に失敗しました: ${error}`);
      // 第2段階のエラーは警告として扱い、処理を継続
      deps.logger.warn("  ⚠️  環境変数の更新をスキップします");
    }
  }

  deps.logger.success("\n🎉 すべてのアプリの処理が完了しました！");
  process.exitCode = 0;
}

// EOF
