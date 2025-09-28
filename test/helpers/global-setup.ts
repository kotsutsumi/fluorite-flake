import { cleanupAllTempDirs } from './temp-dir.js';

/**
 * Global setup for all tests
 */
export async function setup() {
    // Set test environment variables
    process.env.FLUORITE_TEST_MODE = 'true';
    process.env.FLUORITE_CLOUD_MODE = 'mock';
    process.env.FLUORITE_AUTO_PROVISION = 'false';
    process.env.NODE_ENV = 'test';

    // Ensure we're not accidentally modifying real projects
    if (!process.env.CI && !process.env.VITEST) {
        console.log('🧪 Running tests in local environment');
    }

    return async () => {
        // This is the teardown function
        await cleanupAllTempDirs();
        console.log('✅ Test cleanup completed');
    };
}
