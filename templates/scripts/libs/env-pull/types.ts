import { resolve } from "node:path";

import type { TargetName, TargetSelection } from "../env-push/types.js";

export type NextAppName = "web" | "docs" | "backend";

export type NextAppConfig = {
  readonly name: NextAppName;
  readonly relativeDir: string;
};

export const NEXT_APP_CONFIGS: readonly NextAppConfig[] = [
  { name: "web", relativeDir: "apps/web" },
  { name: "docs", relativeDir: "apps/docs" },
  { name: "backend", relativeDir: "apps/backend" },
] as const;

export const NEXT_APP_NAMES = NEXT_APP_CONFIGS.map((config) => config.name);

export function isNextAppName(value: string): value is NextAppName {
  return (NEXT_APP_NAMES as readonly string[]).includes(value);
}

export function resolveAppDir(projectRoot: string, config: NextAppConfig): string {
  return resolve(projectRoot, config.relativeDir);
}

export type TargetSelectionOption = TargetSelection;
export type TargetOption = TargetName;

// EOF
