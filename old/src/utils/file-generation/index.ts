/**
 * ファイル生成とテンプレート処理のための共有ユーティリティ
 */

// ファイル書き込み関数をエクスポート
export { writeConfigFile } from './write-config-file.js';
export { writeCodeFile } from './write-code-file.js';

// テンプレート処理関数をエクスポート
export { processTemplate } from './process-template.js';
export { processTemplateFile } from './process-template-file.js';

// パッケージ管理関数をエクスポート
export { mergePackageJson } from './merge-package-json.js';

// 環境変数とGit関連ファイル生成関数をエクスポート
export { writeEnvFile } from './write-env-file.js';
export { writeGitIgnore } from './write-git-ignore.js';

// パターン定義をエクスポート
export { GITIGNORE_PATTERNS } from './gitignore-patterns.js';
