/**
 * テンプレート要件検証機能
 */
import chalk from "chalk";
import { cancel, note } from "@clack/prompts";

import { validatePnpm } from "../../../utils/pnpm-validator/index.js";
import type { TemplateRequirements, TemplateSelectionResult } from "./types.js";

/**
 * テンプレート要件を検証
 */
export function validateTemplateRequirements(
    selection: TemplateSelectionResult
): boolean {
    const requirements = getTemplateRequirements(selection);

    // システム要件を表示
    displayRequirements(requirements);

    // pnpm要件の検証
    if (requirements.pnpmRequired || selection.requiresMonorepo) {
        const isPnpmValid = validatePnpm();
        if (!isPnpmValid) {
            cancel(chalk.red("pnpm が必要ですが、利用できません。"));
            return false;
        }
    }

    // Node.jsバージョンの検証（簡易チェック）
    if (requirements.nodeVersion) {
        const currentNodeVersion = process.version;
        note(
            `現在の Node.js バージョン: ${chalk.cyan(currentNodeVersion)}`,
            "Node.js バージョン確認"
        );
    }

    return true;
}

/**
 * テンプレートに応じた要件を取得
 */
function getTemplateRequirements(
    selection: TemplateSelectionResult
): TemplateRequirements {
    const base: TemplateRequirements = {
        nodeVersion: ">=20.0.0",
        pnpmRequired: selection.requiresMonorepo,
        additionalDependencies: [],
        systemRequirements: [],
        estimatedSetupTime: "2-5分",
    };

    // テンプレート固有の要件
    if (
        selection.template.includes("fullstack") ||
        selection.template.includes("admin")
    ) {
        base.additionalDependencies = ["@auth/nextjs", "prisma", "zod"];
        base.systemRequirements = ["データベース（推奨: PostgreSQL）"];
        base.estimatedSetupTime = "10-15分";
    }

    if (selection.template.includes("graphql")) {
        base.additionalDependencies = [
            ...(base.additionalDependencies || []),
            "@apollo/server",
            "@apollo/client",
        ];
        base.estimatedSetupTime = "15-20分";
    }

    if (selection.template.includes("cross-platform")) {
        base.systemRequirements = [
            ...(base.systemRequirements || []),
            "Rust (Tauri Mobile用)",
            "Android Studio / Xcode (モバイル開発用)",
        ];
        base.estimatedSetupTime = "20-30分";
    }

    if (selection.template.includes("tauri")) {
        base.systemRequirements = [...(base.systemRequirements || []), "Rust"];
        base.estimatedSetupTime = "10-15分";
    }

    if (selection.isFullStack) {
        base.pnpmRequired = true; // フルスタックプロジェクトは常にpnpm必須
    }

    return base;
}

/**
 * 要件情報を表示
 */
function displayRequirements(requirements: TemplateRequirements): void {
    const requirementsList: string[] = [];

    if (requirements.nodeVersion) {
        requirementsList.push(`📦 Node.js: ${requirements.nodeVersion}`);
    }

    if (requirements.pnpmRequired) {
        requirementsList.push("📦 pnpm: 必須（モノレポ管理用）");
    }

    if (
        requirements.additionalDependencies &&
        requirements.additionalDependencies.length > 0
    ) {
        requirementsList.push(
            `📦 主要依存関係: ${requirements.additionalDependencies.join(", ")}`
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

    note(requirementsList.join("\n"), chalk.yellow("システム要件"));
}

// EOF
