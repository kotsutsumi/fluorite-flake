/**
 * Nextra の MDX コンポーネントを拡張するヘルパー。
 * - @repo/ui のプリミティブをドキュメントから直接扱えるようショートコードを登録
 * - バリエーション豊富なノートブロック (Note/Tip/Warning など) を提供し、製品と同じ UI を再利用
 */
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  LightbulbIcon,
  type LucideIcon,
} from "lucide-react";
import type { MDXComponents } from "nextra/mdx-components";
import { useMDXComponents as useThemeMDXComponents } from "nextra-theme-docs";
import type { ReactNode } from "react";

type NoteTone = "info" | "tip" | "warning" | "success";

type NoteConfig = {
  defaultTitle: string;
  icon: LucideIcon;
  variant: "default" | "destructive";
  className: string;
  iconClassName: string;
  titleClassName: string;
};

const NOTE_STYLES: Record<NoteTone, NoteConfig> = {
  info: {
    defaultTitle: "Note",
    icon: InfoIcon,
    variant: "default",
    className:
      "border-l-4 border-sky-500/50 bg-sky-500/5 dark:border-sky-400/40 dark:bg-sky-400/10",
    iconClassName: "text-sky-600 dark:text-sky-300",
    titleClassName: "text-sky-900 dark:text-sky-100",
  },
  tip: {
    defaultTitle: "Tip",
    icon: LightbulbIcon,
    variant: "default",
    className:
      "border-l-4 border-emerald-500/50 bg-emerald-500/5 dark:border-emerald-500/40 dark:bg-emerald-500/10",
    iconClassName: "text-emerald-600 dark:text-emerald-300",
    titleClassName: "text-emerald-900 dark:text-emerald-100",
  },
  warning: {
    defaultTitle: "Warning",
    icon: AlertTriangleIcon,
    variant: "destructive",
    className:
      "border-l-4 border-amber-500/60 bg-amber-500/10 dark:border-amber-500/50 dark:bg-amber-500/20",
    iconClassName: "text-amber-600 dark:text-amber-300",
    titleClassName: "text-amber-900 dark:text-amber-100",
  },
  success: {
    defaultTitle: "Success",
    icon: CheckCircle2Icon,
    variant: "default",
    className:
      "border-l-4 border-emerald-500/60 bg-emerald-500/10 dark:border-emerald-500/50 dark:bg-emerald-500/20",
    iconClassName: "text-emerald-600 dark:text-emerald-300",
    titleClassName: "text-emerald-900 dark:text-emerald-100",
  },
};

type DocNoteProps = {
  children: ReactNode;
  title?: string;
  tone?: NoteTone;
  className?: string;
};

const DocNote = ({ children, title, tone = "info", className }: DocNoteProps) => {
  const config = NOTE_STYLES[tone];
  const Icon = config.icon;

  return (
    <Alert
      className={cn("mt-6 gap-x-3 [&>svg]:h-5 [&>svg]:w-5", config.className, className)}
      variant={config.variant}
    >
      <Icon aria-hidden className={cn("shrink-0", config.iconClassName)} />
      <div className="space-y-2">
        <AlertTitle className={cn("font-semibold text-sm", config.titleClassName)}>
          {title ?? config.defaultTitle}
        </AlertTitle>
        <AlertDescription className="text-muted-foreground text-sm leading-relaxed">
          {children}
        </AlertDescription>
      </div>
    </Alert>
  );
};

const createNoteComponent = (tone: NoteTone) => (props: Omit<DocNoteProps, "tone">) => (
  <DocNote tone={tone} {...props} />
);

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return useThemeMDXComponents({
    Button,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    CardAction,
    Alert,
    AlertTitle,
    AlertDescription,
    Note: DocNote,
    Info: createNoteComponent("info"),
    Tip: createNoteComponent("tip"),
    Warning: createNoteComponent("warning"),
    Success: createNoteComponent("success"),
    ...components,
  });
}

// EOF
