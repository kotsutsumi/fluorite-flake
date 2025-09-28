import { describe, expect, it } from 'vitest';
import { runCli, expectSuccess, expectOutput } from '../../helpers/cli-runner.js';

describe('CLI list command', () => {
    it('should list available frameworks', async () => {
        const result = await runCli(['list', 'frameworks']);

        expectSuccess(result);
        expectOutput(result, 'nextjs');
        expectOutput(result, 'expo');
        expectOutput(result, 'tauri');
        expectOutput(result, 'flutter');
    });

    it('should list available databases', async () => {
        const result = await runCli(['list', 'databases']);

        expectSuccess(result);
        expectOutput(result, 'turso');
        expectOutput(result, 'supabase');
    });

    it('should list available ORMs', async () => {
        const result = await runCli(['list', 'orms']);

        expectSuccess(result);
        expectOutput(result, 'prisma');
        expectOutput(result, 'drizzle');
    });

    it('should list available storage options', async () => {
        const result = await runCli(['list', 'storage']);

        expectSuccess(result);
        expectOutput(result, 'vercel-blob');
        expectOutput(result, 'aws-s3');
        expectOutput(result, 'cloudflare-r2');
        expectOutput(result, 'supabase-storage');
    });

    it('should display help when no subcommand provided', async () => {
        const result = await runCli(['list']);

        expectSuccess(result);
        expectOutput(result, /list.*<type>/i);
    });

    it('should handle invalid list type', async () => {
        const result = await runCli(['list', 'invalid-type']);

        // Should still succeed but with a message about invalid type
        expectSuccess(result);
        expectOutput(result, /frameworks|databases|orms|storage/i);
    });
});
