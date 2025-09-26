import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read a template file from the templates directory
 * @param templatePath - Path relative to src/templates/ directory
 * @returns Template content as string
 */
export async function readTemplate(templatePath: string): Promise<string> {
    const fullPath = path.join(__dirname, '..', 'templates', templatePath);
    return await fs.readFile(fullPath, 'utf8');
}

/**
 * Read a template and replace placeholders
 * @param templatePath - Path relative to src/templates/ directory
 * @param replacements - Object with key-value pairs for replacements
 * @returns Processed template content
 */
export async function readTemplateWithReplacements(
    templatePath: string,
    replacements: Record<string, string>
): Promise<string> {
    let content = await readTemplate(templatePath);

    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
    }

    return content;
}

/**
 * Check if a template file exists
 * @param templatePath - Path relative to src/templates/ directory
 * @returns True if the template exists
 */
export async function templateExists(templatePath: string): Promise<boolean> {
    const fullPath = path.join(__dirname, '..', 'templates', templatePath);
    return await fs.pathExists(fullPath);
}
