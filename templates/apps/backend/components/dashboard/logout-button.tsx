"use client";
// logout-button コンポーネントを定義する。

import { Button } from "@repo/ui/components/button";
import { useLoadingMask } from "@repo/ui/hooks/use-loading-mask";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { logger } from "@/lib/logger";

export function LogoutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { show, hide } = useLoadingMask();

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    show("ログアウト処理を実行しています…");
    try {
      logger.info("🚪 Starting custom logout process");
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        logger.warn("⚠️ Logout request returned non-OK status", {
          status: response.status,
        });
      }

      logger.info("✅ Logout request dispatched, redirecting to login");
    } catch (error) {
      logger.error("💥 Logout error:", error);
    } finally {
      hide();
      window.location.replace("/login");
    }
  };

  return (
    <Button disabled={isSigningOut} onClick={handleSignOut} variant="default">
      <LogOut className="mr-2 h-4 w-4" />
      ログアウト
    </Button>
  );
}

// EOF
