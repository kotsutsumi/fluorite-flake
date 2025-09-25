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
      supabaseStorage = await this.provisionSupabaseStorage(slug, config);
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

      // Get account ID
      this.spinner.text = 'Getting Cloudflare account information...';
      let accountId = '';
      try {
        const { stdout } = await execa('wrangler', ['whoami']);
        const accountMatch = stdout.match(/Account ID:\s*([\w-]+)/);
        if (accountMatch) {
          accountId = accountMatch[1];
        }
      } catch {
        console.log('\n  ⚠️  Could not retrieve account ID automatically');
      }

      this.spinner.succeed('Cloudflare R2 storage configured');
      console.log(`  ℹ️  Bucket created: ${bucketName}`);
      if (accountId) {
        console.log(`     Account ID: ${accountId}`);
      }
      console.log('\n  ⚠️  R2 API credentials must be created manually:');
      console.log('     1. Go to Cloudflare Dashboard > R2 > Manage R2 API tokens');
      console.log('     2. Create a new API token with read/write permissions');
      console.log('     3. Save the Access Key ID and Secret Access Key');
      console.log(
        `     4. Endpoint: https://${accountId || '<account-id>'}.r2.cloudflarestorage.com`
      );

      return {
        bucketName,
        accountId,
        accessKeyId: '',
        secretAccessKey: '',
        endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '',
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
        await execa('supabase', ['projects', 'list']);
      } catch {
        this.spinner.text = 'Logging in to Supabase...';
        await execa('supabase', ['login'], { stdio: 'inherit' });
      }

      // Get project reference
      this.spinner.stop();
      const { projectRef } = await prompts({
        type: 'text',
        name: 'projectRef',
        message: 'Enter your Supabase project reference (e.g., abcdefghijklmnop):',
        validate: (value) => value.length > 0 || 'Project reference is required',
      });

      if (!projectRef) {
        throw new ProvisioningError('Supabase project reference is required');
      }

      this.spinner = ora('Configuring Supabase storage...').start();

      const projectUrl = `https://${projectRef}.supabase.co`;
      let serviceRoleKey = '';

      // Try to get API keys
      try {
        const { stdout } = await execa('supabase', [
          'projects',
          'api-keys',
          '--project-ref',
          projectRef,
        ]);

        // Parse service role key from output
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('service_role')) {
            const parts = line.split('|').map((p) => p.trim());
            if (parts.length >= 3) {
              serviceRoleKey = parts[2];
            }
          }
        }
      } catch {
        // Keys not available via CLI
      }

      // Create storage bucket using Management API if we have the service key
      if (serviceRoleKey) {
        try {
          // Use curl to create bucket via Supabase Management API
          await execa('curl', [
            '-X',
            'POST',
            `${projectUrl}/storage/v1/bucket`,
            '-H',
            `Authorization: Bearer ${serviceRoleKey}`,
            '-H',
            'Content-Type: application/json',
            '-d',
            JSON.stringify({
              id: bucketId,
              name: bucketName,
              public: false,
            }),
          ]);
          this.spinner.succeed(`Created storage bucket: ${bucketName}`);
        } catch (error) {
          if (error && typeof error === 'object' && 'stdout' in error) {
            const errorOutput = (error as { stdout?: string }).stdout;
            if (errorOutput?.includes('already exists')) {
              console.log(`\n  ℹ️  Storage bucket ${bucketName} already exists`);
            } else {
              console.log('\n  ⚠️  Could not create bucket automatically.');
            }
          } else {
            console.log('\n  ⚠️  Could not create bucket automatically.');
          }
        }
      }

      if (!serviceRoleKey) {
        console.log('\n  ℹ️  Please complete setup manually:');
        console.log(`     1. Go to https://app.supabase.com/project/${projectRef}/storage`);
        console.log(`     2. Create bucket: ${bucketName}`);
        console.log('     3. Get service role key from Settings > API');
      }

      this.spinner.succeed('Supabase storage configuration complete');
      console.log(`  ℹ️  Bucket: ${bucketName}`);
      console.log(`     Project: ${projectRef}`);
      console.log(`     Storage URL: ${projectUrl}/storage/v1`);

      return {
        bucketName,
        bucketId,
        isPublic: false,
        projectRef,
        serviceRoleKey,
        url: `${projectUrl}/storage/v1`,
      };
    } catch (error) {
      this.spinner?.fail('Failed to provision Supabase storage');
      throw new ProvisioningError('Failed to provision Supabase storage', error);
    }
  }

  private async provisionAwsS3(slug: string, _config: ProjectConfig): Promise<AwsS3Record> {
    this.spinner = ora('Setting up AWS S3 storage...').start();

    try {
      const bucketName = `${slug}-s3-bucket`;
      const region = process.env.AWS_REGION || 'us-east-1';

      // Check if logged in to AWS
      try {
        await execa('aws', ['sts', 'get-caller-identity']);
      } catch {
        this.spinner.text = 'Configuring AWS CLI...';
        console.log('\n  ℹ️  Please configure AWS CLI with: aws configure');
        console.log('     You need an AWS Access Key ID and Secret Access Key');
        throw new ProvisioningError('AWS CLI not configured. Please run: aws configure');
      }

      // Check if bucket already exists
      let bucketExists = false;
      try {
        await execa('aws', ['s3api', 'head-bucket', '--bucket', bucketName]);
        bucketExists = true;
      } catch {
        // Bucket doesn't exist, which is fine
      }

      if (bucketExists) {
        this.spinner.stop();
        const { action } = await prompts({
          type: 'select',
          name: 'action',
          message: `AWS S3 bucket '${bucketName}' already exists. What would you like to do?`,
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
          this.spinner = ora(`Deleting existing S3 bucket ${bucketName}...`).start();
          // Force delete bucket and all contents
          await execa('aws', ['s3', 'rb', `s3://${bucketName}`, '--force']);
          this.spinner.text = 'Creating S3 bucket...';
          await execa('aws', ['s3', 'mb', `s3://${bucketName}`, '--region', region]);
        } else {
          this.spinner = ora('Using existing S3 bucket...').start();
        }
      } else {
        this.spinner.text = 'Creating S3 bucket...';
        await execa('aws', ['s3', 'mb', `s3://${bucketName}`, '--region', region]);
      }

      // Set bucket policy for public read access (optional)
      this.spinner.text = 'Configuring bucket permissions...';
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${bucketName}/*`,
          },
        ],
      };

      try {
        await execa('aws', [
          's3api',
          'put-bucket-policy',
          '--bucket',
          bucketName,
          '--policy',
          JSON.stringify(policy),
        ]);
      } catch {
        // Policy setting might fail, but that's okay
        console.log(
          '\n  ⚠️  Could not set public read policy. You may need to configure this manually.'
        );
      }

      // Get AWS credentials from AWS CLI config
      this.spinner.text = 'Retrieving AWS credentials...';
      let accessKeyId = '';
      let secretAccessKey = '';

      try {
        // Get credentials from AWS CLI configuration
        const { stdout: configOutput } = await execa('aws', [
          'configure',
          'get',
          'aws_access_key_id',
        ]);
        accessKeyId = configOutput.trim();
        const { stdout: secretOutput } = await execa('aws', [
          'configure',
          'get',
          'aws_secret_access_key',
        ]);
        secretAccessKey = secretOutput.trim();
      } catch {
        console.log('\n  ⚠️  Could not retrieve AWS credentials from CLI config');
        console.log('     Credentials will need to be set as environment variables');
      }

      // Create an IAM user for this bucket (optional)
      const iamUserName = `${slug}-s3-user`;
      if (!accessKeyId || !secretAccessKey) {
        this.spinner.text = 'Creating IAM user for S3 access...';
        try {
          // Create IAM user
          await execa('aws', ['iam', 'create-user', '--user-name', iamUserName]);

          // Attach S3 policy to user
          const policyDocument = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['s3:*'],
                Resource: [`arn:aws:s3:::${bucketName}`, `arn:aws:s3:::${bucketName}/*`],
              },
            ],
          };

          const policyName = `${slug}-s3-policy`;
          await execa('aws', [
            'iam',
            'put-user-policy',
            '--user-name',
            iamUserName,
            '--policy-name',
            policyName,
            '--policy-document',
            JSON.stringify(policyDocument),
          ]);

          // Create access key for user
          const { stdout: keyOutput } = await execa('aws', [
            'iam',
            'create-access-key',
            '--user-name',
            iamUserName,
            '--output',
            'json',
          ]);

          const keyData = JSON.parse(keyOutput);
          if (keyData.AccessKey) {
            accessKeyId = keyData.AccessKey.AccessKeyId;
            secretAccessKey = keyData.AccessKey.SecretAccessKey;
            console.log(`\n  ✅ Created IAM user: ${iamUserName}`);
            console.log('     Access keys have been generated for this user');
          }
        } catch (_error) {
          console.log(`\n  ⚠️  Could not create IAM user ${iamUserName}`);
          console.log('     You may need to create access keys manually');
        }
      }

      this.spinner.succeed('AWS S3 storage configured');
      console.log(`  ℹ️  Bucket created: ${bucketName}`);
      console.log(`     Region: ${region}`);
      console.log(`     Public URL: https://${bucketName}.s3.${region}.amazonaws.com`);
      if (accessKeyId) {
        console.log('     ✅ AWS credentials configured');
      } else {
        console.log('     ⚠️  Set AWS credentials as environment variables for deployment');
      }

      return {
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        publicUrl: `https://${bucketName}.s3.${region}.amazonaws.com`,
      };
    } catch (error) {
      this.spinner?.fail('Failed to provision AWS S3 storage');
      throw new ProvisioningError('Failed to provision AWS S3 storage', error);
    }
  }

  private async provisionSupabaseDatabase(
    slug: string,
    config: ProjectConfig
  ): Promise<SupabaseProvisioningRecord> {
    this.spinner = ora('Setting up Supabase database...').start();

    try {
      // Check if logged in to Supabase
      try {
        await execa('supabase', ['projects', 'list']);
      } catch {
        this.spinner.text = 'Logging in to Supabase...';
        await execa('supabase', ['login'], { stdio: 'inherit' });
      }

      const databases: SupabaseDatabaseRecord[] = [];

      // For Supabase, we typically use one project with different schemas/environments
      // But for consistency with Turso pattern, we'll create separate projects for each env
      for (const env of DB_ENVIRONMENTS) {
        const projectName = `${slug}-${env}`;

        // Check if project exists
        let projectExists = false;
        let projectRef = '';
        try {
          const { stdout: projectsList } = await execa('supabase', ['projects', 'list']);
          if (projectsList.includes(projectName)) {
            projectExists = true;
            // Extract project ref from the list
            const match = projectsList.match(new RegExp(`(\\w{20})\\s+\\|\\s+${projectName}`));
            if (match) {
              projectRef = match[1];
            }
          }
        } catch {
          // Project doesn't exist
        }

        if (projectExists) {
          this.spinner.stop();
          const { action } = await prompts({
            type: 'select',
            name: 'action',
            message: `Supabase project '${projectName}' already exists. What would you like to do?`,
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
            this.spinner = ora(`Deleting existing project ${projectName}...`).start();
            // Note: Supabase CLI doesn't have a delete command, need to use dashboard
            console.log('\n  ⚠️  Please delete the project manually from Supabase dashboard');
            console.log(`     Project: ${projectName}`);
            throw new ProvisioningError('Manual deletion required via Supabase dashboard');
          }
          this.spinner = ora(`Using existing project ${projectName}...`).start();
        } else {
          this.spinner.text = `Creating Supabase project ${projectName}...`;
          const dbPassword = generatePassword();

          // Create new project
          const { stdout: createOutput } = await execa('supabase', [
            'projects',
            'create',
            projectName,
            '--db-password',
            dbPassword,
            '--region',
            'us-east-1',
            '--plan',
            'free',
          ]);

          // Extract project ref from output
          const refMatch = createOutput.match(/Project ID: (\w+)/);
          if (refMatch) {
            projectRef = refMatch[1];
          } else {
            // Try alternative patterns
            const altMatch = createOutput.match(/([a-z]{20})/);
            if (altMatch) {
              projectRef = altMatch[1];
            }
          }
        }

        // Get project API keys and URL
        this.spinner.text = 'Getting project credentials...';
        let anonKey = '';
        let serviceRoleKey = '';

        try {
          const { stdout: apiKeys } = await execa('supabase', [
            'projects',
            'api-keys',
            '--project-ref',
            projectRef,
          ]);

          // Parse API keys from tabular output
          const lines = apiKeys.split('\n');
          for (const line of lines) {
            if (line.includes('anon')) {
              const parts = line.split('|').map((p) => p.trim());
              if (parts.length >= 3) {
                anonKey = parts[2];
              }
            }
            if (line.includes('service_role')) {
              const parts = line.split('|').map((p) => p.trim());
              if (parts.length >= 3) {
                serviceRoleKey = parts[2];
              }
            }
          }
        } catch {
          console.log('\n  ⚠️  Could not retrieve API keys automatically');
          console.log(
            `     Get them from: https://app.supabase.com/project/${projectRef}/settings/api`
          );
        }

        // Build the actual database URL with password
        const dbPassword = projectExists ? '[YOUR-PASSWORD]' : generatePassword();
        const databaseUrl = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

        databases.push({
          env,
          projectRef,
          databaseUrl,
          anonKey,
          serviceRoleKey,
        });
      }

      this.spinner.succeed('Supabase databases created');
      console.log('  ℹ️  Note: Configure additional settings in Supabase dashboard');

      return {
        projectName: config.projectName,
        organization: '',
        databases,
      };
    } catch (error) {
      this.spinner?.fail('Failed to provision Supabase databases');
      throw new ProvisioningError('Failed to provision Supabase databases', error);
    }
  }

  private async configureEnvironment(
    _vercel: VercelProjectRecord | undefined,
    turso: { databases: TursoDatabaseRecord[] } | undefined,
    supabase: { databases: SupabaseDatabaseRecord[] } | undefined,
    vercelBlob: VercelBlobRecord | undefined,
    _cloudflareR2: CloudflareR2Record | undefined,
    _awsS3: AwsS3Record | undefined,
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

      // Set Supabase database environment variables
      if (supabase?.databases && config.deployment) {
        for (const db of supabase.databases) {
          const target =
            db.env === 'prod' ? 'production' : db.env === 'stg' ? 'preview' : 'development';

          // Set Supabase URL
          await execa('vercel', ['env', 'add', 'NEXT_PUBLIC_SUPABASE_URL', target, '--yes'], {
            cwd: config.projectPath,
            input: db.databaseUrl,
            reject: false,
          });

          // Set Supabase Anon Key
          await execa('vercel', ['env', 'add', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', target, '--yes'], {
            cwd: config.projectPath,
            input: db.anonKey,
            reject: false,
          });

          // Set Supabase Service Role Key
          await execa('vercel', ['env', 'add', 'SUPABASE_SERVICE_ROLE_KEY', target, '--yes'], {
            cwd: config.projectPath,
            input: db.serviceRoleKey,
            reject: false,
          });

          // Set DATABASE_URL for Supabase
          const dbUrl = `postgresql://postgres:[YOUR-PASSWORD]@db.${db.projectRef}.supabase.co:5432/postgres`;
          await execa('vercel', ['env', 'add', 'DATABASE_URL', target, '--yes'], {
            cwd: config.projectPath,
            input: dbUrl,
            reject: false,
          });
        }
      }

      // Set AWS S3 environment variables if available
      if (_awsS3 && config.deployment) {
        // Note: AWS credentials should be configured via IAM roles or secrets management
        console.log('\n  ⚠️  Configure AWS S3 credentials in Vercel dashboard:');
        console.log('     - AWS_REGION');
        console.log('     - AWS_ACCESS_KEY_ID');
        console.log('     - AWS_SECRET_ACCESS_KEY');
        console.log('     - S3_BUCKET_NAME');
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

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 20; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
