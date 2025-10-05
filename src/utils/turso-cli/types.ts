/**
 * Turso CLI ラッパーの型定義
 */

// 認証関連の型
export type AuthTokenInfo = {
    token: string;
    expiresAt?: Date;
};

export type UserInfo = {
    username: string;
    email?: string;
};

// データベース関連の型
export type DatabaseInfo = {
    name: string;
    id?: string;
    url?: string;
    httpUrl?: string;
    group?: string;
    locations?: string[];
    sizeLimit?: string;
    isCanary?: boolean;
};

export type DatabaseCreateOptions = {
    group?: string;
    fromFile?: string;
    fromDump?: string;
    fromCsv?: string;
    timestamp?: string;
    enableExtensions?: boolean;
    sizeLimit?: string;
    canary?: boolean;
    wait?: boolean;
};

export type DatabaseToken = {
    token: string;
    expiresAt?: Date;
    readOnly?: boolean;
};

// グループ関連の型
export type GroupInfo = {
    name: string;
    locations?: string[];
    version?: string;
    extensions?: string[];
    isCanary?: boolean;
};

export type GroupCreateOptions = {
    location?: string;
    canary?: boolean;
    wait?: boolean;
};

// 組織関連の型
export type OrganizationInfo = {
    slug: string;
    name: string;
    type?: string;
};

export type MemberInfo = {
    username: string;
    email?: string;
    role?: "admin" | "member";
};

// コマンド実行結果の共通型
export type CommandResult<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
    stderr?: string;
    stdout?: string;
};

// 実行オプション
export type ExecOptions = {
    timeout?: number;
    env?: Record<string, string>;
    cwd?: string;
};

// エラー型
export class TursoCliError extends Error {
    command: string;
    exitCode?: number;
    stderr?: string;

    constructor(
        message: string,
        command: string,
        exitCode?: number,
        stderr?: string
    ) {
        super(message);
        this.name = "TursoCliError";
        this.command = command;
        this.exitCode = exitCode;
        this.stderr = stderr;
    }
}

// EOF
