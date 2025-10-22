/**
 * ファイルアップロードコンポーネント
 * S3互換ストレージへのファイルアップロード機能
 */
"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { logger } from "@/lib/logger";

export function FileUpload() {
    const [uploading, setUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const data = await response.json();
            setUploadedUrl(data.url);
        } catch (err) {
            logger.error(err);
            setError("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2 rounded-lg border p-4">
            {/* フォームを最小限に留め、状態によって非活性化を切り替える */}
            <input disabled={uploading} onChange={handleUpload} type="file" />
            {uploading && <p>Uploading...</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {uploadedUrl && (
                <p className="break-all text-sm">
                    Uploaded to:{" "}
                    <a className="text-blue-500 underline" href={uploadedUrl} rel="noopener noreferrer" target="_blank">
                        {uploadedUrl}
                    </a>
                </p>
            )}
        </div>
    );
}

// EOF

// EOF
