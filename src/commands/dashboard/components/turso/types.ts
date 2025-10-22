import type { JSX } from "react";

export type TursoSectionProps = {
    sectionLabel: string;
    placeholder: string;
};

export type TursoSectionComponent = (props: TursoSectionProps) => JSX.Element;

// EOF
