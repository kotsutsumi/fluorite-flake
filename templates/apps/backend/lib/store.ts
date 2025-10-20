/**
 * apps/backend で共有する軽量な UI 状態 (Jotai アトム) を定義。
 * - `countAtom`: デモや Story 用のカウンター
 * - `themeAtom`: 画面内テーマ切り替えに用いるライト / ダーク
 */
import { atom } from "jotai";

// 簡易サンプル用のカウンター状態
export const countAtom = atom(0);
// ThemeProvider と連携して現在のテーマ名を保持
export const themeAtom = atom<"light" | "dark">("light");

// EOF
