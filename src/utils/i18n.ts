const SUPPORTED_LOCALES = ['en', 'ja'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

type MessageValue = string | ((params: MessageParams) => string);
type MessageDictionary = Record<string, MessageValue>;

type MessageParams = Record<string, string | number | undefined>;

type MessageKey =
    | 'cli.description'
    | 'cli.localeOption'
    | 'create.description'
    | 'create.invalidFramework'
    | 'create.invalidDatabase'
    | 'create.invalidOrm'
    | 'create.invalidStorage'
    | 'create.invalidPackageManager'
    | 'create.invalidMode'
    | 'create.missingRequiredArgs'
    | 'create.ormRequired'
    | 'r2.invalidAction';

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

let currentLocale: SupportedLocale = normalizeLocale(initialLocaleFromEnvironment());

function extractLanguageTag(value?: string | null): string | undefined {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    return trimmed.replace('_', '-');
}

function initialLocaleFromEnvironment(): string | undefined {
    const forced = extractLanguageTag(process.env.FLUORITE_LOCALE);
    if (forced) {
        return forced;
    }
    const candidates = [process.env.LC_ALL, process.env.LC_MESSAGES, process.env.LANG];
    for (const candidate of candidates) {
        const tag = extractLanguageTag(candidate);
        if (tag) {
            return tag;
        }
    }
    try {
        const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
        if (resolved) {
            return resolved;
        }
    } catch {
        // ignore and fall back to default
    }
    return undefined;
}

function normalizeLocale(value?: string | null): SupportedLocale {
    if (!value) {
        return 'en';
    }
    const lower = value.toLowerCase();
    for (const locale of SUPPORTED_LOCALES) {
        if (lower === locale || lower.startsWith(`${locale}-`)) {
            return locale;
        }
    }
    return 'en';
}

function resolveMessage(key: MessageKey, params: MessageParams = {}): string {
    const localeMessages = messageMap[currentLocale] ?? messageMap.en;
    const fallbackMessages = messageMap.en;
    const message = localeMessages[key] ?? fallbackMessages[key];
    if (!message) {
        return key;
    }
    if (typeof message === 'function') {
        return message(params);
    }
    return message;
}

export function setLocale(locale?: string | null): void {
    currentLocale = normalizeLocale(locale ?? initialLocaleFromEnvironment());
}

export function getLocale(): SupportedLocale {
    return currentLocale;
}

export function t(key: MessageKey, params?: MessageParams): string {
    return resolveMessage(key, params);
}

export function formatInvalidOption(
    type: 'framework' | 'database' | 'orm' | 'storage' | 'packageManager' | 'mode',
    value: string
): string {
    const key = `create.invalid${capitalize(type)}` as MessageKey;
    return t(key, { value });
}

export function getCliDescription(): string {
    return t('cli.description');
}

export function getCreateCommandDescription(): string {
    return t('create.description');
}

export function getLocaleOptionDescription(): string {
    return t('cli.localeOption');
}

export function getMissingArgsMessage(): string {
    return t('create.missingRequiredArgs');
}

export function getOrmRequiredMessage(): string {
    return t('create.ormRequired');
}

export function getInvalidR2ActionMessage(): string {
    return t('r2.invalidAction');
}

function capitalize<T extends string>(input: T): Capitalize<T> {
    return (input.charAt(0).toUpperCase() + input.slice(1)) as Capitalize<T>;
}
