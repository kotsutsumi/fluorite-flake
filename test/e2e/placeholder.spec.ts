import { expect, test } from '@playwright/test';

test.describe('E2E placeholder', () => {
  test('passes without real assertions', async () => {
    await expect(true).toBeTruthy();
  });
});
