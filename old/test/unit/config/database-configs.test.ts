/**
 * `DATABASE_CONFIGS` の構成と内容を網羅的に検証するユニットテスト。
 * Turso / Supabase それぞれの表示名・説明文・要求環境変数・サポート ORM を精査し、
 * CLI が依存する設定オブジェクトの整合性が保たれているかを確認する。
 * 新しいデータベースの追加や仕様変更による副作用を早期に検知する安全網として機能させる。
 */
import { describe, expect, it } from 'vitest';

import { DATABASE_CONFIGS } from '../../../src/config/framework-configs/database-configs.js';
import type { OrmType } from '../../../src/config/framework-configs/types.js';

describe('DATABASE_CONFIGS の構成確認', () => {
    describe('Turso 設定の検証', () => {
        const tursoConfig = DATABASE_CONFIGS.turso;

        // Turso の表示名と説明文が UI やドキュメントの表記と一致しているかを検証する
        it('名称と説明が期待どおりであること', () => {
            expect(tursoConfig.name).toBe('Turso');
            expect(tursoConfig.description).toBe('libSQLでエッジで動作するSQLiteデータベース');
        });

        // Turso に接続するために必要な環境変数が完全に揃っているかを確認する
        it('必要な環境変数が揃っていること', () => {
            const expectedEnvVars = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'DATABASE_URL'];
            expect(tursoConfig.envVars).toEqual(expectedEnvVars);
        });

        // CLI で提示する ORM 選択肢が Prisma と Drizzle の 2 種類に限定されているかを保証する
        it('Prisma と Drizzle の両方をサポートしていること', () => {
            const expectedOrms: OrmType[] = ['prisma', 'drizzle'];
            expect(tursoConfig.supportedOrms).toEqual(expectedOrms);
        });

        // Turso の設定が最低 1 つ以上の ORM に対応していることを確認し、空配列が紛れ込む退行を防ぐ
        it('サポート対象の ORM が最低一つは存在すること', () => {
            expect(tursoConfig.supportedOrms.length).toBeGreaterThan(0);
        });
    });

    describe('Supabase 設定の検証', () => {
        const supabaseConfig = DATABASE_CONFIGS.supabase;

        // Supabase の表示名と説明文が仕様どおりかを確認し、テキスト変更の取りこぼしを防ぐ
        it('名称と説明が期待どおりであること', () => {
            expect(supabaseConfig.name).toBe('Supabase');
            expect(supabaseConfig.description).toBe('認証機能内蔵のPostgreSQLデータベース');
        });

        // Supabase を利用するために求められる公開キー・サービスロールキーが全て揃っているか検証する
        it('必要な環境変数が揃っていること', () => {
            const expectedEnvVars = [
                'NEXT_PUBLIC_SUPABASE_URL',
                'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'SUPABASE_SERVICE_ROLE_KEY',
                'DATABASE_URL',
            ];
            expect(supabaseConfig.envVars).toEqual(expectedEnvVars);
        });

        // Supabase が Prisma と Drizzle で利用可能である前提を維持しているかを確認する
        it('Prisma と Drizzle の両方をサポートしていること', () => {
            const expectedOrms: OrmType[] = ['prisma', 'drizzle'];
            expect(supabaseConfig.supportedOrms).toEqual(expectedOrms);
        });

        // Supabase の設定で ORM 配列が空にならないことを明示的にチェックする
        it('サポート対象の ORM が最低一つは存在すること', () => {
            expect(supabaseConfig.supportedOrms.length).toBeGreaterThan(0);
        });
    });

    describe('データベース設定オブジェクト全体の構造検証', () => {
        // Turso と Supabase の 2 種類が確実に定義されているかを確認する
        it('Turso と Supabase の設定が揃っていること', () => {
            expect(DATABASE_CONFIGS).toHaveProperty('turso');
            expect(DATABASE_CONFIGS).toHaveProperty('supabase');
        });

        // データベース設定の種類が 2 件に固定されていることを数で保証し、増減時にテストが落ちるようにする
        it('データベース設定が2種類のみで構成されていること', () => {
            expect(Object.keys(DATABASE_CONFIGS)).toHaveLength(2);
        });

        // 各設定が共通のキー構造と値の型を満たしているかを検証し、フィールド欠落を検知する
        it('各データベース設定が同じ構造を保っていること', () => {
            for (const [_key, config] of Object.entries(DATABASE_CONFIGS)) {
                expect(config).toHaveProperty('name');
                expect(config).toHaveProperty('description');
                expect(config).toHaveProperty('envVars');
                expect(config).toHaveProperty('supportedOrms');

                expect(typeof config.name).toBe('string');
                expect(typeof config.description).toBe('string');
                expect(Array.isArray(config.envVars)).toBe(true);
                expect(Array.isArray(config.supportedOrms)).toBe(true);

                expect(config.name.length).toBeGreaterThan(0);
                expect(config.description.length).toBeGreaterThan(0);
                expect(config.envVars.length).toBeGreaterThan(0);
            }
        });

        // DATABASE_URL は両設定で共用のため除外しつつ、その他の環境変数が重複していないかを検証する
        it('共通項目を除き環境変数名が重複しないこと', () => {
            const allEnvVars = Object.values(DATABASE_CONFIGS)
                .flatMap((config) => config.envVars)
                .filter((envVar) => envVar !== 'DATABASE_URL');

            const uniqueEnvVars = [...new Set(allEnvVars)];
            expect(allEnvVars).toHaveLength(uniqueEnvVars.length);
        });
    });

    describe('ORM サポート設定の検証', () => {
        // 定義された ORM 名が型で許可される値の範囲 (Prisma/Drizzle) に収まっているか確認する
        it('サポートされる ORM の値が妥当であること', () => {
            const validOrms: OrmType[] = ['prisma', 'drizzle'];

            for (const [_dbName, config] of Object.entries(DATABASE_CONFIGS)) {
                for (const orm of config.supportedOrms) {
                    expect(validOrms).toContain(orm);
                }
            }
        });

        // どのデータベース設定でも ORM 配列が空にならない前提をチェックし、テンプレートの破綻を防ぐ
        it('全てのデータベースで少なくとも1つの ORM をサポートしていること', () => {
            for (const [_dbName, config] of Object.entries(DATABASE_CONFIGS)) {
                expect(config.supportedOrms.length).toBeGreaterThan(0);
            }
        });
    });

    describe('環境変数設定の検証', () => {
        // 各環境変数名から前後の空白を除去した際に内容が変わらないことを確認し、空文字列も禁止する
        it('環境変数名が空文字列になっていないこと', () => {
            for (const [_dbName, config] of Object.entries(DATABASE_CONFIGS)) {
                for (const envVar of config.envVars) {
                    expect(envVar.trim()).toBe(envVar);
                    expect(envVar.length).toBeGreaterThan(0);
                }
            }
        });

        // Turso に必要な 3 つの環境変数が揃っているかを個別に検査する
        it('Turso に必要な環境変数が揃っていること', () => {
            const tursoEnvVars = DATABASE_CONFIGS.turso.envVars;
            expect(tursoEnvVars).toContain('TURSO_DATABASE_URL');
            expect(tursoEnvVars).toContain('TURSO_AUTH_TOKEN');
            expect(tursoEnvVars).toContain('DATABASE_URL');
        });

        // Supabase に必要な公開 URL・匿名キー・サービスロールキーが定義されているかを確認する
        it('Supabase に必要な環境変数が揃っていること', () => {
            const supabaseEnvVars = DATABASE_CONFIGS.supabase.envVars;
            expect(supabaseEnvVars).toContain('NEXT_PUBLIC_SUPABASE_URL');
            expect(supabaseEnvVars).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
            expect(supabaseEnvVars).toContain('SUPABASE_SERVICE_ROLE_KEY');
            expect(supabaseEnvVars).toContain('DATABASE_URL');
        });
    });
});
