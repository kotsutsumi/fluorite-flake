// 使い方に関する例外へ一貫した名前を付け、isUsageError で判定しやすくするためのファクトリ関数。
export function createUsageError(message: string): Error {
  const error = new Error(message);
  error.name = "UsageError";
  return error;
}

// EOF
