import { execa } from 'execa';
import ora, { type Ora } from 'ora';
import prompts from 'prompts';
import type { ProjectConfig } from '../../commands/create.js';
import { slugify } from '../slugify.js';
import { ProvisioningError } from './errors.js';
import type {
  AwsS3Record,
  CloudProvisioner,
  CloudProvisioningRecord,
  CloudflareR2Record,
  ProvisionedDatabaseEnv,
  SupabaseDatabaseRecord,
  SupabaseProvisioningRecord,
  SupabaseStorageRecord,
  TursoDatabaseRecord,
  VercelBlobRecord,
  VercelProjectRecord,
} from './types.js';

const DB_ENVIRONMENTS: ProvisionedDatabaseEnv[] = ['dev', 'stg', 'prod'];

export class CLIProvisioner implements CloudProvisioner {
  readonly mode = 'real' as const;
  private spinner?: Ora;

  private env(name: string, fallback?: string): string | undefined {
    const value = process.env[name]?.trim();
    if (value && value.length > 0) {
      return value;
    }
    return fallback;
  }

  private async lookupCloudflareAccountId(): Promise<string | undefined> {
    try {
      const { stdout } = await execa('wrangler', ['whoami']);
      const idMatch = stdout.match(/Account ID:\s*([\w-]+)/i);
      if (idMatch?.[1]) {
        return idMatch[1];
      }
      const parenMatch = stdout.match(/\(([-\w]{12,})\)/);
      return parenMatch?.[1];
    } catch {
      return undefined;
    }
  }

  private async addVercelEnv(
    key: string,
    value: string | undefined,
    targets: ('development' | 'preview' | 'production')[],
    projectPath: string
  ) {
    if (!value || value.length === 0) {
      return;
    }

    try {
      await execa('vercel', ['env', 'add', key, ...targets, '--yes'], {
        cwd: projectPath,
        input: value,
        reject: false,
      });
    } catch {
      console.log(`  ⚠️  Failed to write Vercel env ${key}. Set it manually if required.`);
    }
  }

  private isUnsupportedBlobSubcommand(stderr: string | undefined): boolean {
    if (!stderr) {
      return false;
    }
    const normalized = stderr.toLowerCase();
    return (
      normalized.includes('unknown command') ||
      normalized.includes('unknown argument') ||
      normalized.includes('please specify a valid subcommand') ||
      normalized.includes('did you mean')
    );
  }

  private async createAndConnectBlobStore(storeName: string, projectPath: string) {
    const createVariants: string[][] = [
      ['blob', 'store', 'add', storeName],
      ['blob', 'store', 'create', storeName],
    ];

    let created = false;
    for (const args of createVariants) {
      try {
        await execa('vercel', args, {
          cwd: projectPath,
          timeout: 30000,
          stdin: 'pipe',
          input: 'y\n', // Auto-confirm any prompts
        });
        created = true;
        break;
      } catch (error) {
        const stderr = (error as { stderr?: string }).stderr ?? '';
        const normalized = stderr.toLowerCase();
        if (normalized.includes('already exists')) {
          created = true;
          break;
        }
        if (this.isUnsupportedBlobSubcommand(stderr)) {
          continue;
        }
        throw error;
      }
    }

    if (!created) {
      throw new ProvisioningError('Vercel Blob store を作成できませんでした。');
    }

    await this.connectBlobStore(storeName, projectPath);
  }

  private async connectBlobStore(storeName: string, projectPath: string) {
    const connectVariants: string[][] = [
      ['blob', 'store', 'connect', storeName],
      ['blob', 'store', 'link', storeName],
    ];

    let lastError: unknown;

    for (const args of connectVariants) {
      try {
        await execa('vercel', args, {
          cwd: projectPath,
          timeout: 30000,
          stdin: 'pipe',
          input: 'y\n', // Auto-confirm any prompts
        });
        return;
      } catch (error) {
        const stderr = (error as { stderr?: string }).stderr ?? '';
        const normalized = stderr.toLowerCase();
        if (this.isUnsupportedBlobSubcommand(stderr)) {
          continue;
        }
        if (normalized.includes('already linked') || normalized.includes('already connected')) {
          return;
        }
        lastError = error;
      }
    }

    if (lastError) {
      throw new ProvisioningError(
        'Vercel Blob store をプロジェクトに接続できませんでした。',
        lastError
      );
    }

    console.log(
      '  ℹ️  現在の Vercel CLI では Blob store の connect ステップが不要なためスキップしました。'
    );
  }

  async provision(config: ProjectConfig): Promise<CloudProvisioningRecord> {
    const slug = slugify(config.projectName);

    // Check if CLIs are available
    await this.checkCLITools(config);

    // Provision database resources
    const turso = config.database === 'turso' ? await this.provisionTurso(slug, config) : undefined;
    const supabase =
      config.database === 'supabase'
        ? await this.provisionSupabaseDatabase(slug, config)
        : undefined;

    // Provision deployment resources
    const vercel = config.deployment ? await this.provisionVercel(config) : undefined;

    // Provision storage resources based on selection
    let vercelBlob: VercelBlobRecord | undefined;
    let cloudflareR2: CloudflareR2Record | undefined;
    let awsS3: AwsS3Record | undefined;
    let supabaseStorage: SupabaseStorageRecord | undefined;

    if (config.storage === 'vercel-blob' && vercel) {
      vercelBlob = await this.provisionVercelBlob(vercel, slug, config);
    } else if (config.storage === 'cloudflare-r2') {
      cloudflareR2 = await this.provisionCloudflareR2(slug, config);
    } else if (config.storage === 'aws-s3') {
      awsS3 = await this.provisionAwsS3(slug, config);
    } else if (config.storage === 'supabase-storage') {
      supabaseStorage = await this.provisionSupabaseStorage(slug, config, supabase);
    }

    // Configure environment variables
    await this.configureEnvironment(
      vercel,
      turso,
      supabase,
      vercelBlob,
      cloudflareR2,
      awsS3,
      supabaseStorage,
      config
    );

    return {
      mode: this.mode,
      createdAt: new Date().toISOString(),
      projectName: config.projectName,
      turso,
      supabase,
      vercel,
      vercelBlob,
      cloudflareR2,
      awsS3,
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

    // Check AWS CLI if using S3 storage
    if (config.storage === 'aws-s3') {
      try {
        await execa('aws', ['--version']);
      } catch {
        throw new ProvisioningError(
          'AWS CLI is required for S3. Please install it from: https://aws.amazon.com/cli/'
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
            this.spinner = ora(`Recreating database ${dbName}...`).start();
            await execa('turso', ['db', 'destroy', dbName, '--yes']);
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
        const getResult = await execa('vercel', ['blob', 'store', 'get', storeName], {
          cwd: config.projectPath,
          timeout: 10000, // 10 second timeout
          reject: false,
        });
        if (getResult.exitCode === 0) {
          storeExists = true;
        } else if (this.isUnsupportedBlobSubcommand(getResult.stderr)) {
          try {
            const { stdout: storeList } = await execa('vercel', ['blob', 'store', 'list'], {
              cwd: config.projectPath,
              timeout: 10000,
            });
            if (storeList?.includes(storeName)) {
              storeExists = true;
            }
          } catch {
            // ignore fallback errors
          }
        }
      } catch {
        // Ignore errors; creation step will surface actionable failures
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
          const deleteArgs: string[][] = [
            ['blob', 'store', 'remove', storeName],
            ['blob', 'store', 'rm', storeName],
            ['blob', 'store', 'delete', storeName],
          ];
          let deleted = false;
          for (const args of deleteArgs) {
            const result = await execa('vercel', args, {
              cwd: config.projectPath,
              timeout: 30000,
              reject: false,
            });
            if (result.exitCode === 0) {
              deleted = true;
              break;
            }
            if (this.isUnsupportedBlobSubcommand(result.stderr)) {
              continue;
            }
            const normalized = (result.stderr ?? '').toLowerCase();
            if (normalized.includes('not found')) {
              deleted = true;
              break;
            }
          }
          if (!deleted) {
            throw new ProvisioningError('既存の Vercel Blob store を削除できませんでした。');
          }
          this.spinner.text = 'Creating Vercel Blob store...';
          await this.createAndConnectBlobStore(storeName, config.projectPath);
        } else {
          this.spinner = ora('Using existing Vercel Blob store...').start();
          await this.connectBlobStore(storeName, config.projectPath);
        }
      } else {
        this.spinner.text = 'Creating Vercel Blob store...';
        await this.createAndConnectBlobStore(storeName, config.projectPath);
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
    const bucketName = `${slug}-r2`;
    this.spinner = ora('Configuring Cloudflare R2 bucket...').start();

    try {
      // Create bucket if needed
      try {
        await execa('wrangler', ['r2', 'bucket', 'create', bucketName]);
        this.spinner.succeed(`Created Cloudflare R2 bucket: ${bucketName}`);
      } catch (error) {
        const stdout = (error as { stdout?: string }).stdout ?? '';
        if (stdout.includes('already exists')) {
          this.spinner.stop();
          console.log(`  ℹ️  Cloudflare R2 bucket ${bucketName} already exists`);
        } else {
          throw error;
        }
      }

      const accountId =
        this.env('CLOUDFLARE_ACCOUNT_ID') ?? (await this.lookupCloudflareAccountId());

      const accessKeyId = this.env('R2_ACCESS_KEY_ID') ?? this.env('CLOUDFLARE_R2_ACCESS_KEY_ID');
      const secretAccessKey =
        this.env('R2_SECRET_ACCESS_KEY') ?? this.env('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

      if (!accessKeyId || !secretAccessKey) {
        console.log('\n  ⚠️  Cloudflare R2 API キーが設定されていません。');
        console.log(
          '     ダッシュボードまたは wrangler を使用して Access Key ID / Secret を発行し、環境変数 R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY として設定してください。'
        );
      }

      const endpoint =
        this.env('R2_ENDPOINT') ??
        (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

      return {
        bucketName,
        accountId,
        accessKeyId: accessKeyId ?? undefined,
        secretAccessKey: secretAccessKey ?? undefined,
        endpoint,
      };
    } catch (error) {
      this.spinner?.fail('Failed to configure Cloudflare R2 bucket');
      throw new ProvisioningError('Failed to provision Cloudflare R2 storage', error);
    }
  }

  private async provisionSupabaseStorage(
    slug: string,
    _config: ProjectConfig,
    supabaseRecord?: SupabaseProvisioningRecord
  ): Promise<SupabaseStorageRecord> {
    this.spinner = ora('Configuring Supabase storage bucket...').start();

    try {
      const bucketName = `${slug}-storage`;
      const bucketId = bucketName;

      const projectRef =
        this.env('SUPABASE_STORAGE_PROJECT_REF') ??
        supabaseRecord?.databases.find((db) => db.env === 'prod')?.projectRef ??
        supabaseRecord?.databases[0]?.projectRef;

      if (!projectRef) {
        throw new ProvisioningError(
          'Supabase Storage を自動設定するには SUPABASE_STORAGE_PROJECT_REF または SUPABASE_PROJECT_REF を指定してください。'
        );
      }

      const serviceRoleKey =
        this.env('SUPABASE_STORAGE_SERVICE_ROLE_KEY') ??
        supabaseRecord?.databases.find((db) => db.projectRef === projectRef)?.serviceRoleKey ??
        this.env('SUPABASE_SERVICE_ROLE_KEY');

      const anonKey =
        this.env('SUPABASE_STORAGE_ANON_KEY') ??
        supabaseRecord?.databases.find((db) => db.projectRef === projectRef)?.anonKey ??
        this.env('SUPABASE_ANON_KEY');

      const projectArgs = ['--project-ref', projectRef];

      // Ensure bucket exists via CLI (non-fatal if command fails)
      try {
        await execa('supabase', ['storage', 'buckets', 'create', bucketName, ...projectArgs]);
        this.spinner.succeed(`Created Supabase storage bucket: ${bucketName}`);
      } catch (error) {
        const stdout = (error as { stdout?: string }).stdout ?? '';
        if (stdout.includes('already exists')) {
          this.spinner.stop();
          console.log(`  ℹ️  Supabase storage bucket ${bucketName} already exists`);
        } else {
          console.log('  ⚠️  Could not create bucket via CLI。既存のバケットを利用します。');
        }
      }

      const url = `https://${projectRef}.supabase.co/storage/v1`;

      return {
        bucketName,
        bucketId,
        isPublic: false,
        projectRef,
        serviceRoleKey,
        anonKey,
        url,
      };
    } catch (error) {
      this.spinner?.fail('Supabase Storage の設定に失敗しました');
      throw new ProvisioningError('Failed to provision Supabase storage', error);
    }
  }

  private async provisionAwsS3(slug: string, _config: ProjectConfig): Promise<AwsS3Record> {
    const bucketName = `${slug}-s3-bucket`;
    const region = this.env('AWS_REGION', 'us-east-1')!;
    this.spinner = ora('Configuring AWS S3 bucket...').start();

    try {
      try {
        await execa('aws', ['s3api', 'head-bucket', '--bucket', bucketName]);
        this.spinner.stop();
        console.log(`  ℹ️  AWS S3 bucket ${bucketName} already exists`);
      } catch {
        this.spinner.text = 'Creating AWS S3 bucket...';
        const createArgs = ['s3api', 'create-bucket', '--bucket', bucketName];
        if (region && region !== 'us-east-1') {
          createArgs.push(
            '--region',
            region,
            '--create-bucket-configuration',
            JSON.stringify({ LocationConstraint: region })
          );
        }
        await execa('aws', createArgs);
        this.spinner.succeed(`Created AWS S3 bucket: ${bucketName}`);
      }

      const accessKeyId = this.env('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.env('AWS_SECRET_ACCESS_KEY');

      if (!accessKeyId || !secretAccessKey) {
        console.log('\n  ⚠️  AWS のアクセスキーが設定されていません。');
        console.log(
          '     IAM で発行した Access Key ID / Secret Access Key を環境変数として設定してください。'
        );
      }

      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com`;

      return {
        bucketName,
        region,
        accessKeyId: accessKeyId ?? undefined,
        secretAccessKey: secretAccessKey ?? undefined,
        publicUrl,
      };
    } catch (error) {
      this.spinner?.fail('AWS S3 バケットの設定に失敗しました');
      throw new ProvisioningError('Failed to provision AWS S3 storage', error);
    }
  }

  private async provisionSupabaseDatabase(
    _slug: string,
    config: ProjectConfig
  ): Promise<SupabaseProvisioningRecord> {
    this.spinner = ora('Configuring Supabase credentials...').start();

    try {
      const databases: SupabaseDatabaseRecord[] = DB_ENVIRONMENTS.map((env) => {
        const suffix = env.toUpperCase();
        const projectRef =
          this.env(`SUPABASE_PROJECT_REF_${suffix}`) ?? this.env('SUPABASE_PROJECT_REF');

        if (!projectRef) {
          throw new ProvisioningError(
            `Supabase のプロジェクト参照が見つかりません。環境変数 SUPABASE_PROJECT_REF${
              suffix !== 'DEV' ? `_${suffix}` : ''
            } を設定してください。`
          );
        }

        const apiUrl =
          this.env(`SUPABASE_URL_${suffix}`) ??
          this.env('SUPABASE_URL') ??
          `https://${projectRef}.supabase.co`;

        const anonKey = this.env(`SUPABASE_ANON_KEY_${suffix}`) ?? this.env('SUPABASE_ANON_KEY');
        const serviceRoleKey =
          this.env(`SUPABASE_SERVICE_ROLE_KEY_${suffix}`) ?? this.env('SUPABASE_SERVICE_ROLE_KEY');

        if (!anonKey || !serviceRoleKey) {
          throw new ProvisioningError(
            'Supabase の API キーが不足しています。SUPABASE_ANON_KEY と SUPABASE_SERVICE_ROLE_KEY を設定してください。'
          );
        }

        const dbPassword =
          this.env(`SUPABASE_DB_PASSWORD_${suffix}`) ?? this.env('SUPABASE_DB_PASSWORD');
        const explicitDbUrl =
          this.env(`SUPABASE_DATABASE_URL_${suffix}`) ?? this.env('SUPABASE_DATABASE_URL');

        const databaseUrl =
          explicitDbUrl ??
          (dbPassword
            ? `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`
            : `postgresql://postgres@db.${projectRef}.supabase.co:5432/postgres`);

        return {
          env,
          projectRef,
          databaseUrl,
          dbPassword,
          apiUrl,
          anonKey,
          serviceRoleKey,
        } satisfies SupabaseDatabaseRecord;
      });

      this.spinner.succeed('Supabase 資格情報を取得しました');

      return {
        projectName: config.projectName,
        organization: '',
        databases,
      };
    } catch (error) {
      this.spinner?.fail('Supabase 資格情報の設定に失敗しました');
      throw error;
    }
  }

  private async configureEnvironment(
    _vercel: VercelProjectRecord | undefined,
    turso: { databases: TursoDatabaseRecord[] } | undefined,
    supabase: SupabaseProvisioningRecord | undefined,
    vercelBlob: VercelBlobRecord | undefined,
    cloudflareR2: CloudflareR2Record | undefined,
    awsS3: AwsS3Record | undefined,
    supabaseStorage: SupabaseStorageRecord | undefined,
    config: ProjectConfig
  ) {
    this.spinner = ora('Configuring environment variables...').start();

    try {
      if (config.deployment) {
        const projectPath = config.projectPath;

        if (config.database === 'turso' && turso?.databases) {
          for (const db of turso.databases) {
            const targets: ('development' | 'preview' | 'production')[] =
              db.env === 'prod' ? ['production'] : db.env === 'stg' ? ['preview'] : ['development'];

            await this.addVercelEnv(
              'DATABASE_URL',
              `${db.databaseUrl}?authToken=${db.authToken}`,
              targets,
              projectPath
            );
            await this.addVercelEnv('TURSO_DATABASE_URL', db.databaseUrl, targets, projectPath);
            await this.addVercelEnv('TURSO_AUTH_TOKEN', db.authToken, targets, projectPath);
          }
        }

        if (config.database === 'supabase' && supabase?.databases) {
          for (const db of supabase.databases) {
            const targets: ('development' | 'preview' | 'production')[] =
              db.env === 'prod' ? ['production'] : db.env === 'stg' ? ['preview'] : ['development'];

            await this.addVercelEnv('DATABASE_URL', db.databaseUrl, targets, projectPath);
            await this.addVercelEnv('NEXT_PUBLIC_SUPABASE_URL', db.apiUrl, targets, projectPath);
            await this.addVercelEnv(
              'NEXT_PUBLIC_SUPABASE_ANON_KEY',
              db.anonKey,
              targets,
              projectPath
            );
            await this.addVercelEnv(
              'SUPABASE_SERVICE_ROLE_KEY',
              db.serviceRoleKey,
              targets,
              projectPath
            );
          }
        }

        if (vercelBlob?.readWriteToken) {
          await this.addVercelEnv(
            'BLOB_READ_WRITE_TOKEN',
            vercelBlob.readWriteToken,
            ['development', 'preview', 'production'],
            projectPath
          );
        }

        if (cloudflareR2) {
          await this.addVercelEnv(
            'R2_BUCKET_NAME',
            cloudflareR2.bucketName,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'R2_ACCOUNT_ID',
            cloudflareR2.accountId,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'R2_ACCESS_KEY_ID',
            cloudflareR2.accessKeyId,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'R2_SECRET_ACCESS_KEY',
            cloudflareR2.secretAccessKey,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'R2_ENDPOINT',
            cloudflareR2.endpoint,
            ['development', 'preview', 'production'],
            projectPath
          );
        }

        if (awsS3) {
          await this.addVercelEnv(
            'S3_BUCKET_NAME',
            awsS3.bucketName,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'AWS_REGION',
            awsS3.region,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'AWS_ACCESS_KEY_ID',
            awsS3.accessKeyId,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'AWS_SECRET_ACCESS_KEY',
            awsS3.secretAccessKey,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'AWS_S3_PUBLIC_URL',
            awsS3.publicUrl,
            ['development', 'preview', 'production'],
            projectPath
          );
        }

        if (supabaseStorage) {
          await this.addVercelEnv(
            'SUPABASE_STORAGE_BUCKET',
            supabaseStorage.bucketName,
            ['development', 'preview', 'production'],
            projectPath
          );
          await this.addVercelEnv(
            'SUPABASE_STORAGE_URL',
            supabaseStorage.url,
            ['development', 'preview', 'production'],
            projectPath
          );
        }
      }

      this.spinner.succeed('Environment variables configured');
    } catch (error) {
      this.spinner?.fail('Failed to configure environment variables');
      throw new ProvisioningError('Failed to configure environment variables', error);
    }
  }
}
