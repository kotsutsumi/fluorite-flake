/**
 * プロジェクト生成ユーティリティ
 *
 * templates/ ディレクトリから新しいプロジェクトを生成する機能を提供します
 */

export { generateProject } from "./generate-project.js";
export { copyTemplates } from "./copy-templates.js";
export { replaceInProject } from "./replace-in-project.js";
export { runSetupCommands } from "./run-setup-commands.js";
export type { ProjectGeneratorOptions, SetupResult } from "./types.js";

// EOF
