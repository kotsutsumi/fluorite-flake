import type { DbCloudRunnerDeps } from "./types.js";

const SCHEMA_PATH = "prisma/schema.turso.prisma";

export async function generateFullSchemaSQL(deps: DbCloudRunnerDeps): Promise<string> {
  const rawOutput = await deps.runCommandCapture("pnpm", [
    "--filter",
    "backend",
    "exec",
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    SCHEMA_PATH,
    "--script",
  ]);

  // Filter out dotenv banner messages that appear in the output
  // Example: "[dotenv@17.2.3] injecting env (11) from .env.local"
  const sql = rawOutput
    .split("\n")
    .filter((line) => !line.trim().startsWith("[dotenv"))
    .join("\n")
    .trim();

  return sql;
}

// EOF
