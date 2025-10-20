// getEncryptedArchiveName の返却値を検証するシンプルなテスト。
import { describe, expect, it } from "vitest";
import { getEncryptedArchiveName } from "../../../libs/env-tools/get-encrypted-archive-name.js";

describe("UT-SCRIPTS-02: getEncryptedArchiveName", () => {
  it("期待されるアーカイブファイル名を返すこと", () => {
    expect(getEncryptedArchiveName()).toBe("env.encrypted.zip");
  });

  it("複数回呼び出しても同じ値を返すこと", () => {
    const first = getEncryptedArchiveName();
    const second = getEncryptedArchiveName();

    expect(first).toBe(second);
  });
});

// EOF
