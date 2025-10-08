/**
 * 環境変数管理システム
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { EnvironmentVariables } from "./types.js";

/**
 * 環境変数管理クラス
 */
export class EnvironmentManager {
    private readonly rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    /**
     * 階層的環境変数管理
     */
    async loadEnvironmentHierarchy(appName: string, environment: string): Promise<EnvironmentVariables> {
        const hierarchy = [
            // 1. ルートレベル共通設定
            path.join(this.rootPath, ".env"),
            path.join(this.rootPath, `.env.${environment}`),

            // 2. アプリレベル設定
            path.join(this.rootPath, "apps", appName, ".env"),
            path.join(this.rootPath, "apps", appName, `.env.${environment}`),

            // 3. ローカルオーバーライド
            path.join(this.rootPath, "apps", appName, ".env.local"),
        ];

        const merged: EnvironmentVariables = {};

        for (const envFile of hierarchy) {
            if (await this.fileExists(envFile)) {
                const vars = await this.parseEnvFile(envFile);
                Object.assign(merged, vars);
            }
        }

        return merged;
    }

    /**
     * 環境変数注入
     */
    async injectVariables(appName: string, environment: string, command: string): Promise<string> {
        const vars = await this.loadEnvironmentHierarchy(appName, environment);
        const envString = Object.entries(vars)
            .map(([key, value]) => `${key}=${this.escapeValue(value)}`)
            .join(" ");

        return envString ? `${envString} ${command}` : command;
    }

    /**
     * 環境変数ファイル作成
     */
    async createEnvFile(appName: string, environment: string, variables: EnvironmentVariables): Promise<void> {
        const envFilePath = path.join(this.rootPath, "apps", appName, `.env.${environment}`);

        // ディレクトリ作成
        await fs.mkdir(path.dirname(envFilePath), { recursive: true });

        // 環境変数ファイル内容生成
        const content = Object.entries(variables)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n");

        await fs.writeFile(envFilePath, `${content}\n`);
    }

    /**
     * 環境変数ファイル読み込み
     */
    async loadEnvFile(filePath: string): Promise<EnvironmentVariables> {
        try {
            return await this.parseEnvFile(filePath);
        } catch {
            return {};
        }
    }

    /**
     * 利用可能な環境一覧取得
     */
    async getAvailableEnvironments(appName: string): Promise<string[]> {
        const appDir = path.join(this.rootPath, "apps", appName);
        const environments = new Set<string>();

        try {
            const files = await fs.readdir(appDir);

            for (const file of files) {
                if (file.startsWith(".env.") && !file.endsWith(".local")) {
                    const env = file.replace(".env.", "");
                    environments.add(env);
                }
            }
        } catch {
            // ディレクトリが存在しない場合はデフォルト環境を返す
        }

        // デフォルト環境を追加
        environments.add("development");
        environments.add("staging");
        environments.add("production");

        return Array.from(environments).sort();
    }

    /**
     * 環境変数の検証
     */
    validateEnvironment(
        variables: EnvironmentVariables,
        requiredVars: string[]
    ): { valid: boolean; missing: string[] } {
        const missing = requiredVars.filter((varName) => !variables[varName]);

        return {
            valid: missing.length === 0,
            missing,
        };
    }

    /**
     * ファイル存在確認
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 環境変数ファイル解析
     */
    private async parseEnvFile(filePath: string): Promise<EnvironmentVariables> {
        const content = await fs.readFile(filePath, "utf-8");
        const variables: EnvironmentVariables = {};

        for (const line of content.split("\n")) {
            const trimmedLine = line.trim();

            // コメント行や空行をスキップ
            if (!trimmedLine || trimmedLine.startsWith("#")) {
                continue;
            }

            const [key, ...valueParts] = trimmedLine.split("=");

            if (key && valueParts.length > 0) {
                const value = valueParts
                    .join("=")
                    .trim()
                    .replace(/^["']|["']$/g, ""); // クォート除去

                variables[key.trim()] = value;
            }
        }

        return variables;
    }

    /**
     * 値のエスケープ
     */
    private escapeValue(value: string): string {
        // スペースや特殊文字が含まれる場合はクォートで囲む
        if (/[\s"'$`\\]/.test(value)) {
            return `"${value.replace(/["\\]/g, "\\$&")}"`;
        }
        return value;
    }
}

// EOF
