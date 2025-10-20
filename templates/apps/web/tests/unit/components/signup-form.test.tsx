// signup-form.test のテストケースを定義する。
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/components/auth/signup-form";

// LoadingMask フックをモック化する
const mockShow = vi.fn();
const mockHide = vi.fn();
vi.mock("@repo/ui/hooks/use-loading-mask", () => ({
  useLoadingMask: () => ({
    show: mockShow,
    hide: mockHide,
  }),
}));

const fetchSpy = vi.spyOn(globalThis, "fetch");

// Next.js の Link をテスト用コンポーネントで置き換える
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// window.location をテスト用に初期化
(window as any).location = undefined;
window.location = { href: "" } as any;

describe("UT-AUTH-02: SignupForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";
    fetchSpy.mockReset();
    fetchSpy.mockImplementation(() => Promise.reject(new Error("fetch not mocked")));
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  describe("Rendering", () => {
    it("should render signup form with all fields", () => {
      render(<SignupForm />);

      expect(screen.getByLabelText(/氏名/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^パスワード$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/パスワード \(確認\)/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /新規登録/i })).toBeInTheDocument();
      expect(screen.getByText(/ログイン/i)).toBeInTheDocument();
    });

    it("should have required and type attributes on inputs", () => {
      render(<SignupForm />);

      const nameInput = screen.getByLabelText(/氏名/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);

      expect(nameInput).toHaveAttribute("type", "text");
      expect(nameInput).toHaveAttribute("maxLength", "120");
      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("minLength", "8");
      expect(confirmPasswordInput).toHaveAttribute("type", "password");
      expect(confirmPasswordInput).toHaveAttribute("required");
    });
  });

  describe("Form Validation", () => {
    it("should show error when passwords don't match", async () => {
      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "DifferentPassword!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/パスワードが一致しません/i)).toBeInTheDocument();
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Form Submission - Success", () => {
    it("should call API with correct data and show success message", async () => {
      const mockResponse = {
        status: "approved",
        message: "ユーザー登録が完了しました。ログインを続行してください。",
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
        },
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      render(<SignupForm />);

      const nameInput = screen.getByLabelText(/氏名/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(nameInput, "Test User");
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith("新規登録処理を実行しています…");
      });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "http://localhost:3001/api/auth/sign-up/email",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              email: "test@example.com",
              password: "Password123!",
              name: "Test User",
            }),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/ユーザー登録が完了しました/i)).toBeInTheDocument();
      });

      expect(mockHide).toHaveBeenCalled();

      await waitFor(
        () => {
          expect(window.location.href).toBe("/login?prefill=test%40example.com");
        },
        { timeout: 2000 }
      );
    });

    it("should handle registration without name", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "approved",
          message: "ユーザー登録が完了しました。",
        }),
      } as any);

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "http://localhost:3001/api/auth/sign-up/email",
          expect.objectContaining({
            body: JSON.stringify({
              email: "test@example.com",
              password: "Password123!",
            }),
          })
        );
      });
    });

    it("should use NEXT_PUBLIC_API_URL when configured", async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "approved", message: "Success" }),
      } as any);

      try {
        render(<SignupForm />);

        const emailInput = screen.getByLabelText(/メールアドレス/i);
        const passwordInput = screen.getByLabelText(/^パスワード$/i);
        const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
        const submitButton = screen.getByRole("button", { name: /新規登録/i });

        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "Password123!");
        await user.type(confirmPasswordInput, "Password123!");
        await user.click(submitButton);

        await waitFor(() => {
          expect(fetchSpy).toHaveBeenCalledWith(
            "https://api.example.com/api/auth/sign-up/email",
            expect.any(Object)
          );
        });
      } finally {
        process.env.NEXT_PUBLIC_API_URL = originalEnv;
      }
    });
  });

  describe("Form Submission - Error Handling", () => {
    it("should display error message for failed registration", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: "このメールアドレスは既に登録されています。",
        }),
      } as any);

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "existing@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/このメールアドレスは既に登録されています/i)).toBeInTheDocument();
      });

      expect(mockHide).toHaveBeenCalled();
      expect(window.location.href).toBe("");
    });

    it("should handle network errors gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      expect(mockHide).toHaveBeenCalled();
    });

    it("should display generic error when no message provided", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as any);

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/新規登録に失敗しました/i)).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should disable button and show loading text during submission", async () => {
      fetchSpy.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ status: "approved", message: "Success" }),
                }),
              100
            )
          )
      );

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /登録中/i })).toBeDisabled();
      });
    });

    it("should re-enable button after error", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Error" }),
      } as any);

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent("新規登録");
      });
    });

    it("should prevent double submission", async () => {
      fetchSpy.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ status: "approved", message: "Success" }),
                }),
              200
            )
          )
      );

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");

      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(fetchSpy).toHaveBeenCalledTimes(1);
        },
        { timeout: 500 }
      );
    });
  });

  describe("LoadingMask Integration", () => {
    it("should show and hide loading mask correctly", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "approved", message: "Success" }),
      } as any);

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith("新規登録処理を実行しています…");
      });

      await waitFor(() => {
        expect(mockHide).toHaveBeenCalled();
      });
    });

    it("should hide loading mask even when error occurs", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード \(確認\)/i);
      const submitButton = screen.getByRole("button", { name: /新規登録/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.type(confirmPasswordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockHide).toHaveBeenCalled();
      });
    });
  });

  describe("Links", () => {
    it("should render link to login page", () => {
      render(<SignupForm />);

      const loginLink = screen.getByText(/ログイン/i);
      expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
    });
  });
});

// EOF
