# user-input/prompt-project-name.ts レビュー報告書

## 概要

`src/utils/user-input/prompt-project-name.ts` は CLI 実行時にプロジェクト名が指定されていない場合、`@clack/prompts` のテキスト入力 UI を用いて対話的に入力を促します。バリデーションとフォールバック処理により安全なディレクトリ名を確保します。

## 処理フロー

1. `getMessages()` からローカライズ済み文言を取得し、`promptProjectName`・`projectNamePlaceholder`・`invalidProjectName` などのキーをプレースホルダーやエラーメッセージに利用。
2. `text()` プロンプトで灰色背景の入力フィールドとプレースホルダーを表示し、`validate` で `/^[a-zA-Z0-9_-]+$/` による検証を実施。
3. バリデーションに失敗した場合はその場でエラーメッセージを返し、再入力を求める。
4. `Ctrl+C` などでキャンセルされた場合は `cancel()` で中断メッセージを表示し、`process.exit(0)` で終了。
5. 入力が空の場合は `usingDefaultProjectName` を表示し、`my-fluorite-project` を採用。
6. 正常に入力された場合はトリム済みのプロジェクト名を返却。

## 留意点

- UI レイヤーが `@clack/prompts` に切り替わったため、スタイル変更やキー操作の挙動を調整する際は Clack の API を確認すること。
- バリデーションルールを変更する場合は、テキストプロンプトの `validate` とローカライズ文言 (`invalidProjectName`) を同時に更新する必要がある。
- デフォルト名を変更した際は README 生成やテンプレートにも影響する可能性があるため、関連箇所を合わせて確認すること。
