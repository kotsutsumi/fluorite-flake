import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';

export async function generatePackageJson(config: ProjectConfig) {
  const packageJson: {
    name: string;
    version: string;
    private: boolean;
    type: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } = {
    name: config.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'biome lint .',
      'lint:fix': 'biome lint --fix .',
      format: 'biome format --write .',
      'format:check': 'biome format .',
      check: 'biome check .',
      'check:fix': 'biome check --fix .',
      prepare: 'husky',
    },
    dependencies: {
      next: '15.1.3',
      react: '19.0.0',
      'react-dom': '19.0.0',
      '@tailwindcss/postcss': '4.0.0-alpha.33',
      tailwindcss: '4.0.0-alpha.33',
      'next-themes': '^0.4.4',
      jotai: '^2.10.3',
      clsx: '^2.1.1',
      'tailwind-merge': '^2.6.0',
    },
    devDependencies: {
      '@types/node': '^22.10.2',
      '@types/react': '^19.0.2',
      '@types/react-dom': '^19.0.2',
      typescript: '^5.7.2',
      '@biomejs/biome': '^1.9.4',
      husky: '^9.1.7',
      postcss: '^8.5.1',
    },
  };

  // Add database dependencies
  if (config.database === 'turso') {
    if (config.orm === 'prisma') {
      packageJson.dependencies['@prisma/client'] = '^6.1.0';
      packageJson.dependencies['@prisma/adapter-libsql'] = '^6.1.0';
      packageJson.dependencies['@libsql/client'] = '^0.15.0';
      packageJson.devDependencies.prisma = '^6.1.0';
      packageJson.devDependencies['@types/node'] = '^22.10.2';
      packageJson.devDependencies.tsx = '^4.20.0';
      packageJson.devDependencies['prisma-dbml-generator'] = '^0.12.0';
    } else if (config.orm === 'drizzle') {
      packageJson.dependencies['drizzle-orm'] = '^0.38.3';
      packageJson.dependencies['@libsql/client'] = '^0.15.0';
      packageJson.devDependencies['drizzle-kit'] = '^0.30.2';
      packageJson.devDependencies.tsx = '^4.20.0';
    }
  } else if (config.database === 'supabase') {
    packageJson.dependencies['@supabase/supabase-js'] = '^2.48.1';

    if (config.orm === 'prisma') {
      packageJson.dependencies['@prisma/client'] = '^6.1.0';
      packageJson.devDependencies.prisma = '^6.1.0';
      packageJson.devDependencies.tsx = '^4.20.0';
      packageJson.devDependencies['prisma-dbml-generator'] = '^0.12.0';
    } else if (config.orm === 'drizzle') {
      packageJson.dependencies['drizzle-orm'] = '^0.38.3';
      packageJson.dependencies.postgres = '^3.5.0';
      packageJson.devDependencies['drizzle-kit'] = '^0.30.2';
      packageJson.devDependencies.tsx = '^4.20.0';
    }
  }

  // Add deployment dependencies
  if (config.deployment) {
    packageJson.dependencies['@vercel/blob'] = '^0.28.2';
    packageJson.dependencies['@vercel/analytics'] = '^1.5.0';
    packageJson.dependencies['@vercel/speed-insights'] = '^1.1.0';
  }

  // Add UI library dependencies (shadcn/ui components will be added individually)
  packageJson.dependencies['@radix-ui/themes'] = '^3.1.7';
  packageJson.dependencies['lucide-react'] = '^0.468.0';

  // Sort dependencies and devDependencies
  packageJson.dependencies = sortObject(packageJson.dependencies);
  packageJson.devDependencies = sortObject(packageJson.devDependencies);

  // Write package.json
  await fs.writeJSON(path.join(config.projectPath, 'package.json'), packageJson, {
    spaces: 2,
  });
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  return Object.keys(obj)
    .sort()
    .reduce((result: Record<string, string>, key: string) => {
      result[key] = obj[key];
      return result;
    }, {});
}
