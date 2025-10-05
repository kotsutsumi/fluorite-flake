# user-input/prompt-project-name.ts レビュー報告書

## 概要

`src/utils/user-input/prompt-project-name.ts` は CLI 実行時にプロジェクト名が指定されていない場合、対話的に入力を促す非同期関数 `promptForProjectName()` を提供します。バリデーションとフォールバック処理により安全なディレクトリ名を確保します。

## 処理フロー

1. `readline/promises.createInterface` で対話環境を作成。
2. `create.promptProjectName` を表示し、ユーザーからの入力を取得。
3. 何も入力されなかった場合は `my-fluorite-project` を採用し、`usingDefaultProjectName` を通知。
4. 入力値をトリムしたのち、`/^[a-zA-Z0-9_-]+$/` で検証。
5. 検証に失敗した場合は `invalidProjectName` を表示し、再帰的に再プロンプト。
6. 成功した場合はトリム済み文字列を返却。
7. `finally` で readline インターフェースを必ず閉じる。

## 留意点

- 再帰呼び出しで再入力を要求しているため、極端に長い連続失敗で再帰スタックが伸びる点には注意（実用上は問題になりにくい）。
- バリデーションルールを変更する場合は、単体テストとローカライズメッセージ (`invalidProjectName`) の更新が必要。
- デフォルト名を変更した際は README 生成やテンプレートにも影響する可能性があるため、関連箇所を合わせて確認すること。