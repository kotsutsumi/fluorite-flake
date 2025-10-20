// Domain specific error for encryption/decryption failures. Using a custom
// 暗号化・復号で発生したエラーに一貫した名前を付与し、呼び出し側が識別しやすくする。
export function createEnvToolError(message: string): Error {
  const error = new Error(message);
  error.name = "EnvToolError";
  return error;
}

// EOF
