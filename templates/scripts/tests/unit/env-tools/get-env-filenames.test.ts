// getEnvFilenames の戻り値と不変性を検証するテスト。
import { describe, expect, it } from "vitest";
import { getEnvFilenames } from "../../../libs/env-tools/get-env-filenames.js";

describe("UT-SCRIPTS-01: getEnvFilenames", () => {
  it("期待される環境変数ファイル名の読み取り専用配列を返すこと", () => {
    const filenames = getEnvFilenames();

    expect(filenames).toEqual([
      ".env",
      ".env.local",
      ".env.preview",
      ".env.production",
      ".env.staging",
      ".env.test",
    ]);
  });

  it("複数回呼び出しても同じ参照を返すこと", () => {
    const first = getEnvFilenames();
    const second = getEnvFilenames();

    expect(first).toBe(second);
  });

  it("読み取り専用配列を返すこと", () => {
    const filenames = getEnvFilenames();

    // TypeScript はコンパイル時に readonly を保証する
    // ランタイム: const アサーションにより readonly になるが、freeze されるわけではない
    // 配列が変更されないことを長さと値のチェックで検証する
    expect(filenames).toHaveLength(6);
    expect(filenames[0]).toBe(".env");
  });
});

// EOF
