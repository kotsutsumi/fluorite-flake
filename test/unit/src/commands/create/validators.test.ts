/**
 * createコマンドのバリデーション機能のユニットテスト
 */
import { describe, expect, test } from "vitest";

import { PROJECT_TEMPLATES } from "../../../../../src/commands/create/constants.js";
import {
    validateDatabase,
    validateProjectType,
    validateTemplate,
} from "../../../../../src/commands/create/validators/index.js";

describe("createコマンドのバリデーション機能", () => {
    describe("validateProjectType", () => {
        test("有効なプロジェクトタイプの場合、trueを返すこと", () => {
            // テスト実行: 有効なプロジェクトタイプを検証
            expect(validateProjectType("nextjs")).toBe(true);
            expect(validateProjectType("expo")).toBe(true);
            expect(validateProjectType("tauri")).toBe(true);
        });

        test("無効なプロジェクトタイプの場合、falseを返すこと", () => {
            // テスト実行: 無効なプロジェクトタイプを検証
            expect(validateProjectType("react")).toBe(false);
            expect(validateProjectType("vue")).toBe(false);
            expect(validateProjectType("angular")).toBe(false);
            expect(validateProjectType("")).toBe(false);
            expect(validateProjectType("invalid")).toBe(false);
        });

        test("大文字小文字を区別すること", () => {
            // テスト実行: 大文字小文字の違いを検証
            expect(validateProjectType("NextJS")).toBe(false);
            expect(validateProjectType("EXPO")).toBe(false);
            expect(validateProjectType("Tauri")).toBe(false);
        });

        test("特殊文字や数字を含む文字列は無効とすること", () => {
            // テスト実行: 特殊文字や数字を含む文字列を検証
            expect(validateProjectType("next-js")).toBe(false);
            expect(validateProjectType("expo_app")).toBe(false);
            expect(validateProjectType("tauri123")).toBe(false);
            expect(validateProjectType("@nextjs")).toBe(false);
        });

        test("nullやundefinedの場合、falseを返すこと", () => {
            // テスト実行: nullやundefined値を検証
            expect(validateProjectType(null as any)).toBe(false);
            expect(validateProjectType(undefined as any)).toBe(false);
        });
    });

    describe("validateTemplate", () => {
        describe("nextjsプロジェクトの場合", () => {
            test("有効なテンプレートの場合、trueを返すこと", () => {
                // テスト実行: nextjs用の有効なテンプレートを検証
                expect(validateTemplate("nextjs", "typescript")).toBe(true);
                expect(validateTemplate("nextjs", "app-router")).toBe(true);
                expect(validateTemplate("nextjs", "pages-router")).toBe(true);
                expect(validateTemplate("nextjs", "javascript")).toBe(true);
            });

            test("無効なテンプレートの場合、falseを返すこと", () => {
                // テスト実行: nextjs用の無効なテンプレートを検証
                expect(validateTemplate("nextjs", "react")).toBe(false);
                expect(validateTemplate("nextjs", "tabs")).toBe(false);
                expect(validateTemplate("nextjs", "vanilla")).toBe(false);
                expect(validateTemplate("nextjs", "")).toBe(false);
                expect(validateTemplate("nextjs", "invalid")).toBe(false);
            });
        });

        describe("expoプロジェクトの場合", () => {
            test("有効なテンプレートの場合、trueを返すこと", () => {
                // テスト実行: expo用の有効なテンプレートを検証
                expect(validateTemplate("expo", "typescript")).toBe(true);
                expect(validateTemplate("expo", "tabs")).toBe(true);
                expect(validateTemplate("expo", "navigation")).toBe(true);
                expect(validateTemplate("expo", "javascript")).toBe(true);
            });

            test("無効なテンプレートの場合、falseを返すこと", () => {
                // テスト実行: expo用の無効なテンプレートを検証
                expect(validateTemplate("expo", "app-router")).toBe(false);
                expect(validateTemplate("expo", "pages-router")).toBe(false);
                expect(validateTemplate("expo", "react")).toBe(false);
                expect(validateTemplate("expo", "vanilla")).toBe(false);
                expect(validateTemplate("expo", "")).toBe(false);
            });
        });

        describe("tauriプロジェクトの場合", () => {
            test("有効なテンプレートの場合、trueを返すこと", () => {
                // テスト実行: tauri用の有効なテンプレートを検証
                expect(validateTemplate("tauri", "typescript")).toBe(true);
                expect(validateTemplate("tauri", "react")).toBe(true);
                expect(validateTemplate("tauri", "vanilla")).toBe(true);
                expect(validateTemplate("tauri", "javascript")).toBe(true);
            });

            test("無効なテンプレートの場合、falseを返すこと", () => {
                // テスト実行: tauri用の無効なテンプレートを検証
                expect(validateTemplate("tauri", "app-router")).toBe(false);
                expect(validateTemplate("tauri", "tabs")).toBe(false);
                expect(validateTemplate("tauri", "navigation")).toBe(false);
                expect(validateTemplate("tauri", "")).toBe(false);
            });
        });

        test("大文字小文字を区別すること", () => {
            // テスト実行: テンプレート名の大文字小文字の違いを検証
            expect(validateTemplate("nextjs", "TypeScript")).toBe(false);
            expect(validateTemplate("expo", "TABS")).toBe(false);
            expect(validateTemplate("tauri", "React")).toBe(false);
        });

        test("すべてのプロジェクトタイプでtypescriptとjavascriptが利用可能であること", () => {
            // テスト実行: 共通のテンプレートが全プロジェクトタイプで利用可能かを検証
            const projectTypes = Object.keys(PROJECT_TEMPLATES) as Array<keyof typeof PROJECT_TEMPLATES>;

            for (const projectType of projectTypes) {
                expect(validateTemplate(projectType, "typescript")).toBe(true);
                expect(validateTemplate(projectType, "javascript")).toBe(true);
            }
        });

        test("プロジェクトタイプ固有のテンプレートが他のタイプでは無効であること", () => {
            // テスト実行: プロジェクトタイプ固有のテンプレートが他では無効かを検証

            // nextjs固有のテンプレートが他のプロジェクトで無効であること
            expect(validateTemplate("expo", "app-router")).toBe(false);
            expect(validateTemplate("tauri", "pages-router")).toBe(false);

            // expo固有のテンプレートが他のプロジェクトで無効であること
            expect(validateTemplate("nextjs", "tabs")).toBe(false);
            expect(validateTemplate("tauri", "navigation")).toBe(false);

            // tauri固有のテンプレートが他のプロジェクトで無効であること
            expect(validateTemplate("nextjs", "react")).toBe(false);
            expect(validateTemplate("expo", "vanilla")).toBe(false);
        });
    });

    describe("validateDatabase", () => {
        test("有効なデータベースタイプの場合、trueを返すこと", () => {
            // テスト実行: 有効なデータベースタイプを検証
            expect(validateDatabase("turso")).toBe(true);
            expect(validateDatabase("supabase")).toBe(true);
            expect(validateDatabase("sqlite")).toBe(true);
        });

        test("無効なデータベースタイプの場合、falseを返すこと", () => {
            // テスト実行: 無効なデータベースタイプを検証
            expect(validateDatabase("mysql")).toBe(false);
            expect(validateDatabase("postgresql")).toBe(false);
            expect(validateDatabase("mongodb")).toBe(false);
            expect(validateDatabase("")).toBe(false);
            expect(validateDatabase("invalid")).toBe(false);
        });

        test("大文字小文字を区別すること", () => {
            // テスト実行: 大文字小文字の違いを検証
            expect(validateDatabase("Turso")).toBe(false);
            expect(validateDatabase("SUPABASE")).toBe(false);
            expect(validateDatabase("SQLite")).toBe(false);
            expect(validateDatabase("Sqlite")).toBe(false);
        });

        test("特殊文字や数字を含む文字列は無効とすること", () => {
            // テスト実行: 特殊文字や数字を含む文字列を検証
            expect(validateDatabase("turso-db")).toBe(false);
            expect(validateDatabase("supabase_db")).toBe(false);
            expect(validateDatabase("sqlite3")).toBe(false);
            expect(validateDatabase("@turso")).toBe(false);
        });

        test("nullやundefinedの場合、falseを返すこと", () => {
            // テスト実行: nullやundefined値を検証
            expect(validateDatabase(null as any)).toBe(false);
            expect(validateDatabase(undefined as any)).toBe(false);
        });
    });

    describe("定数の整合性テスト", () => {
        test("PROJECT_TEMPLATESが期待された構造を持つこと", () => {
            // テスト実行: PROJECT_TEMPLATESの構造を検証
            expect(PROJECT_TEMPLATES).toHaveProperty("nextjs");
            expect(PROJECT_TEMPLATES).toHaveProperty("expo");
            expect(PROJECT_TEMPLATES).toHaveProperty("tauri");

            // 各プロジェクトタイプのテンプレートが配列であること
            expect(Array.isArray(PROJECT_TEMPLATES.nextjs)).toBe(true);
            expect(Array.isArray(PROJECT_TEMPLATES.expo)).toBe(true);
            expect(Array.isArray(PROJECT_TEMPLATES.tauri)).toBe(true);

            // 各プロジェクトタイプが少なくとも1つのテンプレートを持つこと
            expect(PROJECT_TEMPLATES.nextjs.length).toBeGreaterThan(0);
            expect(PROJECT_TEMPLATES.expo.length).toBeGreaterThan(0);
            expect(PROJECT_TEMPLATES.tauri.length).toBeGreaterThan(0);
        });

        test("すべてのプロジェクトタイプがtypescriptテンプレートを含むこと", () => {
            // テスト実行: typescriptテンプレートが全プロジェクトタイプに含まれるかを検証
            const projectTypes = Object.keys(PROJECT_TEMPLATES) as Array<keyof typeof PROJECT_TEMPLATES>;

            for (const projectType of projectTypes) {
                expect(PROJECT_TEMPLATES[projectType]).toContain("typescript");
            }
        });

        test("重複するテンプレート名が存在しないこと", () => {
            // テスト実行: 各プロジェクトタイプ内でテンプレート名の重複がないかを検証
            const projectTypes = Object.keys(PROJECT_TEMPLATES) as Array<keyof typeof PROJECT_TEMPLATES>;

            for (const projectType of projectTypes) {
                const templates = PROJECT_TEMPLATES[projectType];
                const uniqueTemplates = [...new Set(templates)];
                expect(templates.length).toBe(uniqueTemplates.length);
            }
        });
    });
});

// EOF
