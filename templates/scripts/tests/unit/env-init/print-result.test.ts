import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { printResult } from "../../../libs/env-init/print-result.js";
import type { InitResult } from "../../../libs/env-init/types.js";

describe("printResult", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // 意図的に空実装
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("作成されたファイルを表示すること", () => {
    const result: InitResult = {
      created: [
        { app: "backend", file: ".env" },
        { app: "web", file: ".env.local" },
      ],
      skipped: [],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("✓ Created: apps/backend/.env");
    expect(consoleLogSpy).toHaveBeenCalledWith("✓ Created: apps/web/.env.local");
  });

  it("スキップされたファイルを表示すること", () => {
    const result: InitResult = {
      created: [],
      skipped: [
        { app: "backend", file: ".env" },
        { app: "web", file: ".env.local" },
      ],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("⊘ Skipped: apps/backend/.env (already exists)");
    expect(consoleLogSpy).toHaveBeenCalledWith("⊘ Skipped: apps/web/.env.local (already exists)");
  });

  it("作成とスキップの両方を表示すること", () => {
    const result: InitResult = {
      created: [{ app: "backend", file: ".env" }],
      skipped: [{ app: "web", file: ".env.local" }],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("✓ Created: apps/backend/.env");
    expect(consoleLogSpy).toHaveBeenCalledWith("⊘ Skipped: apps/web/.env.local (already exists)");
  });

  it("ファイルが見つからない場合はメッセージを表示すること", () => {
    const result: InitResult = {
      created: [],
      skipped: [],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("No .env.*.example files found.");
  });

  it("作成されたファイルのサマリーを表示すること", () => {
    const result: InitResult = {
      created: [
        { app: "app1", file: ".env" },
        { app: "app2", file: ".env.local" },
      ],
      skipped: [],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("Summary: 2 files created");
  });

  it("スキップされたファイルのサマリーを表示すること", () => {
    const result: InitResult = {
      created: [],
      skipped: [
        { app: "app1", file: ".env" },
        { app: "app2", file: ".env.local" },
      ],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("Summary: 2 skipped");
  });

  it("作成とスキップの両方のサマリーを表示すること", () => {
    const result: InitResult = {
      created: [
        { app: "app1", file: ".env" },
        { app: "app2", file: ".env.local" },
      ],
      skipped: [{ app: "app3", file: ".env.preview" }],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("Summary: 2 files created, 1 skipped");
  });

  it("単数形のメッセージを表示すること", () => {
    const result: InitResult = {
      created: [{ app: "app1", file: ".env" }],
      skipped: [],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("Summary: 1 file created");
  });

  it("空行を含めること", () => {
    const result: InitResult = {
      created: [{ app: "app1", file: ".env" }],
      skipped: [],
    };

    printResult(result);

    expect(consoleLogSpy).toHaveBeenCalledWith("");
  });
});

// EOF
