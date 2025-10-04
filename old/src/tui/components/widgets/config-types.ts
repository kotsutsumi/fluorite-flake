/**
 * TUIウィジェット設定型定義
 */

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
