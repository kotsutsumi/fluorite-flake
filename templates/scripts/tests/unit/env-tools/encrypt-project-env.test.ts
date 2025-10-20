import { beforeEach, describe, expect, it, vi } from "vitest";
import { encryptProjectEnv } from "../../../libs/env-tools/encrypt-project-env.js";
import { getEncryptedArchiveName } from "../../../libs/env-tools/get-encrypted-archive-name.js";

vi.mock("node:fs/promises", () => ({ rm: vi.fn() }));
vi.mock("../../../libs/env-tools/directory-exists.js", () => ({ directoryExists: vi.fn() }));
vi.mock("../../../libs/env-tools/collect-env-files.js", () => ({ collectEnvFiles: vi.fn() }));
vi.mock("../../../libs/env-tools/run-command.js", () => ({ runCommand: vi.fn() }));

const { rm } = await import("node:fs/promises");
const { directoryExists } = await import("../../../libs/env-tools/directory-exists.js");
const { collectEnvFiles } = await import("../../../libs/env-tools/collect-env-files.js");
const { runCommand } = await import("../../../libs/env-tools/run-command.js");

describe("UT-SCRIPTS-11: encryptProjectEnv", () => {
  const project = { name: "docs", relativePath: "apps/docs" } as const;
  const options = { rootDir: "/repo", password: "p@ss" } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("プロジェクトディレクトリが見つからない場合はスキップすること", async () => {
    vi.mocked(directoryExists).mockResolvedValue(false);

    const result = await encryptProjectEnv(project, options);

    expect(result.status).toBe("skipped");
    expect(result.message).toMatch(/Directory not found/);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("環境変数ファイルが見つからない場合はスキップすること", async () => {
    vi.mocked(directoryExists).mockResolvedValue(true);
    vi.mocked(collectEnvFiles).mockResolvedValue([]);

    const result = await encryptProjectEnv(project, options);

    expect(result.status).toBe("skipped");
    expect(result.message).toMatch(/No environment files/);
  });

  it("既存のアーカイブを削除してファイルを圧縮すること", async () => {
    vi.mocked(directoryExists).mockResolvedValue(true);
    vi.mocked(collectEnvFiles).mockResolvedValue([".env", ".env.production"]);
    vi.mocked(runCommand).mockResolvedValue();

    const result = await encryptProjectEnv(project, options);

    expect(rm).toHaveBeenCalledWith(
      `${options.rootDir}/${project.relativePath}/${getEncryptedArchiveName()}`,
      { force: true }
    );
    expect(runCommand).toHaveBeenCalledWith(
      "zip",
      ["-P", options.password, getEncryptedArchiveName(), ".env", ".env.production"],
      { cwd: `${options.rootDir}/${project.relativePath}` }
    );
    expect(result).toEqual({
      kind: "encrypt",
      project,
      status: "success",
      files: [".env", ".env.production"],
    });
  });
});

// EOF
