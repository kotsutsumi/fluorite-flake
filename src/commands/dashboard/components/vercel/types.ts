import type { JSX } from "react";

// Vercel SDK とやり取りする際に利用する資格情報。
export type VercelCredentials = {
    token?: string;
};

export type VercelSectionNavigation = {
    hasInteractiveContent: () => boolean;
    focus: () => void;
    blur: () => void;
    move: (direction: "next" | "previous") => void;
    select: () => void;
};

// 各セクションコンポーネントに渡される共通プロパティ。
export type VercelSectionProps = {
    sectionLabel: string;
    placeholder: string;
    credentials?: VercelCredentials;
    isFocused?: boolean;
    onRegisterNavigation?: (navigation: VercelSectionNavigation | undefined) => void;
};

// Vercel セクションは全て JSX.Element を返す関数コンポーネントとして扱う。
export type VercelSectionComponent = (props: VercelSectionProps) => JSX.Element;

// EOF
