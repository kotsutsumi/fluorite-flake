#!/bin/bash
set -e

echo "🔧 Vercel環境変数セットアップ開始..."

# 環境変数ファイルの存在確認
if [[ ! -f .env.example ]]; then
    echo "❌ .env.example ファイルが見つかりません"
    exit 1
fi

echo "📋 利用可能な環境変数:"
echo "  - DATABASE_URL (データベース接続文字列)"
echo "  - NEXTAUTH_SECRET (NextAuth.js認証シークレット)"
echo "  - NEXTAUTH_URL (NextAuth.js認証URL)"
echo ""

# 各環境での環境変数設定
echo "🏗️  Development環境の設定..."
if [[ -f .env.development ]]; then
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_]+= ]]; then
            var_name=$(echo "$line" | cut -d'=' -f1)
            echo "  設定中: $var_name"
            echo "$line" | vercel env add --environment development
        fi
    done < .env.development
else
    echo "⚠️  .env.development が見つかりません"
fi

echo "🚀 Production環境の設定..."
if [[ -f .env.production ]]; then
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_]+= ]]; then
            var_name=$(echo "$line" | cut -d'=' -f1)
            echo "  設定中: $var_name"
            echo "$line" | vercel env add --environment production
        fi
    done < .env.production
else
    echo "⚠️  .env.production が見つかりません"
fi

echo "🔍 設定された環境変数の確認..."
vercel env ls

echo "✅ Vercel環境変数セットアップ完了"
echo ""
echo "📝 次のステップ:"
echo "  1. vercel deploy --prod でデプロイを実行"
echo "  2. 環境変数の値を確認・更新"
echo "  3. データベースマイグレーションを実行"
