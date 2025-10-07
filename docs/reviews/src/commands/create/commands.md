# create/commands.ts レビュー報告書

## 概要

`src/commands/create/commands.ts` は `citty` の `defineCommand` を用いて `create` / `new` コマンドを定義し、プロジェクト生成の実行フローを調整する中核となるファイルです。国際化されたメッセージを利用しながら、pnpm 検証やユーザー入力ユーティリティを統合し、大幅にリファクタリングされてより保守性の高い構造になっています。

## 主な処理

### `createCommand`
- メタ情報と引数定義を `getMessages()` の結果から構築
- `--simple` 指定時は monorepo 判定を上書きしてシンプルモードへ切り替え
- monorepo モードであれば `validatePnpm()` を実行し、バージョン不足や未インストールの場合は即終了
- プロジェクト名が未指定のとき `promptForProjectName()` を呼び出し、`@clack/prompts` ベースの UI でプレースホルダー表示・バリデーション・キャンセル処理を一括で担保
- データベース選択のバリデーションとプロンプト表示（テンプレートがデータベース機能を持つ場合）
- `createProjectConfig()` で組み立てた設定を `generateProject()` に渡し、例外時は `process.exit(1)`
- `--force` が無い場合は `confirmDirectoryOverwrite()` で既存ディレクトリを安全に確認

### `newCommand`
- 大幅に拡張され、テンプレート選択システムと統合
- `selectProjectTemplate()` を使用したインタラクティブなプロジェクト選択
- `ADVANCED_TEMPLATES` 定数によるテンプレートフィルタリング機能
- モノレポ設定の優先順位処理（明示指定 > 選択結果 > 既定値）
- ヘルパー関数による機能の分割と可読性向上

## リファクタリングと新機能

### 新しいヘルパー関数
1. **`hasExplicitMonorepoFlag()`**: 明示的なモノレポフラグの検出
2. **`determineDatabaseSelection()`**: データベース選択の決定ロジック
3. **`determineProjectTypeAndTemplate()`**: プロジェクトタイプとテンプレートの決定
4. **`createAndValidateConfig()`**: プロジェクト設定の作成と検証

### 新機能追加
- **データベース選択**: `--database` フラグとインタラクティブプロンプト
- **テンプレート選択システム**: `selectProjectTemplate()` との統合
- **高度なテンプレートフィルタリング**: `ADVANCED_TEMPLATES` による制限
- **改善されたモノレポ処理**: 優先順位に基づく設定決定

## 依存モジュール

- `../../debug.js`: `debugLog()` により CLI デバッグメッセージを出力
- `../../i18n.js`: 引数説明やスピナー文言などローカライズ済みテキストを提供
- `../../utils/pnpm-validator/index.js`: pnpm 環境チェックで使用
- `../../utils/user-input/index.js`: 対話的入力、データベース選択、上書き確認を担う
- `./config.js`: 引数から `ProjectConfig` を生成
- `./generator.js`: 実際のプロジェクト作成ロジック
- `./template-selector/index.js`: インタラクティブなテンプレート選択
- `./validators.js`: データベース関連のバリデーション機能

## 重要な改善点

### 1. コードの構造化
- 複雑なロジックを小さな関数に分割
- 単一責任の原則に従った関数設計
- 型安全性の向上（`CreateAndValidateConfigOptions` 型など）

### 2. エラーハンドリングの強化
- データベース選択のバリデーション
- より詳細なエラーメッセージとユーザーガイダンス
- 一貫した `process.exit()` による確実なプロセス終了

### 3. ユーザーエクスペリエンスの向上
- インタラクティブなテンプレート選択
- データベース機能を持つテンプレートでの自動プロンプト表示
- キャンセル操作への適切な対応

## 留意点

- 複雑化したロジックのため、ユニットテストでの十分なカバレッジが重要
- `process.exit()` を多用する構成のため、テストでのモック化が必要
- 新しいヘルパー関数の個別テストが推奨される
- データベース機能とテンプレート選択の統合により、設定の組み合わせパターンが増加
- CLI 引数の説明文は i18n JSON に依存するため、新規引数追加時は翻訳ファイルも同時更新する