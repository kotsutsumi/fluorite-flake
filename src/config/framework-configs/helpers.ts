import { DATABASE_CONFIGS } from './database-configs.js';
import { FRAMEWORK_CONFIGS } from './frameworks.js';
import type {
    DatabaseType,
    FrameworkConfig,
    FrameworkFeatures,
    FrameworkType,
    OrmType,
    StorageType,
} from './types.js';

export function getFrameworkConfig(framework: FrameworkType): FrameworkConfig {
    return FRAMEWORK_CONFIGS[framework];
}

export function supportsFeature(
    framework: FrameworkType,
    feature: keyof FrameworkFeatures
): boolean {
    return FRAMEWORK_CONFIGS[framework].supportedFeatures[feature];
}

export function getSupportedDatabases(framework: FrameworkType): DatabaseType[] {
    return FRAMEWORK_CONFIGS[framework].supportedDatabases;
}

export function getSupportedStorage(framework: FrameworkType): StorageType[] {
    return FRAMEWORK_CONFIGS[framework].supportedStorage;
}

export function validateConfiguration(config: {
    framework: FrameworkType;
    database: DatabaseType;
    orm?: OrmType;
    storage: StorageType;
}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const frameworkConfig = getFrameworkConfig(config.framework);

    if (
        config.database !== 'none' &&
        !frameworkConfig.supportedDatabases.includes(config.database)
    ) {
        errors.push(`${frameworkConfig.displayName} does not support ${config.database} database`);
    }

    if (config.orm && config.database !== 'none') {
        const dbConfig = DATABASE_CONFIGS[config.database as keyof typeof DATABASE_CONFIGS];
        if (dbConfig && !dbConfig.supportedOrms.includes(config.orm)) {
            errors.push(`${config.database} does not support ${config.orm} ORM`);
        }
    }

    if (config.storage !== 'none' && !frameworkConfig.supportedStorage.includes(config.storage)) {
        errors.push(`${frameworkConfig.displayName} does not support ${config.storage} storage`);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
