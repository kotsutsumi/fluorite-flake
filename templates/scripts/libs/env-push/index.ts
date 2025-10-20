// env-push 関連のエクスポート集約ポイント。
// CLI 側やテストコードが import 先を意識しなくても済むように、
// ここで公開 API を一本化して扱いやすくしている。

export { ensurePrerequisites } from "./ensure-prerequisites.js";
export type { ParsedEnvPushArgs, ParseEnvPushArgsOptions } from "./parse-args.js";
export { parseEnvPushArgs } from "./parse-args.js";
export { pushTarget } from "./push-target.js";
export { normalizeValue, readEnvMap } from "./read-env-map.js";
export { resolveProjectConfig } from "./resolve-project-config.js";
export type { RunCommandFn } from "./run-command.js";
export { runCommand } from "./run-command.js";
export type { RunEnvPushDependencies, RunEnvPushOptions } from "./run-env-push.js";
export { runEnvPush } from "./run-env-push.js";
export type {
  DeploymentTarget,
  ProjectConfig,
  TargetConfig,
  TargetName,
  TargetSelection,
} from "./types.js";

export { TARGETS } from "./types.js";
export { printEnvPushUsage } from "./usage.js";

// EOF
