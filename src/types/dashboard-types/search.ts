/**
 * 検索・発見機能関連の型定義
 */

/**
 * 検索クエリ
 * ファイル、プロジェクト、ログなどの横断検索条件
 */
export interface SearchQuery {
    text: string; // 検索キーワード
    type?: 'files' | 'projects' | 'logs' | 'all'; // 検索対象タイプ
    filters?: SearchFilter[]; // 詳細フィルター条件
    sortBy?: string; // ソート基準フィールド
    sortOrder?: 'asc' | 'desc'; // ソート順序
    limit?: number; // 取得件数上限
    offset?: number; // 取得開始位置
}

/**
 * 検索フィルター
 * 詳細な検索条件を指定するためのフィルター
 */
export interface SearchFilter {
    field: string; // フィルター対象フィールド
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'starts_with' | 'ends_with'; // 比較演算子
    value: unknown; // フィルター値
}

/**
 * 検索結果
 * 検索で見つかった項目の詳細情報
 */
export interface SearchResult {
    id: string; // 結果項目の一意識別子
    type: 'file' | 'project' | 'log' | 'build'; // 結果の種類
    title: string; // 表示タイトル
    description?: string; // 説明文
    path?: string; // ファイルパス（該当する場合）
    score: number; // 関連度スコア
    highlights?: SearchHighlight[]; // ハイライト情報
    metadata?: Record<string, unknown>; // 追加メタデータ
}

/**
 * 検索ハイライト
 * 検索結果内でマッチした部分のハイライト情報
 */
export interface SearchHighlight {
    field: string; // ハイライト対象フィールド
    fragments: string[]; // ハイライトされたテキスト断片
}
