import { isCommandAvailable } from "./is-command-available.js";

// 依存する CLI がインストールされているか確認し、足りない場合は
// 途中で失敗する代わりにインストール手順を提示する。
export async function assertCommandAvailable(
  command: string,
  instructions: readonly string[] | undefined
): Promise<void> {
  if (await isCommandAvailable(command)) {
    return;
  }

  const help = instructions?.join("\n") ?? "";
  const message = [`${command} command not found.`.trim(), help.trim()].filter(Boolean).join("\n");
  throw new Error(message);
}

// EOF
