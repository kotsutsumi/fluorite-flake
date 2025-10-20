/**
 * ファイルアップロードAPIエンドポイント
 * S3互換ストレージへのアップロード
 */
import { Buffer } from "node:buffer";
import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { uploadBuffer } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadBuffer(buffer, file.name, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    logger.error("Upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// EOF
