# Next.js プロジェクト生成テストカバレッジレポート

## サマリー

### 調査概要
- **調査期間**: 2025年10月6日
- **調査対象**: Next.js プロジェクト生成フロー（`src/commands/create` 配下）
- **分析方法**: `pnpm test` および `pnpm test:coverage -- --reporter=lcov --reporter=json-summary` の実行結果、ソースコードとテストコードの静的対応付け、機能網羅・異常系・国際化観点でのギャップ評価

### 主要結論
- **現状カバレッジ**: `generator.ts` はステートメント 69.05%（116/168）、`validators.ts` は 43.75%（14/32）、`nextjs-fullstack-admin.ts` は 7.49%（23/307）で関数カバレッジ 0/7。Next.js 固有ロジックは依然として大半が未実行であり、バリデーション層にも未検証分岐が残存。
- **重大なギャップ**: Next.js フルスタックテンプレート生成 (`generateFullStackAdmin`) のユニットテストが存在せず、`blob-prompts.ts` など対話プロンプト系はカバレッジ 0%。外部 CLI 依存処理（Turso/Supabase）のエラーパスも網羅できていない。
- **改善優先度**: High 2件、Medium 3件、Low 2件のギャップを再確認。High に属する項目はテスト未実装のままであるため早期対応が必要。

## 対象範囲と前提条件

### 分析対象モジュール

#### コアソースファイル
1. **テンプレート生成**
   - `src/commands/create/template-generators/nextjs-fullstack-admin.ts` (369行, 主要実装)
   - `src/commands/create/template-generators/types.ts` (型定義)

2. **プロンプトと設定**
   - `src/commands/create/prompts/blob-prompts.ts` (Vercel Blob 設定)
   - `src/commands/create/config.ts` (プロジェクト設定)
   - `src/commands/create/commands.ts` (CLI コマンド定義)

3. **検証とサポート**
   - `src/commands/create/validators.ts` (プロジェクトタイプ・テンプレート検証)
   - `src/commands/create/generator.ts` (汎用生成ロジック)

#### 関連ユーティリティ
1. **データベース統合**
   - `src/utils/turso-cli/*` (9ファイル, Turso CLI ラッパー)
   - `src/utils/supabase-cli/*` (9ファイル, Supabase CLI ラッパー)

2. **テンプレート管理**
   - `src/utils/template-manager/*` (3ファイル, テンプレートコピー)
   - `src/utils/monorepo-generator/*` (4ファイル, モノレポ構造)

### 既存テスト

#### ユニットテスト (test/unit/)
1. **コア機能**
   - `test/unit/src/commands/create/validators.test.ts`（17テスト, バリデーション検証）
   - `test/unit/src/commands/create/generator.test.ts`（9テスト, 汎用プロジェクト生成）

2. **ユーティリティ**
   - `test/unit/utils/turso-cli/*.test.ts`（44テスト, 認証/DB/実行フロー）
   - `test/unit/utils/supabase-cli/*.test.ts`（34テスト, 認証/DB/実行フロー）
   - `test/unit/template-manager/copy-template.test.ts`（1テスト, テンプレートコピー）

#### E2Eテスト (test/e2e/)
1. **統合テスト**
   - `test/e2e/specs/create/project-creation.test.ts`（11シナリオ, Next.js/Expo/Tauri プロビジョニングおよびエラーハンドリング）

## 計測結果

### テスト実行結果
```
# ユニット・シナリオテスト
pnpm test
  ✓ 18 passed test files (219 total tests)
  Duration: 29.30s

# カバレッジ取得（lcov & json-summary）
pnpm test:coverage -- --reporter=lcov --reporter=json-summary
  ✓ 19 passed test files (221 total tests)
  Duration: 29.80s
  Coverage artifacts: coverage/ (HTML, coverage-final.json, lcov.info)
```

### Next.js 関連テストの詳細カバレッジ

#### 機能別カバレッジマッピング（ステートメント基準）

| 機能領域 | 主対象ファイル/ディレクトリ | 対応テスト | ステートメント網羅率 (covered/total) | 関数網羅率 | 状態 |
|---------|---------------------------|------------|--------------------------------------|-------------|------|
| **プロジェクト生成基盤** | `src/commands/create/generator.ts` | `generator.test.ts` | 69.05% (116/168) | 83.33% (5/6) | ⚠️ 部分的 |
| **バリデーション** | `src/commands/create/validators.ts` | `validators.test.ts` | 43.75% (14/32) | 25.00% (2/8) | ⚠️ 分岐不足 |
| **E2E統合** | CLI 全体 | `project-creation.test.ts` | N/A (カバレッジ未取得) | N/A | ✅ シナリオ網羅 |
| **Next.js 固有テンプレート** | `src/commands/create/template-generators/nextjs-fullstack-admin.ts` | **該当テストなし** | 7.49% (23/307) | 0% (0/7) | ❌ 未実装 |
| **Turso CLI ユーティリティ** | `src/utils/turso-cli/` | `turso-cli/*.test.ts` | 34.28% (277/808) | 78.79% (26/33) | ⚠️ 正常系中心 |
| **Supabase CLI ユーティリティ** | `src/utils/supabase-cli/` | `supabase-cli/*.test.ts` | 13.56% (168/1239) | 100% (15/15) | ❌ ステートメント不足 |
| **テンプレート管理** | `src/utils/template-manager/` | `copy-template.test.ts` | 79.41% (108/136) | 100% (6/6) | ✅ 良好 |
| **Blob 設定プロンプト** | `src/commands/create/prompts/blob-prompts.ts` | なし | 0% (0/176) | 100% (1/1) | ❌ 未実装 |
| **国際化メッセージ** | `getMessages()` 呼び出し | `generator.test.ts` ほか部分的 | 対象箇所のみ | 対象箇所のみ | ⚠️ ロケール未網羅 |

## 詳細分析

### 観点別ギャップ分析

#### 1. 機能網羅性 (Function Coverage)

**✅ カバー済み**
- プロジェクトタイプ検証（`nextjs` / `expo` / `tauri`）
- 汎用プロジェクト生成フロー（モノレポ対応含む）
- CLI インターフェース定義・デバッグログ（開発モード）

**❌ ギャップ (High Priority)**
- **Next.js 固有テンプレート生成**: `generateFullStackAdmin`（369行）の主要分岐が未実行。`buildEnvReplacements`、`selectPrismaSchema`、`runSetupCommands` など全 7 関数が未カバー。
- **外部 CLI エラー処理**: Turso/Supabase コマンド失敗時の分岐がテストされておらず警告・リカバリー挙動を確認できていない。

**⚠️ ギャップ (Medium Priority)**
- **Blob 設定統合**: `blob-prompts.ts` の対話フローが無カバー。
- **プロンプト分岐**: CLI 対話パス（データベース種類・Blob 有無切替）を網羅できていない。

#### 2. 異常系・リカバリー (Error Handling)

**✅ カバー済み**
- 不正テンプレート指定・既存ディレクトリ存在時の失敗ハンドリング
- GitHub CLI ラッパーの一部リトライ・エラー処理

**❌ ギャップ (High Priority)**
- **外部 CLI 依存エラー**: `pnpm install` / `pnpm db:generate` / `pnpm db:reset` 等のコマンド失敗時ロジックが未テスト。
- **ファイルシステム異常**: テンプレートコピー中の I/O エラーや権限エラーに対する分岐が不足。

**⚠️ ギャップ (Medium Priority)**
- **部分的失敗のロールバック**: 環境変数ファイル生成中断時の挙動が未検証。
- **ネットワーク障害**: Turso/Supabase API 接続失敗の再試行・メッセージ提示が未テスト。

#### 3. 国際化 (Internationalization)

**✅ カバー済み**
- 一部メッセージ（成功系）の英語ロケール確認

**❌ ギャップ (Medium Priority)**
- **ロケール別網羅**: 日本語メッセージおよび異常系メッセージの大半が未検証。
- **国際化辞書の整合性**: `getMessages()` が返す構造全体のスナップショット検証が不足。

#### 4. ファイル生成検証 (File Generation)

**✅ カバー済み**
- 基本的なテンプレート存在チェック
- `package.json` のプレースホルダー置換確認

**⚠️ ギャップ (Low Priority)**
- **テンプレート内容整合性**: 主要ファイルの差分比較・期待値検証が未整備。
- **権限設定**: 実行スクリプトのファイルモード確認が不足。

### 外部依存とモック戦略

#### 現状のモック実装
- `fs` / `fs-extra` のモック化によるテンプレートコピー検証
- `execa` のモックにより外部コマンド実行を仮想化
- `ora` / `chalk` のモックで CLI 出力を検証

#### 改善が必要なモック
- **Turso/Supabase CLI**: エラーハンドリングを再現するための詳細なモックシナリオが不足。
- **ネットワークアクセス**: API レスポンス変化を再現するスタブの追加が必要。

## 優先度付き改善提案

### High Priority (緊急, 2-3日以内)
1. **Next.js 固有テンプレート生成ユニットテスト実装**
   - 新規ファイル: `test/unit/src/commands/create/template-generators/nextjs-fullstack-admin.test.ts`
   - カバー対象: `buildEnvReplacements`, `configureEnvironmentFiles`, `selectPrismaSchema`, `runSetupCommands`, `generateFullStackAdmin`
   - 期待効果: ステートメントカバレッジを 7.49% → 70% 以上へ引き上げ
2. **外部 CLI 依存エラーハンドリングテスト**
   - 対象: Turso/Supabase プロビジョニング分岐、`pnpm` 系セットアップコマンド
   - 方針: `execa` モックに失敗レスポンスを追加し終了コード・ユーザー通知を検証

### Medium Priority (1週間以内)
1. **Blob 設定対話フローテスト** (`blob-prompts.ts`)
2. **国際化メッセージ網羅テスト**（英語/日本語の成功・失敗メッセージ）
3. **部分的失敗リカバリー検証**（環境変数生成・テンプレートコピーの途中失敗）

### Low Priority (2週間以内)
1. **テンプレート内容整合性テスト**（生成結果をサンプルスナップショットで比較）
2. **エラーメッセージのローカライゼーション整合性テスト**

## 測定指標

### 現状値（2025-10-06 時点）
- **行カバレッジ**: Next.js 固有テンプレート 7.49%、ジェネレータ 69.05%、バリデータ 43.75%
- **ブランチカバレッジ**: ジェネレータ 90%、バリデータ 100%（対象分岐 2/2 のみ）、テンプレート 0%
- **機能網羅率**: 約 55%（主要責務 11 項目中 6 項目がテスト対象）
- **重大ギャップ数**: High 2 / Medium 3 / Low 2

### 目標値
- Next.js 固有テンプレート: ステートメント ≥ 80%、関数 ≥ 70%
- 汎用ジェネレータ: ステートメント ≥ 85%、関数 100% 維持
- 外部 CLI ユーティリティ: ステートメント ≥ 70%、失敗分岐の最低 1 ケース追加

## 次アクションとフォローアップ計画

### 即時アクション
1. Next.js 固有テンプレート向けユニットテストの設計と実装
2. `execa` モック強化による外部 CLI 失敗シナリオの再現
3. カバレッジ自動取得ワークフロー（`pnpm test:coverage`）を CI に組み込み

### 1週間以内
1. Blob 設定フローと国際化テストの追加
2. カバレッジレポートの集計スクリプト整備（`coverage/coverage-final.json` の解析自動化）

### 2週間以内
1. テンプレート生成結果のスナップショットテスト導入
2. エラー時メッセージのローカライゼーション確認

### 継続的改善
- 新機能追加時にユニットテストと E2E テスト双方の更新を義務化
- 週次のテストレポート自動生成と共有
- 四半期ごとのテスト品質レビュー（重大度 High の継続監視）

## 付録

### 実行コマンドログ
```bash
pnpm test
pnpm test:coverage -- --reporter=lcov --reporter=json-summary
```

### 生成物
- `coverage/lcov.info`, `coverage/coverage-final.json`, `coverage/index.html`
- `@vitest/coverage-v8` を devDependencies に追加（カバレッジ取得用）

### 調査時の主要ファイル
- **主要実装**: `src/commands/create/template-generators/nextjs-fullstack-admin.ts` (369行)
- **既存テスト**: `test/unit/src/commands/create/validators.test.ts` (17テスト)、`generator.test.ts` (9テスト)
- **E2E テスト**: `test/e2e/specs/create/project-creation.test.ts` (11シナリオ)

### レポート生成環境
- **Node.js**: 20.0.0+
- **テストフレームワーク**: Vitest 3.2.4 + `@vitest/coverage-v8`
- **調査時刻**: 2025-10-06 12:45 JST
