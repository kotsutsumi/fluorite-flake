// .env ファイルを読み込み、キーと値のマップに変換するヘルパー。
// env ファイルのフォーマット差異（export 付き、引用符、エスケープなど）を
// 一箇所で吸収することで、他のモジュールがロジックに集中できるようにする。
import { readFile } from "node:fs/promises";

export type EnvDictionary = Map<string, string>;

const LINE_SPLIT_REGEX = /\r?\n/;
const EXPORT_PREFIX = /^export\s+/;
const KEY_VALUE_SEPARATOR = /=/;
const TRAILING_NEWLINE_REGEX = /[\r\n]+$/;

export async function readEnvMap(filePath: string): Promise<EnvDictionary> {
  const content = await readFile(filePath, "utf8");
  const env = new Map<string, string>();

  for (const rawLine of content.split(LINE_SPLIT_REGEX)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const [key, ...valueParts] = line.replace(EXPORT_PREFIX, "").split(KEY_VALUE_SEPARATOR);
    if (!key) {
      continue;
    }

    const valueRaw = valueParts.join(KEY_VALUE_SEPARATOR).trim();
    env.set(key, normalizeValue(valueRaw));
  }

  return env;
}

export function normalizeValue(raw: string): string {
  if (!raw) {
    return "";
  }

  const singleQuoted = raw.startsWith("'") && raw.endsWith("'");
  const doubleQuoted = raw.startsWith('"') && raw.endsWith('"');

  if (singleQuoted || doubleQuoted) {
    const body = raw.slice(1, -1);
    if (doubleQuoted) {
      const unescaped = body
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      // 末尾の改行とキャリッジリターンをトリム
      return unescaped.replace(TRAILING_NEWLINE_REGEX, "");
    }
    return body;
  }

  // クォートされていない値も末尾の改行をトリム
  return raw.replace(TRAILING_NEWLINE_REGEX, "");
}

// EOF
