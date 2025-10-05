/**
 * 一時ディレクトリ管理ユーティリティ
 * E2Eテスト用の一時作業ディレクトリを管理
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// 一時ディレクトリの設定
export type TempDirectoryOptions = {
    prefix?: string;
    suffix?: string;
    cleanup?: boolean;
};

// 作成された一時ディレクトリの情報
export type TempDirectory = {
    path: string;
    cleanup: () => Promise<void>;
    exists: () => Promise<boolean>;
    isEmpty: () => Promise<boolean>;
};

// グローバルクリーンアップリスト
const globalCleanupList: Set<string> = new Set();

/**
 * 一時ディレクトリを作成する
 */
export async function createTempDirectory(
    options: TempDirectoryOptions = {}
): Promise<TempDirectory> {
    const { prefix = "fluorite-e2e-", suffix = "", cleanup = true } = options;

    // ランダムな識別子を生成
    const randomId = randomBytes(8).toString("hex");
    const dirName = `${prefix}${randomId}${suffix}`;
    const tempPath = path.join(tmpdir(), dirName);

    // ディレクトリを作成
    await fs.mkdir(tempPath, { recursive: true });

    // グローバルクリーンアップリストに追加
    if (cleanup) {
        globalCleanupList.add(tempPath);
    }

    const tempDirectory: TempDirectory = {
        path: tempPath,

        async cleanup() {
            try {
                await fs.rm(tempPath, { recursive: true, force: true });
                globalCleanupList.delete(tempPath);
            } catch (error) {
                console.warn(
                    `Failed to cleanup temp directory: ${tempPath}`,
                    error
                );
            }
        },

        async exists() {
            try {
                await fs.access(tempPath);
                return true;
            } catch {
                return false;
            }
        },

        async isEmpty() {
            try {
                const entries = await fs.readdir(tempPath);
                return entries.length === 0;
            } catch {
                return true;
            }
        },
    };

    return tempDirectory;
}

/**
 * 一時ディレクトリ内にファイルを作成する
 */
export async function createTempFile(
    tempDir: string,
    fileName: string,
    content: string
): Promise<string> {
    const filePath = path.join(tempDir, fileName);
    const dir = path.dirname(filePath);

    // ディレクトリが存在しない場合は作成
    await fs.mkdir(dir, { recursive: true });

    // ファイルを作成
    await fs.writeFile(filePath, content, "utf8");

    return filePath;
}

/**
 * 一時ディレクトリ内のファイルを読み取る
 */
export async function readTempFile(
    tempDir: string,
    fileName: string
): Promise<string> {
    const filePath = path.join(tempDir, fileName);
    return await fs.readFile(filePath, "utf8");
}

/**
 * 一時ディレクトリ内のファイル存在確認
 */
export async function tempFileExists(
    tempDir: string,
    fileName: string
): Promise<boolean> {
    try {
        const filePath = path.join(tempDir, fileName);
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * 一時ディレクトリ内のディレクトリ作成
 */
export async function createTempSubdir(
    tempDir: string,
    subdirName: string
): Promise<string> {
    const subdirPath = path.join(tempDir, subdirName);
    await fs.mkdir(subdirPath, { recursive: true });
    return subdirPath;
}

/**
 * 一時ディレクトリの内容をリスト表示
 */
export async function listTempContents(
    tempDir: string,
    recursive = false
): Promise<string[]> {
    try {
        if (!recursive) {
            return await fs.readdir(tempDir);
        }

        const contents: string[] = [];

        async function walk(dir: string, prefix = ""): Promise<void> {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const relativePath = path.join(prefix, entry.name);
                contents.push(relativePath);

                if (entry.isDirectory()) {
                    await walk(path.join(dir, entry.name), relativePath);
                }
            }
        }

        await walk(tempDir);
        return contents.sort();
    } catch {
        return [];
    }
}

/**
 * 一時ディレクトリのサイズを取得
 */
export async function getTempDirectorySize(tempDir: string): Promise<number> {
    let totalSize = 0;

    async function calculateSize(dir: string): Promise<void> {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(dir, entry.name);

                if (entry.isFile()) {
                    const stat = await fs.stat(entryPath);
                    totalSize += stat.size;
                } else if (entry.isDirectory()) {
                    await calculateSize(entryPath);
                }
            }
        } catch {
            // ディレクトリが読み取れない場合はスキップ
        }
    }

    await calculateSize(tempDir);
    return totalSize;
}

/**
 * 全ての一時ディレクトリをクリーンアップ
 */
export async function cleanupAllTempDirectories(): Promise<void> {
    const cleanupPromises = Array.from(globalCleanupList).map(
        async (tempPath) => {
            try {
                await fs.rm(tempPath, { recursive: true, force: true });
                globalCleanupList.delete(tempPath);
            } catch (error) {
                console.warn(
                    `Failed to cleanup temp directory: ${tempPath}`,
                    error
                );
            }
        }
    );

    await Promise.all(cleanupPromises);
}

/**
 * テストスイート用の一時ディレクトリマネージャー
 */
export class TempDirectoryManager {
    private readonly directories: Map<string, TempDirectory> = new Map();

    async create(
        name: string,
        options: TempDirectoryOptions = {}
    ): Promise<TempDirectory> {
        const tempDir = await createTempDirectory(options);
        this.directories.set(name, tempDir);
        return tempDir;
    }

    get(name: string): TempDirectory | undefined {
        return this.directories.get(name);
    }

    async cleanup(name?: string): Promise<void> {
        if (name) {
            const tempDir = this.directories.get(name);
            if (tempDir) {
                await tempDir.cleanup();
                this.directories.delete(name);
            }
        } else {
            // 全てクリーンアップ
            const cleanupPromises = Array.from(this.directories.values()).map(
                (tempDir) => tempDir.cleanup()
            );
            await Promise.all(cleanupPromises);
            this.directories.clear();
        }
    }

    async cleanupAll(): Promise<void> {
        await this.cleanup();
    }

    list(): string[] {
        return Array.from(this.directories.keys());
    }
}

// プロセス終了時の自動クリーンアップを設定
process.on("exit", () => {
    // 同期的なクリーンアップ（ベストエフォート）
    for (const tempPath of globalCleanupList) {
        try {
            require("node:fs").rmSync(tempPath, {
                recursive: true,
                force: true,
            });
        } catch {
            // 無視
        }
    }
});

// EOF
