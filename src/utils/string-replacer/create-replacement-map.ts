/**
 * プロジェクト名から置換マップを作成する
 */
import { toPascalCase, toTitleCase } from "../case-converter/index.js";
import type { ReplacementMap } from "./replace-in-file.js";

/**
 * プロジェクト名から置換マップを作成する関数
 * @param projectName - 新しいプロジェクト名（ケバブケース）
 * @returns 置換マップ
 */
export function createReplacementMap(projectName: string): ReplacementMap {
    const replacements: ReplacementMap = new Map();

    // より具体的なパターンから先に追加（長い文字列から先に置換する）
    // 1. com.fluorite-flake.app → com.<project-name>.app
    replacements.set("com.fluorite-flake.app", `com.${projectName}.app`);

    // 2. "name": "fluorite-flake-app" → "name": "<project-name>"
    replacements.set('"name": "fluorite-flake-app"', `"name": "${projectName}"`);

    // 3. Fluorite Flake → プロジェクト名（タイトルケース）
    const titleCaseName = toTitleCase(projectName);
    replacements.set("Fluorite Flake", titleCaseName);

    // 4. FluoriteFlake → プロジェクト名（パスカルケース）
    const pascalCaseName = toPascalCase(projectName);
    replacements.set("FluoriteFlake", pascalCaseName);

    // 5. fluorite-flake → <project-name>（最も汎用的なパターンは最後）
    replacements.set("fluorite-flake", projectName);

    return replacements;
}

// EOF
