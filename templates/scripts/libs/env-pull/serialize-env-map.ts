const SAFE_VALUE_PATTERN = /^[A-Za-z0-9_@./:-]*$/;

function needsQuoting(value: string): boolean {
  return !SAFE_VALUE_PATTERN.test(value);
}

function escapeValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/"/g, '\\"');
}

function formatEntry(key: string, value: string): string {
  if (value === "") {
    return `${key}=`;
  }
  if (!needsQuoting(value)) {
    return `${key}=${value}`;
  }
  return `${key}="${escapeValue(value)}"`;
}

export function serializeEnvMap(env: Map<string, string>): string {
  const lines = [...env.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, value]) => formatEntry(key, value ?? ""));
  return `${lines.join("\n")}\n`;
}

// EOF
