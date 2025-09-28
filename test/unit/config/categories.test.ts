/**
 * `PACKAGE_CATEGORIES` がフレームワーク別・機能別に想定どおりの依存関係を保持しているかを検証するテスト。
 * Next.js/Expo/Tauri など主要カテゴリの依存パッケージ、および storage/auth グループの要素が含まれているかを確認する。
 */
import { describe, expect, it } from 'vitest';

import { PACKAGE_CATEGORIES } from '../../../src/config/package-versions/categories.js';

describe('PACKAGE_CATEGORIES の内容検証', () => {
    it('各フレームワークカテゴリに想定の依存が含まれること', () => {
        expect(PACKAGE_CATEGORIES.nextjs.dependencies).toEqual(
            expect.arrayContaining(['next', 'react'])
        );
        expect(PACKAGE_CATEGORIES.expo.dependencies).toContain('expo');
        expect(PACKAGE_CATEGORIES.tauri.dependencies).toContain('@tauri-apps/api');
    });

    it('storage/auth グループに期待するパッケージが含まれること', () => {
        expect(PACKAGE_CATEGORIES.storage['vercel-blob']).toContain('@vercel/blob');
        expect(PACKAGE_CATEGORIES.auth).toContain('better-auth');
    });
});
