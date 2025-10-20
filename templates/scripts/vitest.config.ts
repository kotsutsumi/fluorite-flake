import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  test: {
    globals: true,
    environment: "node",
    root: __dirname,
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "../**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["libs/**/*.ts", "env-tools.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/node_modules/**",
        "**/dist/**",
        "tests/**",
        "libs/db-cloud/command-executor.ts",
        "libs/db-cloud/prisma-runner.ts",
        "libs/db-cloud/runner.ts",
        "libs/db-cloud/seed-runner.ts",
        "libs/env-init/types.ts",
      ],
    },
  },
});

// EOF
