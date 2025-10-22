import type { JSX } from "react";

export type VercelSectionProps = {
    sectionLabel: string;
    placeholder: string;
};

export type VercelSectionComponent = (props: VercelSectionProps) => JSX.Element;

