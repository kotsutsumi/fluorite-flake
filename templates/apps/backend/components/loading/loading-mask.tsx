/**
 * ローディングマスクコンポーネント
 * 処理中の画面全体オーバーレイ表示
 */
"use client";

import { useLoadingMaskState } from "@repo/ui/hooks/use-loading-mask";
import { Loader2 } from "lucide-react";

export function LoadingMask() {
  const state = useLoadingMaskState();

  if (!state.open) {
    return null;
  }

  const message = state.message ?? "処理を実行しています…";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg border bg-background/90 px-6 py-4 shadow-lg">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary" />
        <output aria-live="assertive" className="font-medium text-foreground text-sm">
          {message}
        </output>
      </div>
    </div>
  );
}

// EOF
