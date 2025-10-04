/**
 * ファイルシステムとプロジェクト構造関連の型定義
 */

/**
 * ファイルシステムノード
 * ファイルとディレクトリの階層構造を表現
 */
export interface FileSystemNode {
    id: string; // ノードの一意識別子
    name: string; // ファイル/ディレクトリ名
    path: string; // 絶対パス
    type: 'file' | 'directory'; // ノードタイプ
    size?: number; // ファイルサイズ（バイト）
    modifiedAt: number; // 最終更新日時（Unix timestamp）
    permissions?: string; // ファイル権限
    children?: FileSystemNode[]; // 子ノード（ディレクトリの場合）
    isExpanded?: boolean; // UI上での展開状態
    metadata?: FileMetadata; // ファイルメタデータ
}

/**
 * ファイルメタデータ
 * ファイルの詳細情報とGit状態
 */
export interface FileMetadata {
    language?: string; // プログラミング言語
    lineCount?: number; // 行数
    encoding?: string; // 文字エンコーディング
    gitStatus?: 'added' | 'modified' | 'deleted' | 'untracked' | 'staged'; // Git状態
    isGenerated?: boolean; // 自動生成ファイルか
    lastEditor?: string; // 最終編集者
}
