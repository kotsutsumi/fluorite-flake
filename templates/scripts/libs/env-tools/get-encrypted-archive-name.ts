// Centralised so both encrypt/decrypt stay in sync if we ever rename the
// 暗号化アーカイブのファイル名を一元管理する。
const ARCHIVE_NAME = "env.encrypted.zip";

export function getEncryptedArchiveName(): string {
  return ARCHIVE_NAME;
}

// EOF
