import type { EnvProject } from "./env-types.js";

// 暗号化対象となるワークスペースを順序付きで定義する。
const ENV_PROJECTS: readonly EnvProject[] = [
  { name: "docs", relativePath: "apps/docs" },
  { name: "web", relativePath: "apps/web" },
  { name: "backend", relativePath: "apps/backend" },
  { name: "mobile", relativePath: "apps/mobile" },
] as const;

// 外部から誤って書き換えられないよう、定義済み配列をそのまま返す。
export function getEnvProjects(): readonly EnvProject[] {
  return ENV_PROJECTS;
}

// EOF
