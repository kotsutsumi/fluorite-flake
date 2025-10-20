import { describe, expect, it, vi } from "vitest";

vi.mock("../../../libs/db-cloud/logger.js", () => ({
  createConsoleLogger: vi.fn(),
}));

vi.mock("../../../libs/db-cloud/command-executor.js", () => ({
  createRunCommand: vi.fn(),
  createRunCommandCapture: vi.fn(),
}));

vi.mock("../../../libs/db-cloud/env-manager.js", () => ({
  createEnvManagerDeps: vi.fn(),
}));

vi.mock("../../../libs/db-cloud/base-name.js", () => ({
  createReadlinePrompt: vi.fn(),
}));

const { createConsoleLogger } = await import("../../../libs/db-cloud/logger.js");
const { createRunCommand, createRunCommandCapture } = await import(
  "../../../libs/db-cloud/command-executor.js"
);
const { createEnvManagerDeps } = await import("../../../libs/db-cloud/env-manager.js");
const { createReadlinePrompt } = await import("../../../libs/db-cloud/base-name.js");
const { createDefaultRunnerDeps, createDefaultEnvDeps, promptWithReadline } = await import(
  "../../../libs/db-cloud/dependencies.js"
);

describe("createDefaultRunnerDeps", () => {
  it("デフォルトの依存関係を作成すること", () => {
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const mockRunCommand = vi.fn();
    const mockRunCommandCapture = vi.fn();

    vi.mocked(createConsoleLogger).mockReturnValue(mockLogger);
    vi.mocked(createRunCommand).mockReturnValue(mockRunCommand);
    vi.mocked(createRunCommandCapture).mockReturnValue(mockRunCommandCapture);

    const deps = createDefaultRunnerDeps();

    expect(deps).toHaveProperty("projectRoot");
    expect(deps).toHaveProperty("backendRoot");
    expect(deps.logger).toBe(mockLogger);
    expect(deps.runCommand).toBe(mockRunCommand);
    expect(deps.runCommandCapture).toBe(mockRunCommandCapture);
    expect(deps.env).toBe(process.env);
  });
});

describe("createDefaultEnvDeps", () => {
  it("環境マネージャーの依存関係を作成すること", () => {
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const mockEnvDeps = { test: "deps" };

    vi.mocked(createEnvManagerDeps).mockReturnValue(mockEnvDeps as any);

    const deps = createDefaultEnvDeps(mockLogger);

    expect(createEnvManagerDeps).toHaveBeenCalledWith(mockLogger, expect.any(Object));
    expect(deps).toBe(mockEnvDeps);
  });
});

describe("promptWithReadline", () => {
  it("readlineプロンプトを作成すること", async () => {
    vi.mocked(createReadlinePrompt).mockResolvedValue("user input");

    const result = await promptWithReadline("Enter value:");

    expect(createReadlinePrompt).toHaveBeenCalledWith("Enter value:");
    expect(result).toBe("user input");
  });
});

// EOF
