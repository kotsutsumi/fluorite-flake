// Vercel CLI をサブプロセスとして起動するための薄いラッパー。
// stdin に値を流し込むユースケース（`vercel env add`）にも対応できるよう、
// 既存の run-command とは別に env-push 専用の実装を用意している。
import { spawn } from "node:child_process";

export type RunCommandOptions = {
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly input?: string;
};

export type RunCommandFn = (
  command: string,
  args: readonly string[],
  options: RunCommandOptions
) => Promise<void>;

const isWindows = process.platform === "win32";

export const runCommand: RunCommandFn = async (command, args, options) => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "inherit", "inherit"],
      shell: isWindows,
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? -1}`));
    });

    if (options.input !== undefined) {
      child.stdin?.write(`${options.input}\n`);
    }
    child.stdin?.end();
  });
};

// EOF
