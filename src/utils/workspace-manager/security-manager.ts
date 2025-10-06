/**
 * セキュリティ管理システム
 */

import path from "node:path";
import type { ExecutionContext, ValidationResult } from "./types.js";

/**
 * セキュリティ管理クラス
 */
export class SecurityManager {
    /**
     * スクリプト実行前のバリデーション
     */
    validateScriptExecution(
        script: string,
        context: ExecutionContext
    ): ValidationResult {
        // 1. 危険なコマンドのブロック
        const dangerousPatterns = [
            /rm\s+-rf/, // 危険な削除コマンド
            /sudo\s+/, // 権限昇格
            />\s*\/dev\/null/, // 出力隠蔽
            /curl.*\|\s*sh/, // リモートスクリプト実行
            /eval\s*\(/, // 動的評価
            /exec\s*\(/, // 動的実行
            /\$\(.*\)/, // コマンド置換
            /`.*`/, // バッククォート実行
            /;\s*rm\s+/, // セミコロンでの連結削除
            /&&\s*rm\s+/, // AND連結での削除
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(script)) {
                return {
                    valid: false,
                    reason: `Dangerous pattern detected: ${pattern.source}`,
                    severity: "critical",
                };
            }
        }

        // 2. パス範囲検証
        if (!this.validatePathScope(script, context)) {
            return {
                valid: false,
                reason: "Script attempts to access outside project scope",
                severity: "high",
            };
        }

        // 3. ネットワークアクセス検証
        const networkValidation = this.validateNetworkAccess(script);
        if (!networkValidation.valid) {
            return networkValidation;
        }

        // 4. 環境変数アクセス検証
        const envValidation = this.validateEnvironmentAccess(script);
        if (!envValidation.valid) {
            return envValidation;
        }

        return { valid: true };
    }

    /**
     * コマンド引数のサニタイゼーション
     */
    sanitizeArguments(args: string[]): string[] {
        return args.map((arg) => {
            // シェルエスケープ文字の除去
            return arg.replace(/[;&|`$(){}[\]\\]/g, "");
        });
    }

    /**
     * 安全なパス構築
     */
    buildSafePath(basePath: string, relativePath: string): string | null {
        try {
            const resolved = path.resolve(basePath, relativePath);

            // パスエスケープ防止
            if (!resolved.startsWith(basePath)) {
                return null;
            }

            return resolved;
        } catch {
            return null;
        }
    }

    /**
     * パスエスケープ防止
     */
    private validatePathScope(
        script: string,
        context: ExecutionContext
    ): boolean {
        const pathPatterns = script.match(/[./\\]+[\w/-]+/g) || [];

        for (const pathPattern of pathPatterns) {
            try {
                const resolvedPath = path.resolve(
                    context.rootPath,
                    pathPattern
                );
                if (!resolvedPath.startsWith(context.rootPath)) {
                    return false; // パスエスケープ検出
                }
            } catch {
                return false; // 無効なパス
            }
        }

        return true;
    }

    /**
     * ネットワークアクセス検証
     */
    private validateNetworkAccess(script: string): ValidationResult {
        const networkPatterns = [
            /curl\s+/, // HTTP requests
            /wget\s+/, // Downloads
            /nc\s+/, // Netcat
            /telnet\s+/, // Telnet
            /ssh\s+/, // SSH connections
            /scp\s+/, // Secure copy
            /rsync\s+.*::/, // Remote rsync
        ];

        for (const pattern of networkPatterns) {
            if (pattern.test(script)) {
                return {
                    valid: false,
                    reason: `Network access detected: ${pattern.source}`,
                    severity: "medium",
                };
            }
        }

        return { valid: true };
    }

    /**
     * 環境変数アクセス検証
     */
    private validateEnvironmentAccess(script: string): ValidationResult {
        const sensitiveEnvPatterns = [
            /\$HOME/, // ホームディレクトリ
            /\$USER/, // ユーザー名
            /\$PASSWORD/, // パスワード
            /\$SECRET/, // シークレット
            /\$API_KEY/, // APIキー
            /\$TOKEN/, // トークン
        ];

        for (const pattern of sensitiveEnvPatterns) {
            if (pattern.test(script)) {
                return {
                    valid: false,
                    reason: `Sensitive environment variable access: ${pattern.source}`,
                    severity: "medium",
                };
            }
        }

        return { valid: true };
    }
}

// EOF
