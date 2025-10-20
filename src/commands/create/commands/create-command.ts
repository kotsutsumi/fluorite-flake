/**
 * createコマンドの実装を提供するモジュール
 */
import { defineCommand } from "citty";

/**
 * createコマンドの定義
 * 現在は開発中のため、メッセージのみを表示します
 */
export const createCommand = defineCommand({
	meta: {
		name: "create",
		description: "新しいプロジェクトを作成します（開発中）",
	},
	args: {},
	async run() {
		console.log("🚧 createコマンドは現在開発中です");
		console.log("📝 近日中に利用可能になります");
		process.exit(0);
	},
});

// EOF
