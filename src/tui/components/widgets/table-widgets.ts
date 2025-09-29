/**
 * テーブルウィジェット機能
 */

import contrib from 'blessed-contrib';
import type { TableConfig } from './config-types.js';

// Blessed widget types for table widgets
interface BlessedGrid {
    set(
        row: number,
        col: number,
        rowSpan: number,
        colSpan: number,
        element: unknown,
        options: unknown
    ): BlessedWidget;
}

interface BlessedWidget {
    setData(data: unknown): void;
}

/**
 * テーブルウィジェットの作成
 */
export function createTableWidget(grid: BlessedGrid, config: TableConfig): BlessedWidget {
    const {
        position,
        title,
        headers,
        columnWidths,
        columnSpacing = 3,
        interactive = true,
        style,
        border,
    } = config;

    return grid.set(...position, contrib.table, {
        keys: interactive,
        fg: style?.fg || 'white',
        selectedFg: style?.selectedFg || 'white',
        selectedBg: style?.selectedBg || 'blue',
        interactive,
        label: title,
        columnSpacing,
        columnWidth: columnWidths || headers.map(() => 15),
        border: {
            type: border?.type || 'line',
            fg: border?.fg || 'cyan',
        },
    });
}

/**
 * テーブルデータの更新
 */
export function updateTableData(widget: BlessedWidget, headers: string[], data: string[][]): void {
    widget.setData({
        headers,
        data,
    });
}
