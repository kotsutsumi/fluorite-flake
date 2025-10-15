/**
 * Biome設定の互換性を調整するモジュール
 */
import fs from "node:fs"; // ファイル読み書きユーティリティ
import path from "node:path"; // パス操作ユーティリティ
import { execSync } from "node:child_process"; // コマンド実行ユーティリティ

import { debugLog } from "../../../debug.js"; // デバッグログユーティリティ

/**
 * プロジェクトのBiome設定を最新バージョンに合わせて修正する
 */
export async function fixBiomeConfiguration(projectRoot: string): Promise<void> {
    try {
        const biomeVersion = await getCurrentBiomeVersion(); // 現在のBiomeバージョンを取得する
        if (!biomeVersion) {
            debugLog("Biome not found, skipping configuration fix"); // Biomeが無ければ処理をスキップする
            return;
        }

        await fixBiomeConfigFiles(projectRoot, biomeVersion); // プロジェクト内の設定ファイルを修正する
    } catch (error) {
        debugLog("Failed to fix Biome configuration", { error }); // 失敗時の詳細を記録する
        // Biomeの調整が失敗してもプロジェクト生成は続行する
    }
}

/**
 * 実行環境にインストールされているBiomeのバージョンを取得する
 */
async function getCurrentBiomeVersion(): Promise<string | null> {
    try {
        const output = execSync("npx biome --version", { encoding: "utf8", stdio: "pipe" }); // バージョンコマンドを実行する
        const match = output.match(/Version:\s*(\d+\.\d+\.\d+)/); // 出力からバージョン番号を抽出する
        return match ? match[1] : null; // 正規表現が成功した場合はバージョンを返す
    } catch {
        return null; // コマンド実行に失敗した場合はnullを返す
    }
}

/**
 * プロジェクト内のbiome.jsonファイルを探し出し、それぞれを修正する
 */
async function fixBiomeConfigFiles(projectRoot: string, biomeVersion: string): Promise<void> {
    const biomeConfigFiles = findBiomeConfigFiles(projectRoot); // 対象ファイル一覧を取得する

    for (const configFile of biomeConfigFiles) {
        await fixSingleBiomeConfig(configFile, biomeVersion); // 各ファイルを順番に修正する
    }
}

/**
 * プロジェクト配下からbiome.jsonファイルを再帰的に収集する
 */
function findBiomeConfigFiles(projectRoot: string): string[] {
    const configFiles: string[] = []; // 結果を格納する配列を初期化する

    function searchRecursively(dir: string): void {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true }); // ディレクトリエントリを取得する

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name); // フルパスを組み立てる

                if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
                    searchRecursively(fullPath); // サブディレクトリを再帰的に探索する
                } else if (entry.isFile() && entry.name === "biome.json") {
                    configFiles.push(fullPath); // biome.jsonを発見したらリストへ追加する
                }
            }
        } catch (error) {
            debugLog("Error searching for biome.json files", { dir, error }); // 読み込みエラー時はログに残す
        }
    }

    searchRecursively(projectRoot); // 探索を開始する
    return configFiles; // 見つかったファイル一覧を返す
}

/**
 * 単一のbiome.jsonファイルを最新仕様へ修正する
 */
async function fixSingleBiomeConfig(configPath: string, biomeVersion: string): Promise<void> {
    try {
        const configContent = fs.readFileSync(configPath, "utf8"); // ファイル内容を読み込む
        const config = JSON.parse(configContent); // JSONを解析する

        if (config.$schema) {
            config.$schema = `https://biomejs.dev/schemas/${biomeVersion}/schema.json`; // スキーマURLを最新バージョンへ更新する
        }

        const removedRules = [
            "noDeprecatedImports",
            "noDuplicateDependencies",
            "noReactForwardRef",
            "noUnusedExpressions",
            "noVueDuplicateKeys",
            "useConsistentArrowReturn",
            "noJsxLiterals",
            "noUselessCatchBinding",
            "useVueMultiWordComponentNames",
        ]; // 非推奨になったルールの一覧

        if (config.linter?.rules?.nursery) {
            for (const rule of removedRules) {
                delete config.linter.rules.nursery[rule]; // nurseryセクションから廃止ルールを取り除く
            }
        }

        const updatedContent = JSON.stringify(config, null, 2); // 修正後のJSONを整形する
        fs.writeFileSync(configPath, updatedContent); // 上書き保存する

        debugLog("Fixed biome.json", { configPath, biomeVersion }); // 修正したファイル情報を記録する
    } catch (error) {
        debugLog("Failed to fix biome.json file", { configPath, error }); // 失敗時は詳細を記録する
    }
}

// EOF
