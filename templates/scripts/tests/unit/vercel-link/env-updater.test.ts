import { describe, expect, it, vi } from "vitest";
import { updateAllEnvFiles } from "../../../libs/vercel-link/env-updater.js";
import type { VercelLinkDeps } from "../../../libs/vercel-link/types.js";

const createMockDeps = (overrides?: Partial<VercelLinkDeps>): VercelLinkDeps => ({
  projectRoot: "/project",
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  prompt: vi.fn(),
  runCommand: vi.fn(),
  runCommandCapture: vi.fn(),
  readFile: vi.fn().mockResolvedValue(""),
  writeFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockReturnValue(false),
  ...overrides,
});

describe("UT-SCRIPTS-VERCEL-LINK-07: env-updater", () => {
  describe("updateAllEnvFiles", () => {
    it("should update all env files with correct URLs", async () => {
      const writeFileMock = vi.fn().mockResolvedValue(undefined);
      const deps = createMockDeps({
        exists: vi.fn().mockReturnValue(false),
        writeFile: writeFileMock,
      });

      const results = await updateAllEnvFiles("/project/apps/web", "my-project", "my-team", deps);

      expect(results).toHaveLength(3);
      expect(writeFileMock).toHaveBeenCalledTimes(3);

      // Verify production file
      expect(writeFileMock).toHaveBeenCalledWith(
        "/project/apps/web/.env.production",
        expect.stringContaining("NEXT_PUBLIC_APP_URL=https://my-project.vercel.app")
      );

      // Verify staging file
      expect(writeFileMock).toHaveBeenCalledWith(
        "/project/apps/web/.env.staging",
        expect.stringContaining(
          "NEXT_PUBLIC_APP_URL=https://my-project-env-staging-my-team.vercel.app"
        )
      );

      // Verify preview file
      expect(writeFileMock).toHaveBeenCalledWith(
        "/project/apps/web/.env.preview",
        expect.stringContaining("NEXT_PUBLIC_APP_URL=https://my-project-my-team.vercel.app")
      );
    });

    it("should preserve existing file content and update variables", async () => {
      const existingContent = `# Comment line
NEXT_PUBLIC_APP_URL=old-url
OTHER_VAR=value`;

      const writeFileMock = vi.fn().mockResolvedValue(undefined);
      const deps = createMockDeps({
        exists: vi.fn().mockReturnValue(true),
        readFile: vi.fn().mockResolvedValue(existingContent),
        writeFile: writeFileMock,
      });

      await updateAllEnvFiles("/project/apps/web", "my-project", "my-team", deps);

      // Verify that OTHER_VAR is preserved and NEXT_PUBLIC_APP_URL is updated
      const productionCall = writeFileMock.mock.calls.find(
        (call) => call[0] === "/project/apps/web/.env.production"
      );
      expect(productionCall?.[1]).toContain("OTHER_VAR=value");
      expect(productionCall?.[1]).toContain("NEXT_PUBLIC_APP_URL=https://my-project.vercel.app");
      // The URL value should be updated, but NEXT_PUBLIC_API_URL may still contain old-url as fallback
      expect(productionCall?.[1]).toMatch(/NEXT_PUBLIC_APP_URL=https:\/\/my-project\.vercel\.app/);
    });

    it("should add new variables to existing file", async () => {
      const existingContent = "EXISTING_VAR=value";

      const writeFileMock = vi.fn().mockResolvedValue(undefined);
      const deps = createMockDeps({
        exists: vi.fn().mockReturnValue(true),
        readFile: vi.fn().mockResolvedValue(existingContent),
        writeFile: writeFileMock,
      });

      await updateAllEnvFiles("/project/apps/web", "my-project", "my-team", deps);

      const productionCall = writeFileMock.mock.calls.find(
        (call) => call[0] === "/project/apps/web/.env.production"
      );
      expect(productionCall?.[1]).toContain("EXISTING_VAR=value");
      expect(productionCall?.[1]).toContain("NEXT_PUBLIC_APP_URL=https://my-project.vercel.app");
    });

    it("should use backend API URL when available", async () => {
      const backendEnvContent = "NEXT_PUBLIC_APP_URL=https://backend-api.vercel.app";

      const writeFileMock = vi.fn().mockResolvedValue(undefined);
      const deps = createMockDeps({
        exists: vi.fn((path: string) => path.includes("backend")),
        readFile: vi.fn((path: string) =>
          Promise.resolve(path.includes("backend") ? backendEnvContent : "")
        ),
        writeFile: writeFileMock,
      });

      await updateAllEnvFiles("/project/apps/web", "my-project", "my-team", deps);

      const productionCall = writeFileMock.mock.calls.find(
        (call) => call[0] === "/project/apps/web/.env.production"
      );
      expect(productionCall?.[1]).toContain("NEXT_PUBLIC_API_URL=https://backend-api.vercel.app");
    });

    it("should handle file write errors gracefully", async () => {
      const deps = createMockDeps({
        exists: vi.fn().mockReturnValue(false),
        writeFile: vi.fn().mockRejectedValue(new Error("Write failed")),
      });

      const results = await updateAllEnvFiles("/project/apps/web", "my-project", "my-team", deps);

      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.updated).toBe(false);
        expect(result.error).toBe("Write failed");
      }
    });

    it("should not write if no changes detected", async () => {
      const existingContent = `NEXT_PUBLIC_APP_URL=https://my-project.vercel.app
BETTER_AUTH_URL=https://my-project.vercel.app
NEXT_PUBLIC_API_URL=https://my-project.vercel.app
`;

      const writeFileMock = vi.fn().mockResolvedValue(undefined);
      const deps = createMockDeps({
        exists: vi.fn().mockReturnValue(true),
        readFile: vi.fn().mockResolvedValue(existingContent),
        writeFile: writeFileMock,
      });

      const results = await updateAllEnvFiles("/project/apps/web", "my-project", "my-team", deps);

      // Production file should not be updated since it already has correct values
      const productionResult = results.find((r) => r.file.endsWith(".env.production"));
      expect(productionResult?.updated).toBe(false);

      // Staging and preview should still be updated (different URLs)
      const stagingResult = results.find((r) => r.file.endsWith(".env.staging"));
      expect(stagingResult?.updated).toBe(true);
    });

    it("should handle backend env file read errors", async () => {
      const writeFileMock = vi.fn().mockResolvedValue(undefined);
      const deps = createMockDeps({
        exists: vi.fn((path: string) => path.includes("backend")),
        readFile: vi.fn((path: string) =>
          path.includes("backend") ? Promise.reject(new Error("Read failed")) : Promise.resolve("")
        ),
        writeFile: writeFileMock,
      });

      // Should not throw, but use fallback URLs
      const results = await updateAllEnvFiles("/project/apps/web", "my-project", "my-team", deps);

      expect(results).toHaveLength(3);

      const productionCall = writeFileMock.mock.calls.find(
        (call) => call[0] === "/project/apps/web/.env.production"
      );
      expect(productionCall?.[1]).toContain("NEXT_PUBLIC_API_URL=https://my-project.vercel.app");
    });
  });
});

// EOF
