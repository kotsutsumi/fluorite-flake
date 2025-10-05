/**
 * テンプレート選択システムの型定義
 */
import type { ProjectType } from "../types.js";

/**
 * テンプレート選択結果
 */
export type TemplateSelectionResult = {
    projectType: ProjectType;
    template: string;
    isFullStack: boolean;
    requiresMonorepo: boolean;
    useMonorepo: boolean;
    estimatedComplexity: "simple" | "moderate" | "complex";
    features: string[];
};

/**
 * テンプレート要件
 */
export type TemplateRequirements = {
    nodeVersion?: string;
    pnpmRequired: boolean;
    additionalDependencies?: string[];
    systemRequirements?: string[];
    estimatedSetupTime: string;
};

// EOF
