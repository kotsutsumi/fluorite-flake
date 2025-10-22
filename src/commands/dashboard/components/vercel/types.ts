import type { JSX } from "react";

export type VercelCredentials = {
    token?: string;
};

export type VercelSectionProps = {
    sectionLabel: string;
    placeholder: string;
    credentials?: VercelCredentials;
};

export type VercelSectionComponent = (props: VercelSectionProps) => JSX.Element;

// EOF
