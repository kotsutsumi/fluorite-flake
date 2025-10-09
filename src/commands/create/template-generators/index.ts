/**
 * テンプレートジェネレーターシステム
 */

// Phase 3で実装完了したジェネレーター
export { generateExpoGraphQL } from "./expo-graphql.js";
export { generateExpoFullstackAdmin } from "./expo-fullstack-admin.js";
// Phase 2で実装完了したジェネレーター
export { generateFullStackAdmin } from "./nextjs-fullstack-admin.js";

// Phase 4で実装完了したジェネレーター
export { generateTauriCrossPlatform } from "./tauri-cross-platform.js";

// Phase 5以降で実装予定のジェネレーター
// export { generateEnhancedProject } from "./enhanced-project-generator.js";
export type { GenerationContext, TemplateGenerationResult } from "./types.js";

// EOF
