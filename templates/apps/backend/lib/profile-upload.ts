/**
 * プロフィール画像を Vercel Blob (またはローカルストレージ) に保存するヘルパー。
 * - 拡張子をファイル名から推測し、ユーザー ID とタイムスタンプで一意のパスを生成
 * - Upload 先は `lib/storage.ts` に委譲しており、環境に応じて Blob / ローカルを切り替える
 */
import { uploadBuffer } from "@/lib/storage";

export async function saveProfileImage(file: File, userId: string) {
  // File API から ArrayBuffer を取得し Node.js Buffer に変換 (Blob API 互換)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // 元ファイル名から拡張子を取得。判別できない場合は png を既定とする
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `profiles/${userId}-${Date.now()}.${extension}`;
  // MIME タイプはアップロード先の Content-Type に反映されるため、未指定時は octet-stream
  return uploadBuffer(buffer, filename, file.type || "application/octet-stream");
}

// EOF
