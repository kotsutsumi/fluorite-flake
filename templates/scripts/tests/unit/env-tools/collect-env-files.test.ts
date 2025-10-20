// collectEnvFiles の振る舞いを検証するユニットテスト。
import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectEnvFiles } from "../../../libs/env-tools/collect-env-files.js";
import { getEnvFilenames } from "../../../libs/env-tools/get-env-filenames.js";
import { pathExists } from "../../../libs/env-tools/path-exists.js";

// 依存モジュールをモックする
vi.mock("../../../libs/env-tools/path-exists.js", () => ({
  pathExists: vi.fn(),
}));

vi.mock("../../../libs/env-tools/get-env-filenames.js", () => ({
  getEnvFilenames: vi.fn(),
}));

describe("UT-SCRIPTS-05: collectEnvFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック: 標準的な env ファイル名を返す
    vi.mocked(getEnvFilenames).mockReturnValue([
      ".env",
      ".env.local",
      ".env.preview",
      ".env.production",
      ".env.staging",
      ".env.test",
    ]);
  });

  it("存在するすべての環境変数ファイルを返すこと", async () => {
    vi.mocked(pathExists).mockImplementation((path: string) =>
      Promise.resolve(path.includes(".env.preview") || path.includes(".env.production"))
    );

    const result = await collectEnvFiles("/project/root");

    expect(result).toEqual([".env.preview", ".env.production"]);
    expect(pathExists).toHaveBeenCalledTimes(6);
  });

  it("環境変数ファイルが存在しない場合は空配列を返すこと", async () => {
    vi.mocked(pathExists).mockResolvedValue(false);

    const result = await collectEnvFiles("/project/root");

    expect(result).toEqual([]);
  });

  it("すべてのファイルが存在する場合はすべてを返すこと", async () => {
    vi.mocked(pathExists).mockResolvedValue(true);

    const result = await collectEnvFiles("/project/root");

    expect(result).toEqual([
      ".env",
      ".env.local",
      ".env.preview",
      ".env.production",
      ".env.staging",
      ".env.test",
    ]);
  });

  it("各ファイルを正しいパスでチェックすること", async () => {
    vi.mocked(pathExists).mockResolvedValue(false);

    await collectEnvFiles("/apps/backend");

    expect(pathExists).toHaveBeenCalledWith("/apps/backend/.env");
    expect(pathExists).toHaveBeenCalledWith("/apps/backend/.env.local");
    expect(pathExists).toHaveBeenCalledWith("/apps/backend/.env.preview");
    expect(pathExists).toHaveBeenCalledWith("/apps/backend/.env.production");
    expect(pathExists).toHaveBeenCalledWith("/apps/backend/.env.staging");
    expect(pathExists).toHaveBeenCalledWith("/apps/backend/.env.test");
  });

  it("存在するファイルの順序を保持すること", async () => {
    vi.mocked(pathExists).mockImplementation((path: string) =>
      Promise.resolve(path.includes(".env.production") || path.includes(".env.staging"))
    );

    const result = await collectEnvFiles("/project");

    // getEnvFilenames から得られる元の順序を保持すること
    expect(result).toEqual([".env.production", ".env.staging"]);
  });
});

// EOF
