export { FRAMEWORK_CONFIGS } from './frameworks.js';
export { DATABASE_CONFIGS } from './database-configs.js';
export { STORAGE_CONFIGS } from './storage-configs.js';
export {
    getFrameworkConfig,
    getSupportedDatabases,
    getSupportedStorage,
    supportsFeature,
    validateConfiguration,
} from './helpers.js';
export type {
    FrameworkType,
    DatabaseType,
    OrmType,
    StorageType,
    PackageManagerType,
    FrameworkFeatures,
    FrameworkVersions,
    FrameworkConfig,
} from './types.js';
