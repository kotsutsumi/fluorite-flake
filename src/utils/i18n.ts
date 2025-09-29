/**
 * 国際化（i18n）モジュール
 * CLIの多言語対応を管理し、ロケールに応じたメッセージを提供する
 */

// サポートしているロケール一覧（現在は英語と日本語）
const SUPPORTED_LOCALES = ['en', 'ja'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// メッセージ値の型定義（単純な文字列または動的な関数）
type MessageValue = string | ((params: MessageParams) => string);
type MessageDictionary = Record<string, MessageValue>;

// メッセージパラメータの型定義（テンプレート変数用）
type MessageParams = Record<string, string | number | undefined>;

// 利用可能なメッセージキーの型定義（タイプセーフなi18n実現）
type MessageKey =
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

// 各ロケールごとのメッセージ定義
// 動的パラメータを持つメッセージは関数として定義
const messageMap: Record<SupportedLocale, MessageDictionary> = {
    en: {
        'cli.description': 'Multi-framework project generator',
        'cli.localeOption': 'Force output locale (en, ja)',
        'create.description':
            'Create a new project with interactive options (Next.js, Expo, Tauri, Flutter)',
        'create.invalidFramework': ({ value }) => `Invalid framework: ${value}`,
        'create.invalidDatabase': ({ value }) => `Invalid database: ${value}`,
        'create.invalidOrm': ({ value }) => `Invalid ORM: ${value}`,
        'create.invalidStorage': ({ value }) => `Invalid storage: ${value}`,
        'create.invalidPackageManager': ({ value }) => `Invalid package manager: ${value}`,
        'create.invalidMode': ({ value }) => `Invalid mode: ${value}`,
        'create.missingRequiredArgs':
            'When using CLI arguments, --name, --path, --framework, --database, --storage, and --package-manager are required',
        'create.ormRequired': 'When database is not "none", --orm is required',
        'r2.invalidAction': 'Invalid action. Use: list, create, or delete',
    },
    ja: {
        'cli.description': '複数フレームワーク対応のプロジェクトジェネレーター',
        'cli.localeOption': '出力言語を強制指定 (en, ja)',
        'create.description': '対話形式でプロジェクトを作成します (Next.js, Expo, Tauri, Flutter)',
        'create.invalidFramework': ({ value }) => `未対応のフレームワークです: ${value}`,
        'create.invalidDatabase': ({ value }) => `未対応のデータベースです: ${value}`,
        'create.invalidOrm': ({ value }) => `未対応の ORM です: ${value}`,
        'create.invalidStorage': ({ value }) => `未対応のストレージです: ${value}`,
        'create.invalidPackageManager': ({ value }) =>
            `未対応のパッケージマネージャーです: ${value}`,
        'create.invalidMode': ({ value }) => `未対応のモードです: ${value}`,
        'create.missingRequiredArgs':
            'CLI 引数を使用する場合は --name, --path, --framework, --database, --storage, --package-manager をすべて指定してください',
        'create.ormRequired': 'データベースに "none" 以外を指定した場合は --orm が必須です',
        'r2.invalidAction': '未対応の操作です。list, create, delete から選択してください',
    },
};

// 現在のアクティブなロケール（初期値は環境変数から取得）
let currentLocale: SupportedLocale = normalizeLocale(initialLocaleFromEnvironment());

/**
 * 言語タグを抽出して正規化する
 * アンダースコアをハイフンに変換（例: ja_JP → ja-JP）
 * @param value - 入力文字列（環境変数など）
 * @returns 正規化された言語タグまたはundefined
 */
function extractLanguageTag(value?: string | null): string | undefined {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    // POSIX形式（ja_JP）をBCP47形式（ja-JP）に変換
    return trimmed.replace('_', '-');
}

/**
 * 環境変数から初期ロケールを決定する
 * 優先順位：
 * 1. FLUORITE_LOCALE（専用環境変数）
 * 2. LC_ALL, LC_MESSAGES, LANG（標準的なロケール環境変数）
 * 3. システムのデフォルトロケール（Intl API経由）
 * @returns ロケール文字列またはundefined
 */
function initialLocaleFromEnvironment(): string | undefined {
    // 専用環境変数を最優先でチェック
    const forced = extractLanguageTag(process.env.FLUORITE_LOCALE);
    if (forced) {
        return forced;
    }
    // 標準的なロケール環境変数を順番にチェック
    const candidates = [process.env.LC_ALL, process.env.LC_MESSAGES, process.env.LANG];
    for (const candidate of candidates) {
        const tag = extractLanguageTag(candidate);
        if (tag) {
            return tag;
        }
    }
    // システムのデフォルトロケールを取得
    try {
        const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
        if (resolved) {
            return resolved;
        }
    } catch {
        // Intl APIが利用できない環境では無視してデフォルトへフォールバック
    }
    return undefined;
}

/**
 * ロケール文字列をサポートされているロケールに正規化する
 * 例: 'ja-JP' → 'ja', 'en-US' → 'en'
 * @param value - 入力ロケール文字列
 * @returns サポートされているロケール（デフォルト: 'en'）
 */
function normalizeLocale(value?: string | null): SupportedLocale {
    if (!value) {
        return 'en'; // デフォルトは英語
    }
    const lower = value.toLowerCase();
    // サポートされているロケールにマッチするかチェック
    for (const locale of SUPPORTED_LOCALES) {
        // 完全一致または地域コード付きの一致を確認（例: 'ja' or 'ja-JP'）
        if (lower === locale || lower.startsWith(`${locale}-`)) {
            return locale;
        }
    }
    return 'en'; // マッチしない場合は英語にフォールバック
}

/**
 * メッセージキーから実際のメッセージを解決する
 * 現在のロケールにメッセージがない場合は英語にフォールバック
 * @param key - メッセージキー
 * @param params - テンプレートパラメータ
 * @returns 解決されたメッセージ文字列
 */
function resolveMessage(key: MessageKey, params: MessageParams = {}): string {
    // 現在のロケールのメッセージ辞書を取得
    const localeMessages = messageMap[currentLocale] ?? messageMap.en;
    const fallbackMessages = messageMap.en;
    // メッセージを検索（見つからない場合は英語版を使用）
    const message = localeMessages[key] ?? fallbackMessages[key];
    if (!message) {
        // メッセージが定義されていない場合はキーそのものを返す（デバッグ用）
        return key;
    }
    // 関数型メッセージの場合はパラメータを渡して実行
    if (typeof message === 'function') {
        return message(params);
    }
    // 単純な文字列メッセージの場合はそのまま返す
    return message;
}

/**
 * 現在のロケールを設定する
 * CLIの実行中にロケールを動的に変更可能
 * @param locale - 設定するロケール（nullの場合は環境変数から再取得）
 */
export function setLocale(locale?: string | null): void {
    currentLocale = normalizeLocale(locale ?? initialLocaleFromEnvironment());
}

/**
 * 現在のアクティブなロケールを取得する
 * @returns 現在のロケール（'en' または 'ja'）
 */
export function getLocale(): SupportedLocale {
    return currentLocale;
}

/**
 * メッセージを翻訳する（tは'translate'の省略形）
 * 国際化のメイン関数
 * @param key - メッセージキー
 * @param params - テンプレートパラメータ
 * @returns 翻訳されたメッセージ
 */
export function t(key: MessageKey, params?: MessageParams): string {
    return resolveMessage(key, params);
}

/**
 * 無効なオプション値のエラーメッセージをフォーマットする
 * @param type - オプションのタイプ
 * @param value - 無効な値
 * @returns フォーマットされたエラーメッセージ
 */
export function formatInvalidOption(
    type: 'framework' | 'database' | 'orm' | 'storage' | 'packageManager' | 'mode',
    value: string
): string {
    // タイプ名を大文字で始めてメッセージキーを構築
    const key = `create.invalid${capitalize(type)}` as MessageKey;
    return t(key, { value });
}

/**
 * CLIツール全体の説明を取得
 */
export function getCliDescription(): string {
    return t('cli.description');
}

/**
 * createコマンドの説明を取得
 */
export function getCreateCommandDescription(): string {
    return t('create.description');
}

/**
 * ロケールオプションの説明を取得
 */
export function getLocaleOptionDescription(): string {
    return t('cli.localeOption');
}

/**
 * 必須引数不足エラーメッセージを取得
 */
export function getMissingArgsMessage(): string {
    return t('create.missingRequiredArgs');
}

/**
 * ORM必須エラーメッセージを取得
 */
export function getOrmRequiredMessage(): string {
    return t('create.ormRequired');
}

/**
 * 無効なR2アクションエラーメッセージを取得
 */
export function getInvalidR2ActionMessage(): string {
    return t('r2.invalidAction');
}

/**
 * 文字列の最初の文字を大文字にする
 * TypeScriptの組み込み型Capitalize<T>と互換性のある実装
 * @param input - 入力文字列
 * @returns 最初の文字が大文字になった文字列
 */
function capitalize<T extends string>(input: T): Capitalize<T> {
    return (input.charAt(0).toUpperCase() + input.slice(1)) as Capitalize<T>;
}
