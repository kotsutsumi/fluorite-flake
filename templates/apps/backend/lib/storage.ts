// BLOB_READ_WRITE_TOKEN が未設定、または Vercel 上でない場合にローカルストレージへ自動的にフォールバックする抽象化レイヤー。

// ローカルストレージのエミュレーションを使うべきか判定する
// 下記の条件ではローカルストレージを使用する:
// - Vercel Blob に必要な BLOB_READ_WRITE_TOKEN が設定されていない
// - もしくは Vercel 上で動作していない (VERCEL 環境変数が無い)
// これによりローカル開発、`next start`、E2E テストなどに対応する。
const isLocalMode = !(process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL);

// 環境に応じて動的インポートを切り替える
const storageModule = isLocalMode ? import("./storage-local") : import("@vercel/blob");

export async function uploadBuffer(buffer: Buffer, filename: string, contentType?: string) {
  if (isLocalMode) {
    // ローカルストレージのエミュレーションを使用する
    const { uploadLocal } = await import("./storage-local");
    const result = await uploadLocal(buffer, { pathname: filename });
    return result.url;
  }

  // 本番環境またはトークンが設定されている場合は Vercel Blob を使用する
  const { put } = (await storageModule) as typeof import("@vercel/blob");
  const blob = await put(filename, buffer, {
    access: "public",
    contentType,
  });

  return blob.url;
}

export async function uploadFile(file: File, options?: { pathname?: string }) {
  if (isLocalMode) {
    // ローカルストレージのエミュレーションを使用する
    const { uploadLocal } = await import("./storage-local");
    const result = await uploadLocal(file, options);
    return result.url;
  }

  // 本番環境またはトークンが設定されている場合は Vercel Blob を使用する
  const { put } = (await storageModule) as typeof import("@vercel/blob");
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = options?.pathname || file.name;

  const blob = await put(filename, buffer, {
    access: "public",
    contentType: file.type,
  });

  return blob.url;
}

export async function deleteFile(urlOrPath: string) {
  if (isLocalMode) {
    // ローカルストレージのエミュレーションを使用する
    const { deleteLocal } = await import("./storage-local");
    // フル URL の場合はパス名を抽出する
    const pathname = urlOrPath.startsWith("/api/storage/")
      ? urlOrPath.replace("/api/storage/", "")
      : urlOrPath;
    await deleteLocal(pathname);
    return;
  }

  // 本番環境またはトークンが設定されている場合は Vercel Blob を使用する
  const { del } = (await storageModule) as typeof import("@vercel/blob");
  await del(urlOrPath);
}

export async function listFiles(options?: { limit?: number; prefix?: string }) {
  if (isLocalMode) {
    // ローカルストレージのエミュレーションを使用する
    const { listLocal } = await import("./storage-local");
    const result = await listLocal(options);
    return result.blobs;
  }

  // 本番環境またはトークンが設定されている場合は Vercel Blob を使用する
  const { list } = (await storageModule) as typeof import("@vercel/blob");
  const { blobs } = await list(options);
  return blobs;
}

export async function getFile(pathname: string) {
  if (isLocalMode) {
    // ローカルストレージのエミュレーションを使用する
    const { getLocal } = await import("./storage-local");
    const result = await getLocal(pathname);
    return {
      url: result.url,
      pathname: result.pathname,
      size: result.size,
      uploadedAt: result.uploadedAt,
      buffer: result.buffer,
    };
  }

  // Vercel Blob では list API で対象を探し URL を取得する
  const { list, head } = (await storageModule) as typeof import("@vercel/blob");

  try {
    // 利用可能なら head API でメタデータを取得する
    if (head) {
      const headBlob = await head(pathname);

      // Blob の URL からコンテンツを取得する
      const response = await fetch(headBlob.url);
      const buffer = Buffer.from(await response.arrayBuffer());

      return {
        url: headBlob.url,
        pathname: headBlob.pathname,
        size: headBlob.size,
        uploadedAt: headBlob.uploadedAt,
        buffer,
      };
    }
  } catch (_error) {
    // head が利用できない場合は list にフォールバックする
  }

  // list を使って対象の blob を検索する
  const { blobs } = await list({
    prefix: pathname,
    limit: 1,
  });

  const [blob] = blobs;

  if (!blob) {
    throw new Error(`Blob not found: ${pathname}`);
  }

  // Blob の URL からコンテンツを取得する
  const response = await fetch(blob.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: blob.size,
    uploadedAt: blob.uploadedAt,
    buffer,
  };
}

export async function copyFile(from: string, to: string) {
  if (isLocalMode) {
    // ローカルストレージのエミュレーションを使用する
    const { copyLocal } = await import("./storage-local");
    const result = await copyLocal(from, to);
    return result.url;
  }

  // Vercel Blob ではダウンロードと再アップロードでコピーする
  const { put, list, copy } = (await storageModule) as typeof import("@vercel/blob");

  // まず Vercel Blob SDK にネイティブのコピー機能があるか確認する (v0.14.0 以降)
  if (copy) {
    try {
      const result = await copy(from, to, {
        access: "public",
      });
      return result.url;
    } catch (_error) {
      // ネイティブコピーが失敗した場合は手動コピーに切り替える
    }
  }

  // 手動コピー: まずソースの blob URL を取得する
  const { blobs } = await list({
    prefix: from,
    limit: 1,
  });

  const [sourceBlob] = blobs;

  if (!sourceBlob) {
    throw new Error(`Source blob not found: ${from}`);
  }

  // ソース blob の URL からコンテンツを取得する
  const response = await fetch(sourceBlob.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch source blob: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // 取得したデータを新しい場所にアップロードする
  const blob = await put(to, buffer, {
    access: "public",
    contentType: response.headers.get("content-type") || undefined,
  });

  return blob.url;
}

// ローカルモードかどうか判定するヘルパーを公開する
export function isUsingLocalStorage() {
  return isLocalMode;
}

// ストレージの利用状況を取得するヘルパー
export function getStorageInfo() {
  if (isLocalMode) {
    const reasons: string[] = [];
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      reasons.push("No BLOB_READ_WRITE_TOKEN configured");
    }
    if (!process.env.VERCEL) {
      reasons.push("Not running on Vercel");
    }

    return {
      type: "local",
      message: "Using local file storage (.storage directory)",
      reason: reasons.join(", "),
      apiEndpoint: "/api/storage",
      debugEndpoint: "/api/storage/debug",
      environment: process.env.NODE_ENV,
    };
  }

  return {
    type: "vercel-blob",
    message: "Using Vercel Blob Storage",
    hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    storeId: process.env.BLOB_STORE_ID,
    isVercel: !!process.env.VERCEL,
    environment: process.env.NODE_ENV,
  };
}

// EOF
