/**
 * Vercel管理パネルコンポーネント
 */
import type React from "react";
import { useEffect, useState } from "react";
import { Box, Text } from "ink";

import type { TabType } from "../../types/common.js";

type VercelPanelProps = {
    tab: TabType;
};

/**
 * プロジェクトステータスに基づいて色を決定
 */
function getStatusColor(status: string): string {
    if (status === "ready") {
        return "green";
    }
    if (status === "building") {
        return "yellow";
    }
    return "red";
}

/**
 * Vercel管理パネルコンポーネント
 */
export const VercelPanel: React.FC<VercelPanelProps> = ({ tab }) => {
    const [data, setData] = useState<Record<string, unknown>>({});

    // データ取得（プレースホルダー）
    useEffect(() => {
        // TODO: Vercel CLIからデータを取得
        setData({
            projects: [
                {
                    name: "my-app",
                    status: "ready",
                    url: "https://my-app.vercel.app",
                },
                {
                    name: "admin-panel",
                    status: "building",
                    url: "https://admin-panel.vercel.app",
                },
            ],
            deployments: [
                {
                    id: "dpl_123",
                    status: "ready",
                    createdAt: "2024-01-01T12:00:00Z",
                },
                {
                    id: "dpl_456",
                    status: "error",
                    createdAt: "2024-01-01T11:30:00Z",
                },
            ],
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
                url: string;
            }>) || [];

        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Vercel Projects
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    {projects.map((project) => (
                        <Box key={project.name} marginBottom={1}>
                            <Box width={20}>
                                <Text color="cyan">{project.name}</Text>
                            </Box>
                            <Box width={10}>
                                <Text color={getStatusColor(project.status)}>
                                    {project.status}
                                </Text>
                            </Box>
                            <Box>
                                <Text color="gray">{project.url}</Text>
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
                    <Text color="cyan">• Deploy current project</Text>
                    <Text color="cyan">• View deployment logs</Text>
                    <Text color="cyan">• Manage environment variables</Text>
                    <Text color="cyan">• List all projects</Text>
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
        const deployments =
            (data.deployments as Array<{
                id: string;
                status: string;
                createdAt: string;
            }>) || [];

        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Recent Deployments
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    {deployments.map((deployment) => (
                        <Box key={deployment.id} marginBottom={1}>
                            <Box width={15}>
                                <Text color="gray">{deployment.id}</Text>
                            </Box>
                            <Box width={10}>
                                <Text
                                    color={
                                        deployment.status === "ready"
                                            ? "green"
                                            : "red"
                                    }
                                >
                                    {deployment.status}
                                </Text>
                            </Box>
                            <Box>
                                <Text color="gray">
                                    {new Date(
                                        deployment.createdAt
                                    ).toLocaleString()}
                                </Text>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        );
    }

    /**
     * メトリクスタブの内容
     */
    function renderMetrics() {
        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Performance Metrics
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text color="green">• Response Time: 245ms</Text>
                    <Text color="green">• Success Rate: 99.8%</Text>
                    <Text color="yellow">• Bandwidth Usage: 2.1GB / 100GB</Text>
                    <Text color="cyan">• Deployments Today: 5</Text>
                    <Box marginTop={1}>
                        <Text color="gray">
                            Detailed metrics charts coming soon...
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
