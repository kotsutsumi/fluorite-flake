/**
 * CLI utilities for checking CLI availability and providing fallbacks
 *
 * NOTE: CLI adapters temporarily disabled due to compilation issues
 * TODO: Re-enable when CLI adapters are fixed
 */

/*
 * This entire file is commented out while the CLI adapters have compilation issues.
 * The infrastructure is in place for when the CLI adapters are fixed.
 */

export interface CliAvailabilityCheck {
    available: boolean;
    version?: string;
    adapter?: unknown;
    fallbackMessage?: string;
}

// Placeholder functions to maintain interface compatibility
export async function checkVercelCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLI adapters disabled' };
}

export async function checkTursoCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLI adapters disabled' };
}

export async function checkSupabaseCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLI adapters disabled' };
}

export async function checkAwsCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLI adapters disabled' };
}

export async function checkWranglerCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLI adapters disabled' };
}

export async function checkGitHubCli(): Promise<CliAvailabilityCheck> {
    return { available: false, fallbackMessage: 'CLI adapters disabled' };
}

export async function executeWithFallback<T>(
    _cliCheck: () => Promise<CliAvailabilityCheck>,
    _adapterOperation: (adapter: unknown) => Promise<T>,
    fallbackOperation: () => Promise<T>
): Promise<T> {
    return await fallbackOperation();
}
