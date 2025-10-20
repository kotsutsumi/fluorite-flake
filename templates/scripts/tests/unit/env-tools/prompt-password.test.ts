import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// readline モジュール全体をモックする
vi.mock("node:readline/promises");

describe("UT-SCRIPTS-19: promptPassword", () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("TTY が利用できない場合は readline にフォールバックすること", async () => {
    // TTY を無効にする
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      writable: true,
      configurable: true,
    });

    const question = vi.fn().mockResolvedValue("secret");
    const close = vi.fn().mockResolvedValue(undefined);

    // createInterface をモックする
    const { createInterface } = await import("node:readline/promises");
    vi.mocked(createInterface).mockReturnValue({ question, close } as any);

    vi.resetModules();
    const { promptPassword } = await import("../../../libs/env-tools/prompt-password.js");

    const result = await promptPassword("Password: ");

    expect(result).toBe("secret");
    expect(question).toHaveBeenCalledWith("Password: ");
    expect(close).toHaveBeenCalled();
  });

  it("TTY で実行する場合は入力をマスクすること", async () => {
    // TTY を有効にする
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });

    const stdin = Object.assign(process.stdin, {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      removeListener: vi.fn(),
      isRaw: false,
    });

    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    vi.resetModules();
    const passwordPromise = (
      await import("../../../libs/env-tools/prompt-password.js")
    ).promptPassword("Enter: ");

    stdin.emit("data", Buffer.from("s"));
    stdin.emit("data", Buffer.from("e"));
    stdin.emit("data", Buffer.from("c"));
    stdin.emit("data", Buffer.from("r"));
    stdin.emit("data", Buffer.from("e"));
    stdin.emit("data", Buffer.from("t"));
    stdin.emit("data", Buffer.from([13]));

    const result = await passwordPromise;

    expect(result).toBe("secret");
    expect(writeSpy).toHaveBeenCalledWith("Enter: ");

    writeSpy.mockRestore();
  });

  it("バックスペースで文字を削除できること", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });

    const stdin = Object.assign(process.stdin, {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      removeListener: vi.fn(),
      isRaw: false,
    });

    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    vi.resetModules();
    const passwordPromise = (
      await import("../../../libs/env-tools/prompt-password.js")
    ).promptPassword("Enter: ");

    stdin.emit("data", Buffer.from("a"));
    stdin.emit("data", Buffer.from("b"));
    stdin.emit("data", Buffer.from([8])); // バックスペース
    stdin.emit("data", Buffer.from("c"));
    stdin.emit("data", Buffer.from([13])); // Enter

    const result = await passwordPromise;

    expect(result).toBe("ac");
    writeSpy.mockRestore();
  });

  it("Delete キーで文字を削除できること", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });

    const stdin = Object.assign(process.stdin, {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      removeListener: vi.fn(),
      isRaw: false,
    });

    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    vi.resetModules();
    const passwordPromise = (
      await import("../../../libs/env-tools/prompt-password.js")
    ).promptPassword("Enter: ");

    stdin.emit("data", Buffer.from("x"));
    stdin.emit("data", Buffer.from("y"));
    stdin.emit("data", Buffer.from([127])); // Delete
    stdin.emit("data", Buffer.from("z"));
    stdin.emit("data", Buffer.from([13])); // Enter

    const result = await passwordPromise;

    expect(result).toBe("xz");
    writeSpy.mockRestore();
  });

  it("空のバッファに対するバックスペースを無視すること", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });

    const stdin = Object.assign(process.stdin, {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      removeListener: vi.fn(),
      isRaw: false,
    });

    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    vi.resetModules();
    const passwordPromise = (
      await import("../../../libs/env-tools/prompt-password.js")
    ).promptPassword("Enter: ");

    stdin.emit("data", Buffer.from([8])); // バックスペース (無視される)
    stdin.emit("data", Buffer.from("a"));
    stdin.emit("data", Buffer.from([13])); // Enter

    const result = await passwordPromise;

    expect(result).toBe("a");
    writeSpy.mockRestore();
  });

  it("ESC キーを無視すること", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });

    const stdin = Object.assign(process.stdin, {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      removeListener: vi.fn(),
      isRaw: false,
    });

    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    vi.resetModules();
    const passwordPromise = (
      await import("../../../libs/env-tools/prompt-password.js")
    ).promptPassword("Enter: ");

    stdin.emit("data", Buffer.from("a"));
    stdin.emit("data", Buffer.from([27])); // ESC (無視される)
    stdin.emit("data", Buffer.from("b"));
    stdin.emit("data", Buffer.from([13])); // Enter

    const result = await passwordPromise;

    expect(result).toBe("ab");
    writeSpy.mockRestore();
  });

  it("Ctrl+D で送信できること", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });

    const stdin = Object.assign(process.stdin, {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      removeListener: vi.fn(),
      isRaw: false,
    });

    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    vi.resetModules();
    const passwordPromise = (
      await import("../../../libs/env-tools/prompt-password.js")
    ).promptPassword("Enter: ");

    stdin.emit("data", Buffer.from("test"));
    stdin.emit("data", Buffer.from([4])); // Ctrl+D

    const result = await passwordPromise;

    expect(result).toBe("test");
    writeSpy.mockRestore();
  });

  it("Line Feed で送信できること", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });

    const stdin = Object.assign(process.stdin, {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      removeListener: vi.fn(),
      isRaw: false,
    });

    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    vi.resetModules();
    const passwordPromise = (
      await import("../../../libs/env-tools/prompt-password.js")
    ).promptPassword("Enter: ");

    stdin.emit("data", Buffer.from("test"));
    stdin.emit("data", Buffer.from([10])); // Line Feed

    const result = await passwordPromise;

    expect(result).toBe("test");
    writeSpy.mockRestore();
  });
});

// EOF
