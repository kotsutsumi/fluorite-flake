/**
 * Turso Cloud initialization utilities
 */
import { log, note } from "@clack/prompts";
import { execa, type ExecaError } from "execa";
import fsExtra from "fs-extra";
import os from "node:os";
import path from "node:path";

import { createClient, type TursoConfig } from "@tursodatabase/api";

import { getMessages } from "../../../i18n.js";

const CONFIG_DIRECTORY_NAME = ".fluorite";
const CONFIG_FILE_NAME = "flake.json";
const TURSO_SECTION_KEY = "truso"; // TODO: Confirm if this key should be 'turso'

export type TursoLogLevel = "info" | "warn" | "error" | "success";

export interface TursoLogEntry {
    level: TursoLogLevel;
    message: string;
}

export type TursoLogger = (entry: TursoLogEntry) => void;

export interface TursoOperationContext {
    logger?: TursoLogger;
    suppressPrompts?: boolean;
    suppressStdout?: boolean;
}

export interface TursoInitializationOptions extends TursoOperationContext {
    onLog?: TursoLogger;
}

/**
 * Fluorite CLI configuration schema.
 */
export interface FluoriteConfig {
    [key: string]: unknown;
    truso?: {
        [key: string]: unknown;
        access_key?: string;
    };
}

/**
 * Config load result.
 */
export interface ConfigLoadResult {
    path: string;
    data: FluoriteConfig;
}

/**
 * Token validation result.
 */
export interface TokenValidationResult {
    valid: boolean;
    statusCode?: number;
    error?: unknown;
}

/**
 * Turso initialization statuses.
 */
export type TursoInitializationStatus = "reused" | "generated" | "login-required";

/**
 * Turso initialization result.
 */
export interface TursoInitializationResult {
    status: TursoInitializationStatus;
    token?: string;
}

/**
 * Ensure the Fluorite configuration directory and file exist, then load JSON.
 */
export async function loadConfig(): Promise<ConfigLoadResult> {
    const configDir = path.join(os.homedir(), CONFIG_DIRECTORY_NAME);
    await fsExtra.ensureDir(configDir);

    const configPath = path.join(configDir, CONFIG_FILE_NAME);
    if (!(await fsExtra.pathExists(configPath))) {
        await writeJsonAtomic(configPath, {});
    }

    const data = (await fsExtra.readJson(configPath)) as FluoriteConfig;
    return {
        path: configPath,
        data,
    };
}

/**
 * Validate an existing Turso token using the public API.
 */
export async function validateToken(token: string, context?: TursoOperationContext): Promise<TokenValidationResult> {
    const messages = getMessages().create.turso;

    try {
        const client = createClient(createClientConfig(token));
        const validation = await client.apiTokens.validate(token);
        return {
            valid: validation.valid,
            statusCode: validation.valid ? 200 : 401,
        };
    } catch (error) {
        if (isTursoClientError(error)) {
            if (error.status === 401 || error.status === 404) {
                return {
                    valid: false,
                    statusCode: error.status,
                    error,
                };
            }

            emitLog("warn", messages.apiError(String(error.status ?? "unknown")), context);
            return {
                valid: false,
                statusCode: error.status,
                error,
            };
        }

        emitLog("warn", messages.apiError("network"), context);
        return {
            valid: false,
            error,
        };
    }
}

/**
 * Ensure the user is logged in to the Turso CLI.
 * Returns a management token when available.
 */
export async function ensureTursoLogin(context?: TursoOperationContext): Promise<{ managementToken: string } | undefined> {
    const messages = getMessages().create.turso;

    try {
        await execa("turso", ["auth", "status"], {
            stdio: "pipe",
        });
    } catch (error) {
        if (isExecutableNotFound(error)) {
            emitLog("error", messages.cliNotFound, context);
            throw new Error(messages.cliNotFound);
        }

        if (!context?.suppressPrompts) {
            note(messages.promptLogin, messages.promptLoginTitle);
        }
        emitLog("warn", messages.promptLogin, context);
        emitLog("warn", messages.retryHint, context);
        return;
    }

    try {
        const tokenResult = await execa("turso", ["auth", "token"], {
            stdio: "pipe",
        });
        const managementToken = tokenResult.stdout.trim();

        if (!managementToken) {
            emitLog("error", messages.cliTokenEmpty, context);
            throw new Error(messages.cliTokenEmpty);
        }

        emitLog("success", messages.cliLoginConfirmed, context);
        return {
            managementToken,
        };
    } catch (error) {
        if (isExecutableNotFound(error)) {
            emitLog("error", messages.cliNotFound, context);
            throw new Error(messages.cliNotFound);
        }

        emitLog("error", messages.cliTokenFailed, context);
        throw error instanceof Error ? error : new Error(String(error));
    }
}

/**
 * Recreate the CLI token by revoking any existing entry and minting a new one.
 */
export async function recreateToken(
    managementToken: string,
    tokenName: string,
    context?: TursoOperationContext
): Promise<string> {
    const messages = getMessages().create.turso;

    try {
        const client = createClient(createClientConfig(managementToken));
        const tokens = await client.apiTokens.list();

        if (tokens.some((token) => token.name === tokenName)) {
            await client.apiTokens.revoke(tokenName);
            emitLog("info", messages.tokenRevoked(tokenName), context);
        }

        const created = await client.apiTokens.create(tokenName);
        const token = created.token;
        if (!token) {
            emitLog("error", messages.tokenCreateEmpty, context);
            throw new Error(messages.tokenCreateEmpty);
        }

        emitLog("success", messages.tokenRegenerated(tokenName), context);
        return token;
    } catch (error) {
        if (isTursoClientError(error)) {
            emitLog("error", messages.apiError(String(error.status ?? "unknown")), context);
        } else {
            emitLog("error", messages.apiError("network"), context);
        }
        throw error instanceof Error ? error : new Error(String(error));
    }
}

/**
 * Initialize Turso Cloud credentials and store them locally.
 */
export async function initializeTursoCloud(
    options?: TursoInitializationOptions
): Promise<TursoInitializationResult> {
    const { create } = getMessages();
    const messages = create.turso;
    const context: TursoOperationContext = {
        logger: options?.onLog ?? options?.logger,
        suppressPrompts: options?.suppressPrompts,
        suppressStdout: options?.suppressStdout,
    };

    emitLog("info", messages.initializing, context);

    const { path: configPath, data } = await loadConfig();
    const section = (data[TURSO_SECTION_KEY] as FluoriteConfig["truso"]) ?? {};

    const currentToken = typeof section.access_key === "string" ? section.access_key.trim() : undefined;

    if (currentToken) {
        const validation = await validateToken(currentToken, context);
        if (validation.valid) {
            emitLog("success", messages.validTokenReused, context);
            emitLog("success", messages.ready, context);
            return {
                status: "reused",
                token: currentToken,
            };
        }

        emitLog("warn", messages.invalidTokenDetected, context);
    } else {
        emitLog("info", messages.noExistingToken, context);
    }

    const loginResult = await ensureTursoLogin(context);
    if (!loginResult) {
        emitLog("warn", messages.footerLoginRequired, context);
        return {
            status: "login-required",
        };
    }

    const hostname = os.hostname();
    const tokenName = `fluorite-flake-${hostname}`;

    const newToken = await recreateToken(loginResult.managementToken, tokenName, context);
    data[TURSO_SECTION_KEY] = {
        ...section,
        access_key: newToken,
    };

    await writeJsonAtomic(configPath, data);

    emitLog("success", messages.tokenStored(configPath), context);
    emitLog("success", messages.ready, context);
    return {
        status: "generated",
        token: newToken,
    };
}

/**
 * Create API client configuration.
 */
function createClientConfig(token: string): TursoConfig {
    return {
        token,
        org: "", // Not required for API token operations
    };
}

type TursoApiError = Error & {
    status?: number;
};

function isTursoClientError(error: unknown): error is TursoApiError {
    return error instanceof Error && error.name === "TursoClientError";
}

function emitLog(level: TursoLogLevel, message: string, context?: TursoOperationContext): void {
    if (!message) {
        return;
    }

    if (!context?.suppressStdout) {
        switch (level) {
            case "success":
                log.success(message);
                break;
            case "error":
                log.error(message);
                break;
            case "warn":
                log.warn(message);
                break;
            default:
                log.info(message);
        }
    }

    context?.logger?.({ level, message });
}

/**
 * Write JSON atomically with a newline and 4-space indentation.
 */
async function writeJsonAtomic(filePath: string, payload: unknown): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const serialized = `${JSON.stringify(payload, null, 4)}\n`;

    await fsExtra.writeFile(tempPath, serialized, "utf8");
    await fsExtra.move(tempPath, filePath, { overwrite: true });
}

/**
 * Determine whether the given error is an ExecaError with ENOENT.
 */
function isExecutableNotFound(error: unknown): boolean {
    if (!error || typeof error !== "object") {
        return false;
    }

    const candidate = error as Partial<ExecaError>;
    return candidate.code === "ENOENT";
}
