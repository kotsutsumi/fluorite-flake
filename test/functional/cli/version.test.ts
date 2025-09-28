import { describe, expect, it } from 'vitest';
import { runCli, expectSuccess, expectOutput } from '../../helpers/cli-runner.js';
import packageJson from '../../../package.json';

describe('CLI version command', () => {
    it('should display version with --version flag', async () => {
        const result = await runCli(['--version']);

        expectSuccess(result);
        expectOutput(result, packageJson.version);
    });

    it('should display version with -v flag', async () => {
        const result = await runCli(['-v']);

        expectSuccess(result);
        expectOutput(result, packageJson.version);
    });

    it('should display version with version command', async () => {
        const result = await runCli(['version']);

        expectSuccess(result);
        expectOutput(result, packageJson.version);
    });
});
