// login-form.test のテストケースを定義する。
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

// LoadingMask フックをモック化する
const mockShow = vi.fn();
const mockHide = vi.fn();
vi.mock("@repo/ui/hooks/use-loading-mask", () => ({
  useLoadingMask: () => ({
    show: mockShow,
    hide: mockHide,
  }),
}));

const { mockSignInEmail } = vi.hoisted(() => ({
  mockSignInEmail: vi.fn(),
}));
vi.mock("@/lib/auth-client", () => ({
  signIn: {
    email: mockSignInEmail,
  },
}));

// Next.js の Link コンポーネントをテスト用の a タグに置き換える
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// window.location をテスト用に初期化
(window as any).location = undefined;
window.location = { href: "" } as any;

describe("UT-AUTH-01: LoginForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";
    mockSignInEmail.mockReset();
    mockSignInEmail.mockImplementation(() => Promise.reject(new Error("signIn.email not mocked")));
  });

  describe("Rendering", () => {
    it("should render login form with all fields", () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ログイン/i })).toBeInTheDocument();
      expect(screen.getByText(/パスワードをお忘れですか/i)).toBeInTheDocument();
      expect(screen.getByText(/新規登録/i)).toBeInTheDocument();
    });

    it("should prefill email when prefillEmail prop is provided", () => {
      render(<LoginForm prefillEmail="test@example.com" />);

      const emailInput = screen.getByLabelText(/メールアドレス/i) as HTMLInputElement;
      expect(emailInput.value).toBe("test@example.com");
    });

    it("should have required and type attributes on inputs", () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("minLength", "8");
    });
  });

  describe("Form Submission - Success", () => {
    it("should call signIn.email with credentials and show success message", async () => {
      mockSignInEmail.mockResolvedValueOnce({ error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith("ログイン処理を実行しています…");
      });

      await waitFor(() => {
        expect(mockSignInEmail).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "Password123!",
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/ログインに成功しました/i)).toBeInTheDocument();
      });

      expect(mockHide).toHaveBeenCalled();

      await waitFor(
        () => {
          expect(window.location.href).toBe("/");
        },
        { timeout: 2000 }
      );
    });

    it("should submit even when NEXT_PUBLIC_API_URL is configured", async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
      mockSignInEmail.mockResolvedValueOnce({ error: null });

      try {
        render(<LoginForm prefillEmail="test@example.com" />);

        const passwordInput = screen.getByLabelText(/パスワード/i);
        const submitButton = screen.getByRole("button", { name: /ログイン/i });

        await user.type(passwordInput, "Password123!");
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockSignInEmail).toHaveBeenCalledWith({
            email: "test@example.com",
            password: "Password123!",
          });
        });
      } finally {
        process.env.NEXT_PUBLIC_API_URL = originalEnv;
      }
    });
  });

  describe("Form Submission - Error Handling", () => {
    it("should display error message for failed login", async () => {
      mockSignInEmail.mockResolvedValueOnce({
        error: { message: "メールアドレスまたはパスワードが正しくありません。" },
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "wrong@example.com");
      await user.type(passwordInput, "WrongPassword!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/メールアドレスまたはパスワードが正しくありません/i)
        ).toBeInTheDocument();
      });

      expect(mockHide).toHaveBeenCalled();
      expect(window.location.href).toBe("");
    });

    it("should handle network errors gracefully", async () => {
      mockSignInEmail.mockRejectedValueOnce(new Error("Network error"));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      expect(mockHide).toHaveBeenCalled();
    });

    it("should display generic error when no message provided", async () => {
      mockSignInEmail.mockResolvedValueOnce({
        error: {},
      } as any);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/ログインに失敗しました/i)).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should disable button and show loading text during submission", async () => {
      mockSignInEmail.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /ログイン中/i })).toBeDisabled();
      });
    });

    it("should re-enable button after error", async () => {
      mockSignInEmail.mockResolvedValueOnce({
        error: { message: "Error" },
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent("ログイン");
      });
    });

    it("should prevent double submission", async () => {
      mockSignInEmail.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 200))
      );

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");

      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(mockSignInEmail).toHaveBeenCalledTimes(1);
        },
        { timeout: 500 }
      );
    });
  });

  describe("LoadingMask Integration", () => {
    it("should show and hide loading mask correctly", async () => {
      mockSignInEmail.mockResolvedValueOnce({ error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith("ログイン処理を実行しています…");
      });

      await waitFor(() => {
        expect(mockHide).toHaveBeenCalled();
      });
    });

    it("should hide loading mask even when error occurs", async () => {
      mockSignInEmail.mockRejectedValueOnce(new Error("Network error"));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const submitButton = screen.getByRole("button", { name: /ログイン/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockHide).toHaveBeenCalled();
      });
    });
  });

  describe("Links", () => {
    it("should render link to forgot password page", () => {
      render(<LoginForm />);

      const forgotLink = screen.getByText(/パスワードをお忘れですか/i);
      expect(forgotLink.closest("a")).toHaveAttribute("href", "/forgot-password");
    });

    it("should render link to signup page", () => {
      render(<LoginForm />);

      const signupLink = screen.getByText(/新規登録/i);
      expect(signupLink.closest("a")).toHaveAttribute("href", "/signup");
    });
  });
});

// EOF
