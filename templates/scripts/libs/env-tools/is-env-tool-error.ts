// 暗号化・復号処理が投げるドメインエラーを判別するための型ガード。
export function isEnvToolError(error: unknown): error is Error {
  return error instanceof Error && error.name === "EnvToolError";
}

// EOF
