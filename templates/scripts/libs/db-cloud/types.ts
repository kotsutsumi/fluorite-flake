/**
 * DB Cloud CLI で共通利用する型定義。
 * ここで定義した型を通じて、テスト時に依存関係を注入できるようにする。
 */
export const DB_ENVIRONMENTS = ["preview", "staging", "production"] as const;

export type DbEnvironment = (typeof DB_ENVIRONMENTS)[number];

export type EnvironmentTarget = DbEnvironment | "all";

export type DbCloudCommand = "create" | "migrate" | "push" | "seed" | "reset";

export type ParsedCli = {
  readonly command: DbCloudCommand;
  readonly environment: EnvironmentTarget;
  readonly name?: string;
  readonly primaryRegion?: string;
  readonly yes: boolean;
};

export type EnvironmentCredentials = {
  readonly env: DbEnvironment;
  readonly databaseUrl: string;
  readonly authToken: string;
  readonly databaseName: string;
};

export type Logger = {
  readonly info: (message: string) => void;
  readonly warn: (message: string) => void;
  readonly error: (message: string) => void;
};

export type RunCommandOptions = {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
};

export type RunCommandFn = (
  command: string,
  args: readonly string[],
  options?: RunCommandOptions
) => Promise<void>;

export type RunCommandCaptureFn = (
  command: string,
  args: readonly string[],
  options?: RunCommandOptions
) => Promise<string>;

export type PromptFn = (message: string) => Promise<string>;

export type ResolveBaseNameOptions = {
  readonly initialName?: string;
  readonly autoApprove: boolean;
  readonly existingNames: readonly string[];
  readonly prompt: PromptFn;
  readonly logger: Logger;
};

export type TursoDatabaseDetails = {
  readonly name: string;
  readonly url: string;
  readonly hostname?: string;
  readonly locations?: readonly string[];
};

export type TursoClientDeps = {
  readonly runCommand: RunCommandFn;
  readonly runCommandCapture: RunCommandCaptureFn;
  readonly logger: Logger;
};

export type EnvManagerDeps = {
  readonly readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  readonly writeFile: (path: string, content: string, encoding: BufferEncoding) => Promise<void>;
  readonly mkdir: (path: string, options: { readonly recursive: boolean }) => Promise<void>;
  readonly exists: (path: string) => boolean;
  readonly logger: Logger;
};

export type PrismaRunnerDeps = {
  readonly runCommand: RunCommandFn;
  readonly projectRoot: string;
  readonly logger: Logger;
};

export type DbCloudRunnerDeps = {
  readonly projectRoot: string;
  readonly backendRoot: string;
  readonly env: NodeJS.ProcessEnv;
  readonly logger: Logger;
  readonly runCommand: RunCommandFn;
  readonly runCommandCapture: RunCommandCaptureFn;
};

// EOF
