/**
 * 国際化システムの型定義
 */

// サポートしているロケール一覧（現在は英語と日本語）
const SUPPORTED_LOCALES = ['en', 'ja'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// メッセージ値の型定義（単純な文字列または動的な関数）
export type MessageValue = string | ((params: MessageParams) => string);
export type MessageDictionary = Record<string, MessageValue>;

// メッセージパラメータの型定義（テンプレート変数用）
export type MessageParams = Record<string, string | number | undefined>;

// 利用可能なメッセージキーの型定義（タイプセーフなi18n実現）
export type MessageKey =
    | 'cli.description' // CLIツールの説明
    | 'cli.localeOption' // ロケールオプションの説明
    | 'create.description' // createコマンドの説明
    | 'create.invalidFramework' // 無効なフレームワーク指定エラー
    | 'create.invalidDatabase' // 無効なデータベース指定エラー
    | 'create.invalidOrm' // 無効なORM指定エラー
    | 'create.invalidStorage' // 無効なストレージ指定エラー
    | 'create.invalidPackageManager' // 無効なパッケージマネージャー指定エラー
    | 'create.invalidMode' // 無効なモード指定エラー
    | 'create.missingRequiredArgs' // 必須引数不足エラー
    | 'create.ormRequired' // ORM指定必須エラー
    | 'r2.invalidAction'; // 無効なR2アクションエラー
