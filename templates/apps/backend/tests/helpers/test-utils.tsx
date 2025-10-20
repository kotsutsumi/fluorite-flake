/**
 * React コンポーネントのテストを補助するユーティリティ。
 * - 必要に応じてプロバイダーを差し込むためのラッパーを提供
 * - renderWithProviders で RTL の `render` を拡張
 */
import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";

// Theme や i18n などの共通プロバイダーを追加したい場合はここに追記する
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
): ReturnType<typeof render> {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export specific functions from React Testing Library to avoid barrel file
export { screen, waitFor, within } from "@testing-library/react";
export { renderWithProviders as render };

// EOF
