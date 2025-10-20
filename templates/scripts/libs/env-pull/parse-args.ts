import { existsSync } from "node:fs";
import { resolve } from "node:path";

import type { TargetSelection } from "../env-push/types.js";
import { isNextAppName, NEXT_APP_NAMES, type NextAppName } from "./types.js";
import { printEnvPullUsage } from "./usage.js";

export type ParseEnvPullArgsOptions = {
  readonly cwd: string;
  readonly defaultProjectSubdir?: string;
  readonly scriptPath?: string;
};

export type ParsedEnvPullArgs = {
  readonly projectRoot: string;
  readonly apps?: readonly NextAppName[];
  readonly selection: TargetSelection;
};

const DEFAULT_SCRIPT_PATH = "scripts/env-pull.ts";
const DEFAULT_PROJECT_SUBDIR = ".";
const VALID_SELECTIONS: readonly TargetSelection[] = ["preview", "production", "staging", "all"];

function parseAppsValue(value: string, scriptPath: string): NextAppName[] {
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (entries.length === 0) {
    printEnvPullUsage(scriptPath);
    throw new Error("At least one app name must be provided with --apps");
  }

  const invalid = entries.filter((entry) => !isNextAppName(entry));
  if (invalid.length > 0) {
    printEnvPullUsage(scriptPath);
    throw new Error(`Unknown app name(s): ${invalid.join(", ")}`);
  }

  const deduped = [...new Set(entries)] as NextAppName[];
  return deduped;
}

function parseTargetValue(value: string, scriptPath: string): TargetSelection {
  if (!VALID_SELECTIONS.includes(value as TargetSelection)) {
    printEnvPullUsage(scriptPath);
    throw new Error(`Unknown target: ${value}`);
  }
  return value as TargetSelection;
}

type ParsedFlag = {
  readonly name: string;
  readonly inlineValue?: string;
};

function parseFlag(arg: string): ParsedFlag | null {
  if (!arg.startsWith("--")) {
    return null;
  }

  const [name, inlineValue] = arg.split("=", 2);
  if (inlineValue === undefined) {
    return { name };
  }

  return { name, inlineValue };
}

function readOptionValue(
  flag: ParsedFlag,
  argv: readonly string[],
  currentIndex: number,
  errorMessage: string
): { readonly value: string; readonly nextIndex: number } {
  if (flag.inlineValue !== undefined) {
    return { value: flag.inlineValue, nextIndex: currentIndex };
  }

  const nextValue = argv[currentIndex + 1];
  if (!nextValue) {
    throw new Error(errorMessage);
  }

  return { value: nextValue, nextIndex: currentIndex + 1 };
}

export function parseEnvPullArgs(
  argv: readonly string[],
  options: ParseEnvPullArgsOptions
): ParsedEnvPullArgs {
  const scriptPath = options.scriptPath ?? DEFAULT_SCRIPT_PATH;
  const defaultProjectSubdir = options.defaultProjectSubdir ?? DEFAULT_PROJECT_SUBDIR;

  let projectRoot = resolve(options.cwd, defaultProjectSubdir);
  let projectRootExplicit = false;
  let appsFilter: NextAppName[] | undefined;
  let selection: TargetSelection = "all";

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printEnvPullUsage(scriptPath);
      throw new Error("Help requested");
    }

    const flag = parseFlag(arg);
    if (!flag) {
      printEnvPullUsage(scriptPath);
      throw new Error(`Unknown option: ${arg}`);
    }

    switch (flag.name) {
      case "--project-root": {
        const result = readOptionValue(flag, argv, index, "--project-root requires a value");
        projectRoot = resolve(options.cwd, result.value);
        projectRootExplicit = true;
        index = result.nextIndex;
        break;
      }

      case "--apps": {
        const result = readOptionValue(
          flag,
          argv,
          index,
          "--apps requires a comma separated list of app names"
        );
        appsFilter = parseAppsValue(result.value, scriptPath);
        index = result.nextIndex;
        break;
      }

      case "--target": {
        const result = readOptionValue(flag, argv, index, "--target requires a value");
        selection = parseTargetValue(result.value, scriptPath);
        index = result.nextIndex;
        break;
      }

      default: {
        printEnvPullUsage(scriptPath);
        throw new Error(`Unknown option: ${arg}`);
      }
    }
  }

  if (!(projectRootExplicit || existsSync(projectRoot))) {
    projectRoot = options.cwd;
  }

  if (appsFilter && appsFilter.length === NEXT_APP_NAMES.length) {
    appsFilter = undefined;
  }

  return {
    projectRoot,
    apps: appsFilter,
    selection,
  };
}

// EOF
