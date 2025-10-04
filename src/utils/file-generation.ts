/**
 * ファイル生成とテンプレート処理のための共有ユーティリティ
 *
 * このファイルは後方互換性のために保持されています。
 * 新しい実装は ./file-generation/ ディレクトリに分割されています。
 */

// すべての関数と定数を再エクスポート
export {
    writeConfigFile,
    writeCodeFile,
    processTemplate,
    processTemplateFile,
    mergePackageJson,
    writeEnvFile,
    writeGitIgnore,
    GITIGNORE_PATTERNS,
} from './file-generation/index.js';
