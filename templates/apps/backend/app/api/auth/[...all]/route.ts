/**
 * Better Auth統合エンドポイント
 * 全ての認証リクエストをBetter Authにルーティング
 */
import { auth } from "@/lib/auth";

export const GET = auth.handler;
export const POST = auth.handler;
export const PUT = auth.handler;
export const PATCH = auth.handler;
export const DELETE = auth.handler;
export const OPTIONS = auth.handler;

// EOF
