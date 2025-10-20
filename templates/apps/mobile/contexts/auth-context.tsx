/**
 * モバイルアプリ全体の認証状態を管理するコンテキストとフック。
 * - Better Auth のセッショントークンを Secure Store に保存 / 復元
 * - GraphQL 経由でユーザー情報をフェッチし、コンポーネントに配布
 * - login / logout / refresh の 3 つの主要アクションを公開
 */
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apolloClient } from "@/lib/apollo-client";
import { LOGIN_MUTATION, LOGOUT_MUTATION } from "@/lib/graphql/mutations";
import { ME_QUERY } from "@/lib/graphql/queries";

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "sessionToken";

async function storeToken(token: string) {
  // Expo Secure Store にセッショントークンを保存し、アプリ再起動時にも維持
  try {
    await setItemAsync(TOKEN_KEY, token);
  } catch (_error) {
    // Web 環境などで Secure Store が利用できない場合に備えて握りつぶす
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

function loadStoredToken() {
  // トークンが存在しない場合は null が返るため、呼び出し側で分岐する
  return getItemAsync(TOKEN_KEY)
    .then((value) => {
      if (value) {
        return value;
      }

      if (typeof window !== "undefined") {
        return window.localStorage.getItem(TOKEN_KEY);
      }

      return null;
    })
    .catch(() => {
      if (typeof window !== "undefined") {
        return window.localStorage.getItem(TOKEN_KEY);
      }
      return null;
    });
}

async function deleteStoredToken() {
  // セッションが失効した場合はローカルのトークンも削除して整合性を保つ
  try {
    await deleteItemAsync(TOKEN_KEY);
  } catch (_error) {
    // Web 環境などで Secure Store が利用できない場合に備えて握りつぶす
  }
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async (sessionToken: string) => {
    try {
      const { data } = await apolloClient.query({
        query: ME_QUERY,
        fetchPolicy: "network-only",
        token: sessionToken,
      });

      if (!data?.me) {
        throw new Error("Failed to refresh session");
      }

      setUser(data.me as AuthUser);
      setToken(sessionToken);
    } catch (_error) {
      // 呼び出し元でトークン削除などのリカバリーを行うため、汎用的なエラーを投げ直す
      throw new Error("Failed to refresh session");
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      const stored = await loadStoredToken();
      if (!stored) {
        setLoading(false);
        return;
      }

      await fetchSession(stored);
    } catch (_error) {
      await deleteStoredToken();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [fetchSession]);

  useEffect(() => {
    initialize().catch(() => {
      // 初期化時のエラーは initialize 内で処理される
    });
  }, [initialize]);

  // メール + パスワードでログインし、取得したセッションとユーザー情報を保存
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, errors } = await apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: {
          input: {
            email,
            password,
          },
        },
      });

      if (errors || !data?.login) {
        const errorCode = errors?.[0]?.extensions?.code;
        let errorMessage = "ログインに失敗しました";

        if (errorCode === "ACCOUNT_DISABLED") {
          errorMessage = "アカウントが無効化されています";
        } else if (errorCode === "PENDING_APPROVAL") {
          errorMessage = "現在承認待ちです";
        } else if (errorCode === "ACCOUNT_REJECTED") {
          errorMessage = "このアカウントは利用できません";
        }

        throw new Error(errorMessage);
      }

      await storeToken(data.login.token);
      setToken(data.login.token);
      setUser(data.login.user as AuthUser);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("ログインに失敗しました");
    }
  }, []);

  // サーバー側セッションを破棄し、ローカルのトークンと Apollo キャッシュをクリーンアップ
  const logout = useCallback(async () => {
    if (token) {
      try {
        await apolloClient.mutate({
          mutation: LOGOUT_MUTATION,
          token,
        });
      } catch (_error) {
        // トークンの無効化でエラーが発生しても、下のトークン削除でログアウト状態に戻せるため無視する
      }
    }

    await deleteStoredToken();
    await apolloClient.clearStore();
    setUser(null);
    setToken(null);
  }, [token]);

  // セッショントークンが存在する場合のみ再認証を行う
  const refresh = useCallback(async () => {
    if (!token) {
      return;
    }

    await fetchSession(token);
  }, [fetchSession, token]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, logout, refresh }),
    [user, token, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// EOF
