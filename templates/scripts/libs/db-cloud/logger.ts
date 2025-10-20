/**
 * CLI から利用する標準的なロガーの実装。必要に応じてテストで差し替えられる。
 */
import type { Logger } from "./types.js";

export function createConsoleLogger(): Logger {
  return {
    info: (message: string) => console.log(message),
    warn: (message: string) => console.warn(message),
    error: (message: string) => console.error(message),
  };
}

// EOF
