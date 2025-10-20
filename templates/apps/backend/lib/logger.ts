// コンソール出力を集約する軽量なロガーヘルパー。
type LogArguments = [message?: unknown, ...optionalParams: unknown[]];

type LogMethod = (...args: LogArguments) => void;

function createLogger(level: "debug" | "info" | "warn" | "error"): LogMethod {
  return (...args: LogArguments) => {
    // biome-ignore lint/suspicious/noConsole: logger implementation requires console
    console[level](...args);
  };
}

export const logger: Record<"debug" | "info" | "warn" | "error", LogMethod> = {
  debug: createLogger("debug"),
  info: createLogger("info"),
  warn: createLogger("warn"),
  error: createLogger("error"),
};

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  // 予期しない値でもログ出力できるよう JSON 化
  return JSON.stringify(error);
}

// EOF
