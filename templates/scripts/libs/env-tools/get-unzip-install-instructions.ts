const isWindows = process.platform === "win32";

// Unix 系 OS で共通に利用できるインストール手順。
const BASE_INSTRUCTIONS = [
  "Please install unzip:",
  "  macOS: brew install unzip",
  "  Ubuntu/Debian: sudo apt-get install unzip",
] as const;

// Windows 向けの代表的な導入方法をまとめたもの。
const WINDOWS_INSTRUCTIONS = [
  "  Windows options:",
  "    1. Install Git for Windows (includes unzip): https://git-scm.com/download/win",
  "    2. Use PowerShell Expand-Archive (requires script change)",
  "    3. Install 7-Zip and add to PATH: https://www.7-zip.org/",
  "    4. Use Windows Subsystem for Linux (WSL)",
  '  For 7-Zip users: Set-Alias unzip "C:\\Program Files\\7-Zip\\7z.exe"',
] as const;

export function getUnzipInstallInstructions(): readonly string[] {
  return isWindows ? [...BASE_INSTRUCTIONS, ...WINDOWS_INSTRUCTIONS] : [...BASE_INSTRUCTIONS];
}

// EOF
