/**
 * Turso CLI プラン・その他ユーティリティ
 */

import { executeTursoCommand } from "./executor.js";
import type { CommandResult } from "./types.js";

/**
 * 現在のプランと使用量サマリを表示
 */
export async function showPlan(): Promise<CommandResult> {
    return await executeTursoCommand(["plan", "show"]);
}

/**
 * プランを切り替え
 */
export async function selectPlan(): Promise<CommandResult> {
    return await executeTursoCommand(["plan", "select"]);
}

/**
 * 有料プランへアップグレード
 */
export async function upgradePlan(): Promise<CommandResult> {
    return await executeTursoCommand(["plan", "upgrade"]);
}

/**
 * オーバージ課金を有効化
 */
export async function enableOverages(): Promise<CommandResult> {
    return await executeTursoCommand(["plan", "overages", "enable"]);
}

/**
 * オーバージ課金を無効化
 */
export async function disableOverages(): Promise<CommandResult> {
    return await executeTursoCommand(["plan", "overages", "disable"]);
}

/**
 * ローカル libSQL サーバーを起動
 */
export async function startDevServer(dbFile?: string): Promise<CommandResult> {
    const args = ["dev"];
    if (dbFile) {
        args.push("--db-file", dbFile);
    }
    return await executeTursoCommand(args);
}

/**
 * CLI自体を最新化
 */
export async function updateCli(): Promise<CommandResult> {
    return await executeTursoCommand(["update"]);
}

/**
 * ヘルプを表示
 */
export async function showHelp(): Promise<CommandResult> {
    return await executeTursoCommand(["help"]);
}

/**
 * コンタクト - フィードバック送信
 */
export async function sendFeedback(): Promise<CommandResult> {
    return await executeTursoCommand(["contact", "feedback"]);
}

/**
 * コンタクト - ミーティング予約
 */
export async function bookMeeting(): Promise<CommandResult> {
    return await executeTursoCommand(["contact", "bookmeeting"]);
}

/**
 * Turso CLIのバージョンを取得
 */
export async function getVersion(): Promise<string> {
    const result = await executeTursoCommand(["--version"]);
    return result.stdout?.trim() || "unknown";
}

// EOF
