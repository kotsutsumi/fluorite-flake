import { describe, expect, it, vi } from "vitest";
import { createDefaultDeps, createReadlinePrompt } from "../../../libs/vercel-link/dependencies.js";

vi.mock("node:readline/promises", () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn(),
    close: vi.fn(),
  })),
}));

describe("UT-SCRIPTS-VERCEL-LINK-02: dependencies", () => {
  describe("createReadlinePrompt", () => {
    it("should create a prompt function that returns user input", async () => {
      const { createInterface } = await import("node:readline/promises");
      const mockRl = {
        question: vi.fn().mockResolvedValue("user input"),
        close: vi.fn(),
      };
      vi.mocked(createInterface).mockReturnValue(mockRl as any);

      const prompt = createReadlinePrompt();
      const result = await prompt("Enter value:");

      expect(result).toBe("user input");
      expect(mockRl.question).toHaveBeenCalledWith("Enter value:");
      expect(mockRl.close).toHaveBeenCalled();
    });

    it("should close readline interface even if question throws", async () => {
      const { createInterface } = await import("node:readline/promises");
      const mockRl = {
        question: vi.fn().mockRejectedValue(new Error("input error")),
        close: vi.fn(),
      };
      vi.mocked(createInterface).mockReturnValue(mockRl as any);

      const prompt = createReadlinePrompt();

      await expect(prompt("Enter value:")).rejects.toThrow("input error");
      expect(mockRl.close).toHaveBeenCalled();
    });
  });

  describe("createDefaultDeps", () => {
    it("should create default dependencies object", () => {
      const deps = createDefaultDeps();

      expect(deps).toHaveProperty("projectRoot");
      expect(deps).toHaveProperty("logger");
      expect(deps).toHaveProperty("prompt");
      expect(deps).toHaveProperty("runCommand");
      expect(deps).toHaveProperty("runCommandCapture");
      expect(deps).toHaveProperty("readFile");
      expect(deps).toHaveProperty("writeFile");
      expect(deps).toHaveProperty("exists");

      expect(typeof deps.logger.info).toBe("function");
      expect(typeof deps.logger.warn).toBe("function");
      expect(typeof deps.logger.error).toBe("function");
      expect(typeof deps.logger.success).toBe("function");
      expect(typeof deps.prompt).toBe("function");
      expect(typeof deps.runCommand).toBe("function");
      expect(typeof deps.runCommandCapture).toBe("function");
      expect(typeof deps.readFile).toBe("function");
      expect(typeof deps.writeFile).toBe("function");
      expect(typeof deps.exists).toBe("function");
    });

    it("should create working readFile function", async () => {
      const deps = createDefaultDeps();
      // Test that readFile function can be called (will fail with actual file, but tests the function)
      await expect(deps.readFile("/nonexistent")).rejects.toThrow();
    });

    it("should create working writeFile function", async () => {
      const deps = createDefaultDeps();
      // Test that writeFile function can be called (will fail with actual file, but tests the function)
      await expect(deps.writeFile("/nonexistent", "content")).rejects.toThrow();
    });

    it("should create working exists function", () => {
      const deps = createDefaultDeps();
      // Test that exists function can be called
      expect(deps.exists("/nonexistent")).toBe(false);
    });
  });
});

// EOF
