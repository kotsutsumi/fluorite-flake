/**
 * チャート・グラフウィジェット機能
 */

import contrib from 'blessed-contrib';
import type { ChartConfig, WidgetConfig } from './config-types.js';

// Blessed-contrib widget types
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
    setPercent(percent: number): void;
    log(message: string): void;
}

/**
 * 折れ線グラフウィジェットの作成
 */
export function createLineChartWidget(grid: BlessedGrid, config: ChartConfig): BlessedWidget {
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
export function createBarChartWidget(grid: BlessedGrid, config: ChartConfig): BlessedWidget {
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
    grid: BlessedGrid,
    config: WidgetConfig & { label?: string; stroke?: string; fill?: string }
): BlessedWidget {
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
    grid: BlessedGrid,
    config: ChartConfig & { radius?: number; arcWidth?: number }
): BlessedWidget {
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
 * グラフデータの更新
 */
export function updateChartData(
    widget: BlessedWidget,
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
export function updateGaugeData(widget: BlessedWidget, percent: number): void {
    widget.setPercent(percent);
}

/**
 * ドーナツデータの更新
 */
export function updateDonutData(
    widget: BlessedWidget,
    data: Array<{
        percent: number;
        label: string;
        color: string;
    }>
): void {
    widget.setData(data);
}
