/**
 * DB Cloud CLI で使用する定数・正規表現群。
 * ロジックに依存しない値をここに集約し、テストしやすくする。
 */
import type { DbEnvironment } from "./types.js";

export const TURSO_INSTALL_HINTS = [
  "Turso CLI が見つかりません。以下のいずれかの方法でインストールしてください。",
  "公式ドキュメント: https://docs.turso.tech/reference/cli/installation",
  "macOS (Homebrew): brew install turso",
  "Windows (Scoop): scoop install turso",
  "Linux: curl -sSf https://get.tur.so/install.sh | bash",
] as const;

export const ENV_FILE_NAME: Record<DbEnvironment, string> = {
  preview: ".env.preview",
  staging: ".env.staging",
  production: ".env.production",
};

export const DATABASE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}$/;
export const ENV_ASSIGN_CAPTURE_REGEX = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/;
export const ENV_KEY_VALUE_REGEX = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;
export const LINE_SPLIT_REGEX = /\r?\n/;
export const TOKEN_DIRECT_REGEX = /^[A-Za-z0-9._-]{20,}$/;
export const TOKEN_PREFIX_REGEX = /^Token:\s*/i;
export const TOKEN_LABEL_REGEX = /^token:\s*/i;
export const TOKEN_VISIBLE_SEGMENT = 5;
export const SIMPLE_ENV_VALUE_REGEX = /^[A-Za-z0-9_:/@=.+-]+$/;
export const TURSO_HOST_PREFIX_REGEX = /^([a-z0-9-]+)/;
export const JSON_FLAG_ERROR_REGEX = /unknown flag:\s*--json/i;
export const TURSO_LIST_HEADER_REGEX = /^name\b/i;
export const TURSO_LIST_DIVIDER_REGEX = /^-/u;
export const WHITESPACE_SPLIT_REGEX = /\s+/;
export const TURSO_SHOW_KEY_REGEX = /^([A-Za-z][A-Za-z0-9\s_-]*)\s*:\s*(.+)$/;
export const LOCATION_SPLIT_REGEX = /[\s,|]+/;
export const AUTHENTICATION_TOKEN_INLINE_REGEX = /^authentication token:\s*(.+)$/i;

// EOF
