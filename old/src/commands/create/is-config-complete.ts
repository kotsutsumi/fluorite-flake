import type { ProjectConfig } from './types.js';

export function isConfigComplete(config: Partial<ProjectConfig>): boolean {
    return !!(
        config.projectName &&
        config.framework &&
        config.database !== undefined &&
        config.deployment !== undefined &&
        config.storage !== undefined &&
        config.auth !== undefined &&
        config.packageManager
    );
}
