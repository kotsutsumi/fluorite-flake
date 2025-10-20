import { stat } from "node:fs/promises";

// ディレクトリが存在するかどうかを非同期に確認するヘルパー。
export async function directoryExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// EOF
