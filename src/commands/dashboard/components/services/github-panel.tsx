/**
 * GitHub管理パネルコンポーネント
 */

import { Box, Text } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import type { TabType } from "../../types/common.js";

type GitHubPanelProps = {
    tab: TabType;
};

/**
 * GitHub管理パネルコンポーネント
 */
export const GitHubPanel: React.FC<GitHubPanelProps> = ({ tab }) => {
    const [data, setData] = useState<Record<string, unknown>>({});

    // データ取得（プレースホルダー）
    useEffect(() => {
        // TODO: GitHub CLIからデータを取得
        setData({
            repositories: [
                {
                    name: "fluorite-flake",
                    visibility: "public",
                    stars: 12,
                    language: "TypeScript",
                },
                {
                    name: "my-app",
                    visibility: "private",
                    stars: 0,
                    language: "JavaScript",
                },
            ],
            workflows: [
                {
                    name: "CI/CD",
                    status: "success",
                    lastRun: "2024-01-01T12:00:00Z",
                },
                {
                    name: "Tests",
                    status: "failure",
                    lastRun: "2024-01-01T11:30:00Z",
                },
            ],
            pullRequests: [
                {
                    number: 123,
                    title: "Add new feature",
                    state: "open",
                    author: "user1",
                },
                {
                    number: 122,
                    title: "Fix bug",
                    state: "closed",
                    author: "user2",
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
        const repositories =
            (data.repositories as Array<{
                name: string;
                visibility: string;
                stars: number;
                language: string;
            }>) || [];

        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Repositories
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    {repositories.map((repo) => (
                        <Box key={repo.name} marginBottom={1}>
                            <Box width={20}>
                                <Text color="cyan">{repo.name}</Text>
                            </Box>
                            <Box width={8}>
                                <Text
                                    color={
                                        repo.visibility === "public"
                                            ? "green"
                                            : "yellow"
                                    }
                                >
                                    {repo.visibility}
                                </Text>
                            </Box>
                            <Box width={8}>
                                <Text color="gray">★ {repo.stars}</Text>
                            </Box>
                            <Box>
                                <Text color="blue">{repo.language}</Text>
                            </Box>
                        </Box>
                    ))}
                </Box>

                <Box marginTop={2}>
                    <Text bold color="white">
                        Pull Requests
                    </Text>
                    <Box flexDirection="column" marginTop={1}>
                        {(
                            (data.pullRequests as Array<{
                                number: number;
                                title: string;
                                state: string;
                                author: string;
                            }>) || []
                        ).map((pr) => (
                            <Box key={pr.number} marginBottom={1}>
                                <Box width={8}>
                                    <Text color="gray">#{pr.number}</Text>
                                </Box>
                                <Box width={25}>
                                    <Text color="white">{pr.title}</Text>
                                </Box>
                                <Box width={8}>
                                    <Text
                                        color={
                                            pr.state === "open"
                                                ? "green"
                                                : "gray"
                                        }
                                    >
                                        {pr.state}
                                    </Text>
                                </Box>
                                <Box>
                                    <Text color="gray">@{pr.author}</Text>
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
                    <Text color="cyan">• View repository details</Text>
                    <Text color="cyan">• List workflow runs</Text>
                    <Text color="cyan">• Create pull request</Text>
                    <Text color="cyan">• Trigger workflow</Text>
                    <Text color="cyan">• Open in browser</Text>
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
        const workflows =
            (data.workflows as Array<{
                name: string;
                status: string;
                lastRun: string;
            }>) || [];

        return (
            <Box flexDirection="column">
                <Text bold color="white">
                    Workflow Status
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    {workflows.map((workflow) => (
                        <Box key={workflow.name} marginBottom={1}>
                            <Box width={15}>
                                <Text color="magenta">{workflow.name}</Text>
                            </Box>
                            <Box width={10}>
                                <Text
                                    color={
                                        workflow.status === "success"
                                            ? "green"
                                            : "red"
                                    }
                                >
                                    {workflow.status}
                                </Text>
                            </Box>
                            <Box>
                                <Text color="gray">
                                    {new Date(
                                        workflow.lastRun
                                    ).toLocaleString()}
                                </Text>
                            </Box>
                        </Box>
                    ))}
                </Box>
                <Box marginTop={1}>
                    <Text color="gray">
                        Detailed workflow logs coming soon...
                    </Text>
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
                    Repository Metrics
                </Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text color="cyan">• Total Commits: 245</Text>
                    <Text color="cyan">• Active PRs: 3</Text>
                    <Text color="cyan">• Issues: 8 open, 42 closed</Text>
                    <Text color="green">• Test Coverage: 87%</Text>
                    <Text color="yellow">• Build Success Rate: 94%</Text>
                    <Box marginTop={1}>
                        <Text color="gray">Activity charts coming soon...</Text>
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
