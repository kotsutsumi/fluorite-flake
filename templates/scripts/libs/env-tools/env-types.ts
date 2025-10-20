// Shared types consumed by the CLI helpers. Keeping them in a single module
// 暗号化・復号の各モジュールで共通利用する型をまとめて定義し、循環参照を防ぐ。
export type EnvProject = {
  readonly name: string;
  readonly relativePath: string;
};

export type ProjectOperationKind = "encrypt" | "decrypt";

export type ProjectOperationResult =
  | {
      readonly kind: ProjectOperationKind;
      readonly project: EnvProject;
      readonly status: "skipped";
      readonly message: string;
    }
  | {
      readonly kind: ProjectOperationKind;
      readonly project: EnvProject;
      readonly status: "success";
      readonly files: readonly string[];
    };

export type EncryptOptions = {
  readonly rootDir: string;
  readonly password: string;
};

export type DecryptOptions = {
  readonly rootDir: string;
  readonly password: string;
};

// テストで実行路を確保するためのダミー値。使用側には影響しない。
export const __envTypesRuntimeMarker = true;

// EOF
