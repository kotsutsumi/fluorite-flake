import type { SupportedLocale, MessageDictionary } from './types.js';

/**
 * 各ロケールごとのメッセージ定義
 * 動的パラメータを持つメッセージは関数として定義
 */
export const messageMap: Record<SupportedLocale, MessageDictionary> = {
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
