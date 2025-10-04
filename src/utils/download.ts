import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';

/**
 * URLからファイルをダウンロードし、tar.gzファイルを展開します
 * @param url ダウンロードするURL
 * @param destination 展開先ディレクトリ
 */
export async function downloadAndExtract(url: string, destination: string) {
    // 一時ディレクトリを作成
    const tempDir = path.join(destination, '.temp');
    await fs.ensureDir(tempDir);

    try {
        // curlを使用してファイルをダウンロード
        const fileName = 'download.tar.gz';
        const filePath = path.join(tempDir, fileName);

        // -L: リダイレクトをフォロー、-o: 出力ファイル指定
        await execa('curl', ['-L', '-o', filePath, url], {
            stdio: 'pipe',
        });

        // tar.gzファイルを展開
        // -x: 展開、-z: gzip圧縮、-f: ファイル指定、-C: 出力ディレクトリ指定
        await execa('tar', ['-xzf', filePath, '-C', destination], {
            stdio: 'pipe',
        });

        // 一時ディレクトリをクリーンアップ
        await fs.remove(tempDir);
    } catch (error) {
        // エラー時にもクリーンアップ
        await fs.remove(tempDir);
        throw error;
    }
}

/**
 * URLからファイルをダウンロードします
 * @param url ダウンロードするURL
 * @param destination 保存先ファイルパス
 */
export async function downloadFile(url: string, destination: string) {
    // curlを使用してファイルをダウンロード
    await execa('curl', ['-L', '-o', destination, url], {
        stdio: 'pipe',
    });
}

/**
 * Gitリポジトリをクローンします（最新のコミットのみ）
 * @param repoUrl リポジトリのURL
 * @param destination クローン先ディレクトリ
 */
export async function cloneRepository(repoUrl: string, destination: string) {
    // --depth 1: 最新のコミットのみをクローン（高速化）
    await execa('git', ['clone', '--depth', '1', repoUrl, destination], {
        stdio: 'pipe',
    });

    // .gitディレクトリを削除（テンプレートとして使用するため）
    await fs.remove(path.join(destination, '.git'));
}
