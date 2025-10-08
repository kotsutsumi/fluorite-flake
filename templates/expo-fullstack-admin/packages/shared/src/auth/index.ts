/**
 * 認証関連のユーティリティ
 * トークン管理、権限チェックなどの共通機能を提供
 */

import type { Role, AuthUser } from "../types/index.js";

// JWT関連のユーティリティ
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = "access_token";
  private static readonly REFRESH_TOKEN_KEY = "refresh_token";
  private static readonly USER_KEY = "user";

  /**
   * アクセストークンを保存する
   */
  static async setAccessToken(token: string): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    }
  }

  /**
   * アクセストークンを取得する
   */
  static async getAccessToken(): Promise<string | null> {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  /**
   * リフレッシュトークンを保存する
   */
  static async setRefreshToken(token: string): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    }
  }

  /**
   * リフレッシュトークンを取得する
   */
  static async getRefreshToken(): Promise<string | null> {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  /**
   * ユーザー情報を保存する
   */
  static async setUser(user: AuthUser): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * ユーザー情報を取得する
   */
  static async getUser(): Promise<AuthUser | null> {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  /**
   * 全てのトークンとユーザー情報をクリアする
   */
  static async clearAll(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * トークンが有効かチェックする
   */
  static async isTokenValid(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    try {
      // JWTの簡単な検証（実際の検証はサーバーサイドで行う）
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch {
      return false;
    }
  }
}

// 権限チェック関連のユーティリティ
export class PermissionManager {
  /**
   * ユーザーが管理者権限を持っているかチェックする
   */
  static isAdmin(user: AuthUser | null): boolean {
    return user?.role === Role.ADMIN;
  }

  /**
   * ユーザーが組織管理者権限を持っているかチェックする
   */
  static isOrgAdmin(user: AuthUser | null): boolean {
    return user?.role === Role.ORG_ADMIN || this.isAdmin(user);
  }

  /**
   * ユーザーが指定されたロールを持っているかチェックする
   */
  static hasRole(user: AuthUser | null, role: Role): boolean {
    return user?.role === role;
  }

  /**
   * ユーザーが指定されたロール以上の権限を持っているかチェックする
   */
  static hasMinimumRole(user: AuthUser | null, minRole: Role): boolean {
    if (!user) return false;

    const roleHierarchy = {
      [Role.USER]: 0,
      [Role.ORG_ADMIN]: 1,
      [Role.ADMIN]: 2,
    };

    const userLevel = roleHierarchy[user.role];
    const minLevel = roleHierarchy[minRole];

    return userLevel >= minLevel;
  }

  /**
   * ユーザーが自分自身のリソースにアクセスしているかチェックする
   */
  static isOwner(user: AuthUser | null, resourceUserId: string): boolean {
    return user?.id === resourceUserId;
  }

  /**
   * ユーザーがリソースにアクセス可能かチェックする
   */
  static canAccess(
    user: AuthUser | null,
    resourceUserId: string,
    minRole: Role = Role.USER
  ): boolean {
    return (
      this.hasMinimumRole(user, minRole) || this.isOwner(user, resourceUserId)
    );
  }
}

// エラー処理関連のユーティリティ
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = "UNKNOWN_ERROR"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthErrorCodes {
  static readonly INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
  static readonly TOKEN_EXPIRED = "TOKEN_EXPIRED";
  static readonly INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS";
  static readonly USER_NOT_FOUND = "USER_NOT_FOUND";
  static readonly ACCOUNT_DISABLED = "ACCOUNT_DISABLED";
}

// パスワード検証ユーティリティ
export class PasswordValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;

  /**
   * パスワードの強度をチェックする
   */
  static validate(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < this.MIN_LENGTH) {
      errors.push(`パスワードは${this.MIN_LENGTH}文字以上である必要があります`);
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`パスワードは${this.MAX_LENGTH}文字以下である必要があります`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push("パスワードには小文字が含まれている必要があります");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("パスワードには大文字が含まれている必要があります");
    }

    if (!/\d/.test(password)) {
      errors.push("パスワードには数字が含まれている必要があります");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("パスワードには特殊文字が含まれている必要があります");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * パスワードの強度スコアを計算する（0-100）
   */
  static getStrengthScore(password: string): number {
    let score = 0;

    // 長さによるスコア
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // 文字種によるスコア
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;

    return Math.min(score, 100);
  }

  /**
   * パスワード強度のレベルを取得する
   */
  static getStrengthLevel(password: string): "weak" | "medium" | "strong" {
    const score = this.getStrengthScore(password);
    if (score < 50) return "weak";
    if (score < 80) return "medium";
    return "strong";
  }
}

// EOF