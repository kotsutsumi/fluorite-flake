/**
 * 認証コンテキスト (`AuthProvider`) を直接参照するためのシンタックスシュガー。
 * - `import { useAuth } from "@/hooks/use-auth"` の形式で利用しやすくする
 * - 実装を `contexts/auth-context` に閉じ込めることでモジュール間の結合を緩和
 */
import { useAuthContext } from "@/contexts/auth-context";

// React コンポーネントからは `useAuth()` を呼び出せば認証 API にアクセスできる
export const useAuth = useAuthContext;

// EOF
