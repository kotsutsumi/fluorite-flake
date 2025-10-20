/**
 * Prisma クライアントを単体テストでモック化するためのヘルパー群。
 * - `getPrismaMock` で DeepMockProxy をシングルトンとして取得
 * - `resetPrismaMock` で各テスト後に状態をクリア
 */
import type { PrismaClient } from "@prisma/client";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

let prismaMock: MockPrismaClient;

export function getPrismaMock(): MockPrismaClient {
  if (!prismaMock) {
    prismaMock = mockDeep<PrismaClient>();
  }
  return prismaMock;
}

export function resetPrismaMock(): void {
  if (prismaMock) {
    mockReset(prismaMock);
  }
}

// `@/lib/db` をモック差し替えする際に利用するショートカット
export function mockPrismaDb() {
  const mock = getPrismaMock();
  return {
    mock,
    resetMock: resetPrismaMock,
  };
}

// EOF
