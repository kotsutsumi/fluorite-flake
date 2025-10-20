import { describe, expect, it, vi } from "vitest";

import { generateFullSchemaSQL } from "../../../libs/db-cloud/schema-generator.js";
import type { DbCloudRunnerDeps } from "../../../libs/db-cloud/types.js";

describe("generateFullSchemaSQL", () => {
  it("Prismaコマンドを実行してSQLスキーマを生成すること", async () => {
    const mockDeps: DbCloudRunnerDeps = {
      projectRoot: "/test/root",
      backendRoot: "/test/root/apps/backend",
      env: {},
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      runCommand: vi.fn(),
      runCommandCapture: vi.fn().mockResolvedValue("CREATE TABLE users (\n  id INTEGER\n);\n\n"),
    };

    const result = await generateFullSchemaSQL(mockDeps);

    expect(mockDeps.runCommandCapture).toHaveBeenCalledWith("pnpm", [
      "--filter",
      "backend",
      "exec",
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema.turso.prisma",
      "--script",
    ]);
    expect(result).toBe("CREATE TABLE users (\n  id INTEGER\n);");
  });

  it("出力の前後の空白をトリムすること", async () => {
    const mockDeps: DbCloudRunnerDeps = {
      projectRoot: "/test/root",
      backendRoot: "/test/root/apps/backend",
      env: {},
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      runCommand: vi.fn(),
      runCommandCapture: vi.fn().mockResolvedValue("\n  SELECT 1;  \n\n"),
    };

    const result = await generateFullSchemaSQL(mockDeps);

    expect(result).toBe("SELECT 1;");
  });
});

// EOF
