/**
 * 詳細パネルコンポーネント
 */

import { Box, Text, useInput } from "ink";
import type React from "react";
import { useSnapshot } from "valtio";

import { dashboardStore, setActiveTab } from "../../state/dashboard-store.js";
import type { TabType } from "../../types/common.js";
import { GitHubPanel } from "../services/github-panel.js";
import { SupabasePanel } from "../services/supabase-panel.js";
import { TursoPanel } from "../services/turso-panel.js";
import { VercelPanel } from "../services/vercel-panel.js";

// タブ情報の定義
const TABS: Array<{
    key: TabType;
    name: string;
    shortcut: string;
}> = [
    { key: "overview", name: "Overview", shortcut: "1" },
    { key: "operations", name: "Operations", shortcut: "2" },
    { key: "logs", name: "Logs", shortcut: "3" },
    { key: "metrics", name: "Metrics", shortcut: "4" },
];

/**
 * 詳細パネルコンポーネント
 */
export const DetailPanel: React.FC = () => {
    const snapshot = useSnapshot(dashboardStore);
    const panelBorderColor = snapshot.activeFocus === "tabs" ? "cyan" : "gray";

    // キーボード入力でタブ切り替え
    useInput((input) => {
        switch (input) {
            case "1":
                setActiveTab("overview");
                break;
            case "2":
                setActiveTab("operations");
                break;
            case "3":
                setActiveTab("logs");
                break;
            case "4":
                setActiveTab("metrics");
                break;
            default:
                // 未知の入力は何もしない
                break;
        }
    });

    /**
     * アクティブなサービスのパネルを取得
     */
    function getServicePanel() {
        switch (snapshot.activeService) {
            case "vercel":
                return <VercelPanel tab={snapshot.activeTab} />;
            case "turso":
                return <TursoPanel tab={snapshot.activeTab} />;
            case "supabase":
                return <SupabasePanel tab={snapshot.activeTab} />;
            case "github":
                return <GitHubPanel tab={snapshot.activeTab} />;
            default:
                return <Text color="red">Unknown service: {snapshot.activeService}</Text>;
        }
    }

    return (
        <Box flexDirection="column" height="100%">
            {/* サービス名ヘッダー */}
            <Box marginBottom={1}>
                <Text bold color="cyan">
                    {snapshot.activeService.toUpperCase()} Dashboard
                </Text>
            </Box>

            {/* タブナビゲーション */}
            <Box marginBottom={1}>
                {TABS.map((tab) => {
                    const isActive = snapshot.activeTab === tab.key;
                    return (
                        <Box key={tab.key} marginRight={2}>
                            <Text bold={isActive} color={isActive ? "yellow" : "gray"} underline={isActive}>
                                [{tab.shortcut}] {tab.name}
                            </Text>
                        </Box>
                    );
                })}
            </Box>

            {/* サービス別パネル */}
            <Box borderColor={panelBorderColor} borderStyle="round" flexGrow={1} padding={1}>
                {getServicePanel()}
            </Box>
        </Box>
    );
};

// EOF
