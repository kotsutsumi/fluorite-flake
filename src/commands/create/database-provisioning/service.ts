/**
 * データベースプロビジョニングサービス
 */

import { spinner } from "@clack/prompts";
import type {
    DatabaseCredentials,
    DatabaseProvisioningConfig,
    DatabaseProvisioningError,
    ErrorRecoveryResult,
    ProvisioningContext,
    ProvisioningResult,
    RetryOptions,
    SupabaseProvisioningOptions,
    TursoProvisioningOptions,
    ValidationResult,
} from "./types.js";

/**
 * データベースプロビジョニングサービス
 */
export class DatabaseProvisioningService {
    /**
     * データベースをプロビジョニングする
     * @param config プロビジョニング設定
     * @returns プロビジョニング結果
     */
    async provision(
        config: DatabaseProvisioningConfig
    ): Promise<ProvisioningResult> {
        if (config.options.skipProvisioning) {
            return {
                success: true,
                databases: [],
            };
        }

        const s = spinner();
        s.start("データベースプロビジョニングを開始しています...");

        try {
            const credentials =
                config.provider === "turso"
                    ? await this.provisionTurso(config)
                    : await this.provisionSupabase(config);

            s.stop("データベースプロビジョニングが完了しました");

            return {
                success: true,
                credentials,
                databases: this.generateDatabaseList(config, credentials),
            };
        } catch (error) {
            s.stop("データベースプロビジョニングに失敗しました");

            const provisioningError = error as DatabaseProvisioningError;
            const context: ProvisioningContext = {
                projectName: config.naming.prod,
                config,
            };

            // エラー回復を試行
            const recovery = await this.handleProvisioningError(
                provisioningError,
                context
            );
            if (recovery.recovered) {
                return await this.provision(config); // リトライ
            }

            return {
                success: false,
                error:
                    provisioningError.message ||
                    "データベースプロビジョニングに失敗しました",
            };
        }
    }

    /**
     * 認証情報を検証する
     * @param credentials 認証情報
     * @returns 検証結果
     */
    async validateCredentials(
        credentials: DatabaseCredentials
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const env of ["dev", "staging", "prod"] as const) {
            const url = credentials.urls[env];
            const token = credentials.tokens[env];

            if (!url) {
                errors.push(`${env}環境のデータベースURLが設定されていません`);
            }
            if (!token) {
                errors.push(`${env}環境の認証トークンが設定されていません`);
            }

            // URL形式の検証
            if (url && !this.isValidDatabaseUrl(url)) {
                errors.push(
                    `${env}環境のデータベースURL形式が無効です: ${url}`
                );
            }

            // トークン長の検証
            if (token && token.length < 10) {
                warnings.push(
                    `${env}環境の認証トークンが短すぎる可能性があります`
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Tursoデータベースをプロビジョニングする
     * @param config プロビジョニング設定
     * @returns 認証情報
     */
    private async provisionTurso(
        config: DatabaseProvisioningConfig
    ): Promise<DatabaseCredentials> {
        const { provisionTursoDatabases } = await import(
            "../../../utils/turso-cli/provisioning.js"
        );

        const options: TursoProvisioningOptions = {
            projectName: config.naming.prod,
            environments: ["dev", "staging", "prod"],
            preserveExisting: config.options.preserveData,
        };

        const result = await provisionTursoDatabases(options);
        return result.credentials;
    }

    /**
     * Supabaseプロジェクトをプロビジョニングする
     * @param config プロビジョニング設定
     * @returns 認証情報
     */
    private async provisionSupabase(
        config: DatabaseProvisioningConfig
    ): Promise<DatabaseCredentials> {
        const { provisionSupabaseProjects } = await import(
            "../../../utils/supabase-cli/provisioning.js"
        );

        const options: SupabaseProvisioningOptions = {
            projectName: config.naming.prod,
            environments: ["dev", "staging", "prod"],
        };

        const result = await provisionSupabaseProjects(options);
        return result.credentials;
    }

    /**
     * データベース一覧を生成する
     * @param config プロビジョニング設定
     * @param credentials 認証情報
     * @returns データベース一覧
     */
    private generateDatabaseList(
        config: DatabaseProvisioningConfig,
        credentials: DatabaseCredentials
    ) {
        return (["dev", "staging", "prod"] as const).map((env) => ({
            environment: env,
            name: config.naming[env],
            url: credentials.urls[env],
            status: "created" as const,
        }));
    }

    /**
     * データベースURL形式を検証する
     * @param url データベースURL
     * @returns 有効かどうか
     */
    private isValidDatabaseUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            const validProtocols = [
                "libsql:",
                "postgresql:",
                "postgres:",
                "file:",
            ];
            return validProtocols.some(
                (protocol) => parsedUrl.protocol === protocol
            );
        } catch {
            return false;
        }
    }

    /**
     * プロビジョニングエラーをハンドリングする
     * @param error エラー
     * @param context コンテキスト
     * @returns エラー回復結果
     */
    private async handleProvisioningError(
        error: DatabaseProvisioningError,
        context: ProvisioningContext
    ): Promise<ErrorRecoveryResult> {
        switch (error.type) {
            case "AUTHENTICATION_FAILED":
                return await this.handleAuthError(error, context);
            case "QUOTA_EXCEEDED":
                return await this.handleQuotaError(error, context);
            case "NETWORK_ERROR":
                return await this.handleNetworkError(error, context);
            case "NAMING_CONFLICT":
                return await this.handleNamingConflict(error, context);
            default:
                return await this.handleUnknownError(error, context);
        }
    }

    /**
     * 認証エラーをハンドリングする
     * @param error エラー
     * @param context コンテキスト
     * @returns エラー回復結果
     */
    private async handleAuthError(
        _error: DatabaseProvisioningError,
        context: ProvisioningContext
    ): Promise<ErrorRecoveryResult> {
        console.error(
            `認証エラー: ${context.config.provider} CLI に認証されていません`
        );
        console.log("以下のコマンドで認証を完了してください:");

        if (context.config.provider === "turso") {
            console.log("turso auth login");
        } else {
            console.log("supabase login");
        }

        return {
            recovered: false,
            action: "authentication_guide_displayed",
            message: "認証を完了してから再実行してください",
        };
    }

    /**
     * クォータ制限エラーをハンドリングする
     * @param error エラー
     * @param context コンテキスト
     * @returns エラー回復結果
     */
    private async handleQuotaError(
        _error: DatabaseProvisioningError,
        _context: ProvisioningContext
    ): Promise<ErrorRecoveryResult> {
        console.error("クォータ制限に達しました");
        console.log(
            "既存のデータベースを削除するか、プランをアップグレードしてください"
        );

        return {
            recovered: false,
            action: "quota_guidance_displayed",
            message: "クォータ制限のため処理を継続できません",
        };
    }

    /**
     * ネットワークエラーをハンドリングする
     * @param error エラー
     * @param context コンテキスト
     * @returns エラー回復結果
     */
    private async handleNetworkError(
        _error: DatabaseProvisioningError,
        context: ProvisioningContext
    ): Promise<ErrorRecoveryResult> {
        console.warn(
            "ネットワークエラーが発生しました。リトライを実行します..."
        );

        const retryOptions: RetryOptions = {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 5000,
            backoffMultiplier: 2,
        };

        try {
            await this.executeWithRetry(
                () => this.provision(context.config),
                retryOptions
            );

            return {
                recovered: true,
                action: "network_retry_successful",
                message: "リトライにより回復しました",
            };
        } catch (retryError) {
            return {
                recovered: false,
                action: "network_retry_failed",
                message: "リトライでも回復できませんでした",
            };
        }
    }

    /**
     * 命名競合エラーをハンドリングする
     * @param error エラー
     * @param context コンテキスト
     * @returns エラー回復結果
     */
    private async handleNamingConflict(
        _error: DatabaseProvisioningError,
        _context: ProvisioningContext
    ): Promise<ErrorRecoveryResult> {
        console.error("データベース名が競合しています");
        console.log(
            "既存利用モードを選択するか、異なるプロジェクト名を使用してください"
        );

        return {
            recovered: false,
            action: "naming_conflict_guidance_displayed",
            message: "命名競合のため処理を継続できません",
        };
    }

    /**
     * 未知のエラーをハンドリングする
     * @param error エラー
     * @param context コンテキスト
     * @returns エラー回復結果
     */
    private async handleUnknownError(
        error: DatabaseProvisioningError,
        _context: ProvisioningContext
    ): Promise<ErrorRecoveryResult> {
        console.error(`未知のエラーが発生しました: ${error.message}`);
        console.log("詳細なエラー情報:", error);

        return {
            recovered: false,
            action: "unknown_error_logged",
            message: "予期しないエラーが発生しました",
        };
    }

    /**
     * リトライ付きで操作を実行する
     * @param operation 実行する操作
     * @param options リトライオプション
     * @returns 操作結果
     */
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const {
            maxAttempts = 3,
            initialDelay = 1000,
            maxDelay = 5000,
            backoffMultiplier = 2,
        } = options;

        let lastError: Error;
        let delay = initialDelay;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxAttempts) {
                    throw lastError;
                }

                console.log(
                    `試行 ${attempt}/${maxAttempts} が失敗しました。${delay}ms後にリトライします...`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));

                delay = Math.min(delay * backoffMultiplier, maxDelay);
            }
        }

        throw lastError!;
    }
}

// EOF
