/**
 * テンプレートコピー処理のオプション
 */
export type CopyTemplateOptions = {
    templateName: string;
    variant?: string;
    targetDirectory: string;
    variableFiles?: string[];
    variables?: Record<string, string>;
    executableFiles?: string[];
};

/**
 * テンプレートコピー結果
 */
export type CopyTemplateResult = {
    files: string[];
    directories: string[];
};

// EOF
