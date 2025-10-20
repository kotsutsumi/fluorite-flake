# ドキュメントサイト

Nextra テーマで構築されたプロジェクトドキュメントサイトです。初期セットアップから運用までの詳細なガイド、API リファレンス、アーキテクチャ解説を提供します。開発環境では `http://localhost:3002` で起動します。

## 📦 技術スタック

- **フレームワーク**: Next.js 15 (App Router) + React 19
- **ドキュメント**: Nextra 4 + nextra-theme-docs
- **スタイリング**: Tailwind CSS 4
- **UI コンポーネント**: `@repo/ui` (shadcn/ui ベース)
- **テスト**: Vitest + React Testing Library, Playwright (E2E)
- **型チェック**: TypeScript 5.9

## 🚀 セットアップと開発

### 前提条件

- Node.js 22 以上
- pnpm 10.18.3 以上

### ローカル開発の開始

```bash
# リポジトリルートから実行
pnpm install

# Docs アプリのみ起動
pnpm --filter docs dev

# または全アプリを起動
pnpm dev
```

### 開発サーバー

```bash
pnpm --filter docs dev
```

http://localhost:3002 でアクセスできます。

## 📚 ドキュメント構成

```
apps/docs/app/
├── page.mdx                          # トップページ
├── introduction/
│   └── page.mdx                     # プロジェクト紹介
├── getting-started/
│   ├── page.mdx                     # クイックスタート
│   ├── prerequisites.mdx            # 前提条件
│   ├── local-setup.mdx              # ローカルセットアップ
│   └── production-setup.mdx         # 本番環境セットアップ
├── setup/
│   ├── environment-variables.mdx    # 環境変数管理
│   ├── database-local.mdx           # ローカルDB設定
│   ├── database-cloud.mdx           # Turso Cloud設定
│   ├── vercel-deployment.mdx        # Vercel連携
│   ├── eas-setup.mdx                # EAS設定
│   └── vercel-blob.mdx              # Vercel Blob設定
├── development/
│   ├── commands.mdx                 # コマンドリファレンス
│   ├── testing.mdx                  # テスト戦略
│   ├── linting.mdx                  # Lint・フォーマット
│   └── troubleshooting.mdx          # トラブルシューティング
├── architecture/
│   ├── overview.mdx                 # システムアーキテクチャ
│   ├── backend.mdx                  # Backend設計
│   ├── web.mdx                      # Web設計
│   ├── mobile.mdx                   # Mobile設計
│   ├── database.mdx                 # データベース設計
│   └── authentication.mdx           # 認証フロー
├── deployment/
│   ├── page.mdx                     # デプロイ概要
│   ├── vercel.mdx                   # Vercelデプロイ
│   ├── database-migration.mdx       # DBマイグレーション
│   ├── environment-management.mdx   # 環境管理
│   ├── mobile-release.mdx           # モバイルリリース
│   └── vercel-blob/
│       └── page.mdx                 # Vercel Blob設定
└── guides/
    ├── team-collaboration.mdx       # チーム開発
    ├── database-operations.mdx      # DB操作ガイド
    └── api-usage.mdx                # API使用ガイド
```

## ✏️ ドキュメントの編集

### 新しいページの追加

1. MDX ファイルを作成：

```bash
# 新しいガイドページを作成
mkdir -p apps/docs/app/guides/new-guide
echo "---\ntitle: New Guide\ndescription: Description\n---\n\n# New Guide\n\nContent here." > apps/docs/app/guides/new-guide/page.mdx
```

2. `_meta.json` でナビゲーションに追加：

```json
{
  "new-guide": {
    "title": "New Guide"
  }
}
```

### MDX の基本

Nextra は MDX（Markdown + JSX）をサポートしています：

```mdx
---
title: Page Title
description: Page description for SEO
---

# Page Title

## Markdown Heading

Regular markdown text with **bold** and *italic*.

```bash
# Code blocks with syntax highlighting
pnpm dev
```

## React コンポーネント

import { Button } from "@repo/ui";

<Button>Click me</Button>

## Callouts

> **Note**: This is a note callout

> **Warning**: This is a warning callout
```

### フロントマターの設定

各 MDX ファイルの先頭に YAML フロントマターを追加できます：

```mdx
---
title: "ページタイトル"
description: "ページの説明（SEO用）"
---
```

## 🎨 カスタマイズ

### レイアウトの調整

`app/layout.tsx` でバナー、ナビゲーションバー、フッターをカスタマイズできます：

```tsx
import { RootLayout } from "nextra-theme-docs/layout";

export default function Layout({ children }) {
  return (
    <RootLayout
      banner={<div>お知らせバナー</div>}
      navbar={<CustomNavbar />}
      footer={<CustomFooter />}
    >
      {children}
    </RootLayout>
  );
}
```

### MDX コンポーネントのカスタマイズ

`mdx-components.tsx` で MDX コンポーネントをカスタマイズできます：

```tsx
import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ children }) => <h1 className="custom-h1">{children}</h1>,
    // その他のコンポーネント
  };
}
```

### ナビゲーションの設定

`_meta.json` でナビゲーション構造を制御します：

```json
{
  "index": {
    "title": "Home",
    "type": "page"
  },
  "getting-started": {
    "title": "Getting Started",
    "type": "page"
  },
  "guides": {
    "title": "Guides",
    "type": "menu"
  }
}
```

## 🧪 テスト

### ユニットテスト

```bash
# テストを実行
pnpm --filter docs test

# ウォッチモードで実行
pnpm --filter docs test:watch

# カバレッジ付きで実行
pnpm --filter docs test:unit --coverage

# UI モードで実行
pnpm --filter docs test:ui
```

### E2E テスト

```bash
# E2E テストを実行
pnpm --filter docs test:e2e

# ヘッドレスモードで実行
pnpm --filter docs test:e2e:headed

# UI モードで実行
pnpm --filter docs test:e2e:ui

# デバッグモードで実行
pnpm --filter docs test:e2e:debug
```

## 🚢 ビルドとデプロイ

### ローカルビルド

```bash
# プロダクションビルド
pnpm --filter docs build

# ビルド成果物を起動
pnpm --filter docs start
```

### Vercel デプロイ

#### 1. Vercel プロジェクトへのリンク

```bash
cd apps/docs
vercel link --repo
```

#### 2. デプロイ

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
| `pnpm --filter docs dev` | 開発サーバーを起動 |
| `pnpm --filter docs build` | プロダクションビルド |
| `pnpm --filter docs start` | ビルド成果物を起動 |
| `pnpm --filter docs lint` | Lint チェック |
| `pnpm --filter docs check-types` | 型チェック |
| `pnpm --filter docs test` | ユニットテストを実行 |
| `pnpm --filter docs test:e2e` | E2E テストを実行 |

## 🚨 トラブルシューティング

### ポート衝突

**症状**: `Address already in use: 3002` エラー

**解決方法**:
```bash
# ポートを解放
lsof -ti:3002 | xargs kill

# または pnpm dev 実行時に自動解放
pnpm dev
```

### ビルドエラー

**症状**: MDX ファイルのパースエラー

**解決方法**:
1. MDX の構文が正しいか確認（特にフロントマターの YAML）
2. JSX コンポーネントのインポートが正しいか確認
3. `_meta.json` の JSON 構文が正しいか確認

### ナビゲーションが表示されない

**症状**: サイドバーにページが表示されない

**解決方法**:
1. `_meta.json` にページが登録されているか確認
2. ファイル名が `page.mdx` であることを確認
3. ディレクトリ構造が正しいか確認

## 📚 関連リソース

- [Nextra ドキュメント](https://nextra.site)
- [Next.js ドキュメント](https://nextjs.org/docs)
- [MDX ドキュメント](https://mdxjs.com)
- [プロジェクトルート README](../../README.md)

## 💡 ベストプラクティス

### ドキュメント作成のガイドライン

1. **明確なタイトル**: 各ページに分かりやすいタイトルをつける
2. **ステップバイステップ**: 手順は段階的に記載する
3. **コード例**: 実行可能なコード例を豊富に含める
4. **スクリーンショット**: 必要に応じてビジュアルを追加する
5. **リンク**: 関連ページへのリンクを適切に配置する

### SEO 最適化

- フロントマターに `title` と `description` を必ず設定
- ページ内に適切な見出し階層を使用（H1 → H2 → H3）
- 画像に `alt` テキストを設定

### アクセシビリティ

- セマンティックな HTML を使用
- コントラスト比に配慮した配色
- キーボードナビゲーションに対応
