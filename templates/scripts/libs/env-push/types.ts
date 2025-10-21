// Vercel 環境変数の同期処理で利用する基本的な型定義。
// CLI エントリーポイント以外の各モジュールから共有される土台なので、
// 依存方向が循環しないようにシンプルな型宣言のみを切り出している。

export type TargetName = "preview" | "production" | "staging";

export type TargetSelection = TargetName | "all";

export type DeploymentTarget = "development" | "preview" | "production" | "staging";

export type TargetConfig = {
  readonly envFile: string;
  readonly deploymentTarget: DeploymentTarget;
  readonly gitBranch?: string;
};

export type ProjectConfig = {
  readonly orgId: string;
  readonly projectId: string;
};

export const TARGETS: Record<TargetName, TargetConfig> = {
  preview: {
    envFile: ".env.preview",
    deploymentTarget: "preview",
  },
  production: {
    envFile: ".env.production",
    deploymentTarget: "production",
  },
  staging: {
    envFile: ".env.staging",
    deploymentTarget: "staging",
  },
};

// EOF
