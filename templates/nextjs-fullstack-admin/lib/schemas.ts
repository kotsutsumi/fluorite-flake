import { z } from "zod";

// ユーザー関連スキーマ
export const userCreateSchema = z.object({
    name: z.string().min(2, "名前は2文字以上で入力してください"),
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z.string().min(8, "パスワードは8文字以上で入力してください"),
    role: z.enum(["ADMIN", "USER", "MANAGER"]).default("USER"),
    organizationId: z.string().uuid().optional(),
});

export const userUpdateSchema = z.object({
    name: z.string().min(2, "名前は2文字以上で入力してください").optional(),
    email: z
        .string()
        .email("有効なメールアドレスを入力してください")
        .optional(),
    role: z.enum(["ADMIN", "USER", "MANAGER"]).optional(),
    organizationId: z.string().uuid().optional(),
});

export const userLoginSchema = z.object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z.string().min(1, "パスワードを入力してください"),
});

// 組織関連スキーマ
export const organizationCreateSchema = z.object({
    name: z.string().min(2, "組織名は2文字以上で入力してください"),
    description: z.string().optional(),
    website: z.string().url("有効なURLを入力してください").optional(),
});

export const organizationUpdateSchema = z.object({
    name: z.string().min(2, "組織名は2文字以上で入力してください").optional(),
    description: z.string().optional(),
    website: z.string().url("有効なURLを入力してください").optional(),
});

// 型エクスポート
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type OrganizationCreate = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdate = z.infer<typeof organizationUpdateSchema>;
