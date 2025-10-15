/**
 * データベース選択に関するロジックを切り出したモジュール
 */
import { promptForDatabase } from "../../../utils/user-input/index.js"; // ユーザーにデータベース選択を促すユーティリティを取り込む
import type { DatabaseType } from "../types.js"; // データベース種別の型定義を読み込む
import { hasDatabaseFeature, showInvalidDatabaseError, validateDatabase } from "../validators/index.js"; // 検証とエラー表示の関数をまとめてインポートする

/**
 * コマンド引数とテンプレート情報から利用するデータベースを決定する
 */
export async function determineDatabaseSelection(
    args: { database?: string },
    template: string | undefined
): Promise<DatabaseType | undefined> {
    // 引数のデータベース指定をDatabaseTypeにキャストして初期値を決める
    let database: DatabaseType | undefined = args.database as DatabaseType;

    // データベース名が与えられているがバリデーションに失敗した場合はエラーを表示して終了する
    if (args.database && !validateDatabase(args.database)) {
        showInvalidDatabaseError(args.database);
        process.exit(1);
    }

    // データベース指定が無くテンプレートがDB機能を持つなら対話的に選択してもらう
    if (!database && template && hasDatabaseFeature(template)) {
        database = await promptForDatabase();
        if (database === undefined) {
            process.exit(0); // ユーザーがキャンセルしたケースでは正常終了する
        }
    }

    // 判定結果を呼び出し元へ返す
    return database;
}

// EOF
