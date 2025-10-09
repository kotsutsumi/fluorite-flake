#!/usr/bin/env bash
# Vercel環境対応マルチデータベースセットアップスクリプト
# Turso / Supabase両方のデータベースタイプに対応
set -euo pipefail

# Vercel環境での詳細ログ出力
if [[ -n "${VERCEL:-}" ]]; then
    set -x
fi

# ローカル環境でのデータベースセットアップをスキップ
if [[ ${NODE_ENV:-} == "local" ]]; then
    echo "Skipping database setup for NODE_ENV=local"
    exit 0
fi

# スクリプトディレクトリとプロジェクトルートを設定
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# 元のNODE_ENVを保持
ORIGINAL_NODE_ENV="${ORIGINAL_NODE_ENV:-${NODE_ENV:-}}"
export NODE_ENV="${ORIGINAL_NODE_ENV:-}"

/**
 * 環境を解決する（Vercel環境変数とGitブランチを考慮）
 */
resolve_env() {
    # 優先順位: NEXT_PUBLIC_ENV > Gitブランチ検出 > VERCEL_ENV > NODE_ENV > デフォルト
    if [[ -n "${NEXT_PUBLIC_ENV:-}" ]]; then
        local candidate="${NEXT_PUBLIC_ENV}"
    elif [[ -n "${VERCEL_GIT_COMMIT_REF:-}" ]]; then
        # Gitブランチベースの環境マッピング
        case "${VERCEL_GIT_COMMIT_REF}" in
            main)
                local candidate="production"
                ;;
            staging)
                local candidate="staging"
                ;;
            develop)
                local candidate="development"
                ;;
            *)
                local candidate="development"
                ;;
        esac
    elif [[ -n "${VERCEL_ENV:-}" ]]; then
        # Vercel環境変数からのフォールバック
        case "${VERCEL_ENV}" in
            production)
                local candidate="production"
                ;;
            preview|development)
                local candidate="development"
                ;;
            *)
                local candidate="development"
                ;;
        esac
    else
        local candidate="${ORIGINAL_NODE_ENV:-development}"
    fi

    # 有効な環境タイプに正規化
    case "${candidate}" in
        production|staging|development)
            echo "${candidate}"
            ;;
        *)
            echo "development"
            ;;
    esac
}

# 環境を解決
DB_ENV="$(resolve_env)"

# 環境変数サフィックスを決定
ENV_SUFFIX=""
case "${DB_ENV}" in
    production)
        ENV_SUFFIX="PROD"
        ;;
    staging)
        ENV_SUFFIX="STG"
        ;;
    development)
        ENV_SUFFIX="DEV"
        ;;
    *)
        ENV_SUFFIX=""
        ;;
esac

echo "Resolved environment: ${DB_ENV}"
echo "Preparing database for ${DB_ENV} environment"
echo "Using ENV_SUFFIX: ${ENV_SUFFIX}"

# 環境変数プロモーション（サフィックス付きから基本名にコピー）
promote_env_variables() {
    local suffix=$1

    # 共通環境変数のプロモーション
    [[ -n "${NODE_ENV_${suffix}:-}" ]] && export NODE_ENV="${NODE_ENV_${suffix}}"
    [[ -n "${NEXT_PUBLIC_ENV_${suffix}:-}" ]] && export NEXT_PUBLIC_ENV="${NEXT_PUBLIC_ENV_${suffix}}"
    [[ -n "${NEXT_PUBLIC_APP_URL_${suffix}:-}" ]] && export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL_${suffix}}"
    [[ -n "${BETTER_AUTH_URL_${suffix}:-}" ]] && export BETTER_AUTH_URL="${BETTER_AUTH_URL_${suffix}}"
    [[ -n "${BETTER_AUTH_SECRET_${suffix}:-}" ]] && export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET_${suffix}}"
    [[ -n "${DATABASE_URL_${suffix}:-}" ]] && export DATABASE_URL="${DATABASE_URL_${suffix}}"
    [[ -n "${BLOB_READ_WRITE_TOKEN_${suffix}:-}" ]] && export BLOB_READ_WRITE_TOKEN="${BLOB_READ_WRITE_TOKEN_${suffix}}"
    [[ -n "${BLOB_STORE_ID_${suffix}:-}" ]] && export BLOB_STORE_ID="${BLOB_STORE_ID_${suffix}}"

    # Turso固有の環境変数
    [[ -n "${TURSO_DATABASE_URL_${suffix}:-}" ]] && export TURSO_DATABASE_URL="${TURSO_DATABASE_URL_${suffix}}"
    [[ -n "${TURSO_AUTH_TOKEN_${suffix}:-}" ]] && export TURSO_AUTH_TOKEN="${TURSO_AUTH_TOKEN_${suffix}}"

    # Supabase固有の環境変数
    [[ -n "${NEXT_PUBLIC_SUPABASE_URL_${suffix}:-}" ]] && export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL_${suffix}}"
    [[ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY_${suffix}:-}" ]] && export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY_${suffix}}"
    [[ -n "${SUPABASE_SERVICE_ROLE_KEY_${suffix}:-}" ]] && export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY_${suffix}}"
}

# 環境変数のプロモーション実行
if [[ -n "${ENV_SUFFIX}" ]]; then
    promote_env_variables "${ENV_SUFFIX}"
    echo "Environment variables promoted from *_${ENV_SUFFIX} to base names"
fi

# データベースタイプを検出
detect_database_type() {
    if [[ -n "${TURSO_DATABASE_URL:-}" ]] || [[ -n "${TURSO_AUTH_TOKEN:-}" ]]; then
        echo "turso"
    elif [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]] || [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
        echo "supabase"
    else
        # デフォルトはTurso
        echo "turso"
    fi
}

DB_TYPE="$(detect_database_type)"
echo "Detected database type: ${DB_TYPE}"

# DATABASE_URLが設定されていない場合のフォールバック処理
setup_fallback_env() {
    local fallback_env_file

    case "${DB_ENV}" in
        production)
            fallback_env_file=".env.prod"
            ;;
        staging)
            fallback_env_file=".env.staging"
            ;;
        development)
            fallback_env_file=".env.development"
            ;;
        *)
            fallback_env_file=".env.development"
            ;;
    esac

    if [[ -z "${DATABASE_URL:-}" ]]; then
        if [[ -f "${fallback_env_file}" ]]; then
            echo "DATABASE_URL not set; sourcing ${fallback_env_file} as fallback"
            set -o allexport
            source "${fallback_env_file}"
            set +o allexport
        else
            echo "ERROR: DATABASE_URL is not set. Provide *_${ENV_SUFFIX} environment variables or ${fallback_env_file}."
            exit 1
        fi
    else
        echo "Using DATABASE_URL from environment"
    fi
}

# フォールバック環境設定
setup_fallback_env

# NEXT_PUBLIC_ENVの設定
if [[ -z "${NEXT_PUBLIC_ENV:-}" ]]; then
    export NEXT_PUBLIC_ENV="${DB_ENV}"
fi

echo "Final configuration:"
echo "  Database type: ${DB_TYPE}"
echo "  Environment: ${DB_ENV}"
echo "  DATABASE_URL: ${DATABASE_URL:0:50}..." # 最初の50文字のみ表示（セキュリティ）

# データベースセットアップの実行
setup_database() {
    if [[ "${DB_ENV}" == "development" ]] && [[ -z "${VERCEL:-}" ]]; then
        # ローカル開発環境での完全リセット
        echo "Running complete database reset for local development"
        echo "Step 1: Force reset database schema..."
        pnpm db:push:force
        echo "Step 2: Generate Prisma client..."
        pnpm db:generate
        echo "Step 3: Seed initial data..."
        pnpm db:seed
        echo "Development database reset and seeded successfully"
    elif [[ "${DB_ENV}" == "development" ]] || [[ "${DB_ENV}" == "staging" ]] || [[ "${DB_ENV}" == "production" ]]; then
        echo "Handling ${DB_ENV} environment database setup"

        # 段階的なデータベースセットアップ
        echo "Step 1: Push database schema to ensure tables exist..."
        pnpm db:push

        echo "Step 2: Generate/update Prisma client..."
        pnpm db:generate

        # データベース接続テスト
        echo "Step 3: Testing database connection..."
        set +e
        CONNECTION_TEST=$(pnpm exec tsx -e "
            import { PrismaClient } from '@prisma/client';
            const prisma = new PrismaClient();
            prisma.\$connect()
                .then(() => {
                    console.log('connection_success');
                    return prisma.\$disconnect();
                })
                .then(() => process.exit(0))
                .catch((error) => {
                    console.log('connection_failed');
                    console.error(error.message);
                    process.exit(1);
                });
        " 2>/dev/null)
        set -e

        if [[ "${CONNECTION_TEST}" == *"connection_success"* ]]; then
            echo "✅ Database connection successful"

            # 初期シードが必要かチェック（Userテーブルが空の場合のみ）
            echo "Step 4: Checking if initial seed is needed..."
            set +e
            USER_COUNT=$(pnpm exec tsx -e "
                import { PrismaClient } from '@prisma/client';
                const prisma = new PrismaClient();
                prisma.user.count()
                    .then(count => { console.log(count); return prisma.\$disconnect(); })
                    .then(() => process.exit(0))
                    .catch(() => { console.log(0); process.exit(0); });
            " 2>/dev/null)
            set -e

            if [[ "${USER_COUNT}" == "0" ]] || [[ -z "${USER_COUNT}" ]]; then
                echo "No users found, running initial seed..."
                pnpm db:seed
                echo "Initial seed completed"
            else
                echo "Database already has ${USER_COUNT} users, skipping seed"
            fi
        else
            echo "❌ Database connection failed"
            echo "Please check your DATABASE_URL and authentication credentials"
            exit 1
        fi
    else
        echo "Running pnpm db:migrate for ${DB_ENV}"
        pnpm db:migrate
    fi
}

# データベースセットアップ実行
setup_database

echo "Database preparation complete for ${DB_ENV} (${DB_TYPE})"

# Next.jsビルド用の環境変数設定
export NODE_ENV=production

# EOF