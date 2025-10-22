import type { JSX } from "react";

// Turso 向けセクションに共通するプロパティの定義。
export type TursoSectionProps = {
    sectionLabel: string;
    placeholder: string;
};

// Turso セクションは単純な関数コンポーネントとして扱う。
export type TursoSectionComponent = (props: TursoSectionProps) => JSX.Element;

// ファイル終端
