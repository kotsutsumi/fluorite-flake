/**
 * Enhanced error types for better type safety and error handling
 */

export interface ErrorWithMessage {
    message: string;
    code?: string;
    stack?: string;
}

export interface DatabaseError extends ErrorWithMessage {
    code: string;
    constraint?: string;
    table?: string;
}

export interface ValidationError extends ErrorWithMessage {
    field?: string;
    value?: unknown;
}

export interface AuthError extends ErrorWithMessage {
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_SESSION' | 'INVALID_CREDENTIALS';
    statusCode?: number;
}

export interface NetworkError extends ErrorWithMessage {
    url?: string;
    statusCode?: number;
    response?: string;
}

/**
 * Type guard to check if error has a message property
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
    );
}

/**
 * Type guard to check if error is a database error
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
    return (
        isErrorWithMessage(error) &&
        'code' in error &&
        typeof (error as unknown as Record<string, unknown>).code === 'string'
    );
}

/**
 * Type guard to check if error is an auth error
 */
export function isAuthError(error: unknown): error is AuthError {
    return (
        isErrorWithMessage(error) &&
        'code' in error &&
        ['UNAUTHORIZED', 'FORBIDDEN', 'INVALID_SESSION', 'INVALID_CREDENTIALS'].includes(
            (error as unknown as Record<string, unknown>).code as string
        )
    );
}

/**
 * Get error message safely from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (isErrorWithMessage(error)) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'An unknown error occurred';
}

/**
 * Convert unknown error to ErrorWithMessage
 */
export function toErrorWithMessage(error: unknown): ErrorWithMessage {
    if (isErrorWithMessage(error)) {
        return error;
    }

    return {
        message: getErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined,
    };
}
