const fs = require("node:fs");
const path = require("node:path");
const archiver = require("archiver");

/**
 * 環境変数をZIPファイルにエクスポート
 */
async function exportEnvToZip() {
    try {
        console.log("📦 環境変数のエクスポートを開始...");

        const output = fs.createWriteStream("env-backup.zip");
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);

        // .env ファイルの存在確認とアーカイブ追加
        const envFiles = [
            ".env.example",
            ".env.local",
            ".env.development",
            ".env.production",
        ];

        let addedFiles = 0;

        for (const file of envFiles) {
            if (fs.existsSync(file)) {
                archive.file(file, { name: file.replace(".", "") });
                addedFiles++;
                console.log(`  ✓ ${file} を追加`);
            } else {
                console.log(`  ⚠️  ${file} が見つかりません（スキップ）`);
            }
        }

        if (addedFiles === 0) {
            console.log("❌ エクスポートする環境変数ファイルが見つかりません");
            return;
        }

        // README ファイルの追加
        const readmeContent = `# 環境変数バックアップ

このZIPファイルには以下の環境変数ファイルが含まれています:

## ファイル一覧
- env-example: 環境変数のサンプル
- env-local: ローカル開発用環境変数
- env-development: 開発環境用環境変数
- env-production: 本番環境用環境変数

## 復元方法
1. 適切なディレクトリにファイルを配置
2. ファイル名を元に戻す（例: env-local → .env.local）
3. 必要に応じて値を更新

## セキュリティ注意事項
⚠️ このファイルには機密情報が含まれている可能性があります
- 安全な場所に保管してください
- 不要になったら削除してください
- 他人と共有しないでください

作成日時: ${new Date().toISOString()}
`;

        archive.append(readmeContent, { name: "README.txt" });

        await archive.finalize();

        output.on("close", () => {
            console.log(`✅ エクスポート完了: ${archive.pointer()} bytes`);
            console.log("📁 ファイル: env-backup.zip");
            console.log("");
            console.log("🔒 セキュリティ注意事項:");
            console.log("  - このファイルには機密情報が含まれています");
            console.log("  - 安全な場所に保管してください");
            console.log("  - 不要になったら削除してください");
        });

        output.on("error", (err) => {
            console.error("❌ エクスポートエラー:", err);
        });
    } catch (error) {
        console.error("❌ エクスポート失敗:", error.message);
        process.exit(1);
    }
}

// スクリプトとして実行された場合のみ関数を呼び出し
if (require.main === module) {
    exportEnvToZip();
}

module.exports = { exportEnvToZip };
