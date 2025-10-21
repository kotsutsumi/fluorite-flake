/**
 * Type definitions for vercel-link CLI
 */

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

export type RunCommandOptions = {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
};

export type Logger = {
  readonly info: (message: string) => void;
  readonly warn: (message: string) => void;
  readonly error: (message: string) => void;
  readonly success: (message: string) => void;
};

export type PromptFn = (message: string) => Promise<string>;

export type VercelTeam = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
};

export type VercelProject = {
  readonly name: string;
  readonly framework: string;
  readonly updated: string;
};

export type VercelProjectInfo = {
  readonly projectId: string;
  readonly orgId: string;
};

export type AppDirectory = {
  readonly path: string;
  readonly name: string;
};

export type EnvUpdateResult = {
  readonly file: string;
  readonly updated: boolean;
  readonly error?: string;
};

export type AppLinkResult = {
  readonly app: string;
  readonly projectName: string;
  readonly status: "success" | "failed" | "skipped";
  readonly updatedFiles: readonly string[];
  readonly error?: string;
};

export type VercelLinkDeps = {
  readonly projectRoot: string;
  readonly logger: Logger;
  readonly prompt: PromptFn;
  readonly runCommand: RunCommandFn;
  readonly runCommandCapture: RunCommandCaptureFn;
  readonly readFile: (path: string) => Promise<string>;
  readonly writeFile: (path: string, content: string) => Promise<void>;
  readonly exists: (path: string) => boolean;
};

// EOF
