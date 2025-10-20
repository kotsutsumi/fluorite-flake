import { beforeEach, describe, expect, it, vi } from "vitest";
import { decryptProjectEnv } from "../../../libs/env-tools/decrypt-project-env.js";
import { getEncryptedArchiveName } from "../../../libs/env-tools/get-encrypted-archive-name.js";

vi.mock("../../../libs/env-tools/directory-exists.js", () => ({ directoryExists: vi.fn() }));
vi.mock("../../../libs/env-tools/path-exists.js", () => ({ pathExists: vi.fn() }));
vi.mock("../../../libs/env-tools/collect-env-files.js", () => ({ collectEnvFiles: vi.fn() }));
vi.mock("../../../libs/env-tools/run-command.js", () => ({ runCommand: vi.fn() }));

const { directoryExists } = await import("../../../libs/env-tools/directory-exists.js");
const { pathExists } = await import("../../../libs/env-tools/path-exists.js");
const { collectEnvFiles } = await import("../../../libs/env-tools/collect-env-files.js");
const { runCommand } = await import("../../../libs/env-tools/run-command.js");

describe("UT-SCRIPTS-10: decryptProjectEnv", () => {
  const project = { name: "web", relativePath: "apps/web" } as const;
  const options = { rootDir: "/repo", password: "secret" } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("プロジェクトディレクトリが見つからない場合はスキップすること", async () => {
    vi.mocked(directoryExists).mockResolvedValue(false);

    const result = await decryptProjectEnv(project, options);

    expect(result.status).toBe("skipped");
    expect(result.message).toMatch(/Directory not found/);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("アーカイブが存在しない場合はスキップすること", async () => {
    vi.mocked(directoryExists).mockResolvedValue(true);
    vi.mocked(pathExists).mockResolvedValue(false);

    const result = await decryptProjectEnv(project, options);

    expect(result.status).toBe("skipped");
    expect(result.message).toContain(getEncryptedArchiveName());
  });

  it("アーカイブを解凍し復元されたファイルを報告すること", async () => {
    vi.mocked(directoryExists).mockResolvedValue(true);
    vi.mocked(pathExists).mockResolvedValue(true);
    vi.mocked(collectEnvFiles).mockResolvedValue([".env"]);
    vi.mocked(runCommand).mockResolvedValue();

    const result = await decryptProjectEnv(project, options);

    expect(runCommand).toHaveBeenCalledWith(
      "unzip",
      ["-o", "-P", options.password, getEncryptedArchiveName()],
      { cwd: `${options.rootDir}/${project.relativePath}` }
    );
    expect(result).toEqual({
      kind: "decrypt",
      project,
      status: "success",
      files: [".env"],
    });
  });
});

// EOF
