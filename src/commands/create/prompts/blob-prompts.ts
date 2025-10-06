/**
 * Vercel Blob設定用プロンプト機能
 */

import { confirm, isCancel, select, text } from "@clack/prompts";
import {
    createBlobStore,
    generateBlobStoreName,
    generateUniqueStoreName,
    listBlobStores,
    validateBlobToken,
} from "../../../utils/vercel-cli/blob-operations.js";
import type {
    BlobConfiguration,
    BlobStore,
} from "../../../utils/vercel-cli/blob-types.js";
import {
    BlobErrorCode,
    BlobOperationError,
} from "../../../utils/vercel-cli/blob-types.js";

/**
 * Blob設定フロー全体を実行する
 * @param projectName プロジェクト名
 * @returns Blob設定（無効化の場合はnull）
 */
export async function collectBlobConfiguration(
    projectName: string
): Promise<BlobConfiguration | null> {
    // Phase 1: Blob利用確認
    const enableBlob = (await confirm({
        message: "Vercel Blobストレージを利用しますか？",
        initialValue: false,
    })) as boolean;

    if (!enableBlob) {
        return null;
    }

    // Phase 2: トークン入力
    const blobToken = await promptForToken();
    if (!blobToken) {
        console.log("Blobトークンが無効です。Blob設定をスキップします。");
        return null;
    }

    // Phase 3: ストア選択方式
    const storeOption = (await select({
        message: "Blobストア設定：",
        options: [
            { value: "new", label: "新規ストア作成" },
            { value: "existing", label: "既存ストア利用" },
        ],
    })) as "new" | "existing";

    // Phase 4: ストア設定
    let storeId: string;
    let storeName: string;

    if (storeOption === "new") {
        const result = await createNewStore(projectName, blobToken);
        storeId = result.storeId;
        storeName = result.storeName;
    } else {
        const result = await selectExistingStore(blobToken);
        storeId = result.storeId;
        storeName = result.storeName;
    }

    return {
        enabled: true,
        token: blobToken,
        storeId,
        storeName,
    };
}

/**
 * Blobトークンの入力と検証を行う
 * @returns 有効なトークン（キャンセル時はnull）
 */
async function promptForToken(): Promise<string | null> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        const token = await text({
            message: "BLOB_READ_WRITE_TOKEN を入力してください：",
            placeholder: "blob_rw_xxxxxxxxxxxxxxx",
            validate: (value: string) => {
                if (!value.trim()) {
                    return "トークンを入力してください";
                }

                if (!value.trim().startsWith("blob_rw_")) {
                    return "無効なトークン形式です（blob_rw_で始まる必要があります）";
                }

                if (value.trim().length < 64) {
                    return "トークンが短すぎます";
                }

                return;
            },
        });

        if (isCancel(token)) {
            console.warn("Blobトークン入力がキャンセルされました。");
            return null;
        }

        if (typeof token === "string") {
            const trimmedToken = token.trim();
            console.log("トークンを検証中...");
            const validation = await validateBlobToken(trimmedToken);
            if (validation.valid) {
                return trimmedToken;
            }
            console.error(`❌ ${validation.error || "無効なトークンです"}`);
        }

        attempts++;
        if (attempts < maxAttempts) {
            console.log(`再試行してください（${attempts}/${maxAttempts}）`);
        }
    }

    console.log("最大試行回数に達しました。");
    return null;
}

/**
 * 新規ストア作成フロー
 * @param projectName プロジェクト名
 * @param token アクセストークン
 * @returns ストア情報
 */
async function createNewStore(
    projectName: string,
    token: string
): Promise<{ storeId: string; storeName: string }> {
    // 既存ストア一覧を取得して名前衝突を回避
    let existingStores: BlobStore[] = [];
    try {
        existingStores = await listBlobStores({ token });
    } catch (error) {
        if (
            error instanceof BlobOperationError &&
            error.code === BlobErrorCode.INVALID_TOKEN
        ) {
            throw error;
        }

        console.warn(
            "既存ストア一覧の取得に失敗しました。名前衝突チェックをスキップします。"
        );
    }

    // デフォルトストア名を生成
    const baseName = generateBlobStoreName(projectName);
    const defaultName = generateUniqueStoreName(baseName, existingStores);

    // ストア名の入力
    const storeName = (await text({
        message: "ストア名を入力してください：",
        initialValue: defaultName,
        validate: (value: string) => {
            if (!value.trim()) {
                return "ストア名を入力してください";
            }

            const trimmed = value.trim();
            if (trimmed.length < 3 || trimmed.length > 32) {
                return "ストア名は3-32文字で入力してください";
            }

            if (!/^[a-z0-9-]+$/.test(trimmed)) {
                return "ストア名は英小文字、数字、ハイフンのみ使用可能です";
            }

            return;
        },
    })) as string;

    console.log("Blobストアを作成中...");

    try {
        const result = await createBlobStore({
            name: storeName.trim(),
            token,
        });

        console.log(`✅ Blobストア '${result.store.name}' を作成しました`);

        return {
            storeId: result.store.id,
            storeName: result.store.name,
        };
    } catch (error) {
        console.error(
            `❌ ストア作成に失敗しました: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

/**
 * 既存ストア選択フロー
 * @param token アクセストークン
 * @returns 選択されたストア情報
 */
async function selectExistingStore(
    token: string
): Promise<{ storeId: string; storeName: string }> {
    console.log("Blobストア一覧を取得中...");

    try {
        const stores = await listBlobStores({ token });

        if (stores.length === 0) {
            throw new Error(
                "利用可能なBlobストアが見つかりません。新規作成を選択してください。"
            );
        }

        const selectedStoreId = (await select({
            message: "利用するBlobストアを選択してください：",
            options: stores.map((store) => ({
                value: store.id,
                label: store.name,
                hint: `作成日: ${new Date(store.createdAt).toLocaleDateString()}`,
            })),
        })) as string;

        const selectedStore = stores.find(
            (store) => store.id === selectedStoreId
        );
        if (!selectedStore) {
            throw new Error("選択されたストアが見つかりません");
        }

        console.log(`✅ Blobストア '${selectedStore.name}' を選択しました`);

        return {
            storeId: selectedStore.id,
            storeName: selectedStore.name,
        };
    } catch (error) {
        console.error(
            `❌ ストア選択に失敗しました: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

// EOF
