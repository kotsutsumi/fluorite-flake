const fs = require("node:fs");
const path = require("node:path");
const unzipper = require("unzipper");

/**
 * ZIPファイルから環境変数をインポート
 */
async function importEnvFromZip(zipFilePath = "env-backup.zip") {
    try {
        console.log("📥 環境変数のインポートを開始...");

        if (!fs.existsSync(zipFilePath)) {
            console.error(`❌ ZIPファイルが見つかりません: ${zipFilePath}`);
            process.exit(1);
        }

        const extractPath = "./env-import-temp";

        // 一時ディレクトリの作成
        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
        }
        fs.mkdirSync(extractPath);

        console.log("📂 ZIPファイルを展開中...");

        await fs
            .createReadStream(zipFilePath)
            .pipe(unzipper.Extract({ path: extractPath }))
            .promise();

        // ファイルの復元
        const fileMapping = {
            "env-example": ".env.example",
            "env-local": ".env.local",
            "env-development": ".env.development",
            "env-production": ".env.production",
        };

        let restoredFiles = 0;

        for (const [sourceFile, targetFile] of Object.entries(fileMapping)) {
            const sourcePath = path.join(extractPath, sourceFile);

            if (fs.existsSync(sourcePath)) {
                // 既存ファイルの確認
                if (fs.existsSync(targetFile)) {
                    console.log(
                        `⚠️  ${targetFile} は既に存在します（バックアップを作成）`
                    );
                    fs.copyFileSync(targetFile, `${targetFile}.backup`);
                }

                fs.copyFileSync(sourcePath, targetFile);
                restoredFiles++;
                console.log(`  ✓ ${sourceFile} → ${targetFile}`);
            }
        }

        // 一時ディレクトリの削除
        fs.rmSync(extractPath, { recursive: true, force: true });

        if (restoredFiles === 0) {
            console.log("❌ インポートする環境変数ファイルが見つかりません");
            return;
        }

        console.log(`✅ インポート完了: ${restoredFiles} ファイル`);
        console.log("");
        console.log("📝 次のステップ:");
        console.log("  1. 環境変数の値を確認・更新");
        console.log("  2. アプリケーションを再起動");
        console.log("  3. バックアップファイルを確認（必要に応じて削除）");
    } catch (error) {
        console.error("❌ インポート失敗:", error.message);
        process.exit(1);
    }
}

// コマンドライン引数の処理
const targetZipFilePath = process.argv[2] || "env-backup.zip";

// スクリプトとして実行された場合のみ関数を呼び出し
if (require.main === module) {
    importEnvFromZip(targetZipFilePath);
}

module.exports = { importEnvFromZip };
