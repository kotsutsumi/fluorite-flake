import path from 'node:path';
import fs from 'fs-extra';

function normalizeValue(value: string) {
  if (value.includes('\n') || value.includes(' ')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

export async function upsertEnvFile(
  projectPath: string,
  filename: string,
  updates: Record<string, string>
) {
  if (Object.keys(updates).length === 0) {
    return;
  }

  const filePath = path.join(projectPath, filename);
  const existing = await fs.readFile(filePath, 'utf-8').catch(() => '');
  const lines = existing.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const keys = new Set(Object.keys(updates));

  const filtered = lines.filter((line) => {
    const [key] = line.split('=', 1);
    return !keys.has(key ?? '');
  });

  for (const [key, value] of Object.entries(updates)) {
    filtered.push(`${key}=${normalizeValue(value)}`);
  }

  await fs.outputFile(filePath, `${filtered.join('\n')}\n`);
}
