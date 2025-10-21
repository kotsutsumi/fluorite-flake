import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConsoleLogger } from "../../../libs/vercel-link/logger.js";

describe("UT-SCRIPTS-VERCEL-LINK-01: createConsoleLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create logger with info method", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // Intentionally empty - mock implementation
    });
    const logger = createConsoleLogger();

    logger.info("test message");

    expect(consoleSpy).toHaveBeenCalledWith("test message");
    consoleSpy.mockRestore();
  });

  it("should create logger with warn method", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Intentionally empty - mock implementation
    });
    const logger = createConsoleLogger();

    logger.warn("warning message");

    expect(consoleSpy).toHaveBeenCalledWith("⚠️  warning message");
    consoleSpy.mockRestore();
  });

  it("should create logger with error method", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty - mock implementation
    });
    const logger = createConsoleLogger();

    logger.error("error message");

    expect(consoleSpy).toHaveBeenCalledWith("❌ error message");
    consoleSpy.mockRestore();
  });

  it("should create logger with success method", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // Intentionally empty - mock implementation
    });
    const logger = createConsoleLogger();

    logger.success("success message");

    expect(consoleSpy).toHaveBeenCalledWith("✅ success message");
    consoleSpy.mockRestore();
  });
});

// EOF
