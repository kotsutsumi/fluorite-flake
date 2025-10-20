import { describe, expect, it, vi } from "vitest";

import {
  collectExistingDatabases,
  createTursoDatabase,
  destroyTursoDatabase,
  executeSql,
  extractToken,
  formatTokenPreview,
  getTursoDatabaseDetails,
  isJsonFlagUnsupported,
  issueTursoToken,
  parseTursoDbListPlain,
  parseTursoDbShowPlain,
} from "../../../libs/db-cloud/turso-client.js";
import type { TursoClientDeps } from "../../../libs/db-cloud/types.js";

describe("parseTursoDbListPlain", () => {
  it("extracts database names from plain text", () => {
    const plain = "Name\n------\napp-preview\napp-staging\n";
    expect(parseTursoDbListPlain(plain)).toEqual(["app-preview", "app-staging"]);
  });
});

describe("parseTursoDbShowPlain", () => {
  it("parses key/value pairs", () => {
    const plain = 'Name : sample-preview\nDbUri : libsql://example\nLocations : ["fra", "iad"]';
    const details = parseTursoDbShowPlain(plain, "sample-preview");
    expect(details.url).toBe("libsql://example");
    expect(details.locations).toEqual(["fra", "iad"]);
  });

  it("handles locations as comma-separated string", () => {
    const plain = "Name : test-db\nDbUri : libsql://example\nLocations : fra, iad, nrt";
    const details = parseTursoDbShowPlain(plain, "test-db");
    expect(details.url).toBe("libsql://example");
    expect(details.locations).toEqual(["fra", "iad", "nrt"]);
  });

  it("throws error when URL is missing", () => {
    const plain = "Name : test-db\nSomeOtherField : value";
    expect(() => parseTursoDbShowPlain(plain, "test-db")).toThrow(
      "URL が平文出力から特定できませんでした"
    );
  });

  it("uses dbName as fallback when name is missing", () => {
    const plain = "DbUri : libsql://example";
    const details = parseTursoDbShowPlain(plain, "fallback-name");
    expect(details.name).toBe("fallback-name");
  });

  it("handles hostname field", () => {
    const plain = "Name : test-db\nDbUri : libsql://example\nHostname : example.turso.io";
    const details = parseTursoDbShowPlain(plain, "test-db");
    expect(details.hostname).toBe("example.turso.io");
  });

  it("ignores lines without key-value pattern", () => {
    const plain =
      "Name : test-db\nDbUri : libsql://example\nInvalid line without colon\n--- separator ---";
    const details = parseTursoDbShowPlain(plain, "test-db");
    expect(details.url).toBe("libsql://example");
    expect(details.name).toBe("test-db");
  });
});

describe("extractToken", () => {
  it("reads token from plain output", () => {
    const plain = "Authentication token:\nabc123xyz789";
    expect(extractToken(plain)).toBe("abc123xyz789");
  });

  it("reads token from JSON output with lowercase token field", () => {
    const json = JSON.stringify({ token: "secret-token" });
    expect(extractToken(json)).toBe("secret-token");
  });

  it("reads token from JSON output with uppercase Token field", () => {
    const json = JSON.stringify({ Token: "secret-token-upper" });
    expect(extractToken(json)).toBe("secret-token-upper");
  });

  it("reads token from JSON output with authentication_token field", () => {
    const json = JSON.stringify({ authentication_token: "auth-token-123" });
    expect(extractToken(json)).toBe("auth-token-123");
  });

  it("returns undefined for empty string", () => {
    expect(extractToken("")).toBeUndefined();
    expect(extractToken("   ")).toBeUndefined();
  });

  it("extracts inline token", () => {
    const output = "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    expect(extractToken(output)).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  });

  it("extracts direct token match", () => {
    const output = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";
    expect(extractToken(output)).toBe(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0"
    );
  });

  it("extracts token from labeled line", () => {
    const output = "authentication token: my-labeled-token";
    expect(extractToken(output)).toBe("my-labeled-token");
  });
});

describe("formatTokenPreview", () => {
  it("shortens long tokens", () => {
    expect(formatTokenPreview("abcdefghijklmnop")).toBe("abcde…lmnop");
  });

  it("keeps short tokens as is", () => {
    expect(formatTokenPreview("short")).toBe("short");
  });
});

describe("isJsonFlagUnsupported", () => {
  it("detects unsupported --json flag error", () => {
    const error = new Error("unknown flag: --json");
    expect(isJsonFlagUnsupported(error)).toBe(true);
  });

  it("returns false for other errors", () => {
    const error = new Error("Some other error");
    expect(isJsonFlagUnsupported(error)).toBe(false);
  });

  it("returns false for non-error objects", () => {
    expect(isJsonFlagUnsupported("string error")).toBe(false);
  });
});

describe("collectExistingDatabases", () => {
  it("collects database names from turso CLI", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        databases: [{ name: "db1-preview" }, { name: "db2-staging" }],
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await collectExistingDatabases(deps);
    expect(result).toEqual(["db1-preview", "db2-staging"]);
  });

  it("handles uppercase Databases field", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        Databases: [{ Name: "db3-production" }, { name: "db4-staging" }],
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await collectExistingDatabases(deps);
    expect(result).toEqual(["db3-production", "db4-staging"]);
  });

  it("throws error when JSON parsing fails", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue("invalid json");
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    await expect(collectExistingDatabases(deps)).rejects.toThrow(
      "Turso CLI の出力を解析できませんでした"
    );
  });

  it("falls back to plain text when --json is unsupported", async () => {
    const mockRunCommandCapture = vi
      .fn()
      .mockRejectedValueOnce(new Error("unknown flag: --json"))
      .mockResolvedValueOnce("Name\n------\ndb1-preview\ndb2-staging\n");
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await collectExistingDatabases(deps);
    expect(result).toEqual(["db1-preview", "db2-staging"]);
  });

  it("rethrows non-json-flag errors", async () => {
    const mockRunCommandCapture = vi.fn().mockRejectedValue(new Error("Network error"));
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    await expect(collectExistingDatabases(deps)).rejects.toThrow("Network error");
  });

  it("handles JSON response with neither databases nor Databases field", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        // Neither databases nor Databases field present
        someOtherField: "value",
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await collectExistingDatabases(deps);
    expect(result).toEqual([]);
  });

  it("handles database entries with Name instead of name", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        Databases: [{ Name: "db1-with-capital-name" }, { Name: "db2-with-capital-name" }],
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await collectExistingDatabases(deps);
    expect(result).toEqual(["db1-with-capital-name", "db2-with-capital-name"]);
  });

  it("filters out entries with missing names", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        databases: [{ name: "valid-db" }, { name: "" }, { otherField: "no-name" }],
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await collectExistingDatabases(deps);
    expect(result).toEqual(["valid-db"]);
  });

  it("handles non-Error thrown during JSON parsing", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue("Invalid JSON {{{");
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    await expect(collectExistingDatabases(deps)).rejects.toThrow(
      "Turso CLI の出力を解析できませんでした"
    );
  });

  it("handles non-Error value thrown during JSON parsing", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue('{"databases":[]}');
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    // Mock JSON.parse to throw a non-Error value
    const originalParse = JSON.parse;
    JSON.parse = vi.fn().mockImplementation(() => {
      // biome-ignore lint/style/useThrowOnlyError: Must throw non-Error to test String(error) branch
      throw "Non-Error string thrown";
    });

    try {
      await expect(collectExistingDatabases(deps)).rejects.toThrow(
        "Turso CLI の出力を解析できませんでした"
      );
    } finally {
      // Restore original JSON.parse
      JSON.parse = originalParse;
    }
  });
});

describe("createTursoDatabase", () => {
  it("creates database with turso CLI and location", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue(undefined);
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: mockRunCommand,
      runCommandCapture: vi.fn(),
      logger: mockLogger,
    };

    await createTursoDatabase(deps, "test-db", "fra");
    expect(mockRunCommand).toHaveBeenCalledWith("turso", [
      "db",
      "create",
      "test-db",
      "--location",
      "fra",
    ]);
  });

  it("creates database without location", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue(undefined);
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: mockRunCommand,
      runCommandCapture: vi.fn(),
      logger: mockLogger,
    };

    await createTursoDatabase(deps, "test-db", undefined);
    expect(mockRunCommand).toHaveBeenCalledWith("turso", ["db", "create", "test-db"]);
  });
});

describe("destroyTursoDatabase", () => {
  it("destroys database with turso CLI", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue(undefined);
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: mockRunCommand,
      runCommandCapture: vi.fn(),
      logger: mockLogger,
    };

    await destroyTursoDatabase(deps, "test-db");
    expect(mockRunCommand).toHaveBeenCalledWith("turso", ["db", "destroy", "test-db", "--yes"]);
  });
});

describe("executeSql", () => {
  it("executes SQL with turso CLI", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue(undefined);
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: mockRunCommand,
      runCommandCapture: vi.fn(),
      logger: mockLogger,
    };

    await executeSql(deps, "test-db", "CREATE TABLE users (id INTEGER);");
    expect(mockRunCommand).toHaveBeenCalled();
  });
});

describe("getTursoDatabaseDetails", () => {
  it("gets database details from turso CLI with JSON output", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        database: {
          name: "test-db",
          DbUri: "libsql://test.turso.io",
          Locations: ["fra"],
        },
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await getTursoDatabaseDetails(deps, "test-db");
    expect(result.url).toBe("libsql://test.turso.io");
    expect(result.locations).toEqual(["fra"]);
  });

  it("handles uppercase Database field", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        Database: {
          Name: "test-db",
          DbUri: "libsql://test.turso.io",
          Locations: ["iad"],
        },
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await getTursoDatabaseDetails(deps, "test-db");
    expect(result.url).toBe("libsql://test.turso.io");
    expect(result.locations).toEqual(["iad"]);
  });

  it("falls back to plain text when --json is unsupported", async () => {
    const mockRunCommandCapture = vi
      .fn()
      .mockRejectedValueOnce(new Error("unknown flag: --json"))
      .mockResolvedValueOnce('Name : test-db\nDbUri : libsql://test.turso.io\nLocations : ["fra"]');
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await getTursoDatabaseDetails(deps, "test-db");
    expect(result.url).toBe("libsql://test.turso.io");
    expect(result.locations).toEqual(["fra"]);
  });

  it("throws error when URL is missing", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        database: {
          name: "test-db",
          // DbUri is missing
        },
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    await expect(getTursoDatabaseDetails(deps, "test-db")).rejects.toThrow(
      "URL が取得できませんでした"
    );
  });

  it("rethrows non-json-flag errors", async () => {
    const mockRunCommandCapture = vi.fn().mockRejectedValue(new Error("Network error"));
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    await expect(getTursoDatabaseDetails(deps, "test-db")).rejects.toThrow("Network error");
  });

  it("handles missing locations field", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        database: {
          name: "test-db",
          DbUri: "libsql://test.turso.io",
          // Locations field is missing
        },
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await getTursoDatabaseDetails(deps, "test-db");
    expect(result.url).toBe("libsql://test.turso.io");
    expect(result.locations).toBeUndefined();
  });

  it("handles empty locations array", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        database: {
          name: "test-db",
          DbUri: "libsql://test.turso.io",
          Locations: [],
        },
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await getTursoDatabaseDetails(deps, "test-db");
    expect(result.url).toBe("libsql://test.turso.io");
    expect(result.locations).toBeUndefined();
  });

  it("handles JSON response with neither database nor Database field", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue(
      JSON.stringify({
        // Neither database nor Database field present
        someOtherField: "value",
      })
    );
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    // Should throw because URL is missing when payload is empty
    await expect(getTursoDatabaseDetails(deps, "test-db")).rejects.toThrow(
      "URL が取得できませんでした"
    );
  });
});

describe("issueTursoToken", () => {
  it("issues token from turso CLI with first variant", async () => {
    const mockRunCommandCapture = vi
      .fn()
      .mockResolvedValue("Authentication token:\ntest-token-123");
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await issueTursoToken(deps, "test-db");
    expect(result).toBe("test-token-123");
  });

  it("falls back to second variant when first fails", async () => {
    const mockRunCommandCapture = vi
      .fn()
      .mockRejectedValueOnce(new Error("Command not found: create"))
      .mockResolvedValueOnce("Authentication token:\nfallback-token-456");
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    const result = await issueTursoToken(deps, "test-db");
    expect(result).toBe("fallback-token-456");
  });

  it("throws error when all variants fail", async () => {
    const mockRunCommandCapture = vi.fn().mockRejectedValue(new Error("Command failed"));
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    await expect(issueTursoToken(deps, "test-db")).rejects.toThrow(
      "認証トークンを取得できませんでした"
    );
  });

  it("throws error when no token is found in output", async () => {
    const mockRunCommandCapture = vi.fn().mockResolvedValue("No token here");
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    await expect(issueTursoToken(deps, "test-db")).rejects.toThrow(
      "認証トークンを取得できませんでした"
    );
  });

  it("formats error message when non-Error is thrown", async () => {
    const mockRunCommandCapture = vi.fn().mockRejectedValue("String error message");
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const deps: TursoClientDeps = {
      runCommand: vi.fn(),
      runCommandCapture: mockRunCommandCapture,
      logger: mockLogger,
    };

    await expect(issueTursoToken(deps, "test-db")).rejects.toThrow("String error message");
  });
});

// EOF
