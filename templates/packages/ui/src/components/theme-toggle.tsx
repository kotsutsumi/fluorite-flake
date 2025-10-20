"use client";

import { cn } from "@repo/ui/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type * as React from "react";
import { useEffect, useState } from "react";

import { Button } from "./button";

export type ThemeToggleProps = Omit<React.ComponentProps<typeof Button>, "onClick">;

export function ThemeToggle({
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: ThemeToggleProps) {
  const { setTheme, resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const currentTheme = resolvedTheme ?? theme ?? "system";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <Button
        aria-hidden
        className={cn("relative", className)}
        disabled
        size={size}
        type="button"
        variant={variant}
        {...props}
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      className={cn(
        "relative",
        size === "icon" || size === "icon-sm" || size === "icon-lg" ? "" : "px-2.5",
        className
      )}
      onClick={handleToggle}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      <Sun className="dark:-rotate-90 h-4 w-4 rotate-0 scale-100 transition-all dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
