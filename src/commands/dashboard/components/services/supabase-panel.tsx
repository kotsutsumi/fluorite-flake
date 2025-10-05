/**
 * Supabase管理パネルコンポーネント
 */
import type React from "react";
import { useEffect, useState } from "react";
import { Box, Text } from "ink";

import type { TabType } from "../../types/common.js";

type SupabasePanelProps = {
    tab: TabType;
};

/**
 * Supabase管理パネルコンポーネント
 */
export const SupabasePanel: React.FC<SupabasePanelProps> = ({ tab }) => {
    const [data, setData] = useState<Record<string, unknown>>({});

    // データ取得（プレースホルダー）
    useEffect(() => {
        // TODO: Supabase CLIからデータを取得
        setData({
            projects: [
                {
                    name: "production",
                    status: "active",
                    region: "ap-southeast-1",
                },
                { name: "staging", status: "active", region: "ap-southeast-1" },
            ],
            functions: [
                {
                    name: "user-auth",
                    status: "deployed",
                    lastUpdate: "2024-01-01T12:00:00Z",
                },
                {
                    name: "send-email",
                    status: "deployed",
                    lastUpdate: "2024-01-01T11:30:00Z",
                },
            ],
            usage: {
                database: "2.1GB / 8GB",
                auth: "1,234 users",
                storage: "450MB / 1GB",
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
        const projects =
            (data.projects as Array<{
                name: string;
                status: string;
                region: string;
            }>) || [];

        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Supabase Projects
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    {projects.map((project) => (
                        <Box key={project.name} marginBottom={1}>
                            <Box width={20}>
                                <Text color="cyan">{project.name}</Text>
                            </Box>
                            <Box width={12}>
                                <Text
                                    color={
                                        project.status === "active"
                                            ? "green"
                                            : "red"
                                    }
                                >
                                    {project.status}
                                </Text>
                            </Box>
                            <Box>
                                <Text color="gray">{project.region}</Text>
                            </Box>
                        </Box>
                    ))}
                </Box>

                <Box marginTop={2}>
                    <Text bold color="white">
                        Edge Functions
                    </Text>
                    <Box flexDirection="column" marginTop={1}>
                        {(
                            (data.functions as Array<{
                                name: string;
                                status: string;
                                lastUpdate: string;
                            }>) || []
                        ).map((func) => (
                            <Box key={func.name} marginBottom={1}>
                                <Box width={20}>
                                    <Text color="magenta">{func.name}</Text>
                                </Box>
                                <Box width={12}>
                                    <Text
                                        color={
                                            func.status === "deployed"
                                                ? "green"
                                                : "red"
                                        }
                                    >
                                        {func.status}
                                    </Text>
                                </Box>
                                <Box>
                                    <Text color="gray">
                                        {new Date(
                                            func.lastUpdate
                                        ).toLocaleString()}
                                    </Text>
                                </Box>
                            </Box>
                        ))}
                    </Box>
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
                    <Text color="cyan">• Deploy edge functions</Text>
                    <Text color="cyan">• Reset database</Text>
                    <Text color="cyan">• Generate types</Text>
                    <Text color="cyan">• Run migrations</Text>
                    <Text color="cyan">• Manage secrets</Text>
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
                    Recent Activity
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text color="green">• Function deployment successful</Text>
                    <Text color="blue">• Database migration completed</Text>
                    <Text color="yellow">• Auth rate limit warning</Text>
                    <Text color="cyan">• New user registration: +5</Text>
                    <Box marginTop={1}>
                        <Text color="gray">
                            Detailed function logs coming soon...
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
                  database: string;
                  auth: string;
                  storage: string;
              }
            | undefined;

        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Usage Metrics
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text color="cyan">• Database: {usage?.database}</Text>
                    <Text color="cyan">• Auth Users: {usage?.auth}</Text>
                    <Text color="cyan">• Storage: {usage?.storage}</Text>
                    <Text color="green">• API Health: 99.8%</Text>
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
