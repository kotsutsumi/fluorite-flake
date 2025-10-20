# Web アプリケーション

Next.js (App Router) で実装されたメインフロントエンドアプリケーションです。Better Auth による認証を統合し、バックエンド API と連携します。開発環境では `http://localhost:3000` で起動します。

## 📦 技術スタック

- **フレームワーク**: Next.js 15 (App Router) + React 19
- **スタイリング**: Tailwind CSS 4
- **認証**: Better Auth
- **UI コンポーネント**: `@repo/ui` (shadcn/ui ベース)
- **テスト**: Vitest + React Testing Library, Playwright (E2E)
- **型チェック**: TypeScript 5.9

## 🚀 セットアップと開発

### 前提条件

- Node.js 22 以上
- pnpm 10.18.3 以上
- バックエンド API が起動していること（`http://localhost:3001`）

### ローカル開発の開始

```bash
# リポジトリルートから実行
pnpm install

# 環境変数の初期化
pnpm env:init

# Web アプリのみ起動
pnpm --filter web dev

# または全アプリを起動
pnpm dev
```

### 開発サーバー

```bash
pnpm --filter web dev
```

http://localhost:3000 でアクセスできます。

## 🌐 環境変数

`.env.local` に以下の変数を設定してください：

| 変数名 | 説明 | 例 |
| --- | --- | --- |
| `NODE_ENV` | 実行環境 | `development` |
| `NEXT_PUBLIC_ENV` | アプリ環境識別子 | `local` |
| `NEXT_PUBLIC_APP_URL` | アプリの公開 URL | `http://localhost:3000` |
| `BETTER_AUTH_URL` | Better Auth のベース URL | `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Better Auth のシークレットキー | `dev-secret-change-me` |
| `AUTH_REQUIRE_ADMIN_APPROVAL` | 管理者承認フローの有効化 | `true` または `false` |
| `NEXT_PUBLIC_API_URL` | バックエンド API の URL | `http://localhost:3001` |

### 環境変数の生成

```bash
# ルートから実行
pnpm env:init

# シークレットキーの生成
pnpm end:gen:secret
```

## 🏗️ プロジェクト構造

```
apps/web/
├── app/                  # Next.js App Router ページ
│   ├── (auth)/          # 認証関連ページ
│   ├── page.tsx         # トップページ
│   └── layout.tsx       # ルートレイアウト
├── components/          # アプリ固有のコンポーネント
├── lib/                 # ユーティリティ・設定
├── public/              # 静的ファイル
├── tests/               # テストファイル
│   ├── unit/           # ユニットテスト
│   └── e2e/            # E2E テスト
├── .env.local.example  # 環境変数テンプレート
├── next.config.ts      # Next.js 設定
├── tailwind.config.ts  # Tailwind CSS 設定
├── vitest.config.ts    # Vitest 設定
└── playwright.config.ts # Playwright 設定
```

## 🧪 テスト

### ユニットテスト

```bash
# テストを実行
pnpm --filter web test

# ウォッチモードで実行
pnpm --filter web test:watch

# カバレッジ付きで実行
pnpm --filter web test:unit --coverage

# UI モードで実行
pnpm --filter web test:ui
```

### E2E テスト

```bash
# E2E テストを実行
pnpm --filter web test:e2e

# ヘッドレスモードで実行
pnpm --filter web test:e2e:headed

# UI モードで実行
pnpm --filter web test:e2e:ui

# デバッグモードで実行
pnpm --filter web test:e2e:debug
```

### すべてのテストを実行

```bash
pnpm --filter web test:all
```

## 🔐 認証フロー

Better Auth を使用した認証フローを実装しています：

### ログインフロー

1. ユーザーがログインページ（`/login`）にアクセス
2. メール + パスワードで認証
3. Better Auth クライアント (`signIn.email`) が 同一オリジンの `/api/auth/sign-in/email` にリクエスト
4. 認証成功後、Better Auth がセッション Cookie を設定し、トップページ (`/`) にリダイレクト

### セッション管理

- セッションは Better Auth によって管理されます
- クライアント側で `useSession` フックを使用してセッション情報を取得
- ミドルウェアで保護されたルートを設定可能

### 設定

認証設定は `lib/auth.ts` で管理されています。

## 🎨 UI コンポーネント

共有 UI コンポーネントは `@repo/ui` パッケージから利用できます：

```tsx
import { Button, Card, Input } from "@repo/ui";

export function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text" />
      <Button>Submit</Button>
    </Card>
  );
}
```

詳細は [packages/ui/README.md](../../packages/ui/README.md) を参照してください。

## 🚢 ビルドとデプロイ

### ローカルビルド

```bash
# プロダクションビルド
pnpm --filter web build

# ビルド成果物を起動
pnpm --filter web start
```

### Vercel デプロイ

#### 1. Vercel プロジェクトへのリンク

```bash
cd apps/web
vercel link --repo
```

#### 2. 環境変数の設定

Vercel ダッシュボードで以下の環境変数を設定するか、`pnpm env:push` で一括アップロード：

```bash
# 全環境にプッシュ
pnpm env:push

# 特定環境にプッシュ
pnpm env:push:preview
pnpm env:push:staging     # Pro 以上
pnpm env:push:production
```

#### 3. デプロイ

```bash
# Preview デプロイ
git push origin feature-branch

# Production デプロイ
git push origin main
```

Vercel が自動的にビルド・デプロイを実行します。

## 🛠️ 主要コマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm --filter web dev` | 開発サーバーを起動 |
| `pnpm --filter web build` | プロダクションビルド |
| `pnpm --filter web start` | ビルド成果物を起動 |
| `pnpm --filter web lint` | Lint チェック |
| `pnpm --filter web check-types` | 型チェック |
| `pnpm --filter web test` | ユニットテストを実行 |
| `pnpm --filter web test:e2e` | E2E テストを実行 |
| `pnpm --filter web test:all` | すべてのテストを実行 |

## 🚨 トラブルシューティング

### ポート衝突

**症状**: `Address already in use: 3000` エラー

**解決方法**:
```bash
# ポートを解放
lsof -ti:3000 | xargs kill

# または pnpm dev 実行時に自動解放
pnpm dev
```

### 認証エラー

**症状**: ログインが失敗する

**解決方法**:
1. `BETTER_AUTH_SECRET` が設定されているか確認
2. `NEXT_PUBLIC_API_URL` がバックエンド URL と一致するか確認
3. バックエンド API（`http://localhost:3001`）が起動しているか確認

### 環境変数が反映されない

**症状**: 設定した環境変数が反映されない

**解決方法**:
1. `.env.local` が存在するか確認
2. 開発サーバーを再起動（Next.js は起動時に環境変数を読み込みます）
3. `pnpm env:init` で `.env.local` を再生成

### ビルドエラー

**症状**: `pnpm build` が失敗する

**解決方法**:
```bash
# 依存関係を再インストール
rm -rf node_modules .next
pnpm install

# 型チェックを実行
pnpm --filter web check-types

# Lint エラーを修正
pnpm --filter web format
```

## 📚 関連ドキュメント

- [Next.js App Router ドキュメント](https://nextjs.org/docs/app)
- [Better Auth ドキュメント](https://www.better-auth.com/docs)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
- [プロジェクトルート README](../../README.md)
- [Backend API ドキュメント](../backend/README.md)
