// Main library exports for programmatic usage
export { createProject, type ProjectConfig } from './commands/create.js';
export { setupAuth } from './generators/auth-generator.js';
export { setupDatabase } from './generators/database-generator.js';
export { setupDeployment } from './generators/deployment-generator.js';
export { setupStorage } from './generators/storage-generator.js';
export { generateNextProject } from './generators/next-generator.js';
export { generateExpoProject } from './generators/expo-generator.js';
export { generateTauriProject } from './generators/tauri-generator.js';
export { generateFlutterProject } from './generators/flutter-generator.js';
