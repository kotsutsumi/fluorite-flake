/**
 * TUIダッシュボード用ベースウィジェットコンポーネント
 *
 * サービス固有のダッシュボード構築用の再利用可TUIコンポーネント。
 * ターミナルUIレンダリング用のblessedとblessed-contrib上に構築。
 */

// 設定型定義
export type {
    WidgetConfig,
    WidgetStyle,
    BorderConfig,
    TableConfig,
    ChartConfig,
    LogConfig,
} from './config-types.js';

// テーブルウィジェット機能
export {
    createTableWidget,
    updateTableData,
} from './table-widgets.js';

// チャート・グラフウィジェット機能
export {
    createLineChartWidget,
    createBarChartWidget,
    createGaugeWidget,
    createDonutWidget,
    updateChartData,
    updateGaugeData,
    updateDonutData,
} from './chart-widgets.js';

// 表示系ウィジェット機能
export {
    createLogWidget,
    createMarkdownWidget,
    createTreeWidget,
    createStatusBarWidget,
    addLogEntry,
} from './display-widgets.js';

// テーマ設定
export { THEMES } from './themes.js';

// レイアウト設定
export { LAYOUTS } from './layouts.js';
