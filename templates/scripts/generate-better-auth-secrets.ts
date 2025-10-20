#!/usr/bin/env tsx
/**
 * 各アプリケーションの BETTER_AUTH_SECRET を自動生成するユーティリティ。
 * - apps/<name>/ 以下の .env ファイル (.env.local / .env.test など) を対象に更新
 * - 新しい 64 文字の Base64URL 文字列を生成し、既存の値を置き換える
 */
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const APPS_DIR = path.resolve(process.cwd(), "apps");
const TARGET_ENV_FILES = [
  ".env.local",
  ".env.test",
  ".env.preview",
  ".env.staging",
  ".env.production",
];
const SECRET_BYTES = 48;
const SECRET_REGEX = /^BETTER_AUTH_SECRET=.*$/m;

function generateSecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

async function updateSecret(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    if (!content.includes("BETTER_AUTH_SECRET")) {
      return false;
    }

    const secret = generateSecret();
    const updated = content.replace(SECRET_REGEX, `BETTER_AUTH_SECRET=${secret}`);

    if (updated === content) {
      return false;
    }

    await fs.writeFile(filePath, updated, "utf8");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const apps = await fs.readdir(APPS_DIR, { withFileTypes: true });
  const updates: Array<{ app: string; file: string }> = [];

  for (const entry of apps) {
    if (!entry.isDirectory()) {
      continue;
    }

    const appDir = path.join(APPS_DIR, entry.name);

    for (const envName of TARGET_ENV_FILES) {
      const envPath = path.join(appDir, envName);
      const changed = await updateSecret(envPath);
      if (changed) {
        updates.push({ app: entry.name, file: envName });
      }
    }
  }

  if (updates.length === 0) {
    console.log("No BETTER_AUTH_SECRET entries were updated.");
    return;
  }

  console.log("Updated BETTER_AUTH_SECRET for:");
  for (const { app, file } of updates) {
    console.log(`  • ${app}/${file}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

// EOF
