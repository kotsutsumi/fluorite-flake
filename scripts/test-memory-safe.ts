#!/usr/bin/env tsx

/**
 * メモリセーフなテスト実行スクリプト
 * 大きなテストファイルを分割して個別実行し、メモリ不足を防ぐ
 */

import { execSync } from "node:child_process";
import { exit } from "node:process";

// 大容量テストファイル（個別実行）
const HEAVY_TESTS = [
    "test/unit/src/commands/create/template-generators/nextjs-fullstack-admin.test.ts",
    "test/unit/src/commands/create/generator-monorepo-install.test.ts",
    "test/unit/src/commands/create/generator.test.ts",
];

// 一般テストファイル（グループ実行）
const NORMAL_TESTS_EXCLUDE = HEAVY_TESTS.map(file => `--exclude ${file}`).join(" ");

console.log("🧪 メモリセーフなテスト実行を開始...");

let totalFailures = 0;

try {
    // 1. 一般テストを実行
    console.log("\n📋 一般テストを実行中...");
    execSync(`vitest run ${NORMAL_TESTS_EXCLUDE}`, {
        stdio: "inherit",
        env: {
            ...process.env,
            NODE_OPTIONS: "--max-old-space-size=2048", // 2GBに制限
        },
    });
    console.log("✅ 一般テスト完了");

    // 2. 大容量テストを個別実行
    for (const testFile of HEAVY_TESTS) {
        console.log(`\n🔥 大容量テスト実行中: ${testFile}`);
        try {
            execSync(`vitest run ${testFile}`, {
                stdio: "inherit",
                env: {
                    ...process.env,
                    NODE_OPTIONS: "--max-old-space-size=4096", // 4GBを割り当て
                },
            });
            console.log(`✅ ${testFile} 完了`);
        } catch (error) {
            console.error(`❌ ${testFile} 失敗`);
            totalFailures++;
        }
    }

    if (totalFailures > 0) {
        console.error(`\n🚨 ${totalFailures}個のテストファイルが失敗しました`);
        exit(1);
    } else {
        console.log("\n🎉 全テスト完了！");
        exit(0);
    }
} catch (error) {
    console.error("\n💥 テスト実行エラー:", error);
    exit(1);
}

// EOF