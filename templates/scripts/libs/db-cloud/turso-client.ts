/**
 * Turso CLI とのやり取りを担うユーティリティ集。
 * JSON 出力に対応していない CLI にもフォールバックし、プレーンテキストを解析する。
 */
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AUTHENTICATION_TOKEN_INLINE_REGEX,
  DATABASE_NAME_PATTERN,
  JSON_FLAG_ERROR_REGEX,
  LINE_SPLIT_REGEX,
  LOCATION_SPLIT_REGEX,
  TOKEN_DIRECT_REGEX,
  TOKEN_LABEL_REGEX,
  TOKEN_PREFIX_REGEX,
  TOKEN_VISIBLE_SEGMENT,
  TURSO_LIST_DIVIDER_REGEX,
  TURSO_LIST_HEADER_REGEX,
  TURSO_SHOW_KEY_REGEX,
  WHITESPACE_SPLIT_REGEX,
} from "./constants.js";
import type { TursoClientDeps, TursoDatabaseDetails } from "./types.js";

export type TokenAttemptResult =
  | { readonly success: true; readonly token: string }
  | { readonly success: false; readonly error?: string };

export function isJsonFlagUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return JSON_FLAG_ERROR_REGEX.test(message);
}

export async function collectExistingDatabases(deps: TursoClientDeps): Promise<readonly string[]> {
  let stdout: string;
  let usedJson = true;
  try {
    stdout = await deps.runCommandCapture("turso", ["db", "list", "--json"]);
  } catch (error) {
    if (!isJsonFlagUnsupported(error)) {
      throw error;
    }
    stdout = await deps.runCommandCapture("turso", ["db", "list"]);
    usedJson = false;
  }

  if (!usedJson) {
    return parseTursoDbListPlain(stdout);
  }

  try {
    const parsed = JSON.parse(stdout) as {
      readonly databases?: readonly { readonly name?: string }[];
      readonly Databases?: readonly { readonly name?: string; readonly Name?: string }[];
    };
    const entries = parsed.databases ?? parsed.Databases ?? [];
    return entries
      .map((entry) => entry.name ?? (entry as Record<string, unknown>).Name?.toString() ?? "")
      .filter((name): name is string => Boolean(name));
  } catch (error) {
    throw new Error(
      [
        "Turso CLI の出力を解析できませんでした。",
        error instanceof Error ? error.message : String(error),
        `Raw output: ${stdout}`,
      ].join("\n")
    );
  }
}

export async function createTursoDatabase(
  deps: TursoClientDeps,
  dbName: string,
  primaryRegion: string | undefined
): Promise<void> {
  const args: string[] = ["db", "create", dbName];
  if (primaryRegion) {
    args.push("--location", primaryRegion);
  }
  await deps.runCommand("turso", args);
}

export async function destroyTursoDatabase(deps: TursoClientDeps, dbName: string): Promise<void> {
  await deps.runCommand("turso", ["db", "destroy", dbName, "--yes"]);
}

export async function executeSql(
  deps: TursoClientDeps,
  dbName: string,
  sql: string
): Promise<void> {
  const tempFile = join(tmpdir(), `turso-schema-${Date.now()}.sql`);
  await writeFile(tempFile, sql, "utf8");
  try {
    await deps.runCommand("bash", ["-lc", `turso db shell ${dbName} < '${tempFile}'`]);
  } finally {
    await unlink(tempFile).catch(() => {
      // 一時ファイルの削除に失敗しても無視する
    });
  }
}

export async function getTursoDatabaseDetails(
  deps: TursoClientDeps,
  dbName: string
): Promise<TursoDatabaseDetails> {
  let stdout: string;
  let usedJson = true;
  try {
    stdout = await deps.runCommandCapture("turso", ["db", "show", dbName, "--json"]);
  } catch (error) {
    if (!isJsonFlagUnsupported(error)) {
      throw error;
    }
    stdout = await deps.runCommandCapture("turso", ["db", "show", dbName]);
    usedJson = false;
  }

  if (!usedJson) {
    return parseTursoDbShowPlain(stdout, dbName);
  }

  const parsed = JSON.parse(stdout) as {
    readonly database?: Record<string, unknown>;
    readonly Database?: Record<string, unknown>;
  };
  const payload = (parsed.database ?? parsed.Database ?? {}) as Record<string, unknown>;
  const name = extractStringField(payload, ["name", "Name"]) ?? dbName;
  const url = extractStringField(payload, ["DbUri", "dbUri", "Url", "url"]);
  if (!url) {
    throw new Error(`データベース ${dbName} の URL が取得できませんでした。
Raw response: ${stdout}`);
  }

  const hostname = extractStringField(payload, ["Hostname", "hostname"]);
  const locations = extractStringArrayField(payload, ["Locations", "locations"]);
  return { name, url, hostname, locations };
}

export async function issueTursoToken(deps: TursoClientDeps, dbName: string): Promise<string> {
  const variants: readonly {
    readonly args: readonly string[];
    readonly allowJson: boolean;
  }[] = [
    { args: ["db", "tokens", "create", dbName], allowJson: false },
    { args: ["db", "tokens", "issue", dbName], allowJson: false },
  ];

  const errors: string[] = [];
  for (const variant of variants) {
    const result = await attemptTokenExtraction(deps, variant.args, variant.allowJson);
    if (result.success) {
      return result.token;
    }
    if (result.error) {
      errors.push(result.error);
    }
  }

  throw new Error(
    [`データベース ${dbName} の認証トークンを取得できませんでした。`, ...errors].join("\n\n")
  );
}

async function attemptTokenExtraction(
  deps: TursoClientDeps,
  baseArgs: readonly string[],
  allowJson: boolean
): Promise<TokenAttemptResult> {
  const outputs: string[] = [];

  /* c8 ignore start */
  if (allowJson) {
    try {
      const stdoutJson = await deps.runCommandCapture("turso", [...baseArgs, "--json"]);
      outputs.push(`JSON 出力:\n${stdoutJson}`);
      const token = extractToken(stdoutJson);
      if (token) {
        return { success: true, token };
      }
    } catch (error) {
      if (!isJsonFlagUnsupported(error)) {
        return { success: false, error: formatCommandError(baseArgs, error) };
      }
    }
  }
  /* c8 ignore stop */

  try {
    const stdoutPlain = await deps.runCommandCapture("turso", baseArgs);
    outputs.push(`標準出力:\n${stdoutPlain}`);
    const token = extractToken(stdoutPlain);
    if (token) {
      return { success: true, token };
    }
    return { success: false, error: formatNoTokenError(baseArgs, outputs) };
  } catch (error) {
    return { success: false, error: formatCommandError(baseArgs, error) };
  }
}

function formatCommandError(baseArgs: readonly string[], error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `コマンド "turso ${baseArgs.join(" ")}" が失敗しました: ${message}`;
}

function formatNoTokenError(baseArgs: readonly string[], outputs: readonly string[]): string {
  return [
    `コマンド "turso ${baseArgs.join(" ")}" は成功しましたが、トークンを出力しませんでした。`,
    ...outputs,
  ].join("\n\n");
}

export function extractToken(rawOutput: string): string | undefined {
  if (!rawOutput.trim()) {
    return;
  }

  try {
    const parsed = JSON.parse(rawOutput) as
      | { readonly token?: string; readonly Token?: string }
      | { readonly authentication_token?: string };
    if (parsed) {
      const token =
        parsed.token ?? parsed.Token ?? (parsed as Record<string, unknown>).authentication_token;
      if (typeof token === "string" && token.trim().length > 0) {
        return token.trim();
      }
    }
  } catch {
    // JSON でなければテキスト解析に切り替える
  }

  const lines = rawOutput
    .split(LINE_SPLIT_REGEX)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const inlineToken = lines
    .map((line) => line.match(AUTHENTICATION_TOKEN_INLINE_REGEX)?.[1]?.trim())
    .find((value) => value && value.length > 0);
  if (inlineToken) {
    return inlineToken;
  }

  const directMatch = lines.find((line) => TOKEN_DIRECT_REGEX.test(line));
  if (directMatch) {
    return directMatch;
  }

  const labelIndex = lines.findIndex((line) =>
    line.toLowerCase().startsWith("authentication token")
  );
  if (labelIndex >= 0) {
    const candidate = lines[labelIndex + 1];
    if (candidate) {
      return candidate.replace(TOKEN_PREFIX_REGEX, "").trim();
    }
  }

  const tokenLine = lines.find((line) => TOKEN_LABEL_REGEX.test(line));
  if (tokenLine) {
    return tokenLine.replace(TOKEN_LABEL_REGEX, "").trim();
  }

  return;
}

export function parseTursoDbListPlain(raw: string): readonly string[] {
  const lines = raw
    .split(LINE_SPLIT_REGEX)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const names: string[] = [];
  for (const line of lines) {
    if (TURSO_LIST_HEADER_REGEX.test(line) || TURSO_LIST_DIVIDER_REGEX.test(line)) {
      continue;
    }
    const firstToken = line.split(WHITESPACE_SPLIT_REGEX)[0];
    if (firstToken && DATABASE_NAME_PATTERN.test(firstToken)) {
      names.push(firstToken);
    }
  }
  return names;
}

export function parseTursoDbShowPlain(raw: string, dbName: string): TursoDatabaseDetails {
  const map = new Map<string, string>();
  const lines = raw
    .split(LINE_SPLIT_REGEX)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const match = line.match(TURSO_SHOW_KEY_REGEX);
    if (!match) {
      continue;
    }
    const [, keyRaw, value] = match;
    const normalizedKey = keyRaw.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedKey.length > 0) {
      map.set(normalizedKey, value.trim());
    }
  }

  const name = map.get("name") ?? dbName;
  const url = map.get("dburi") ?? map.get("uri") ?? map.get("url");
  if (!url) {
    throw new Error(
      [
        `データベース ${dbName} の URL が平文出力から特定できませんでした。`,
        `Raw output: ${raw}`,
      ].join("\n")
    );
  }

  const hostname = map.get("hostname");
  const rawLocations = map.get("locations");
  let locations: readonly string[] | undefined;
  if (rawLocations) {
    try {
      const parsed = JSON.parse(rawLocations);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (entry: unknown): entry is string => typeof entry === "string" && entry.length > 0
        );
        if (filtered.length > 0) {
          locations = filtered;
        }
      }
    } catch {
      const fallback = rawLocations
        .split(LOCATION_SPLIT_REGEX)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      if (fallback.length > 0) {
        locations = fallback;
      }
    }
  }

  return { name, url, hostname, locations };
}

function extractStringField(
  payload: Record<string, unknown>,
  keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return;
}

function extractStringArrayField(
  payload: Record<string, unknown>,
  keys: readonly string[]
): readonly string[] | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      const filtered = value.filter(
        (entry): entry is string => typeof entry === "string" && entry.length > 0
      );
      if (filtered.length > 0) {
        return filtered;
      }
    }
  }
  return;
}

export function formatTokenPreview(token: string): string {
  if (token.length <= TOKEN_VISIBLE_SEGMENT * 2) {
    return token;
  }
  const prefix = token.slice(0, TOKEN_VISIBLE_SEGMENT);
  const suffix = token.slice(-TOKEN_VISIBLE_SEGMENT);
  return `${prefix}…${suffix}`;
}

// EOF
