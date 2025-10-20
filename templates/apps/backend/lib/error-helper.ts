// エラーオブジェクトからメッセージ文字列を抽出するヘルパー。
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    // Error-like な plain object を扱う (Zod エラーなど)
    return String((error as { message: unknown }).message);
  }
  return "An unknown error occurred";
}

// EOF
