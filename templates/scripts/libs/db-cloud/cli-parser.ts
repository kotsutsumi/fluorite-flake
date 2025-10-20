/**
 * CLI 引数を解析し、内部で利用しやすい形へ変換するモジュール。
 */
import { parseArgs } from "node:util";

import type { DbCloudCommand, DbEnvironment, EnvironmentTarget, ParsedCli } from "./types.js";
import { DB_ENVIRONMENTS } from "./types.js";

function parseCommand(raw: string): DbCloudCommand {
  const normalized = raw.toLowerCase();
  if (
    normalized === "create" ||
    normalized === "migrate" ||
    normalized === "push" ||
    normalized === "seed" ||
    normalized === "reset"
  ) {
    return normalized;
  }
  throw new Error(
    `不明なサブコマンドです: ${raw}。create / migrate / push / seed / reset のいずれかを指定してください。`
  );
}

function parseEnvironment(raw: string): EnvironmentTarget {
  const normalized = raw.toLowerCase();
  if (normalized === "all") {
    return "all";
  }
  if (DB_ENVIRONMENTS.includes(normalized as DbEnvironment)) {
    return normalized as DbEnvironment;
  }
  throw new Error(
    `不明な環境名です: ${raw}。preview / staging / production / all のいずれかを指定してください。`
  );
}

export function parseDbCloudArgs(argv: readonly string[]): ParsedCli {
  const { positionals, values } = parseArgs({
    args: argv.slice(2),
    options: {
      name: { type: "string" },
      "primary-region": { type: "string" },
      yes: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const [commandRaw, environmentRaw] = positionals;
  if (!commandRaw) {
    throw new Error(
      [
        "サブコマンドが指定されていません。",
        "使用例: pnpm db:cloud:create / pnpm db:cloud:migrate staging / pnpm db:cloud:push",
      ].join("\n")
    );
  }

  const command = parseCommand(commandRaw);
  const environment = command === "create" ? "all" : parseEnvironment(environmentRaw ?? "all");

  return {
    command,
    environment,
    name: values.name,
    primaryRegion: values["primary-region"],
    yes: values.yes ?? false,
  };
}

// EOF
