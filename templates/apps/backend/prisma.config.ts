// Prisma設定ファイル
// データベースのスキーマとマイグレーションの設定を定義

import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// .env.local を明示的に読み込む
config({ path: path.join(__dirname, ".env.local") });

export default defineConfig({
  // Prismaスキーマファイルの場所を指定
  schema: path.join("prisma", "schema.prisma"),
  // マイグレーション関連の設定
  migrations: {
    // マイグレーションファイルの保存場所
    path: path.join("prisma", "migrations"),
    // データベースの初期データ投入用のシードスクリプト
    seed: "tsx prisma/seed.ts",
  },
});

// ファイル終端

// EOF
