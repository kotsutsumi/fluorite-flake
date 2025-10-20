import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { normalizeValue, readEnvMap } from "../../../libs/env-push/index.js";

describe("readEnvMap", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "env-push-read-"));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("parses key/value pairs while skipping comments", async () => {
    const file = join(dir, ".env.preview");
    await writeFile(
      file,
      `# comment\nFOO=bar\nexport BAZ='quoted'\nMULTI="line\\nvalue"\nEMPTY=\n`
    );

    const result = await readEnvMap(file);
    expect(Object.fromEntries(result.entries())).toEqual({
      FOO: "bar",
      BAZ: "quoted",
      MULTI: "line\nvalue",
      EMPTY: "",
    });
  });

  it("skips invalid lines with no key", async () => {
    const file = join(dir, ".env.invalid");
    await writeFile(file, "=value\nKEY=value\n   =another");

    const result = await readEnvMap(file);
    expect(Object.fromEntries(result.entries())).toEqual({
      KEY: "value",
    });
  });
});

describe("normalizeValue", () => {
  it("returns raw value for unquoted strings", () => {
    expect(normalizeValue("plain")).toBe("plain");
  });

  it("handles double quoted escapes", () => {
    expect(normalizeValue('"a\\nb"')).toBe("a\nb");
  });

  it("trims trailing newlines from double quoted values", () => {
    expect(normalizeValue('"development\\n"')).toBe("development");
    expect(normalizeValue('"value\\r\\n"')).toBe("value");
    expect(normalizeValue('"multiple\\n\\n\\n"')).toBe("multiple");
  });

  it("preserves internal newlines in double quoted values", () => {
    expect(normalizeValue('"line1\\nline2"')).toBe("line1\nline2");
    expect(normalizeValue('"line1\\nline2\\n"')).toBe("line1\nline2");
  });

  it("trims trailing newlines from unquoted values", () => {
    expect(normalizeValue("development\n")).toBe("development");
    expect(normalizeValue("value\r\n")).toBe("value");
  });

  it("handles single quoted values without escape processing", () => {
    expect(normalizeValue("'value\\n'")).toBe("value\\n");
  });
});
