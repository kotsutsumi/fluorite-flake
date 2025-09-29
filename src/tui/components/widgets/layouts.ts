/**
 * 共通ウィジェットレイアウト設定
 */

/**
 * 共通ウィジェットレイアウト
 */
export const LAYOUTS = {
    // シングルサービスレイアウト
    single: {
        grid: { rows: 12, cols: 12 },
        widgets: {
            main: [0, 0, 8, 8] as [number, number, number, number],
            sidebar: [0, 8, 8, 4] as [number, number, number, number],
            logs: [8, 0, 3, 12] as [number, number, number, number],
            status: [11, 0, 1, 12] as [number, number, number, number],
        },
    },

    // マルチサービスタブレイアウト
    tabs: {
        grid: { rows: 12, cols: 12 },
        widgets: {
            tabs: [0, 0, 1, 12] as [number, number, number, number],
            content: [1, 0, 9, 12] as [number, number, number, number],
            logs: [10, 0, 1, 12] as [number, number, number, number],
            status: [11, 0, 1, 12] as [number, number, number, number],
        },
    },

    // マルチサービスグリッドレイアウト
    grid: {
        grid: { rows: 12, cols: 12 },
        widgets: {
            topLeft: [0, 0, 6, 6] as [number, number, number, number],
            topRight: [0, 6, 6, 6] as [number, number, number, number],
            bottomLeft: [6, 0, 5, 6] as [number, number, number, number],
            bottomRight: [6, 6, 5, 6] as [number, number, number, number],
            status: [11, 0, 1, 12] as [number, number, number, number],
        },
    },

    // 分割ビューレイアウト
    split: {
        grid: { rows: 12, cols: 12 },
        widgets: {
            left: [0, 0, 11, 6] as [number, number, number, number],
            right: [0, 6, 11, 6] as [number, number, number, number],
            status: [11, 0, 1, 12] as [number, number, number, number],
        },
    },
} as const;
