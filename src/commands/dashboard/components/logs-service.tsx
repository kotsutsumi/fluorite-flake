import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Box, Text, useInput } from "ink";

import { useDashboard } from "../state/dashboard-store.js";

type ServiceProps = {
    instructions: readonly string[];
    placeholder: string;
    defaultFooterLabel: string;
    onFooterChange: (label: string) => void;
};

// ログウィンドウに同時表示する行数を制限してスクロールを実現する。
const VISIBLE_LINES = 18;

// ログレベルごとの配色を定義し、視認性を高める。
const LEVEL_COLORS: Record<string, string | undefined> = {
    success: "greenBright",
    error: "redBright",
    warn: "yellowBright",
    info: undefined,
};

export function LogsService({
    instructions,
    placeholder,
    defaultFooterLabel,
    onFooterChange,
}: ServiceProps): JSX.Element {
    // ダッシュボード全体のログを閲覧・スクロールするためのサービスビュー。
    const { logs, clearLogs } = useDashboard();
    const [offset, setOffset] = useState(0);

    // j/k キー操作に応じて表示開始位置を更新する。
    const adjustOffset = useCallback(
        (delta: number) => {
            setOffset((current) => {
                const maxOffset = Math.max(0, logs.length - VISIBLE_LINES);
                const next = Math.min(Math.max(current + delta, 0), maxOffset);
                return next;
            });
        },
        [logs.length]
    );

    useEffect(() => {
        const maxOffset = Math.max(0, logs.length - VISIBLE_LINES);
        if (offset > maxOffset) {
            setOffset(maxOffset);
        }
    }, [logs.length, offset]);

    useEffect(() => {
        // ログタブが選択された際は初期ショートカット表示を同期する。
        onFooterChange(defaultFooterLabel);
    }, [defaultFooterLabel, onFooterChange]);

    // キーボード入力からスクロールやクリア操作を受け付ける。
    useInput((input, key) => {
        if (!input && !key.upArrow && !key.downArrow) {
            return;
        }

        const normalized = input?.toLowerCase();

        if (normalized === "c") {
            clearLogs();
            setOffset(0);
            return;
        }

        if (normalized === "g") {
            setOffset(0);
            return;
        }

        if (normalized === "k" || key.upArrow) {
            adjustOffset(1);
            return;
        }

        if (normalized === "j" || key.downArrow) {
            adjustOffset(-1);
        }
    });

    const timeFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
        []
    );

    // 最新のオフセットに基づいて表示対象のログのみを切り出す。
    const visibleLogs = useMemo(() => {
        if (logs.length === 0) {
            return [];
        }

        const maxOffset = Math.max(0, logs.length - VISIBLE_LINES);
        const clampedOffset = Math.min(offset, maxOffset);
        const endIndex = logs.length - clampedOffset;
        const startIndex = Math.max(0, endIndex - VISIBLE_LINES);
        return logs.slice(startIndex, endIndex);
    }, [logs, offset]);

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            <Box marginBottom={1} flexDirection="column">
                {/* 操作ガイドを冒頭に表示して、キー操作をすぐ確認できるようにする。 */}
                {instructions.map((line) => (
                    <Text key={line} dimColor>
                        {line}
                    </Text>
                ))}
            </Box>

            {/* ログの有無に応じて、空表示かログ一覧を切り替える。 */}
            {visibleLogs.length === 0 ? (
                <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center">
                    <Text dimColor>{placeholder}</Text>
                </Box>
            ) : (
                <Box
                    borderStyle="classic"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                    paddingY={1}
                    flexGrow={1}
                >
                    {visibleLogs.map((entry) => {
                        const formattedTime = timeFormatter.format(entry.timestamp);
                        const color = LEVEL_COLORS[entry.level] ?? undefined;
                        return (
                            <Text key={entry.id} color={color} wrap="truncate-end">
                                [{formattedTime}] {entry.message}
                            </Text>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
}

// ファイル終端
