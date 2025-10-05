/**
 * テンプレート情報表示機能
 */
import chalk from "chalk";
import { intro, note, outro } from "@clack/prompts";

import type { ExtendedProjectConfig } from "../types.js";
import type { TemplateRequirements, TemplateSelectionResult } from "./types.js";

/**
 * テンプレート選択結果の詳細情報を表示
 */
export function displayTemplateInfo(
    selection: TemplateSelectionResult,
    config?: ExtendedProjectConfig
): void {
    intro(chalk.bgBlue.white(" テンプレート情報 "));

    // 基本情報
    note(
        [
            `📦 プロジェクトタイプ: ${chalk.cyan(selection.projectType)}`,
            `🎯 テンプレート: ${chalk.cyan(selection.template)}`,
            `⚡ 複雑度: ${getComplexityEmoji(selection.estimatedComplexity)} ${selection.estimatedComplexity}`,
            `🏗️  モノレポ構造: ${formatMonorepoStatus(selection.requiresMonorepo, selection.useMonorepo)}`,
            `🌐 フルスタック: ${selection.isFullStack ? chalk.green("はい") : chalk.gray("いいえ")}`,
        ].join("\n"),
        "プロジェクト概要"
    );

    // 機能一覧
    if (selection.features.length > 0) {
        note(
            selection.features.map((feature) => `✅ ${feature}`).join("\n"),
            "含まれる機能"
        );
    }

    // 拡張設定情報（利用可能な場合）
    if (config) {
        if (config.framework) {
            note(
                `🛠️  フレームワーク: ${chalk.yellow(config.framework)}`,
                "技術スタック"
            );
        }

        if (config.templateDescription) {
            note(config.templateDescription, "テンプレート詳細");
        }
    }

    outro(chalk.green("テンプレート情報を確認しました"));
}

/**
 * テンプレート要件情報を表示
 */
export function displayTemplateRequirements(
    requirements: TemplateRequirements
): void {
    const requirementsList: string[] = [];

    if (requirements.nodeVersion) {
        requirementsList.push(`📦 Node.js: ${requirements.nodeVersion}`);
    }

    if (requirements.pnpmRequired) {
        requirementsList.push("📦 pnpm: 必須");
    }

    if (
        requirements.additionalDependencies &&
        requirements.additionalDependencies.length > 0
    ) {
        requirementsList.push(
            `📦 追加依存関係: ${requirements.additionalDependencies.join(", ")}`
        );
    }

    if (
        requirements.systemRequirements &&
        requirements.systemRequirements.length > 0
    ) {
        requirementsList.push(
            ...requirements.systemRequirements.map((req) => `⚙️  ${req}`)
        );
    }

    requirementsList.push(
        `⏱️  セットアップ時間: ${requirements.estimatedSetupTime}`
    );

    note(requirementsList.join("\n"), "システム要件");
}

/**
 * 複雑度に対応する絵文字を取得
 */
function getComplexityEmoji(
    complexity: "simple" | "moderate" | "complex"
): string {
    switch (complexity) {
        case "simple":
            return "🟢";
        case "moderate":
            return "🟡";
        case "complex":
            return "🔴";
        default:
            return "⚪";
    }
}

function formatMonorepoStatus(
    requiresMonorepo: boolean,
    useMonorepo: boolean
): string {
    if (useMonorepo) {
        return chalk.green("有効");
    }

    if (requiresMonorepo) {
        return chalk.yellow("推奨 (未使用)");
    }

    return chalk.gray("不要");
}

// EOF
