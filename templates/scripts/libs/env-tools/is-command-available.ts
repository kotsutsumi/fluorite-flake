import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";

/**
 * 指定したコマンドが PATH 上で利用可能かを確認するヘルパー。
 * まずは `--version` などで直接実行し、失敗した場合は OS 固有の方法で
 * 存在確認を行う。
 */
export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) => {
      // `zip` など一部ツールは `--version` ではなく `-v` で情報を出す。
      const testArgs = command === "zip" ? ["-v"] : ["--version"];
      const proc = spawn(command, testArgs, {
        stdio: "ignore",
        shell: isWindows,
      });

      proc.once("error", () => reject(new Error("command not found")));
      proc.once("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`command exited with code ${code ?? -1}`));
      });
    });
    return true;
  } catch {
    try {
      if (isWindows) {
        await new Promise<void>((resolve, reject) => {
          // Windows では `where` が見つかった実行ファイルのパスを返す。
          const proc = spawn("where", [command], {
            stdio: "ignore",
            shell: true,
          });

          proc.once("close", (code) => {
            if (code === 0) {
              resolve();
              return;
            }
            reject(new Error("command not found"));
          });

          proc.once("error", reject);
        });
        return true;
      }

      await new Promise<void>((resolve, reject) => {
        // POSIX 系では `command -v` が移植性の高い確認手段。
        const proc = spawn("sh", ["-c", `command -v ${command}`], {
          stdio: "ignore",
        });

        proc.once("close", (code) => {
          if (code === 0) {
            resolve();
            return;
          }
          reject(new Error("command not found"));
        });

        proc.once("error", reject);
      });
      return true;
    } catch {
      return false;
    }
  }
}

// EOF
