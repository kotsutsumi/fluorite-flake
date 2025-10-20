import { describe, expect, it, vi } from "vitest";

import {
  applyEnvUpdates,
  createEnvManagerDeps,
  formatEnvValue,
  formatTokenPreview,
  inferDatabaseNameFromUrl,
  parseEnvContent,
  saveCredentialsToEnv,
  stripQuotes,
} from "../../../libs/db-cloud/env-manager.js";
import type { EnvironmentCredentials, EnvManagerDeps } from "../../../libs/db-cloud/types.js";

describe("applyEnvUpdates", () => {
  it("updates existing keys and appends missing ones", () => {
    const current = "DATABASE_URL=old\n";
    const updated = applyEnvUpdates(current, {
      DATABASE_URL: "new",
      TURSO_AUTH_TOKEN: "token",
    });
    expect(updated).toBe("DATABASE_URL=new\nTURSO_AUTH_TOKEN=token\n");
  });

  it("skips lines without assignment pattern", () => {
    const current = "# comment\nKEY=value\ninvalid line\n";
    const updated = applyEnvUpdates(current, { KEY: "new" });
    expect(updated).toContain("KEY=new");
    expect(updated).toContain("# comment");
    expect(updated).toContain("invalid line");
  });
});

describe("formatEnvValue", () => {
  it("quotes complex values", () => {
    expect(formatEnvValue("value with space")).toBe('"value with space"');
  });
});

describe("parseEnvContent", () => {
  it("parses simple env files", () => {
    const map = parseEnvContent("A=1\nB=2\n# comment\n");
    expect(map.get("A")).toBe("1");
    expect(map.get("B")).toBe("2");
  });

  it("skips lines without key=value pattern", () => {
    const map = parseEnvContent("KEY=value\ninvalid line without equals\n# comment\n");
    expect(map.get("KEY")).toBe("value");
    expect(map.size).toBe(1);
  });
});

describe("formatTokenPreview", () => {
  it("shows full token when short", () => {
    expect(formatTokenPreview("abc")).toBe("abc");
  });

  it("truncates long tokens", () => {
    const longToken = "a".repeat(50);
    const preview = formatTokenPreview(longToken);
    expect(preview).toContain("…");
    expect(preview.length).toBeLessThan(longToken.length);
  });
});

describe("stripQuotes", () => {
  it("removes double quotes", () => {
    expect(stripQuotes('"value"')).toBe("value");
  });

  it("removes single quotes", () => {
    expect(stripQuotes("'value'")).toBe("value");
  });

  it("preserves values without quotes", () => {
    expect(stripQuotes("value")).toBe("value");
  });
});

describe("inferDatabaseNameFromUrl", () => {
  it("extracts name from turso URL", () => {
    const name = inferDatabaseNameFromUrl("libsql://mydb-example.turso.io");
    expect(name).toBe("mydb-example");
  });

  it("returns undefined for invalid URLs", () => {
    expect(inferDatabaseNameFromUrl("not-a-url")).toBeUndefined();
  });

  it("extracts hostname prefix from any URL", () => {
    expect(inferDatabaseNameFromUrl("https://example.com")).toBe("example");
  });

  it("returns undefined when hostname is empty", () => {
    expect(inferDatabaseNameFromUrl("file:///path/to/file")).toBeUndefined();
  });
});

describe("createEnvManagerDeps", () => {
  it("creates dependencies object", () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const fs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      exists: vi.fn(),
    };
    const deps = createEnvManagerDeps(logger, fs);
    expect(deps).toHaveProperty("readFile");
    expect(deps).toHaveProperty("writeFile");
    expect(deps).toHaveProperty("mkdir");
    expect(deps).toHaveProperty("exists");
    expect(deps).toHaveProperty("logger");
  });
});

describe("saveCredentialsToEnv", () => {
  it("writes credentials to env file", async () => {
    const mockReadFile = vi.fn().mockResolvedValue("EXISTING_VAR=value\n");
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockExists = vi.fn().mockReturnValue(true);
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: EnvManagerDeps = {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      exists: mockExists,
      logger: mockLogger,
    };

    const credentials: EnvironmentCredentials = {
      env: "preview",
      databaseUrl: "libsql://test.turso.io",
      authToken: "test-token",
      databaseName: "test-db",
    };

    await saveCredentialsToEnv(deps, "/test/backend", credentials);

    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith("📝 apps/backend/.env.preview を更新しました。");
  });

  it("creates directory if it doesn't exist", async () => {
    const mockReadFile = vi.fn().mockResolvedValue("");
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockExists = vi.fn().mockReturnValue(false);
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: EnvManagerDeps = {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      exists: mockExists,
      logger: mockLogger,
    };

    const credentials: EnvironmentCredentials = {
      env: "staging",
      databaseUrl: "libsql://test.turso.io",
      authToken: "test-token",
      databaseName: "test-db",
    };

    await saveCredentialsToEnv(deps, "/test/backend", credentials);

    expect(mockMkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it("handles ENOENT error when reading file", async () => {
    const enoentError = new Error("File not found") as NodeJS.ErrnoException;
    enoentError.code = "ENOENT";
    const mockReadFile = vi.fn().mockRejectedValue(enoentError);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockExists = vi.fn().mockReturnValue(true);
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: EnvManagerDeps = {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      exists: mockExists,
      logger: mockLogger,
    };

    const credentials: EnvironmentCredentials = {
      env: "production",
      databaseUrl: "libsql://test.turso.io",
      authToken: "test-token",
      databaseName: "test-db",
    };

    await saveCredentialsToEnv(deps, "/test/backend", credentials);

    expect(mockWriteFile).toHaveBeenCalled();
  });

  it("rethrows non-ENOENT errors when reading file", async () => {
    const permissionError = new Error("Permission denied") as NodeJS.ErrnoException;
    permissionError.code = "EACCES";
    const mockReadFile = vi.fn().mockRejectedValue(permissionError);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockExists = vi.fn().mockReturnValue(true);
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: EnvManagerDeps = {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      exists: mockExists,
      logger: mockLogger,
    };

    const credentials: EnvironmentCredentials = {
      env: "staging",
      databaseUrl: "libsql://test.turso.io",
      authToken: "test-token",
      databaseName: "test-db",
    };

    await expect(saveCredentialsToEnv(deps, "/test/backend", credentials)).rejects.toThrow(
      "Permission denied"
    );
  });
});

// EOF
