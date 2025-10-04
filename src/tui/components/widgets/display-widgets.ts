/**
 * 表示系ウィジェット機能
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import type { LogConfig, WidgetConfig } from './config-types.js';

// Blessed widget types for display widgets
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
    log(message: string): void;
}

/**
 * ログボックスウィジェットの作成
 */
export function createLogWidget(grid: BlessedGrid, config: LogConfig): BlessedWidget {
    const {
        position,
        title,
        scrollable = true,
        alwaysScroll = true,
        mouse = true,
        keys = true,
        vi = true,
        style,
        border,
    } = config;

    const borderType = border?.type || 'line';
    const borderFg = border?.fg || 'cyan';
    const widgetStyle: Record<string, unknown> = {
        fg: style?.fg || 'green',
        selectedFg: style?.selectedFg || 'green',
        border: {
            fg: borderFg,
            bg: border?.bg,
        },
    };

    return grid.set(...position, blessed.log, {
        fg: widgetStyle.fg,
        selectedFg: widgetStyle.selectedFg,
        label: title,
        scrollable,
        alwaysScroll,
        mouse,
        keys,
        vi,
        border: {
            type: borderType,
        },
        style: widgetStyle,
    } as Record<string, unknown>) as BlessedWidget;
}

/**
 * フォーマットされたテキスト表示用のMarkdownウィジェットを作成
 */
export function createMarkdownWidget(
    grid: BlessedGrid,
    config: WidgetConfig & { markdown?: string }
): BlessedWidget {
    const { position, title, markdown = '', style, border } = config;

    const borderType = border?.type || 'line';
    const borderFg = border?.fg || 'cyan';
    const widgetStyle: Record<string, unknown> = {
        fg: style?.fg || 'white',
        bg: style?.bg || 'black',
        border: {
            fg: borderFg,
            bg: border?.bg,
        },
    };

    return grid.set(...position, contrib.markdown, {
        label: title,
        markdown,
        style: widgetStyle,
        border: {
            type: borderType,
        },
    } as Record<string, unknown>) as BlessedWidget;
}

/**
 * 階層データ用のツリーウィジェットを作成
 */
export function createTreeWidget(
    grid: BlessedGrid,
    config: WidgetConfig & { template?: Record<string, unknown> }
): BlessedWidget {
    const { position, title, template, style, border } = config;

    const borderType = border?.type || 'line';
    const borderFg = border?.fg || 'cyan';
    const widgetStyle: Record<string, unknown> = {
        fg: style?.fg || 'green',
        selectedFg: style?.selectedFg || 'white',
        selectedBg: style?.selectedBg || 'blue',
        border: {
            fg: borderFg,
            bg: border?.bg,
        },
    };

    return grid.set(...position, contrib.tree, {
        label: title,
        fg: widgetStyle.fg,
        selectedFg: widgetStyle.selectedFg,
        selectedBg: widgetStyle.selectedBg,
        template,
        border: {
            type: borderType,
        },
        style: widgetStyle,
    } as Record<string, unknown>) as BlessedWidget;
}

/**
 * ステータスバーウィジェットの作成
 */
export function createStatusBarWidget(
    screen: blessed.Widgets.Screen,
    content: string,
    position: 'top' | 'bottom' = 'bottom'
): blessed.Widgets.BoxElement {
    return blessed.box({
        parent: screen,
        bottom: position === 'bottom' ? 0 : undefined,
        top: position === 'top' ? 0 : undefined,
        left: 0,
        width: '100%',
        height: 1,
        content,
        style: {
            fg: 'white',
            bg: 'black',
            border: {
                fg: 'cyan',
            },
        },
        border: {
            type: 'line',
        },
    });
}

/**
 * ログエントリの追加
 */
export function addLogEntry(widget: BlessedWidget, message: string, timestamp = true): void {
    const entry = timestamp ? `[${new Date().toLocaleTimeString()}] ${message}` : message;
    widget.log(entry);
}
