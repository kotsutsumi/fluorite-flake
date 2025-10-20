import { access, constants } from "node:fs/promises";

const { F_OK } = constants;

// fs.access をラップして例外ではなく boolean を返すユーティリティ。
// 同期版 existsSync と同じ使い勝手を非同期で提供する。
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, F_OK);
    return true;
  } catch {
    return false;
  }
}

// EOF
