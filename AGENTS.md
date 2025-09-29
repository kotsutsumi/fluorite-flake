# AGENT.md

AI エージェント（Claude Code、GitHub Copilot、その他の AI アシスタント）向けの開発指針とベストプラクティスをまとめています。

## プロジェクト概要

fluorite-flake は、モダンなアプリケーション開発のためのマルチフレームワーク対応 CLI ツールです。Next.js、Expo、Flutter、Tauri など、様々なプラットフォーム向けのプロジェクトテンプレートを提供し、開発者の生産性を最大化することを目的としています。

## 重要な開発指針

### 1. 日本語によるコメント記載

```typescript
// ❌ 避けるべき例
// Process user input

// ✅ 推奨される例
// ユーザー入力を検証し、適切な形式に変換する
// - 空白文字をトリミング
// - 特殊文字をエスケープ
// - バリデーションルールを適用
```

**理由**: 開発チームの理解を深め、保守性を向上させるため

### 2. コード修正時のテスト同時更新

```bash
# ❌ 絶対に避けるべきフロー
1. src/commands/dashboard.ts を修正
2. コミット & プッシュ

# ✅ 必須のフロー
1. src/commands/dashboard.ts を修正
2. test/unit/commands/dashboard.test.ts を更新
3. pnpm test を実行して全テストがパスすることを確認
4. コミット & プッシュ
```

**重要**: コードとテストは常にペアで更新することが必須です。

### 3. 1ファイル1定義の原則（厳守）

**基本方針**: 各モジュールは1つの主要な定義（関数、クラス、定数など）のみをエクスポートし、単一責任原則を徹底する。コードベースの保守性、テスト可能性、再利用性を最大化するための重要な設計原則です。

#### 3.1 基本原則

- **1ファイルにつき1つの主要な責任**を持つ
- **関連するヘルパー関数や型**は許可されるが、メインの定義に直接関連するもののみ
- **大きなファイル**（>200行または>10エクスポート）は必ず分割する
- **型定義とロジック**は分離する
- **テスト可能性**を考慮した分割を行う

#### 3.2 基本的な分割パターン

```typescript
// ❌ 避けるべき構造（複数の責任）
// src/utils/helpers.ts
export function getPackageVersion() { ... }
export function getPackageVersions() { ... }
export function validateEmail() { ... }
export function parseUrl() { ... }
export interface ApiResponse { ... }
export interface UserData { ... }

// ✅ 推奨される構造（機能別分割）
// src/utils/package-version/getPackageVersion.ts
export function getPackageVersion() { ... }

// src/utils/package-version/getPackageVersions.ts
export function getPackageVersions() { ... }

// src/utils/validation/validateEmail.ts
export function validateEmail() { ... }

// src/utils/parsing/parseUrl.ts
export function parseUrl() { ... }

// src/types/api-types.ts
export interface ApiResponse { ... }

// src/types/user-types.ts
export interface UserData { ... }

// src/utils/package-version/index.ts
export { getPackageVersion } from './getPackageVersion.js';
export { getPackageVersions } from './getPackageVersions.js';
```

#### 3.3 実際の分割例（TUIコンポーネント）

```typescript
// ❌ 以前の構造 (src/tui/components/base-widget.ts)
// 26+ exports in single file

// ✅ 現在の構造（機能別分割後）
src/tui/components/widgets/
├── config-types.ts      # 6 configuration interfaces
├── table-widgets.ts     # 2 table-related functions
├── chart-widgets.ts     # 8 chart/graph functions
├── display-widgets.ts   # 5 display widget functions
├── themes.ts           # 1 themes constant
├── layouts.ts          # 1 layouts constant
└── index.ts            # unified re-exports
```

#### 3.4 許可される例外

**関連性の高い定義のグループ化**:

- 密接に関連する型とその実装（例：クラスとそのオプション型）
- メイン関数とそのプライベートヘルパー関数
- 定数群（テーマ、設定値など、論理的にグループ化されるもの）
- 型定義ファイル（複数の関連する型定義は許可）

**例**:

```typescript
// ✅ 許可される例 - 密接に関連する型と実装
// src/utils/logger.ts
export interface LoggerOptions {
    prefix?: string;
    timestamp?: boolean;
}

export const logger = {
    info: (message: string, options?: LoggerOptions) => { ... },
    error: (message: string, options?: LoggerOptions) => { ... }
};
```

#### 3.5 分割の判断基準

**必ず分割すべきケース**:

- **ファイルサイズ**: >200行
- **エクスポート数**: >10個
- **機能的関連性**: 異なるドメインの機能が混在
- **単体テストの複雑さ**: 1ファイルで複数の異なる機能をテストする必要がある
- **インポート頻度**: ファイルの一部分だけが頻繁に使用される

**優先順位**:

1. **高優先度**: utils/, types/, generators/ ディレクトリの大きなファイル
2. **中優先度**: commands/, services/ ディレクトリの複数責任ファイル
3. **低優先度**: index.ts, config/ ディレクトリの設定ファイル

#### 3.6 適用対象ディレクトリ

**厳守が必要なディレクトリ**:

- `src/commands/` - CLIコマンド実装
- `src/config/` - 設定ファイル群
- `src/utils/` - ユーティリティ関数
- `src/generators/` - プロジェクトジェネレーター
- `src/services/` - サービスアダプター
- `src/ipc/` - プロセス間通信
- `src/tauri/` - Tauri統合
- `src/types/` - 型定義
- `src/tui/` - ターミナルUI

**例外許可**:

- `index.ts`ファイル（再エクスポート専用）
- 設定ファイル（論理的にグループ化された設定値）

#### 3.7 リファクタリング手順

1. **分析フェーズ**:

   ```bash
   # 複数エクスポートを特定
   find src -name "*.ts" -exec sh -c 'echo "{}:" $(grep -c "^export " "$1")' _ {} \; | grep -v ":1$" | grep -v ":0$"
   ```

2. **設計フェーズ**:
   - 機能別にグループ分けを設計
   - ディレクトリ構造を計画
   - 依存関係を分析

3. **実装フェーズ**:
   - 各定義を個別ファイルに分離
   - index.tsで統合エクスポート作成
   - 型定義を適切に分離

4. **更新フェーズ**:
   - インポート文を更新
   - テストファイルを修正
   - ドキュメントを更新

5. **検証フェーズ**:
   ```bash
   pnpm test      # 全テストを実行
   pnpm lint      # リンターチェック
   pnpm build     # ビルド確認
   ```

### 4. 一時ファイルの管理

```bash
# ❌ 避けるべき配置
/run-e2e-debug.sh
/temp-analysis.md
/test-results.txt

# ✅ 正しい配置
/temp/scripts/run-e2e-debug.sh
/temp/docs/temp-analysis.md
/temp/results/test-results.txt
```

## ディレクトリ構造と役割

```
src/
├── cli.ts                 # CLI エントリポイント
├── commands/              # CLI コマンド実装（1ファイル1定義厳守）
│   ├── dashboard/        # ダッシュボード関連
│   ├── generate/         # プロジェクト生成関連
│   └── multi-dashboard/  # マルチサービス監視
├── generators/           # フレームワーク別ジェネレーター
│   ├── nextjs/          # Next.js プロジェクト生成
│   ├── expo/            # Expo プロジェクト生成
│   ├── flutter/         # Flutter プロジェクト生成
│   └── tauri/           # Tauri プロジェクト生成
├── services/            # サービス統合
│   └── adapters/        # 各種サービスアダプター
├── templates/           # プロジェクトテンプレート
├── utils/              # ユーティリティ関数
└── config/             # 設定ファイル

test/
├── unit/               # ユニットテスト
├── functional/         # 機能テスト
└── scenario/          # シナリオテスト

temp/                   # 一時ファイル用（.gitignore済み）
├── scripts/           # 一時的なスクリプト
├── docs/              # 一時的なドキュメント
└── results/           # テスト結果など
```

## 開発ワークフロー

### 新機能追加時のフロー

1. **設計ドキュメント作成**: `docs/` に機能の設計を記載
2. **テスト作成**: TDD アプローチでテストから実装
3. **実装**: 1ファイル1定義の原則に従って実装
4. **テスト実行**: `pnpm test` で全テストをパス
5. **ドキュメント更新**: README.md や関連ドキュメントを更新

### コードレビューチェックリスト

- [ ] 日本語コメントが適切に記載されているか
- [ ] 対応するテストが更新されているか
- [ ] 1ファイル1定義の原則が守られているか
- [ ] 一時ファイルが適切な場所に配置されているか
- [ ] `pnpm test` が成功するか
- [ ] `pnpm lint` と `pnpm format` が実行されているか

## AI エージェント向け具体的指示

### コード生成時の注意点

1. **型安全性を最優先**: TypeScript の strict モードに準拠
2. **エラーハンドリング**: すべてのエラーケースを考慮
3. **非同期処理**: async/await を適切に使用
4. **依存関係**: 新しい依存を追加する前に既存のものを確認

### テスト作成時の注意点

1. **カバレッジ**: 主要なパスとエッジケースを網羅
2. **モック**: 外部依存は適切にモック化
3. **アサーション**: 明確で意味のあるアサーション
4. **テストデータ**: 現実的なテストデータを使用

### リファクタリング時の注意点

1. **段階的改善**: 大規模な変更は小さなステップに分割
2. **後方互換性**: 既存の API を壊さない
3. **テスト先行**: リファクタリング前にテストを強化
4. **ドキュメント**: 変更の理由と影響を記録

## よくある問題と解決策

### 問題: テストが失敗する

```bash
# 解決手順
1. pnpm test:unit    # ユニットテストのみ実行
2. pnpm test:functional  # 機能テストのみ実行
3. エラーメッセージを確認し、該当するテストファイルを更新
4. 再度 pnpm test を実行
```

### 問題: リンターエラー

```bash
# 解決手順
1. pnpm format    # 自動フォーマット
2. pnpm lint --fix  # 自動修正可能なエラーを修正
3. 手動で残りのエラーを修正
```

### 問題: ビルドエラー

```bash
# 解決手順
1. pnpm clean     # ビルドキャッシュをクリア
2. pnpm install   # 依存関係を再インストール
3. pnpm build     # 再ビルド
```

## 参考リソース

- [プロジェクト概要](./docs/00_概要.md)
- [CLIアーキテクチャ](./docs/02_CLIアーキテクチャ.md)
- [テスト戦略](./docs/05_テスト戦略.md)
- [CLAUDE.md](./CLAUDE.md) - Claude Code 向けの詳細指針

## 連絡先

質問や提案がある場合は、GitHub Issues でお知らせください。
