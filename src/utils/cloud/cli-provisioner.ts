import { execa } from 'execa';
import ora, { type Ora } from 'ora';
import prompts from 'prompts';
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
  CloudflareR2Record,
  SupabaseStorageRecord,
} from './types.js';

const DB_ENVIRONMENTS: ProvisionedDatabaseEnv[] = ['dev', 'stg', 'prod'];

export class CLIProvisioner implements CloudProvisioner {
  readonly mode = 'real' as const;
  private spinner?: Ora;

  async provision(config: ProjectConfig): Promise<CloudProvisioningRecord> {
    const slug = slugify(config.projectName);

    // Check if CLIs are available
    await this.checkCLITools(config);

    // Provision database resources
    const turso = config.database === 'turso' ? await this.provisionTurso(slug, config) : undefined;

    // Provision deployment resources
    const vercel = config.deployment ? await this.provisionVercel(config) : undefined;

    // Provision storage resources based on selection
    let vercelBlob: VercelBlobRecord | undefined;
    let cloudflareR2: CloudflareR2Record | undefined;
    let supabaseStorage: SupabaseStorageRecord | undefined;

    if (config.storage === 'vercel-blob' && vercel) {
      vercelBlob = await this.provisionVercelBlob(vercel, slug, config);
    } else if (config.storage === 'cloudflare-r2') {
      cloudflareR2 = await this.provisionCloudflareR2(slug, config);
    } else if (config.storage === 'supabase-storage') {
      supabaseStorage = await this.provisionSupabaseStorage(slug, config);
    }

    // Configure environment variables
    await this.configureEnvironment(
      vercel,
      turso,
      vercelBlob,
      cloudflareR2,
      supabaseStorage,
      config
    );

    return {
      mode: this.mode,
      createdAt: new Date().toISOString(),
      projectName: config.projectName,
      turso,
      vercel,
      vercelBlob,
      cloudflareR2,
      supabaseStorage,
    };
  }

  private async checkCLITools(config: ProjectConfig) {
    // Check Turso CLI if using Turso database
    if (config.database === 'turso') {
      try {
        await execa('turso', ['--version']);
      } catch {
        throw new ProvisioningError(
          'Turso CLI is required. Please install it with: curl -sSfL https://get.tur.so/install.sh | bash'
        );
      }
    }

    // Check Vercel CLI if using Vercel deployment or Vercel Blob
    if (config.deployment || config.storage === 'vercel-blob') {
      try {
        await execa('vercel', ['--version']);
      } catch {
        throw new ProvisioningError(
          'Vercel CLI is required. Please install it with: npm install -g vercel'
        );
      }
    }

    // Check Wrangler CLI if using Cloudflare R2
    if (config.storage === 'cloudflare-r2') {
      try {
        await execa('wrangler', ['--version']);
      } catch {
        throw new ProvisioningError(
          'Wrangler CLI is required for Cloudflare R2. Please install it with: npm install -g wrangler'
        );
      }
    }

    // Check Supabase CLI if using Supabase database or storage
    if (config.database === 'supabase' || config.storage === 'supabase-storage') {
      try {
        await execa('supabase', ['--version']);
      } catch {
        throw new ProvisioningError(
          'Supabase CLI is required. Please install it from: https://supabase.com/docs/guides/cli'
        );
      }
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

        // Check if database already exists
        let databaseExists = false;
        try {
          await execa('turso', ['db', 'show', dbName]);
          databaseExists = true;
        } catch {
          // Database doesn't exist
        }

        if (databaseExists) {
          this.spinner.stop();
          const { action } = await prompts({
            type: 'select',
            name: 'action',
            message: `Turso database '${dbName}' already exists. What would you like to do?`,
            choices: [
              { title: 'Use existing database', value: 'use' },
              { title: 'Delete and recreate', value: 'recreate' },
              { title: 'Cancel', value: 'cancel' },
            ],
          });

          if (action === 'cancel') {
            throw new ProvisioningError('User cancelled provisioning');
          }

          if (action === 'recreate') {
            this.spinner = ora(`Deleting existing database ${dbName}...`).start();
            await execa('turso', ['db', 'destroy', dbName, '--yes']);
            this.spinner.text = `Creating database ${dbName}...`;
            await execa('turso', ['db', 'create', dbName]);
          } else {
            this.spinner = ora(`Using existing database ${dbName}...`).start();
          }
        } else {
          this.spinner.text = `Creating database ${dbName}...`;
          await execa('turso', ['db', 'create', dbName]);
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

      // Check if project already exists by checking if we're already linked
      let projectExists = false;
      try {
        // Try to get project info to see if we're already linked
        const { stdout: projectInfo } = await execa('vercel', ['project'], {
          cwd: config.projectPath,
          reject: false,
        });
        // If we got project info and it contains our project name, we're already linked
        if (projectInfo && !projectInfo.includes('Error') && projectInfo.includes('Name:')) {
          const nameMatch = projectInfo.match(/Name:\s+(\S+)/);
          if (nameMatch && nameMatch[1] === config.projectName) {
            projectExists = true;
          }
        }
      } catch {
        // Not linked to any project, which is fine
      }

      if (projectExists) {
        this.spinner.stop();
        const { action } = await prompts({
          type: 'select',
          name: 'action',
          message: `Vercel project '${config.projectName}' already exists. What would you like to do?`,
          choices: [
            { title: 'Use existing project', value: 'use' },
            { title: 'Delete and recreate', value: 'recreate' },
            { title: 'Cancel', value: 'cancel' },
          ],
        });

        if (action === 'cancel') {
          throw new ProvisioningError('User cancelled provisioning');
        }

        if (action === 'recreate') {
          this.spinner = ora(`Deleting existing project ${config.projectName}...`).start();
          await execa('vercel', ['remove', config.projectName, '--yes'], {
            cwd: config.projectPath,
            timeout: 30000,
          });
          this.spinner.text = 'Creating Vercel project...';
          // Use vercel command without --project flag, let it prompt interactively
          await execa('vercel', ['link', '--yes'], {
            cwd: config.projectPath,
            reject: false,
            timeout: 30000,
          });
        } else {
          this.spinner = ora('Using existing Vercel project...').start();
          // Link to existing project
          await execa('vercel', ['link', '--yes'], {
            cwd: config.projectPath,
            reject: false,
            timeout: 30000,
          });
        }
      } else {
        this.spinner.text = 'Creating Vercel project...';
        // Create and link new project
        await execa('vercel', ['link', '--yes'], {
          cwd: config.projectPath,
          reject: false,
          timeout: 30000,
        });
      }

      // Get project info
      const { stdout: projectInfo } = await execa('vercel', ['project'], {
        cwd: config.projectPath,
        timeout: 10000, // 10 second timeout
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

      // First, ensure we're linked to the Vercel project
      this.spinner.text = 'Ensuring Vercel project link...';
      await execa('vercel', ['link', '--yes'], {
        cwd: config.projectPath,
        reject: false,
        timeout: 15000, // 15 second timeout
      });

      // Check if blob store already exists
      let storeExists = false;
      try {
        const { stdout: storeList } = await execa('vercel', ['blob', 'store', 'list'], {
          cwd: config.projectPath,
          timeout: 10000, // 10 second timeout
        });
        if (storeList?.includes(storeName)) {
          storeExists = true;
        }
      } catch {
        // Error checking stores, continue
      }

      if (storeExists) {
        this.spinner.stop();
        const { action } = await prompts({
          type: 'select',
          name: 'action',
          message: `Vercel Blob store '${storeName}' already exists. What would you like to do?`,
          choices: [
            { title: 'Use existing store', value: 'use' },
            { title: 'Delete and recreate', value: 'recreate' },
            { title: 'Cancel', value: 'cancel' },
          ],
        });

        if (action === 'cancel') {
          throw new ProvisioningError('User cancelled provisioning');
        }

        if (action === 'recreate') {
          this.spinner = ora(`Deleting existing blob store ${storeName}...`).start();
          await execa('vercel', ['blob', 'store', 'remove', storeName], {
            cwd: config.projectPath,
            timeout: 30000, // 30 second timeout
          });
          this.spinner.text = 'Creating Vercel Blob store...';
          // Try create command - this creates AND connects the store
          try {
            await execa('vercel', ['blob', 'create', storeName], {
              cwd: config.projectPath,
              timeout: 30000, // 30 second timeout
            });
          } catch (createError: unknown) {
            // If create fails, try the add command which is used in some versions
            const error = createError as { stderr?: string; message?: string };
            if (
              error.stderr?.includes('unknown command') ||
              error.message?.includes('unknown command')
            ) {
              await execa('vercel', ['blob', 'add', storeName], {
                cwd: config.projectPath,
                timeout: 30000, // 30 second timeout
              });
            } else {
              throw createError;
            }
          }
        } else {
          this.spinner = ora('Using existing Vercel Blob store...').start();
          // Store already exists and should be connected
        }
      } else {
        this.spinner.text = 'Creating Vercel Blob store...';
        // Try create command - this creates AND connects the store
        try {
          await execa('vercel', ['blob', 'create', storeName], {
            cwd: config.projectPath,
            timeout: 30000, // 30 second timeout
          });
        } catch (createError: unknown) {
          // If create fails, try the add command which is used in some versions
          const error = createError as { stderr?: string; message?: string };
          if (
            error.stderr?.includes('unknown command') ||
            error.message?.includes('unknown command')
          ) {
            await execa('vercel', ['blob', 'add', storeName], {
              cwd: config.projectPath,
              timeout: 30000, // 30 second timeout
            });
          } else {
            throw createError;
          }
        }
      }

      // For now, we'll skip token creation as it might need manual setup
      // The BLOB_READ_WRITE_TOKEN needs to be created via the Vercel dashboard
      const readWriteToken = '';

      this.spinner.succeed('Vercel Blob storage configured');
      console.log(
        '  ℹ️  Note: Create a BLOB_READ_WRITE_TOKEN in the Vercel dashboard for blob uploads'
      );

      return {
        storeId: storeName,
        storeName,
        readWriteToken,
      };
    } catch (error) {
      this.spinner?.fail('Failed to provision Vercel Blob storage');
      throw new ProvisioningError('Failed to provision Vercel Blob storage', error);
    }
  }

  private async provisionCloudflareR2(
    slug: string,
    _config: ProjectConfig
  ): Promise<CloudflareR2Record> {
    this.spinner = ora('Setting up Cloudflare R2 storage...').start();

    try {
      const bucketName = `${slug}-r2`;

      // Check if logged in to Cloudflare
      try {
        await execa('wrangler', ['whoami']);
      } catch {
        this.spinner.text = 'Logging in to Cloudflare...';
        await execa('wrangler', ['login'], { stdio: 'inherit' });
      }

      // Check if bucket already exists
      let bucketExists = false;
      try {
        const { stdout: listOutput } = await execa('wrangler', ['r2', 'bucket', 'list']);
        if (listOutput.includes(bucketName)) {
          bucketExists = true;
        }
      } catch {
        // Error checking buckets, continue
      }

      if (bucketExists) {
        this.spinner.stop();
        const { action } = await prompts({
          type: 'select',
          name: 'action',
          message: `Cloudflare R2 bucket '${bucketName}' already exists. What would you like to do?`,
          choices: [
            { title: 'Use existing bucket', value: 'use' },
            { title: 'Delete and recreate', value: 'recreate' },
            { title: 'Cancel', value: 'cancel' },
          ],
        });

        if (action === 'cancel') {
          throw new ProvisioningError('User cancelled provisioning');
        }

        if (action === 'recreate') {
          this.spinner = ora(`Deleting existing R2 bucket ${bucketName}...`).start();
          await execa('wrangler', ['r2', 'bucket', 'delete', bucketName]);
          this.spinner.text = 'Creating Cloudflare R2 bucket...';
          await execa('wrangler', ['r2', 'bucket', 'create', bucketName]);
        } else {
          this.spinner = ora('Using existing Cloudflare R2 bucket...').start();
        }
      } else {
        this.spinner.text = 'Creating Cloudflare R2 bucket...';
        await execa('wrangler', ['r2', 'bucket', 'create', bucketName]);
      }

      this.spinner.succeed('Cloudflare R2 storage configured');
      console.log('  ℹ️  Note: Create R2 API credentials in Cloudflare dashboard for access');

      return {
        bucketName,
        // These need to be configured manually in Cloudflare dashboard
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        endpoint: '',
      };
    } catch (error) {
      this.spinner?.fail('Failed to provision Cloudflare R2 storage');
      throw new ProvisioningError('Failed to provision Cloudflare R2 storage', error);
    }
  }

  private async provisionSupabaseStorage(
    slug: string,
    _config: ProjectConfig
  ): Promise<SupabaseStorageRecord> {
    this.spinner = ora('Setting up Supabase storage...').start();

    try {
      const bucketName = `${slug}-storage`;
      const bucketId = bucketName;

      // Check if logged in to Supabase
      try {
        // Supabase CLI doesn't have a direct whoami command, we'll check if we can list projects
        await execa('supabase', ['projects', 'list']);
      } catch {
        this.spinner.text = 'Logging in to Supabase...';
        await execa('supabase', ['login'], { stdio: 'inherit' });
      }

      // Note: Supabase buckets need to be created via the API or dashboard
      // The CLI doesn't have direct bucket creation commands
      this.spinner.succeed('Supabase storage configuration prepared');
      console.log('  ℹ️  Note: Create storage bucket in Supabase dashboard:');
      console.log(`     - Bucket name: ${bucketName}`);
      console.log('     - Configure public/private access as needed');
      console.log('     - Get service role key from project settings');

      return {
        bucketName,
        bucketId,
        isPublic: false,
        // These need to be configured manually
        projectRef: '',
        serviceRoleKey: '',
        url: '',
      };
    } catch (error) {
      this.spinner?.fail('Failed to prepare Supabase storage configuration');
      throw new ProvisioningError('Failed to prepare Supabase storage configuration', error);
    }
  }

  private async configureEnvironment(
    _vercel: VercelProjectRecord | undefined,
    turso: { databases: TursoDatabaseRecord[] } | undefined,
    vercelBlob: VercelBlobRecord | undefined,
    _cloudflareR2: CloudflareR2Record | undefined,
    _supabaseStorage: SupabaseStorageRecord | undefined,
    config: ProjectConfig
  ) {
    this.spinner = ora('Configuring environment variables...').start();

    try {
      // Set environment variables for each Turso database environment
      if (turso?.databases) {
        for (const db of turso.databases) {
          const target =
            db.env === 'prod' ? 'production' : db.env === 'stg' ? 'preview' : 'development';

          // Set DATABASE_URL (no --project flag when running from project directory)
          await execa('vercel', ['env', 'add', 'DATABASE_URL', target, '--yes'], {
            cwd: config.projectPath,
            input: `${db.databaseUrl}?authToken=${db.authToken}`,
            reject: false,
          });

          // Set TURSO_DATABASE_URL
          await execa('vercel', ['env', 'add', 'TURSO_DATABASE_URL', target, '--yes'], {
            cwd: config.projectPath,
            input: db.databaseUrl,
            reject: false,
          });

          // Set TURSO_AUTH_TOKEN
          await execa('vercel', ['env', 'add', 'TURSO_AUTH_TOKEN', target, '--yes'], {
            cwd: config.projectPath,
            input: db.authToken,
            reject: false,
          });
        }
      }

      // Set BLOB_READ_WRITE_TOKEN if we have it
      if (vercelBlob?.readWriteToken) {
        await execa(
          'vercel',
          ['env', 'add', 'BLOB_READ_WRITE_TOKEN', 'development', 'preview', 'production', '--yes'],
          {
            cwd: config.projectPath,
            input: vercelBlob.readWriteToken,
            reject: false,
          }
        );
      }

      // Note: Cloudflare R2 and Supabase Storage environment variables
      // need to be configured manually via their respective dashboards

      this.spinner.succeed('Environment variables configured');
    } catch (error) {
      this.spinner?.fail('Failed to configure environment variables');
      throw new ProvisioningError('Failed to configure environment variables', error);
    }
  }
}
