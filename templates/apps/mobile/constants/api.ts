/**
 * モバイルアプリからバックエンド API へアクセスするための URL ユーティリティ。
 * - 環境変数 `EXPO_PUBLIC_API_BASE_URL` が指定されていれば優先し、末尾スラッシュを除去
 * - path がスラッシュで始まっていなければ自動で付与し、二重スラッシュを防ぐ
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

export const apiUrl = (path: string) =>
  // API_BASE_URL と任意のパスを安全に連結し、モバイル側から統一的に利用する
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// EOF
