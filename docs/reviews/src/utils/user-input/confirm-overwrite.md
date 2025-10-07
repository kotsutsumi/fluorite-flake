# user-input/confirm-overwrite.ts レビュー報告書

## 概要

`src/utils/user-input/confirm-overwrite.ts` はプロジェクト生成時に既存ディレクトリを検出した際のユーザー確認と安全な削除を担当します。国際化された文言を使ってコンソール対話を行い、承諾時のみ `fs.rmSync` で完全削除します。

## 処理フロー

1. `fs.existsSync(directoryPath)` で対象ディレクトリの存在を確認。無ければ `true` を返して終了。
2. `readline/promises.createInterface` で標準入力と標準出力を束ねた対話環境を作成。
3. `create.directoryExists` と `create.confirmOverwrite` をそのまま表示し、`as any` を介さずに型付けされたメッセージを利用。
4. 応答が `y` / `Y` / `yes` (大文字小文字無視) にマッチすれば削除処理を実行し、成功メッセージを表示。
5. 削除失敗時はエラーメッセージと例外情報を出力。
6. 否認または削除失敗の場合は `false` を返して後段の処理を中断できるようにする。
7. `finally` ブロックで readline インターフェースを必ず閉じる。

## 留意点

- `fs.rmSync` に `force: true` を指定しているため、権限のないファイルでも試行される。権限エラーは catch 節でユーザーへ通知。
- メッセージは `getMessages()` の `create` セクションに依存し、`directoryRemoved` や `failedToRemoveDirectory` など新設キーも JSON 側と同期する必要がある。
- 再帰呼び出しは行わず、確認プロンプトは一度のみ。繰り返し確認が必要な場合は呼び出し側で再試行ロジックを実装する。
