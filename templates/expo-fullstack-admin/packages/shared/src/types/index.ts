/**
 * 共通型定義
 * アプリケーション全体で使用される型を定義する
 */

import { z } from "zod";

// ユーザーロール定義
export enum Role {
  ADMIN = "ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
  USER = "USER",
}

// Zod バリデーションスキーマ
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.nativeEnum(Role),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PostSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  content: z.string().optional(),
  published: z.boolean(),
  authorId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// TypeScript型の生成
export type User = z.infer<typeof UserSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;

// API レスポンス型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 認証関連型
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

// GraphQL操作型
export interface GraphQLVariables {
  [key: string]: any;
}

export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: string[];
  extensions?: {
    code?: string;
    [key: string]: any;
  };
}

// フォーム型
export interface CreatePostInput {
  title: string;
  content?: string;
  published?: boolean;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  published?: boolean;
}

export interface CreateUserInput {
  email: string;
  name?: string;
  role: Role;
  password: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: Role;
}

// ナビゲーション型
export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavigationItem[];
}

// 設定型
export interface AppConfig {
  apiUrl: string;
  appName: string;
  version: string;
  environment: "development" | "staging" | "production";
}

// EOF