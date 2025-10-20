/**
 * AuthContext の状態遷移と副作用を検証するユニットテスト。
 * - ストアされたセッショントークン復元時の分岐 (成功 / 失敗)
 * - ログイン / ログアウト操作時の Apollo / SecureStore 連携
 * - モック環境を用いた各種エラーハンドリングの確認
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuthContext } from "@/contexts/auth-context";

// expo-secure-store をモック化し、キー値ストレージの副作用をコントロールする
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

// Apollo Client をモック化して GraphQL のネットワーク呼び出しを擬似化する
vi.mock("@/lib/apollo-client", () => ({
  apolloClient: {
    query: vi.fn(),
    mutate: vi.fn(),
    clearStore: vi.fn(),
  },
}));

// モック化した関数を読み込み、テスト内から直接アサーションできるようにする
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { apolloClient } from "@/lib/apollo-client";

describe("UT-AUTH-CTX: AuthContext", () => {
  beforeEach(() => {
    // 各テストでモック状態をリセットし、テスト間の依存を排除する
    vi.clearAllMocks();
    vi.mocked(apolloClient.clearStore).mockResolvedValue([]);
  });

  describe("UT-AUTH-CTX-01: Initialization with null token", () => {
    it("should initialize with no user when no token stored", async () => {
      vi.mocked(getItemAsync).mockResolvedValue(null);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(vi.mocked(getItemAsync)).toHaveBeenCalledWith("sessionToken");
    });
  });

  describe("UT-AUTH-CTX-02: Token restoration success", () => {
    it("should restore session when valid token exists", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "user",
        isActive: true,
      };

      vi.mocked(getItemAsync).mockResolvedValue("stored-token");
      vi.mocked(apolloClient.query).mockResolvedValueOnce({
        data: { me: mockUser },
        loading: false,
        networkStatus: 7,
      } as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe("stored-token");
      expect(apolloClient.query).toHaveBeenCalled();
    });

    it("should not delete token when session API succeeds", async () => {
      vi.mocked(getItemAsync).mockResolvedValue("valid-token");
      vi.mocked(apolloClient.query).mockResolvedValueOnce({
        data: { me: { id: "123", email: "test@example.com", role: "user", isActive: true } },
        loading: false,
        networkStatus: 7,
      } as any);

      renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(vi.mocked(deleteItemAsync)).not.toHaveBeenCalled();
      });
    });
  });

  describe("UT-AUTH-CTX-03: Token restoration failure", () => {
    it("should clear token when session query fails", async () => {
      vi.mocked(getItemAsync).mockResolvedValue("expired-token");
      vi.mocked(apolloClient.query).mockRejectedValueOnce(new Error("Unauthorized"));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(vi.mocked(deleteItemAsync)).toHaveBeenCalledWith("sessionToken");
    });

    it("should clear token when session query returns no data", async () => {
      vi.mocked(getItemAsync).mockResolvedValue("bad-token");
      vi.mocked(apolloClient.query).mockResolvedValueOnce({
        data: { me: null },
        loading: false,
        networkStatus: 7,
      } as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(vi.mocked(deleteItemAsync)).toHaveBeenCalled();
    });
  });

  describe("UT-AUTH-CTX-04: login success", () => {
    it("should call GraphQL mutation with credentials and store token", async () => {
      vi.mocked(getItemAsync).mockResolvedValue(null);

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "user",
      };

      vi.mocked(apolloClient.mutate).mockResolvedValueOnce({
        data: {
          login: {
            token: "new-token",
            user: mockUser,
            expiresAt: new Date().toISOString(),
          },
        },
      } as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login("test@example.com", "Password123!");
      });

      expect(apolloClient.mutate).toHaveBeenCalledWith({
        mutation: expect.any(Object),
        variables: {
          input: {
            email: "test@example.com",
            password: "Password123!",
          },
        },
      });

      expect(vi.mocked(setItemAsync)).toHaveBeenCalledWith("sessionToken", "new-token");
      expect(result.current.token).toBe("new-token");
      expect(result.current.user).toEqual(mockUser);
    });

    it("should throw error with appropriate message when login fails with ACCOUNT_DISABLED", async () => {
      vi.mocked(getItemAsync).mockResolvedValue(null);

      vi.mocked(apolloClient.mutate).mockResolvedValueOnce({
        errors: [
          {
            message: "Account disabled",
            extensions: { code: "ACCOUNT_DISABLED" },
          },
        ],
      } as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login("disabled@example.com", "Password123!");
        })
      ).rejects.toThrow("アカウントが無効化されています");

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it("should throw error with PENDING_APPROVAL message", async () => {
      vi.mocked(getItemAsync).mockResolvedValue(null);

      vi.mocked(apolloClient.mutate).mockResolvedValueOnce({
        errors: [
          {
            message: "Pending approval",
            extensions: { code: "PENDING_APPROVAL" },
          },
        ],
      } as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login("pending@example.com", "Password123!");
        })
      ).rejects.toThrow("現在承認待ちです");
    });

    it("should throw generic error when no data returned", async () => {
      vi.mocked(getItemAsync).mockResolvedValue(null);

      vi.mocked(apolloClient.mutate).mockResolvedValueOnce({
        data: null,
      } as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login("test@example.com", "Pass123!");
        })
      ).rejects.toThrow("ログインに失敗しました");
    });
  });

  describe("UT-AUTH-CTX-05: logout", () => {
    it("should call logout mutation and clear token when token exists", async () => {
      vi.mocked(getItemAsync).mockResolvedValue("active-token");
      vi.mocked(apolloClient.query).mockResolvedValueOnce({
        data: { me: { id: "123", email: "test@example.com", role: "user", isActive: true } },
        loading: false,
        networkStatus: 7,
      } as any);
      vi.mocked(apolloClient.mutate).mockResolvedValueOnce({
        data: { logout: true },
      } as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).not.toBeNull();

      await act(async () => {
        await result.current.logout();
      });

      expect(apolloClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          mutation: expect.any(Object),
          token: "active-token",
        })
      );

      expect(apolloClient.clearStore).toHaveBeenCalled();
      expect(vi.mocked(deleteItemAsync)).toHaveBeenCalledWith("sessionToken");
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it("should swallow API errors but still clear local token", async () => {
      vi.mocked(getItemAsync).mockResolvedValue("token");
      vi.mocked(apolloClient.query).mockResolvedValueOnce({
        data: { me: { id: "123", email: "test@example.com", role: "user", isActive: true } },
        loading: false,
        networkStatus: 7,
      } as any);
      vi.mocked(apolloClient.mutate).mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(vi.mocked(deleteItemAsync)).toHaveBeenCalledWith("sessionToken");
      expect(apolloClient.clearStore).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it("should not call mutation when token is null", async () => {
      vi.mocked(getItemAsync).mockResolvedValue(null);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(apolloClient.mutate).not.toHaveBeenCalled();
      expect(vi.mocked(deleteItemAsync)).toHaveBeenCalled();
    });
  });

  describe("UT-AUTH-CTX-06: refresh", () => {
    it("should not query when token is not set", async () => {
      vi.mocked(getItemAsync).mockResolvedValue(null);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // previous query calls
      vi.mocked(apolloClient.query).mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(apolloClient.query).not.toHaveBeenCalled();
    });

    it("should query session when token is set", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        role: "user",
        isActive: true,
      };

      vi.mocked(getItemAsync).mockResolvedValue("refresh-token");
      vi.mocked(apolloClient.query).mockResolvedValue({
        data: { me: mockUser },
        loading: false,
        networkStatus: 7,
      } as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // previous query calls
      vi.mocked(apolloClient.query).mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(apolloClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.any(Object),
          fetchPolicy: "network-only",
          token: "refresh-token",
        })
      );

      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe("UT-AUTH-CTX-07: useAuthContext without provider", () => {
    it("should throw error when used outside AuthProvider", () => {
      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow("useAuthContext must be used within an AuthProvider");
    });
  });
});

// EOF
