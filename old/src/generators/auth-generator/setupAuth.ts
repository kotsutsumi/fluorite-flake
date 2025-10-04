import type { ProjectConfig } from '../../commands/create/types.js';
import {
    addAuthDependencies,
    writeAuthCore,
    writeMiddleware,
    writeAuthApiRoute,
    writeDashboardScaffolding,
    writeApiRoutes,
    writeProfileUploadHelper,
    writeHelperFunctions,
    updateSeedFileForAuth,
} from './helpers/index.js';

export async function setupAuth(config: ProjectConfig) {
    if (config.framework !== 'nextjs') {
        return;
    }

    if (config.orm !== 'prisma') {
        throw new Error(
            'Better Auth advanced scaffolding currently requires Prisma. Please choose Prisma as the ORM when enabling authentication.'
        );
    }

    await addAuthDependencies(config);
    await writeAuthCore(config);
    await writeMiddleware(config);
    await writeAuthApiRoute(config);
    await writeDashboardScaffolding(config);
    await writeApiRoutes(config);
    await writeProfileUploadHelper(config);
    await writeHelperFunctions(config);
    await updateSeedFileForAuth(config);
}
