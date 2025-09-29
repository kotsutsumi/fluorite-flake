/**
 * TUIダッシュボード用ベースウィジェットコンポーネント
 *
 * サービス固有のダッシュボード構築用の再利用可TUIコンポーネント。
 * ターミナルUIレンダリング用のblessedとblessed-contrib上に構築。
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';

export interface WidgetConfig {
    /** グリッド内のウィジェット位置 */
    position: [number, number, number, number]; // [row, col, rowSpan, colSpan]
    /** ウィジェットタイトル */
    title: string;
    /** ウィジェットスタイル */
    style?: WidgetStyle;
    /** ボーダー設定 */
    border?: BorderConfig;
}

export interface WidgetStyle {
    fg?: string;
    bg?: string;
    selectedFg?: string;
    selectedBg?: string;
    focus?: {
        fg?: string;
        bg?: string;
        border?: { fg?: string };
    };
}

export interface BorderConfig {
    type?: 'line' | 'bg';
    fg?: string;
    bg?: string;
}

export interface TableConfig extends WidgetConfig {
    headers: string[];
    columnWidths?: number[];
    columnSpacing?: number;
    interactive?: boolean;
}

export interface ChartConfig extends WidgetConfig {
    chartType: 'line' | 'bar' | 'gauge' | 'donut';
    showLegend?: boolean;
    xLabelPadding?: number;
    xPadding?: number;
    wholeNumbersOnly?: boolean;
}

export interface LogConfig extends WidgetConfig {
    scrollable?: boolean;
    alwaysScroll?: boolean;
    mouse?: boolean;
    keys?: boolean;
    vi?: boolean;
    maxLines?: number;
}

/**
 * テーブルウィジェットの作成
 */
export function createTableWidget(grid: any, config: TableConfig): any {
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
 * 折れ線グラフウィジェットの作成
 */
export function createLineChartWidget(grid: any, config: ChartConfig): any {
    const {
        position,
        title,
        showLegend = true,
        xLabelPadding = 3,
        xPadding = 5,
        wholeNumbersOnly = false,
        style,
        border,
    } = config;

    return grid.set(...position, contrib.line, {
        style: {
            line: style?.fg || 'yellow',
            text: 'green',
            baseline: 'black',
        },
        xLabelPadding,
        xPadding,
        showLegend,
        wholeNumbersOnly,
        label: title,
        border: {
            type: border?.type || 'line',
            fg: border?.fg || 'cyan',
        },
    });
}

/**
 * 棒グラフウィジェットの作成
 */
export function createBarChartWidget(grid: any, config: ChartConfig): any {
    const { position, title, style, border } = config;

    return grid.set(...position, contrib.bar, {
        label: title,
        barWidth: 4,
        barSpacing: 6,
        xOffset: 0,
        maxHeight: 9,
        barBgColor: style?.bg || 'blue',
        border: {
            type: border?.type || 'line',
            fg: border?.fg || 'cyan',
        },
    });
}

/**
 * ゲージウィジェットの作成
 */
export function createGaugeWidget(
    grid: any,
    config: WidgetConfig & { label?: string; stroke?: string; fill?: string }
): any {
    const { position, title, label, stroke = 'green', fill = 'white', border } = config;

    return grid.set(...position, contrib.gauge, {
        label: label || title,
        stroke,
        fill,
        border: {
            type: border?.type || 'line',
            fg: border?.fg || 'cyan',
        },
    });
}

/**
 * ドーナツグラフウィジェットの作成
 */
export function createDonutWidget(
    grid: any,
    config: ChartConfig & { radius?: number; arcWidth?: number }
): any {
    const { position, title, radius = 8, arcWidth = 3, border } = config;

    return grid.set(...position, contrib.donut, {
        label: title,
        radius,
        arcWidth,
        remainColor: 'black',
        yPadding: 2,
        border: {
            type: border?.type || 'line',
            fg: border?.fg || 'cyan',
        },
    });
}

/**
 * ログボックスウィジェットの作成
 */
export function createLogWidget(grid: any, config: LogConfig): any {
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

    return grid.set(...position, blessed.log, {
        fg: style?.fg || 'green',
        selectedFg: style?.selectedFg || 'green',
        label: title,
        scrollable,
        alwaysScroll,
        mouse,
        keys,
        vi,
        border: {
            type: border?.type || 'line',
            fg: border?.fg || 'cyan',
        },
    });
}

/**
 * フォーマットされたテキスト表示用のMarkdownウィジェットを作成
 */
export function createMarkdownWidget(grid: any, config: WidgetConfig & { markdown?: string }): any {
    const { position, title, markdown = '', style, border } = config;

    return grid.set(...position, contrib.markdown, {
        label: title,
        markdown,
        style: {
            fg: style?.fg || 'white',
            bg: style?.bg || 'black',
        },
        border: {
            type: border?.type || 'line',
            fg: border?.fg || 'cyan',
        },
    });
}

/**
 * 階層データ用のツリーウィジェットを作成
 */
export function createTreeWidget(grid: any, config: WidgetConfig & { template?: any }): any {
    const { position, title, template, style, border } = config;

    return grid.set(...position, contrib.tree, {
        label: title,
        fg: style?.fg || 'green',
        selectedFg: style?.selectedFg || 'white',
        selectedBg: style?.selectedBg || 'blue',
        template,
        border: {
            type: border?.type || 'line',
            fg: border?.fg || 'cyan',
        },
    });
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
        },
        border: {
            type: 'line',
            fg: 'cyan' as any,
        },
    });
}

/**
 * テーブルデータの更新
 */
export function updateTableData(widget: any, headers: string[], data: string[][]): void {
    widget.setData({
        headers,
        data,
    });
}

/**
 * グラフデータの更新
 */
export function updateChartData(
    widget: any,
    series: Array<{
        title: string;
        x: string[];
        y: number[];
        style?: { line?: string };
    }>
): void {
    widget.setData(series);
}

/**
 * ゲージのパーセンテージ更新
 */
export function updateGaugeData(widget: any, percent: number): void {
    widget.setPercent(percent);
}

/**
 * ドーナツデータの更新
 */
export function updateDonutData(
    widget: any,
    data: Array<{
        percent: number;
        label: string;
        color: string;
    }>
): void {
    widget.setData(data);
}

/**
 * ログエントリの追加
 */
export function addLogEntry(widget: any, message: string, timestamp = true): void {
    const entry = timestamp ? `[${new Date().toLocaleTimeString()}] ${message}` : message;
    widget.log(entry);
}

/**
 * テーマ設定
 */
export const THEMES = {
    dark: {
        fg: 'white',
        bg: 'black',
        border: 'cyan',
        selectedFg: 'white',
        selectedBg: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        info: 'cyan',
    },
    light: {
        fg: 'black',
        bg: 'white',
        border: 'gray',
        selectedFg: 'white',
        selectedBg: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        info: 'blue',
    },
} as const;

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
