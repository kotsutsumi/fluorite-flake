/**
 * サイドバーコンポーネント - サービス選択
 */

import { Box, Text } from "ink";
import type React from "react";
import { useSnapshot } from "valtio";

import { dashboardStore } from "../../state/dashboard-store.js";
import type { ServiceType } from "../../types/common.js";

// サービス情報の定義
const SERVICES: Array<{
    key: ServiceType;
    name: string;
    icon: string;
    color: string;
}> = [
    { key: "vercel", name: "Vercel", icon: "▲", color: "white" },
    { key: "turso", name: "Turso", icon: "●", color: "cyan" },
    { key: "supabase", name: "Supabase", icon: "⚡", color: "green" },
    { key: "github", name: "GitHub", icon: "📦", color: "magenta" },
];

/**
 * 認証状態のインジケータを取得
 * @param authStatus 認証状態
 * @returns 状態インジケータ
 */
function getAuthIndicator(authStatus: string): {
    symbol: string;
    color: string;
} {
    switch (authStatus) {
        case "authenticated":
            return { symbol: "●", color: "green" };
        case "unauthenticated":
            return { symbol: "●", color: "red" };
        case "error":
            return { symbol: "●", color: "yellow" };
        default:
            return { symbol: "●", color: "gray" };
    }
}

/**
 * サイドバーコンポーネント
 */
export const Sidebar: React.FC = () => {
    const snapshot = useSnapshot(dashboardStore);

    return (
        <Box flexDirection="column" paddingX={1}>
            {/* タイトル */}
            <Box marginBottom={1}>
                <Text bold color="white">
                    Services
                </Text>
            </Box>

            {/* サービス一覧 */}
            {SERVICES.map((service) => {
                const isActive = snapshot.activeService === service.key;
                const authStatus = snapshot.authStatus[service.key];
                const authIndicator = getAuthIndicator(authStatus);

                return (
                    <Box key={service.key} marginBottom={0}>
                        <Box width={2}>
                            <Text color={isActive ? "yellow" : "gray"}>
                                {isActive ? ">" : " "}
                            </Text>
                        </Box>
                        <Box width={2}>
                            <Text color={service.color}>{service.icon}</Text>
                        </Box>
                        <Box flexGrow={1}>
                            <Text
                                bold={isActive}
                                color={isActive ? "yellow" : "white"}
                            >
                                {service.name}
                            </Text>
                        </Box>
                        <Box>
                            <Text color={authIndicator.color}>
                                {authIndicator.symbol}
                            </Text>
                        </Box>
                    </Box>
                );
            })}

            {/* 認証状態の説明 */}
            <Box flexDirection="column" marginTop={1}>
                <Text color="gray" dimColor>
                    Status:
                </Text>
                <Text color="green" dimColor>
                    ● Auth OK
                </Text>
                <Text color="red" dimColor>
                    ● No Auth
                </Text>
                <Text color="yellow" dimColor>
                    ● Error
                </Text>
                <Text color="gray" dimColor>
                    ● Unknown
                </Text>
            </Box>

            {/* 最終更新時刻 */}
            <Box marginTop={1}>
                <Text color="gray" dimColor>
                    Updated: {snapshot.lastRefresh.toLocaleTimeString()}
                </Text>
            </Box>
        </Box>
    );
};

// EOF
