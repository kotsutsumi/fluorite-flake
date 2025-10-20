import { spawn } from "node:child_process";

// Windows では `where` や `powershell` などの組み込みコマンドを解決するため
// シェル経由で起動する必要がある。
const isWindows = process.platform === "win32";

export type RunCommandOptions = {
  readonly cwd?: string;
};

/**
 * 標準入出力を親プロセスと共有したまま子プロセスを起動するヘルパー。
 * コマンドが正常終了すれば Promise を解決し、異常終了時は内容を説明した
 * エラーで reject する。
 */
export async function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions = {}
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    // 子プロセスを起動し、stdin/stdout/stderr を親にバインドする。
    const proc = spawn(command, args, {
      cwd: options.cwd,
      stdio: "inherit",
      shell: isWindows,
    });

    // 実行ファイルが見つからない等の起動失敗は即座に伝播させる。
    proc.once("error", (error) => {
      reject(
        new Error(`Failed to run ${command}: ${error instanceof Error ? error.message : error}`)
      );
    });

    // 正常終了なら resolve、非ゼロ終了コードの場合は reject して呼び出し元が
    // 適切なメッセージを出せるようにする。
    proc.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? -1}`));
    });
  });
}

// EOF
