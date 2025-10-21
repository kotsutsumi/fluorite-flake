/* c8 ignore start */
/**
 * Vercel CLI コマンド実行ラッパー
 * 統合テストでテストすべき低レベルのプロセス実行ユーティリティのため、
 * ユニットテストのカバレッジ対象から除外しています。
 */
import { spawn } from "node:child_process";

import type { RunCommandCaptureFn, RunCommandFn, RunCommandOptions } from "./types.js";

const isWindows = process.platform === "win32";

export function createRunCommand(): RunCommandFn {
  return async (command, args, options: RunCommandOptions = {}) => {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(command, [...args], {
        cwd: options.cwd,
        env: options.env,
        stdio: "inherit",
        shell: isWindows,
      });

      proc.once("error", (error) => {
        reject(
          new Error(
            `コマンド ${command} の実行に失敗しました: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      });

      proc.once("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new Error(`${command} ${args.join(" ")} が終了コード ${code ?? -1} で失敗しました。`)
        );
      });
    });
  };
}

export function createRunCommandCapture(): RunCommandCaptureFn {
  return async (command, args, options: RunCommandOptions = {}) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(command, [...args], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ["ignore", "pipe", "pipe"],
        shell: isWindows,
      });

      proc.stdout?.on("data", (chunk: Buffer) => {
        stdoutChunks.push(chunk);
      });
      proc.stderr?.on("data", (chunk: Buffer) => {
        stderrChunks.push(chunk);
      });

      proc.once("error", (error) => {
        reject(
          new Error(
            `コマンド ${command} の実行に失敗しました: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      });

      proc.once("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        const stderrText = Buffer.concat(stderrChunks).toString("utf8");
        reject(
          new Error(
            `${command} ${args.join(" ")} が終了コード ${code ?? -1} で失敗しました。\n${stderrText}`
          )
        );
      });
    });

    const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
    const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

    // stdout が空で stderr に出力がある場合は stderr を使用（Vercel CLI の仕様）
    if (!stdout && stderr) {
      return stderr;
    }

    return stdout;
  };
}
/* c8 ignore stop */

// EOF
