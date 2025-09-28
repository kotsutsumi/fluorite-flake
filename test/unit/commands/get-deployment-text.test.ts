/**
 * `getDeploymentText` がフレームワーク種別に応じて適切なデプロイ先の説明文を返すかを確認するテスト。
 * Next.js / Tauri / Flutter を個別に検証し、不明なフレームワークでは既定値が返ることもチェックする。
 */
import { describe, expect, it } from 'vitest';

import { getDeploymentText } from '../../../src/commands/create/get-deployment-text.js';

describe('getDeploymentText の案内文判定', () => {
    it('Next.js では "Vercel" が返ること', () => {
        expect(getDeploymentText('nextjs')).toBe('Vercel');
    });

    it('Tauri では "GitHub Releases" が返ること', () => {
        expect(getDeploymentText('tauri')).toBe('GitHub Releases');
    });

    it('Flutter では "Store Distribution" が返ること', () => {
        expect(getDeploymentText('flutter')).toBe('Store Distribution');
    });

    it('未知のフレームワークでは "Custom" が返ること', () => {
        expect(getDeploymentText('unknown')).toBe('Custom');
    });
});
