/**
 * ステータスバナーコンポーネント
 */
import type React from "react";
import { Box, Text } from "ink";
import { useSnapshot } from "valtio";

import { dashboardStore } from "../../state/dashboard-store.js";

/**
 * ステータスバナーコンポーネント
 */
export const StatusBanner: React.FC = () => {
    const snapshot = useSnapshot(dashboardStore);

    // 認証済みサービス数を計算
    const authenticatedCount = Object.values(snapshot.authStatus).filter(
        (status) => status === "authenticated"
    ).length;
    const totalServices = Object.keys(snapshot.authStatus).length;

    // 全体的なステータスを判定
    let overallStatus: string;
    if (authenticatedCount === totalServices) {
        overallStatus = "healthy";
    } else if (authenticatedCount > 0) {
        overallStatus = "partial";
    } else {
        overallStatus = "warning";
    }

    // ステータスに応じた色を決定
    let statusColor: string;
    if (overallStatus === "healthy") {
        statusColor = "green";
    } else if (overallStatus === "partial") {
        statusColor = "yellow";
    } else {
        statusColor = "red";
    }

    // ステータスアイコンを決定
    let statusIcon: string;
    if (overallStatus === "healthy") {
        statusIcon = "✓";
    } else if (overallStatus === "partial") {
        statusIcon = "⚠";
    } else {
        statusIcon = "✗";
    }

    return (
        <Box
            borderColor={statusColor}
            borderStyle="round"
            justifyContent="space-between"
            paddingX={2}
            paddingY={1}
        >
            {/* 左側：タイトルとステータス */}
            <Box>
                <Text bold color="cyan">
                    Fluorite Dashboard
                </Text>
                <Text color="gray"> | </Text>
                <Text color={statusColor}>
                    {statusIcon} {authenticatedCount}/{totalServices} Services
                    Ready
                </Text>
            </Box>

            {/* 右側：現在時刻 */}
            <Box>
                <Text color="gray">{new Date().toLocaleString()}</Text>
            </Box>
        </Box>
    );
};

// EOF
