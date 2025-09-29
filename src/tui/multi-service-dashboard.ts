/**
 * マルチサービスTUIダッシュボード
 *
 * 複数のクラウドサービス監視用のターミナルユーザーインターフェース。
 * サービス非依存コンポーネントを使用した統合ダッシュボードオーケストレーター上に構築。
 */

// import blessed from 'blessed';
// import contrib from 'blessed-contrib';
import type { DashboardOrchestrator } from '../dashboard/dashboard-orchestrator.js';

export interface TUIDashboardOptions {
    /** ダッシュボードオーケストレーターインスタンス */
    orchestrator: DashboardOrchestrator;
    /** 表示するサービス */
    services: string[];
    /** UIテーマ */
    theme?: 'dark' | 'light';
    /** レイアウトスタイル */
    layout?: 'grid' | 'tabs' | 'split';
    /** ミリ秒単位の更新間隔 */
    refreshInterval?: number;
}

/**
 * マルチサービスTUIダッシュボードの開始
 */
export async function startTUIDashboard(options: TUIDashboardOptions): Promise<void> {
    console.log('🚧 Multi-service TUI dashboard is under construction');
    console.log(`📋 Would display: ${options.services.join(', ')}`);
    console.log(`🎨 Theme: ${options.theme || 'dark'}`);
    console.log(`📐 Layout: ${options.layout || 'grid'}`);
    console.log('⏱️  Refresh interval:', options.refreshInterval || 5000, 'ms');

    // 現在はプレースホルダーメッセージを表示
    console.log('\n🔄 This will be implemented in the next phase');
    console.log('📚 Refer to the architecture documentation for the full TUI design');

    // デモ用にプロセスを維持
    console.log('\n⌨️  Press Ctrl+C to exit');

    process.on('SIGINT', () => {
        console.log('\n👋 Goodbye!');
        process.exit(0);
    });

    // ダッシュボード更新のシミュレーション
    let counter = 0;
    const interval = setInterval(async () => {
        counter++;
        console.log(`📊 Dashboard refresh ${counter} - Services: ${options.services.join(', ')}`);

        // オーケストレーターから実際のデータを取得
        try {
            const status = options.orchestrator.getServicesStatus();
            console.log(
                '🔗 Service status:',
                Object.keys(status)
                    .map((s) => `${s}: ${status[s].connected ? '✅' : '❌'}`)
                    .join(', ')
            );
        } catch (error) {
            console.log(`⚠️  Error getting service status: ${error}`);
        }
    }, options.refreshInterval || 5000);

    // 終了時のクリーンアップ
    process.on('SIGINT', () => {
        clearInterval(interval);
        console.log('\n👋 Goodbye!');
        process.exit(0);
    });

    // プロセスを実行続行
    // 永続実行のため無限に待機
    await new Promise(() => {
        // 無限に待機するための空の実装
    });
}
