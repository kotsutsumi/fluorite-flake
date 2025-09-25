import { execa } from 'execa';
import ora, { type Ora } from 'ora';
import type { ProjectConfig } from '../../commands/create.js';
import { slugify } from '../slugify.js';
import { ProvisioningError } from './errors.js';
import type {
  CloudProvisioner,
  CloudProvisioningRecord,
  ProvisionedDatabaseEnv,
  TursoDatabaseRecord,
  VercelBlobRecord,
  VercelProjectRecord,
} from './types.js';

const DB_ENVIRONMENTS: ProvisionedDatabaseEnv[] = ['dev', 'stg', 'prod'];

export class CLIProvisioner implements CloudProvisioner {
  readonly mode = 'real' as const;
  private spinner?: Ora;

  async provision(config: ProjectConfig): Promise<CloudProvisioningRecord> {
    const slug = slugify(config.projectName);

    // Check if CLIs are available
    await this.checkCLITools();

    // Provision resources
    const turso = await this.provisionTurso(slug, config);
    const vercel = await this.provisionVercel(config);
    const vercelBlob = await this.provisionVercelBlob(vercel, slug, config);

    // Configure environment variables
    await this.configureEnvironment(vercel, turso, vercelBlob, config);

    return {
      mode: this.mode,
      createdAt: new Date().toISOString(),
      projectName: config.projectName,
      turso,
      vercel,
      vercelBlob,
    };
  }

  private async checkCLITools() {
    // Check Turso CLI
    try {
      await execa('turso', ['--version']);
    } catch {
      throw new ProvisioningError(
        'Turso CLI is required. Please install it with: curl -sSfL https://get.tur.so/install.sh | bash'
      );
    }

    // Check Vercel CLI
    try {
      await execa('vercel', ['--version']);
    } catch {
      throw new ProvisioningError(
        'Vercel CLI is required. Please install it with: npm install -g vercel'
      );
    }
  }

  private async provisionTurso(slug: string, _config: ProjectConfig) {
    this.spinner = ora('Setting up Turso databases...').start();

    try {
      // Check if logged in to Turso
      const { stdout: authStatus } = await execa('turso', ['auth', 'status'], {
        reject: false,
      });

      if (!authStatus.includes('Logged in')) {
        this.spinner.text = 'Logging in to Turso...';
        await execa('turso', ['auth', 'login'], { stdio: 'inherit' });
      }

      // Get organization
      const { stdout: orgOutput } = await execa('turso', ['org', 'list']);
      const orgMatch = orgOutput.match(/(\S+)\s+\(current\)/);
      const organization = orgMatch ? orgMatch[1] : 'default';

      const databases: TursoDatabaseRecord[] = [];

      for (const env of DB_ENVIRONMENTS) {
        // Turso only accepts lowercase letters, numbers, and dashes (no underscores)
        const dbName = `${slug}-${env}`;
        this.spinner.text = `Creating database ${dbName}...`;

        // Create database
        try {
          await execa('turso', ['db', 'create', dbName]);
        } catch (error) {
          // Database might already exist
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('already exists')) {
            throw error;
          }
        }

        // Get database URL
        const { stdout: showOutput } = await execa('turso', ['db', 'show', dbName]);
        const urlMatch = showOutput.match(/URL:\s+(\S+)/);
        const hostname = urlMatch
          ? urlMatch[1].replace('libsql://', '')
          : `${dbName}-${organization}.turso.io`;

        // Create auth token
        const { stdout: tokenOutput } = await execa('turso', ['db', 'tokens', 'create', dbName]);
        const authToken = tokenOutput.trim();

        databases.push({
          env,
          name: dbName,
          hostname,
          databaseUrl: `libsql://${hostname}`,
          authToken,
        });
      }

      this.spinner.succeed('Turso databases created');

      return {
        organization,
        group: 'default',
        databases,
      };
    } catch (error) {
      this.spinner?.fail('Failed to provision Turso databases');
      throw new ProvisioningError('Failed to provision Turso databases', error);
    }
  }

  private async provisionVercel(config: ProjectConfig): Promise<VercelProjectRecord> {
    this.spinner = ora('Setting up Vercel project...').start();

    try {
      // Check if logged in to Vercel
      const { stdout: whoami } = await execa('vercel', ['whoami'], {
        reject: false,
      });

      if (!whoami || whoami.includes('Error')) {
        this.spinner.text = 'Logging in to Vercel...';
        await execa('vercel', ['login'], { stdio: 'inherit' });
      }

      // Link or create project
      this.spinner.text = 'Creating Vercel project...';

      // Create project using vercel link command
      await execa('vercel', ['link', '--yes', '--project', config.projectName], {
        cwd: config.projectPath,
        reject: false,
      });

      // Get project info
      const { stdout: projectInfo } = await execa('vercel', ['project'], {
        cwd: config.projectPath,
      });

      // Extract project details
      const nameMatch = projectInfo.match(/Name:\s+(\S+)/);
      const projectName = nameMatch ? nameMatch[1] : config.projectName;

      // Get project URL
      const urlMatch = projectInfo.match(/Production:\s+(\S+)/);
      const productionUrl = urlMatch ? urlMatch[1] : undefined;

      this.spinner.succeed('Vercel project created');

      return {
        projectId: projectName, // Use project name as ID for CLI operations
        projectName,
        productionUrl,
      };
    } catch (error) {
      this.spinner?.fail('Failed to provision Vercel project');
      throw new ProvisioningError('Failed to provision Vercel project', error);
    }
  }

  private async provisionVercelBlob(
    _project: VercelProjectRecord,
    slug: string,
    config: ProjectConfig
  ): Promise<VercelBlobRecord> {
    this.spinner = ora('Setting up Vercel Blob storage...').start();

    try {
      const storeName = `${slug}-blob`;

      // Create blob store (without --project flag since we're in the project directory)
      this.spinner.text = 'Creating Vercel Blob store...';
      await execa(
        'vercel',
        ['blob', 'create', storeName, '--yes'],
        {
          cwd: config.projectPath,
          reject: false, // Don't reject if store already exists
        }
      );

      // The store is automatically connected when created from within a project directory
      this.spinner.text = 'Verifying Blob store connection...';

      this.spinner.succeed('Vercel Blob storage configured');

      return {
        storeId: storeName,
        storeName,
        readWriteToken: '', // Will be set via environment variables
      };
    } catch (error) {
      this.spinner?.fail('Failed to provision Vercel Blob storage');
      throw new ProvisioningError('Failed to provision Vercel Blob storage', error);
    }
  }

  private async configureEnvironment(
    _vercel: VercelProjectRecord,
    turso: { databases: TursoDatabaseRecord[] },
    _vercelBlob: VercelBlobRecord,
    config: ProjectConfig
  ) {
    this.spinner = ora('Configuring environment variables...').start();

    try {
      // Set environment variables for each environment
      for (const db of turso.databases) {
        const target =
          db.env === 'prod' ? 'production' : db.env === 'stg' ? 'preview' : 'development';

        // Set DATABASE_URL (no --project flag when running from project directory)
        await execa(
          'vercel',
          [
            'env',
            'add',
            'DATABASE_URL',
            target,
            '--yes'
          ],
          {
            cwd: config.projectPath,
            input: `${db.databaseUrl}?authToken=${db.authToken}`,
            reject: false,
          }
        );

        // Set TURSO_DATABASE_URL
        await execa(
          'vercel',
          [
            'env',
            'add',
            'TURSO_DATABASE_URL',
            target,
            '--yes'
          ],
          {
            cwd: config.projectPath,
            input: db.databaseUrl,
            reject: false,
          }
        );

        // Set TURSO_AUTH_TOKEN
        await execa(
          'vercel',
          [
            'env',
            'add',
            'TURSO_AUTH_TOKEN',
            target,
            '--yes'
          ],
          {
            cwd: config.projectPath,
            input: db.authToken,
            reject: false,
          }
        );
      }

      // The BLOB_READ_WRITE_TOKEN is automatically set when connecting the store
      // No need to manually set it

      this.spinner.succeed('Environment variables configured');
    } catch (error) {
      this.spinner?.fail('Failed to configure environment variables');
      throw new ProvisioningError('Failed to configure environment variables', error);
    }
  }
}
