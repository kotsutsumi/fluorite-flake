import { execa } from 'execa';
import ora, { type Ora } from 'ora';
import prompts from 'prompts';
import type { ProjectConfig } from '../../commands/create/types.js';
import { upsertEnvFile } from '../env-file.js';
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

    private async createAndConnectBlobStore(
        storeName: string,
        projectPath: string
    ): Promise<string | undefined> {
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

        const token = await this.connectBlobStore(storeName, projectPath);
        return token;
    }

    private async connectBlobStore(
        storeName: string,
        projectPath: string
    ): Promise<string | undefined> {
        // Try to connect/link the blob store to the project
        const connectVariants: string[][] = [
            ['blob', 'store', 'connect', storeName],
            ['blob', 'store', 'link', storeName],
        ];

        let connected = false;
        let lastError: unknown;

        for (const args of connectVariants) {
            try {
                const result = await execa('vercel', args, {
                    cwd: projectPath,
                    timeout: 30000,
                    stdin: 'pipe',
                    input: 'y\n', // Auto-confirm any prompts
                });
                connected = true;

                // Try to extract token from output
                const output = result.stdout || result.stderr || '';
                const tokenMatch = output.match(/BLOB_READ_WRITE_TOKEN[=:"'\s]+((blob_|vercel_blob_)[\w-]+)/i);
                if (tokenMatch) {
                    return tokenMatch[1];
                }
                break;
            } catch (error) {
                const stderr = (error as { stderr?: string }).stderr ?? '';
                const normalized = stderr.toLowerCase();

                // Check if already connected
                if (
                    normalized.includes('already linked') ||
                    normalized.includes('already connected')
                ) {
                    connected = true;
                    break;
                }

                // Check if command not supported
                if (this.isUnsupportedBlobSubcommand(stderr)) {
                    continue;
                }

                lastError = error;
            }
        }

        // If no connect commands worked, the blob store might be auto-connected by 'add' command
        // This is fine for newer Vercel CLI versions
        if (!connected && lastError) {
            const errorStr = String(lastError);
            if (!errorStr.includes('unknown command') && !errorStr.includes('unknown argument')) {
                console.log(
                    '  ⚠️  Could not explicitly connect blob store, but it may be auto-connected'
                );
            }
        }

        return undefined;
    }

    async provision(config: ProjectConfig): Promise<CloudProvisioningRecord> {
        const slug = slugify(config.projectName);

        // Check if CLIs are available
        await this.checkCLITools(config);

        // Provision database resources
        const turso =
            config.database === 'turso' ? await this.provisionTurso(slug, config) : undefined;
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
                stdout: 'pipe',
                stderr: 'pipe',
            });

            if (!authStatus.includes('Logged in')) {
                this.spinner.stop();
                console.log('  ℹ️  Logging in to Turso...');
                await execa('turso', ['auth', 'login'], { stdio: 'inherit' });
                this.spinner = ora('Setting up Turso databases...').start();
            }

            // Get organization
            const { stdout: orgOutput } = await execa('turso', ['org', 'list'], {
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const orgMatch = orgOutput.match(/(\S+)\s+\(current\)/);
            const organization = orgMatch ? orgMatch[1] : 'default';

            const databases: TursoDatabaseRecord[] = [];

            // Check existing databases for all environments first
            const existingDatabases: Record<string, boolean> = {};
            this.spinner.text = 'Checking existing databases...';

            for (const env of DB_ENVIRONMENTS) {
                const dbName = `${slug}-${env}`;
                try {
                    // Use silent check to avoid spinner conflict
                    await execa('turso', ['db', 'show', dbName], {
                        reject: false,
                        stdout: 'pipe',
                        stderr: 'pipe',
                    });
                    existingDatabases[env] = true;
                } catch {
                    existingDatabases[env] = false;
                }
            }

            // If any databases exist, ask once for all environments
            const hasExisting = Object.values(existingDatabases).some((exists) => exists);
            let action = 'create';

            if (hasExisting) {
                // Stop spinner before prompting to avoid visual conflicts
                this.spinner.stop();

                const existingList = DB_ENVIRONMENTS.filter((env) => existingDatabases[env])
                    .map((env) => `${slug}-${env}`)
                    .join(', ');

                const response = await prompts({
                    type: 'select',
                    name: 'action',
                    message: `Found existing Turso databases: ${existingList}\nWhat would you like to do for ALL environments?`,
                    choices: [
                        { title: 'Use existing databases (keep current data)', value: 'use' },
                        {
                            title: 'Recreate all databases (delete and create new)',
                            value: 'recreate',
                        },
                    ],
                });

                action = response.action;

                // Restart spinner after prompt
                this.spinner = ora('Processing databases...').start();
            }

            // Process all databases with the same action
            for (const env of DB_ENVIRONMENTS) {
                const dbName = `${slug}-${env}`;
                const exists = existingDatabases[env];

                if (exists && action === 'recreate') {
                    this.spinner.text = `Recreating database ${dbName}...`;
                    await execa('turso', ['db', 'destroy', dbName, '--yes'], {
                        stdout: 'pipe',
                        stderr: 'pipe',
                    });
                    await execa('turso', ['db', 'create', dbName], {
                        stdout: 'pipe',
                        stderr: 'pipe',
                    });
                } else if (exists && action === 'use') {
                    this.spinner.text = `Using existing database ${dbName}...`;
                } else if (!exists) {
                    this.spinner.text = `Creating database ${dbName}...`;
                    await execa('turso', ['db', 'create', dbName], {
                        stdout: 'pipe',
                        stderr: 'pipe',
                    });
                }

                // Get database URL
                const { stdout: showOutput } = await execa('turso', ['db', 'show', dbName]);
                const urlMatch = showOutput.match(/URL:\s+(\S+)/);
                const hostname = urlMatch
                    ? urlMatch[1].replace('libsql://', '')
                    : `${dbName}-${organization}.turso.io`;

                // Create auth token
                const { stdout: tokenOutput } = await execa('turso', [
                    'db',
                    'tokens',
                    'create',
                    dbName,
                ]);
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
                if (
                    projectInfo &&
                    !projectInfo.includes('Error') &&
                    projectInfo.includes('Name:')
                ) {
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
                    this.spinner = ora(
                        `Deleting existing project ${config.projectName}...`
                    ).start();
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

        const parseStoreList = (output: string): string[] => {
            const stores: string[] = [];
            for (const line of output.split('\n')) {
                const match = line.match(/^([\w-]+)/);
                if (match?.[1] && !match[1].startsWith('Name')) {
                    stores.push(match[1]);
                }
            }
            return stores;
        };

        const uniqueStoreName = (base: string, existing: string[]): string => {
            const taken = new Set(existing);
            let candidate = base;
            let counter = 1;
            while (taken.has(candidate)) {
                candidate = `${base}-${counter++}`;
            }
            return candidate;
        };

        try {
            let storeName = `${slug}-blob`;
            let readWriteToken = '';

            this.spinner.text = 'Ensuring Vercel project link...';
            await execa('vercel', ['link', '--yes'], {
                cwd: config.projectPath,
                reject: false,
                timeout: 15000,
            });

            this.spinner.text = 'Checking existing blob stores...';
            let existingStores: string[] = [];
            try {
                const { stdout } = await execa('vercel', ['blob', 'store', 'list'], {
                    cwd: config.projectPath,
                    timeout: 10000,
                    reject: false,
                });
                existingStores = parseStoreList(stdout);
            } catch {
                // Best effort: continue with empty list
            }

            this.spinner.stop();

            const { storeAction } = await prompts({
                type: 'select',
                name: 'storeAction',
                message: 'How would you like to set up Vercel Blob storage?',
                choices: [
                    { title: 'Create new blob store', value: 'create' },
                    {
                        title: 'Select from existing stores',
                        value: 'select',
                        disabled: existingStores.length === 0,
                        description:
                            existingStores.length === 0
                                ? 'No existing blob stores found'
                                : undefined,
                    },
                ],
            });

            if (!storeAction) {
                throw new ProvisioningError('Vercel Blob storage setup was cancelled by the user.');
            }

            let action: 'create' | 'recreate' | 'use' = 'create';

            if (storeAction === 'select') {
                const { selectedStore } = await prompts({
                    type: 'select',
                    name: 'selectedStore',
                    message: 'Select an existing blob store:',
                    choices: existingStores.map((store) => ({ title: store, value: store })),
                });

                if (!selectedStore) {
                    throw new ProvisioningError(
                        'Vercel Blob storage setup was cancelled by the user.'
                    );
                }

                storeName = selectedStore;
                action = 'use';
            } else {
                const defaultName = uniqueStoreName(storeName, existingStores);
                let nextInitial = defaultName;

                while (true) {
                    const { newStoreName } = await prompts({
                        type: 'text',
                        name: 'newStoreName',
                        message: 'Enter a name for the new blob store:',
                        initial: nextInitial,
                        validate: (value: string) => {
                            if (!value || value.trim().length === 0) {
                                return 'Store name is required';
                            }
                            if (!/^[a-zA-Z0-9-]+$/.test(value.trim())) {
                                return 'Use letters, numbers, or hyphen (-) only';
                            }
                            return true;
                        },
                    });

                    if (!newStoreName) {
                        throw new ProvisioningError(
                            'Vercel Blob storage setup was cancelled by the user.'
                        );
                    }

                    const normalized = newStoreName.trim();

                    if (existingStores.includes(normalized)) {
                        const { conflict } = await prompts({
                            type: 'select',
                            name: 'conflict',
                            message: `Blob store '${normalized}' already exists. How should we proceed?`,
                            choices: [
                                { title: 'Delete and recreate this store', value: 'recreate' },
                                { title: 'Enter a different name', value: 'rename' },
                                { title: 'Use the existing store instead', value: 'use' },
                            ],
                        });

                        if (!conflict) {
                            throw new ProvisioningError(
                                'Vercel Blob storage setup was cancelled by the user.'
                            );
                        }

                        if (conflict === 'rename') {
                            nextInitial = `${normalized}-new`;
                            continue;
                        }

                        storeName = normalized;
                        action = conflict === 'use' ? 'use' : 'recreate';
                        break;
                    }

                    storeName = normalized;
                    action = 'create';
                    break;
                }
            }

            this.spinner = ora('Configuring blob store...').start();

            if (action === 'recreate') {
                this.spinner.text = `Deleting existing blob store ${storeName}...`;
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
                    const normalizedErr = (result.stderr ?? '').toLowerCase();
                    if (normalizedErr.includes('not found')) {
                        deleted = true;
                        break;
                    }
                }
                if (!deleted) {
                    throw new ProvisioningError('Failed to delete existing Vercel Blob store');
                }
                this.spinner.text = 'Creating Vercel Blob store...';
                const token = await this.createAndConnectBlobStore(storeName, config.projectPath);
                if (token) {
                    readWriteToken = token;
                }
            } else if (action === 'create') {
                this.spinner.text = 'Creating Vercel Blob store...';
                const token = await this.createAndConnectBlobStore(storeName, config.projectPath);
                if (token) {
                    readWriteToken = token;
                }
            } else {
                this.spinner.text = 'Connecting to existing Vercel Blob store...';
                const token = await this.connectBlobStore(storeName, config.projectPath);
                if (token) {
                    readWriteToken = token;
                }
            }

            if (!readWriteToken) {
                try {
                    const { stdout: tokenOutput } = await execa(
                        'vercel',
                        ['blob', 'token', 'create', storeName],
                        {
                            cwd: config.projectPath,
                            timeout: 10000,
                            reject: false,
                        }
                    );
                    const tokenMatch = tokenOutput.match(/(blob_|vercel_blob_)[\w-]+/);
                    if (tokenMatch) {
                        readWriteToken = tokenMatch[0];
                    }
                } catch {
                    // CLI might not support token creation yet
                }
            }

            if (!readWriteToken) {
                this.spinner.stop();
                console.log('\n📝  Blob store connected but needs a read/write token.\n');
                console.log(
                    '  Generate a new token in the Vercel dashboard or provide an existing token.\n'
                );

                const { tokenFlow } = await prompts({
                    type: 'select',
                    name: 'tokenFlow',
                    message: 'How would you like to continue?',
                    choices: [
                        { title: 'Open dashboard to generate a new token', value: 'dashboard' },
                        { title: 'Enter an existing BLOB_READ_WRITE_TOKEN', value: 'manual' },
                    ],
                });

                if (!tokenFlow) {
                    throw new ProvisioningError(
                        'BLOB_READ_WRITE_TOKEN is required to complete Vercel Blob setup.'
                    );
                }

                if (tokenFlow === 'dashboard') {
                    const dashboardUrl = 'https://vercel.com/dashboard/stores';
                    console.log(`\n🌐  Dashboard URL: ${dashboardUrl}\n`);
                    console.log('  Steps to generate token:');
                    console.log(`  1. Navigate to ${dashboardUrl}`);
                    console.log('  2. Select your project and blob store');
                    console.log('  3. Open the .env.local tab');
                    console.log('  4. Copy the BLOB_READ_WRITE_TOKEN value\n');

                    try {
                        const platform = process.platform;
                        if (platform === 'darwin') {
                            await execa('open', [dashboardUrl]);
                        } else if (platform === 'win32') {
                            await execa('start', [dashboardUrl], { shell: true });
                        } else {
                            await execa('xdg-open', [dashboardUrl]);
                        }
                    } catch {
                        // Optional convenience only
                    }
                }

                const { token } = await prompts({
                    type: 'text',
                    name: 'token',
                    message:
                        tokenFlow === 'manual'
                            ? 'Enter your existing BLOB_READ_WRITE_TOKEN:'
                            : 'Paste the new BLOB_READ_WRITE_TOKEN here:',
                    validate: (value: string) =>
                        value.startsWith('blob_') || value.startsWith('vercel_blob_') ||
                        'Token should start with "blob_" or "vercel_blob_"',
                });

                if (!token) {
                    throw new ProvisioningError(
                        'BLOB_READ_WRITE_TOKEN is required to complete Vercel Blob setup.'
                    );
                }

                readWriteToken = token.trim();
                this.spinner = ora('Finalizing blob storage setup...').start();
            } else {
                this.spinner.text = 'Finalizing blob storage setup...';
            }

            await this.addVercelEnv(
                'BLOB_READ_WRITE_TOKEN',
                readWriteToken,
                ['development', 'preview', 'production'],
                config.projectPath
            );

            try {
                await upsertEnvFile(config.projectPath, '.env.local', {
                    BLOB_READ_WRITE_TOKEN: readWriteToken,
                });
                await upsertEnvFile(config.projectPath, '.env.development', {
                    BLOB_READ_WRITE_TOKEN: readWriteToken,
                });
            } catch {
                console.log(
                    '  ⚠️  Failed to update local env files automatically. Please add BLOB_READ_WRITE_TOKEN manually if needed.'
                );
            }

            this.spinner.succeed('Vercel Blob storage configured');
            console.log('  ✅  BLOB_READ_WRITE_TOKEN has been configured');
            console.log('      - Added to Vercel environment');
            console.log('      - Updated .env.local and .env.development for local development');

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

            const accessKeyId =
                this.env('R2_ACCESS_KEY_ID') ?? this.env('CLOUDFLARE_R2_ACCESS_KEY_ID');
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
                supabaseRecord?.databases.find((db) => db.projectRef === projectRef)
                    ?.serviceRoleKey ??
                this.env('SUPABASE_SERVICE_ROLE_KEY');

            const anonKey =
                this.env('SUPABASE_STORAGE_ANON_KEY') ??
                supabaseRecord?.databases.find((db) => db.projectRef === projectRef)?.anonKey ??
                this.env('SUPABASE_ANON_KEY');

            const projectArgs = ['--project-ref', projectRef];

            // Ensure bucket exists via CLI (non-fatal if command fails)
            try {
                await execa('supabase', [
                    'storage',
                    'buckets',
                    'create',
                    bucketName,
                    ...projectArgs,
                ]);
                this.spinner.succeed(`Created Supabase storage bucket: ${bucketName}`);
            } catch (error) {
                const stdout = (error as { stdout?: string }).stdout ?? '';
                if (stdout.includes('already exists')) {
                    this.spinner.stop();
                    console.log(`  ℹ️  Supabase storage bucket ${bucketName} already exists`);
                } else {
                    console.log(
                        '  ⚠️  Could not create bucket via CLI。既存のバケットを利用します。'
                    );
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
        const region = this.env('AWS_REGION', 'us-east-1') || 'us-east-1';
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

                const anonKey =
                    this.env(`SUPABASE_ANON_KEY_${suffix}`) ?? this.env('SUPABASE_ANON_KEY');
                const serviceRoleKey =
                    this.env(`SUPABASE_SERVICE_ROLE_KEY_${suffix}`) ??
                    this.env('SUPABASE_SERVICE_ROLE_KEY');

                if (!anonKey || !serviceRoleKey) {
                    throw new ProvisioningError(
                        'Supabase の API キーが不足しています。SUPABASE_ANON_KEY と SUPABASE_SERVICE_ROLE_KEY を設定してください。'
                    );
                }

                const dbPassword =
                    this.env(`SUPABASE_DB_PASSWORD_${suffix}`) ?? this.env('SUPABASE_DB_PASSWORD');
                const explicitDbUrl =
                    this.env(`SUPABASE_DATABASE_URL_${suffix}`) ??
                    this.env('SUPABASE_DATABASE_URL');

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
                            db.env === 'prod'
                                ? ['production']
                                : db.env === 'stg'
                                  ? ['preview']
                                  : ['development'];

                        await this.addVercelEnv(
                            'DATABASE_URL',
                            `${db.databaseUrl}?authToken=${db.authToken}`,
                            targets,
                            projectPath
                        );
                        await this.addVercelEnv(
                            'TURSO_DATABASE_URL',
                            db.databaseUrl,
                            targets,
                            projectPath
                        );
                        await this.addVercelEnv(
                            'TURSO_AUTH_TOKEN',
                            db.authToken,
                            targets,
                            projectPath
                        );
                    }
                }

                if (config.database === 'supabase' && supabase?.databases) {
                    for (const db of supabase.databases) {
                        const targets: ('development' | 'preview' | 'production')[] =
                            db.env === 'prod'
                                ? ['production']
                                : db.env === 'stg'
                                  ? ['preview']
                                  : ['development'];

                        await this.addVercelEnv(
                            'DATABASE_URL',
                            db.databaseUrl,
                            targets,
                            projectPath
                        );
                        await this.addVercelEnv(
                            'NEXT_PUBLIC_SUPABASE_URL',
                            db.apiUrl,
                            targets,
                            projectPath
                        );
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
