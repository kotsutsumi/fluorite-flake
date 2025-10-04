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

    const borderType = border?.type || 'line';
    const borderFg = border?.fg || 'cyan';
    const widgetStyle: Record<string, unknown> = {
        fg: style?.fg || 'white',
        bg: style?.bg,
        selectedFg: style?.selectedFg || 'white',
        selectedBg: style?.selectedBg || 'blue',
        focus: style?.focus,
        border: {
            fg: borderFg,
            bg: border?.bg,
        },
    };

    return grid.set(...position, contrib.table, {
        keys: interactive,
        fg: widgetStyle.fg,
        selectedFg: widgetStyle.selectedFg,
        selectedBg: widgetStyle.selectedBg,
        interactive,
        label: title,
        columnSpacing,
        columnWidth: columnWidths || headers.map(() => 15),
        border: {
            type: borderType,
        },
        style: widgetStyle,
    } as Record<string, unknown>) as BlessedWidget;
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
