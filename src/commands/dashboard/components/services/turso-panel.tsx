/**
 * Turso管理パネルコンポーネント
 */
import type React from "react";
import { useEffect, useState } from "react";
import { Box, Text } from "ink";

import type { TabType } from "../../types/common.js";

type TursoPanelProps = {
    tab: TabType;
};

/**
 * Turso管理パネルコンポーネント
 */
export const TursoPanel: React.FC<TursoPanelProps> = ({ tab }) => {
    const [data, setData] = useState<Record<string, unknown>>({});

    // データ取得（プレースホルダー）
    useEffect(() => {
        // TODO: Turso CLIからデータを取得
        setData({
            databases: [
                {
                    name: "main-db",
                    location: "nrt",
                    replicas: 2,
                    status: "ready",
                },
                {
                    name: "analytics-db",
                    location: "sin",
                    replicas: 1,
                    status: "ready",
                },
            ],
            usage: {
                rows: 125_000,
                storage: "45.2MB",
                bandwidth: "1.2GB",
            },
        });
    }, []);

    /**
     * タブに応じたコンテンツを表示
     */
    function renderTabContent() {
        switch (tab) {
            case "overview":
                return renderOverview();
            case "operations":
                return renderOperations();
            case "logs":
                return renderLogs();
            case "metrics":
                return renderMetrics();
            default:
                return <Text color="red">Unknown tab: {tab}</Text>;
        }
    }

    /**
     * 概要タブの内容
     */
    function renderOverview() {
        const databases =
            (data.databases as Array<{
                name: string;
                location: string;
                replicas: number;
                status: string;
            }>) || [];

        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Turso Databases
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    {databases.map((db) => (
                        <Box key={db.name} marginBottom={1}>
                            <Box width={20}>
                                <Text color="cyan">{db.name}</Text>
                            </Box>
                            <Box width={8}>
                                <Text color="gray">{db.location}</Text>
                            </Box>
                            <Box width={12}>
                                <Text color="blue">{db.replicas} replicas</Text>
                            </Box>
                            <Box>
                                <Text
                                    color={
                                        db.status === "ready" ? "green" : "red"
                                    }
                                >
                                    {db.status}
                                </Text>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        );
    }

    /**
     * 操作タブの内容
     */
    function renderOperations() {
        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Available Operations
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text color="cyan">• Create new database</Text>
                    <Text color="cyan">• List all databases</Text>
                    <Text color="cyan">• Create database branch</Text>
                    <Text color="cyan">• Manage replicas</Text>
                    <Text color="cyan">• View connection strings</Text>
                    <Box marginTop={1}>
                        <Text color="gray">
                            Select an operation to execute (Coming soon...)
                        </Text>
                    </Box>
                </Box>
            </Box>
        );
    }

    /**
     * ログタブの内容
     */
    function renderLogs() {
        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Database Activity
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text color="green">• main-db: 234 queries/min</Text>
                    <Text color="blue">• analytics-db: 45 queries/min</Text>
                    <Text color="yellow">• Replication lag: 12ms avg</Text>
                    <Box marginTop={1}>
                        <Text color="gray">
                            Detailed query logs coming soon...
                        </Text>
                    </Box>
                </Box>
            </Box>
        );
    }

    /**
     * メトリクスタブの内容
     */
    function renderMetrics() {
        const usage = data.usage as
            | {
                  rows: number;
                  storage: string;
                  bandwidth: string;
              }
            | undefined;

        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Usage Metrics
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text color="cyan">
                        • Total Rows: {usage?.rows.toLocaleString()}
                    </Text>
                    <Text color="cyan">• Storage Used: {usage?.storage}</Text>
                    <Text color="cyan">• Bandwidth: {usage?.bandwidth}</Text>
                    <Text color="green">• Uptime: 99.9%</Text>
                    <Box marginTop={1}>
                        <Text color="gray">
                            Usage trend charts coming soon...
                        </Text>
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" height="100%">
            {renderTabContent()}
        </Box>
    );
};

// EOF
