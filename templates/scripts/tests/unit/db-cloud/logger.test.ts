import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger } from "../../../libs/db-cloud/logger.js";

describe("createConsoleLogger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // 意図的に空実装
    });
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // 意図的に空実装
    });
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // 意図的に空実装
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("infoメソッドがconsole.logを呼び出すこと", () => {
    const logger = createConsoleLogger();
    logger.info("test message");

    expect(consoleLogSpy).toHaveBeenCalledWith("test message");
  });

  it("warnメソッドがconsole.warnを呼び出すこと", () => {
    const logger = createConsoleLogger();
    logger.warn("warning message");

    expect(consoleWarnSpy).toHaveBeenCalledWith("warning message");
  });

  it("errorメソッドがconsole.errorを呼び出すこと", () => {
    const logger = createConsoleLogger();
    logger.error("error message");

    expect(consoleErrorSpy).toHaveBeenCalledWith("error message");
  });
});

// EOF
