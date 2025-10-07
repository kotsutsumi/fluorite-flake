# CLI エントリーポイントレビュー報告書

## 概要

`src/cli.ts` は Fluorite Flake CLI のエントリーポイントであり、`citty` の `defineCommand` / `runMain` を用いてコマンドツリーを定義・実行します。開発モード時の診断や作業ディレクトリ初期化を支援しつつ、ヘルプ出力をローカライズされたメッセージで構成します。

## 最新の変更点（重要な修正）

### 問題解決: サブコマンド実行後のusageメッセージ表示
**修正前の問題:** プロジェクト作成完了後に不適切にusageメッセージが表示される
**修正内容:**
1. **強化されたコンテキストデバッグ**: 開発モードでの詳細なコンテキスト情報出力
2. **process.argv直接チェック**: Cittyフレームワークの予期しない動作への対処
3. **多層防御**: 複数の条件チェックによる確実な実行制御

```typescript
// 修正されたrun関数の実行制御
run(context: CommandContext) {
    // 開発モードでのコンテキストデバッグ
    if (isDevelopment()) {
        debugLog("Context debug:", {
            subCommand: context.subCommand,
            args: context.args,
            argsLength: context.args._.length,
            rawArgs: process.argv,
        });
    }

    // サブコマンド存在チェック
    if (context.subCommand) return;

    // process.argv での直接的なサブコマンド検出
    const hasSubCommand = process.argv.includes("create") || process.argv.includes("new");
    if (hasSubCommand) {
        if (isDevelopment()) {
            debugLog("Detected subcommand in process.argv, skipping main command");
        }
        return;
    }

    // 引数存在チェック
    if (context.args._.length > 0) return;

    // usageメッセージ表示
}
```

## 実行フロー

1. `isDevelopment()` を判定し、開発環境であれば `printDevelopmentInfo()` と `setupDevelopmentWorkspace()` を実行。
2. `defineCommand()` でメインコマンドを定義し、`create` / `new` サブコマンドを登録。
3. **修正済み**: `run()` ハンドラは多層の条件チェックを実行し、適切な場合のみヘルプを表示。
4. `runMain(main)` によって CLI を起動し、完了を追跡。

## 依存モジュール

- `./commands/create/index.js`: `create` / `new` サブコマンドの実装。
- `./debug.js`: 開発モード向けのログ出力とワークスペース準備。
- `./header.js`: CLI 起動時のバナー表示。
- `./i18n.js`: ロケール依存メッセージの取得。

## トラブルシューティング対応

### Cittyフレームワークの予期しない動作への対処
- **問題**: サブコマンド完了後にメインコマンドのrun関数が予期せず実行される
- **解決策**: 複数の防御的チェックによる堅牢性向上
- **デバッグ**: 開発モードでの詳細なコンテキスト情報出力

### 実行制御の強化
- **従来**: `context.subCommand` のみによる判定
- **現在**: context + process.argv + 引数の三重チェック
- **効果**: Cittyフレームワークの内部動作に依存しない確実な制御

## 留意点

- 開発モード限定の処理は `NODE_ENV=development` でのみ発火するため、本番環境への影響はない。
- メタ情報の `version` は固定文字列となっており、リリース時に更新漏れがないか確認が必要。
- ヘルプ出力は `cli.commandLines` / `cli.exampleLines` の配列順序に依存するため、メッセージファイル編集時は項目の並びを保持すること。
- **新規追加**: process.argv チェックにより、新しいサブコマンド追加時は該当配列の更新が必要。
- **強化**: デバッグ情報により、実行時の問題追跡が容易になった。

## 品質向上の効果

1. **ユーザーエクスペリエンス**: 不適切なusageメッセージ表示の解消
2. **開発効率**: 詳細なデバッグ情報による問題特定の迅速化
3. **保守性**: 多層防御による将来の変更への耐性向上
4. **信頼性**: フレームワーク依存の問題に対する堅牢な対処