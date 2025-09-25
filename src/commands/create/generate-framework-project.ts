import { generateExpoProject } from '../../generators/expo-generator.js';
import { generateFlutterProject } from '../../generators/flutter-generator.js';
import { generateNextProject } from '../../generators/next-generator.js';
import { generateTauriProject } from '../../generators/tauri-generator.js';
import type { ProjectConfig } from './types.js';

export async function generateFrameworkProject(config: ProjectConfig) {
    switch (config.framework) {
        case 'nextjs':
            await generateNextProject(config);
            break;
        case 'expo':
            await generateExpoProject(config);
            break;
        case 'tauri':
            await generateTauriProject(config);
            break;
        case 'flutter':
            await generateFlutterProject(config);
            break;
        default:
            throw new Error(`Unsupported framework: ${config.framework}`);
    }
}
