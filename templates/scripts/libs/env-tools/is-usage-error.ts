// 使い方のミスかどうかを判別するための型ガード。
export function isUsageError(error: unknown): error is Error {
  return error instanceof Error && error.name === "UsageError";
}

// EOF
