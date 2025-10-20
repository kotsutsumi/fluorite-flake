const isWindows = process.platform === "win32";

// 各プラットフォーム共通で案内する基本的なインストール手順。
const BASE_INSTRUCTIONS = [
  "Please install zip:",
  "  macOS: brew install zip",
  "  Ubuntu/Debian: sudo apt-get install zip",
] as const;

// Windows で利用しやすい代表的な導入手段をまとめて案内する。
const WINDOWS_INSTRUCTIONS = [
  "  Windows options:",
  "    1. Install Git for Windows (includes zip): https://git-scm.com/download/win",
  "    2. Use PowerShell Compress-Archive (requires script change)",
  "    3. Install 7-Zip and add to PATH: https://www.7-zip.org/",
  "    4. Use Windows Subsystem for Linux (WSL)",
  '  For 7-Zip users: Set-Alias zip "C:\\Program Files\\7-Zip\\7z.exe"',
] as const;

export function getZipInstallInstructions(): readonly string[] {
  // zip が標準搭載されていない Windows では追加の手順を出力する。
  return isWindows ? [...BASE_INSTRUCTIONS, ...WINDOWS_INSTRUCTIONS] : [...BASE_INSTRUCTIONS];
}

// EOF
