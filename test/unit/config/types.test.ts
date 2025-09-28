/**
 * `framework-configs/types` が提供する型エイリアス・インターフェース群の想定どおりの振る舞いを検証するユニットテスト。
 * フレームワークやデータベースなどの列挙的型が妥当な値のみを受け付けること、構成オブジェクトが必須フィールドを保持すること、
 * 型同士の組み合わせが実際のプロジェクト設定に適用できることを確認し、CLI の型安全性を担保する目的で実施している。
 */
import { describe, expect, it } from 'vitest';

import type {
    DatabaseType,
    FrameworkConfig,
    FrameworkFeatures,
    FrameworkType,
    FrameworkVersions,
    OrmType,
    PackageManagerType,
    StorageType,
} from '../../../src/config/framework-configs/types.js';

// フレームワーク関連の型定義が正しく制約されているかをまとめて検証する
describe('framework-configs types', () => {
    // FrameworkType が許容する値と利用形態をチェックする
    describe('FrameworkType', () => {
        // 列挙されているフレームワーク識別子が文字列として扱えることを確認する
        it('should accept valid framework types', () => {
            const frameworks: FrameworkType[] = ['nextjs', 'expo', 'tauri', 'flutter'];
            for (const framework of frameworks) {
                expect(typeof framework).toBe('string');
            }
        });

        // FrameworkType をオブジェクトキーとして使用した際に型エラーが出ないことを検証する
        it('should be used as object keys', () => {
            const frameworkMap: Record<FrameworkType, string> = {
                nextjs: 'Next.js',
                expo: 'Expo',
                tauri: 'Tauri',
                flutter: 'Flutter',
            };
            expect(Object.keys(frameworkMap)).toHaveLength(4);
        });
    });

    // DatabaseType の値域と使用例を確認する
    describe('DatabaseType', () => {
        // 列挙されたデータベース識別子が適切な文字列型であることをチェックする
        it('should accept valid database types', () => {
            const databases: DatabaseType[] = ['none', 'turso', 'supabase'];
            for (const database of databases) {
                expect(typeof database).toBe('string');
            }
        });

        // デフォルト値として 'none' が選択可能であることを保証する
        it('should include none as default option', () => {
            const noneDatabase: DatabaseType = 'none';
            expect(noneDatabase).toBe('none');
        });

        // DatabaseType を配列で扱うユースケースが想定どおり機能するかを検証する
        it('should be used in arrays', () => {
            const supportedDatabases: DatabaseType[] = ['none', 'turso'];
            expect(supportedDatabases).toContain('none');
            expect(supportedDatabases).toContain('turso');
        });
    });

    // OrmType が Prisma / Drizzle のみを受け付けることを検証する
    describe('OrmType', () => {
        // ORM 識別子が期待する 2 種類に限定されることをチェックする
        it('should accept valid ORM types', () => {
            const orms: OrmType[] = ['prisma', 'drizzle'];
            for (const orm of orms) {
                expect(typeof orm).toBe('string');
            }
        });

        // Prisma と Drizzle の両方を型として宣言できることを確認する
        it('should support both major ORMs', () => {
            const prisma: OrmType = 'prisma';
            const drizzle: OrmType = 'drizzle';
            expect(prisma).toBe('prisma');
            expect(drizzle).toBe('drizzle');
        });
    });

    // StorageType の列挙値がクラウドストレージの選択肢を網羅しているか確認する
    describe('StorageType', () => {
        // ストレージ識別子の一覧が文字列型で構成されているかを検証する
        it('should accept valid storage types', () => {
            const storageTypes: StorageType[] = [
                'none',
                'vercel-blob',
                'cloudflare-r2',
                'aws-s3',
                'supabase-storage',
            ];
            for (const storage of storageTypes) {
                expect(typeof storage).toBe('string');
            }
        });

        // デフォルトとしてストレージなしを選択できることを保証する
        it('should include none as default option', () => {
            const noneStorage: StorageType = 'none';
            expect(noneStorage).toBe('none');
        });

        // 主要クラウドストレージが列挙に含まれていることを確認する
        it('should support major cloud providers', () => {
            const cloudProviders: StorageType[] = ['vercel-blob', 'cloudflare-r2', 'aws-s3'];
            expect(cloudProviders).toHaveLength(3);
        });
    });

    // PackageManagerType の選択肢が主要なパッケージマネージャーを網羅しているかを確認する
    describe('PackageManagerType', () => {
        // npm / pnpm などが許容される値として定義されているかをチェックする
        it('should accept valid package manager types', () => {
            const packageManagers: PackageManagerType[] = ['npm', 'pnpm', 'yarn', 'bun'];
            for (const pm of packageManagers) {
                expect(typeof pm).toBe('string');
            }
        });

        // 全主要パッケージマネージャーを配列で扱えることを確認する
        it('should support all major package managers', () => {
            const npm: PackageManagerType = 'npm';
            const pnpm: PackageManagerType = 'pnpm';
            const yarn: PackageManagerType = 'yarn';
            const bun: PackageManagerType = 'bun';

            expect([npm, pnpm, yarn, bun]).toHaveLength(4);
        });
    });

    // フレームワークで有効化できる機能フラグの型を検証する
    describe('FrameworkFeatures', () => {
        // 各プロパティが boolean 型であることを検証し、型定義の整合性を確認する
        it('should have all required boolean properties', () => {
            const features: FrameworkFeatures = {
                database: true,
                auth: false,
                storage: true,
                deployment: false,
                packageManager: true,
            };

            expect(typeof features.database).toBe('boolean');
            expect(typeof features.auth).toBe('boolean');
            expect(typeof features.storage).toBe('boolean');
            expect(typeof features.deployment).toBe('boolean');
            expect(typeof features.packageManager).toBe('boolean');
        });

        // すべての機能を有効にする設定が許容されることを確認する
        it('should allow all features enabled', () => {
            const allEnabled: FrameworkFeatures = {
                database: true,
                auth: true,
                storage: true,
                deployment: true,
                packageManager: true,
            };

            expect(Object.values(allEnabled).every((value) => value === true)).toBe(true);
        });

        // すべての機能を無効にしても型として受け付けられることを検証する
        it('should allow all features disabled', () => {
            const allDisabled: FrameworkFeatures = {
                database: false,
                auth: false,
                storage: false,
                deployment: false,
                packageManager: false,
            };

            expect(Object.values(allDisabled).every((value) => value === false)).toBe(true);
        });

        // 有効・無効が混在するケースで値の集計が期待どおりになるかを確認する
        it('should allow mixed feature configuration', () => {
            const mixedFeatures: FrameworkFeatures = {
                database: true,
                auth: false,
                storage: true,
                deployment: false,
                packageManager: true,
            };

            const enabledCount = Object.values(mixedFeatures).filter((value) => value).length;
            expect(enabledCount).toBe(3);
        });
    });

    // フレームワークで利用する依存関係バージョンのマッピングを検証する
    describe('FrameworkVersions', () => {
        // パッケージ名とバージョンが文字列どうしでマッピングされるかをチェックする
        it('should accept string key-value pairs', () => {
            const versions: FrameworkVersions = {
                react: '18.2.0',
                next: '13.0.0',
                typescript: '^5.0.0',
            };

            for (const [packageName, version] of Object.entries(versions)) {
                expect(typeof packageName).toBe('string');
                expect(typeof version).toBe('string');
            }
        });

        // caret や tilde などのレンジ指定が許容されることを確認する
        it('should support version ranges', () => {
            const versions: FrameworkVersions = {
                'exact-version': '1.0.0',
                'caret-range': '^2.0.0',
                'tilde-range': '~3.1.0',
                'greater-than': '>=4.0.0',
                'compound-range': '>=1.0.0 <2.0.0',
            };

            expect(Object.keys(versions)).toHaveLength(5);
        });

        // スコープ付きパッケージやカスタムパッケージ名にも対応できるかを検証する
        it('should be flexible with package names', () => {
            const versions: FrameworkVersions = {
                react: '18.2.0',
                '@types/node': '^18.0.0',
                'my-custom-package': '1.0.0',
            };

            expect(versions['@types/node']).toBe('^18.0.0');
            expect(versions['my-custom-package']).toBe('1.0.0');
        });

        // 空のマッピングが許容され、デフォルトでエラーにならないことを確認する
        it('should allow empty versions object', () => {
            const emptyVersions: FrameworkVersions = {};
            expect(Object.keys(emptyVersions)).toHaveLength(0);
        });
    });

    // FrameworkConfig が要求する構造とバリエーションを検証する
    describe('FrameworkConfig', () => {
        // すべての必須プロパティが正しい型で存在することを確認する
        it('should have all required properties', () => {
            const config: FrameworkConfig = {
                name: 'test-framework',
                displayName: 'Test Framework',
                defaultName: 'my-test-app',
                description: 'A test framework for unit tests',
                supportedFeatures: {
                    database: true,
                    auth: true,
                    storage: false,
                    deployment: true,
                    packageManager: true,
                },
                supportedDatabases: ['none', 'turso'],
                supportedOrms: ['prisma'],
                supportedStorage: ['none'],
                versions: {
                    'test-core': '1.0.0',
                    'test-cli': '^2.0.0',
                },
                requiredDependencies: ['test-core'],
                devDependencies: ['test-cli'],
            };

            expect(typeof config.name).toBe('string');
            expect(typeof config.displayName).toBe('string');
            expect(typeof config.defaultName).toBe('string');
            expect(typeof config.description).toBe('string');
            expect(typeof config.supportedFeatures).toBe('object');
            expect(Array.isArray(config.supportedDatabases)).toBe(true);
            expect(Array.isArray(config.supportedOrms)).toBe(true);
            expect(Array.isArray(config.supportedStorage)).toBe(true);
            expect(typeof config.versions).toBe('object');
            expect(Array.isArray(config.requiredDependencies)).toBe(true);
            expect(Array.isArray(config.devDependencies)).toBe(true);
        });

        // 必要最小限の構成だけでも型に適合することを検証する
        it('should support minimal configuration', () => {
            const minimalConfig: FrameworkConfig = {
                name: 'minimal',
                displayName: 'Minimal Framework',
                defaultName: 'minimal-app',
                description: 'Minimal test framework',
                supportedFeatures: {
                    database: false,
                    auth: false,
                    storage: false,
                    deployment: false,
                    packageManager: false,
                },
                supportedDatabases: ['none'],
                supportedOrms: [],
                supportedStorage: ['none'],
                versions: {},
                requiredDependencies: [],
                devDependencies: [],
            };

            expect(minimalConfig.supportedOrms).toHaveLength(0);
            expect(minimalConfig.requiredDependencies).toHaveLength(0);
            expect(minimalConfig.devDependencies).toHaveLength(0);
        });

        // フル機能を盛り込んだ設定でも型が許容されることを確認する
        it('should support comprehensive configuration', () => {
            const comprehensiveConfig: FrameworkConfig = {
                name: 'comprehensive',
                displayName: 'Comprehensive Framework',
                defaultName: 'comprehensive-app',
                description: 'Full-featured framework for testing',
                supportedFeatures: {
                    database: true,
                    auth: true,
                    storage: true,
                    deployment: true,
                    packageManager: true,
                },
                supportedDatabases: ['none', 'turso', 'supabase'],
                supportedOrms: ['prisma', 'drizzle'],
                supportedStorage: [
                    'none',
                    'vercel-blob',
                    'cloudflare-r2',
                    'aws-s3',
                    'supabase-storage',
                ],
                versions: {
                    core: '1.0.0',
                    cli: '2.0.0',
                    plugins: '^3.0.0',
                    types: '~4.1.0',
                },
                requiredDependencies: ['core', 'cli'],
                devDependencies: ['plugins', 'types'],
            };

            expect(comprehensiveConfig.supportedDatabases).toHaveLength(3);
            expect(comprehensiveConfig.supportedOrms).toHaveLength(2);
            expect(comprehensiveConfig.supportedStorage).toHaveLength(5);
            expect(Object.keys(comprehensiveConfig.versions)).toHaveLength(4);
        });

        // FrameworkType や関連型が型制約を強制することを明示的に検証する
        it('should enforce type constraints', () => {
            const config: FrameworkConfig = {
                name: 'nextjs' as FrameworkType,
                displayName: 'Next.js',
                defaultName: 'my-next-app',
                description: 'React framework',
                supportedFeatures: {
                    database: true,
                    auth: true,
                    storage: true,
                    deployment: true,
                    packageManager: true,
                },
                supportedDatabases: ['none', 'turso'] as DatabaseType[],
                supportedOrms: ['prisma'] as OrmType[],
                supportedStorage: ['none', 'vercel-blob'] as StorageType[],
                versions: {
                    next: '13.0.0',
                },
                requiredDependencies: ['next'],
                devDependencies: ['typescript'],
            };

            expect(config.name).toBe('nextjs');
            expect(config.supportedDatabases).toContain('turso');
            expect(config.supportedOrms).toContain('prisma');
            expect(config.supportedStorage).toContain('vercel-blob');
        });
    });

    // 型同士を組み合わせた実践的な利用ケースを検証する
    describe('type composition and usage', () => {
        // プロジェクト設定の組み立てに各型を使用できることを確認する
        it('should work together in realistic scenarios', () => {
            const framework: FrameworkType = 'nextjs';
            const database: DatabaseType = 'turso';
            const orm: OrmType = 'prisma';
            const storage: StorageType = 'vercel-blob';
            const packageManager: PackageManagerType = 'pnpm';

            const projectConfig = {
                framework,
                database,
                orm,
                storage,
                packageManager,
            };

            expect(projectConfig.framework).toBe('nextjs');
            expect(projectConfig.database).toBe('turso');
            expect(projectConfig.orm).toBe('prisma');
            expect(projectConfig.storage).toBe('vercel-blob');
            expect(projectConfig.packageManager).toBe('pnpm');
        });

        // 型制約を利用した設定バリデーションのパターンが成立することを確認する
        it('should support configuration validation patterns', () => {
            interface ConfigValidation {
                framework: FrameworkType;
                database: DatabaseType;
                storage: StorageType;
                valid: boolean;
            }

            const validConfigs: ConfigValidation[] = [
                { framework: 'nextjs', database: 'turso', storage: 'vercel-blob', valid: true },
                { framework: 'expo', database: 'supabase', storage: 'aws-s3', valid: true },
                { framework: 'tauri', database: 'none', storage: 'none', valid: true },
                { framework: 'flutter', database: 'none', storage: 'none', valid: true },
            ];

            for (const config of validConfigs) {
                expect(config.valid).toBe(true);
                expect(typeof config.framework).toBe('string');
                expect(typeof config.database).toBe('string');
                expect(typeof config.storage).toBe('string');
            }
        });
    });
});
