import fs from 'node:fs/promises';
import path from 'node:path';
import { generateProject } from '../test/helpers/project-generator.js';

const main = async () => {
    const { projectPath } = await generateProject({
        projectName: 'inspect-next-e2e',
        framework: 'nextjs',
        database: 'turso',
        orm: 'prisma',
        storage: 'vercel-blob',
        auth: true,
        deployment: true,
        packageManager: 'pnpm',
    });

    const pkg = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
    console.log(JSON.stringify(pkg.scripts, null, 2));
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
