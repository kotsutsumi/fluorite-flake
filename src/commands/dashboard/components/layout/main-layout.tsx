/**
 * メインレイアウトコンポーネント
 */

import { Box, Text, useInput } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";

import { dashboardStore, setActiveService } from "../../state/dashboard-store.js";
import type { ServiceType } from "../../types/common.js";
import { ErrorModal } from "../common/error-modal.js";
import { LoadingSpinner } from "../common/loading-spinner.js";
import { StatusBanner } from "../common/status-banner.js";
import { DetailPanel } from "./detail-panel.js";
import { Sidebar } from "./sidebar.js";

type DashboardAppProps = {
    initialService?: ServiceType;
};

/**
 * ダッシュボードアプリケーションのメインレイアウト
 */
export const DashboardApp: React.FC<DashboardAppProps> = ({ initialService }) => {
    const snapshot = useSnapshot(dashboardStore);
    const [isExiting, setIsExiting] = useState(false);

    // 初期サービスの設定
    useEffect(() => {
        if (initialService) {
            setActiveService(initialService);
        }
    }, [initialService]);

    // キーボード入力の処理
    useInput((input, key) => {
        // 終了処理
        if (input === "q" || key.escape) {
            setIsExiting(true);
            process.exit(0);
            return;
        }

        // サービス選択
        switch (input) {
            case "v":
                setActiveService("vercel");
                break;
            case "t":
                setActiveService("turso");
                break;
            case "s":
                setActiveService("supabase");
                break;
            case "g":
                setActiveService("github");
                break;
            default:
                // 未知の入力は何もしない
                break;
        }
    });

    // 終了中の場合
    if (isExiting) {
        return (
            <Box alignItems="center" flexDirection="column" justifyContent="center">
                <Text color="yellow">ダッシュボードを終了しています...</Text>
            </Box>
        );
    }

    const sidebarBorderColor = snapshot.activeFocus === "services" ? "cyan" : "gray";
    const detailBorderColor = snapshot.activeFocus === "tabs" ? "cyan" : "gray";
    const shortcutBorderColor = snapshot.activeFocus === "shortcuts" ? "cyan" : "gray";
    const shortcutTextColor = shortcutBorderColor === "cyan" ? "cyan" : "gray";

    return (
        <Box flexDirection="column" height={process.stdout.rows || 24} padding={1}>
            {/* ステータスバナー */}
            <StatusBanner />

            {/* メインコンテンツエリア */}
            <Box flexDirection="row" flexGrow={1} marginTop={1}>
                {/* 左サイドバー（サービス一覧） */}
                <Box borderColor={sidebarBorderColor} borderStyle="round" paddingX={1} paddingY={1} width={24}>
                    <Sidebar />
                </Box>

                {/* 右詳細パネル */}
                <Box borderColor={detailBorderColor} borderStyle="round" flexGrow={1} marginLeft={1} padding={1}>
                    <DetailPanel />
                </Box>
            </Box>

            {/* キーボードショートカットヘルプ */}
            <Box borderColor={shortcutBorderColor} borderStyle="round" marginTop={1} paddingX={2} paddingY={1}>
                <Text color={shortcutTextColor}>[v] Vercel [t] Turso [s] Supabase [g] GitHub [q] Quit</Text>
            </Box>

            {/* ローディングオーバーレイ */}
            {snapshot.isLoading && <LoadingSpinner />}

            {/* エラーモーダル */}
            {snapshot.errorMessage && <ErrorModal message={snapshot.errorMessage} />}
        </Box>
    );
};

// EOF
