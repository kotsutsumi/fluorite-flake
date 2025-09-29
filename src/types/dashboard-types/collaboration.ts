/**
 * リアルタイムコラボレーション関連の型定義
 */

/**
 * コラボレーションセッション
 * 複数人でのリアルタイム共同編集セッション
 */
export interface CollaborationSession {
    id: string; // セッションの一意識別子
    projectId: string; // 対象プロジェクトのID
    participants: Participant[]; // 参加者一覧
    createdAt: number; // セッション開始時刻（Unix timestamp）
    lastActivity: number; // 最終活動時刻（Unix timestamp）
    isActive: boolean; // セッションのアクティブ状態
}

/**
 * 参加者
 * コラボレーションセッションの参加者情報
 */
export interface Participant {
    id: string; // 参加者の一意識別子
    name: string; // 参加者名
    avatar?: string; // アバター画像URL
    role: 'owner' | 'editor' | 'viewer'; // 権限レベル
    isOnline: boolean; // オンライン状態
    lastSeen?: number; // 最終アクセス時刻（Unix timestamp）
    cursor?: CursorPosition; // 現在のカーソル位置
}

/**
 * カーソル位置
 * エディタ内での参加者のカーソル位置と選択範囲
 */
export interface CursorPosition {
    fileId: string; // 対象ファイルのID
    line: number; // 行番号（0ベース）
    column: number; // 列番号（0ベース）
    selection?: { start: number; end: number }; // 選択範囲（文字位置）
}
