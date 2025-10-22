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

const VISIBLE_LINES = 18;

const LEVEL_COLORS: Record<string, string | undefined> = {
    success: "greenBright",
    error: "redBright",
    warn: "yellowBright",
    info: undefined,
};

export function LogsService({ instructions, placeholder, defaultFooterLabel, onFooterChange }: ServiceProps): JSX.Element {
    const { logs, clearLogs } = useDashboard();
    const [offset, setOffset] = useState(0);

    const adjustOffset = useCallback(
        (delta: number) => {
            setOffset((current) => {
                const maxOffset = Math.max(0, logs.length - VISIBLE_LINES);
                const next = Math.min(Math.max(current + delta, 0), maxOffset);
                return next;
            });
        },
        [logs.length],
    );

    useEffect(() => {
        const maxOffset = Math.max(0, logs.length - VISIBLE_LINES);
        if (offset > maxOffset) {
            setOffset(maxOffset);
        }
    }, [logs.length, offset]);

    useEffect(() => {
        onFooterChange(defaultFooterLabel);
    }, [defaultFooterLabel, onFooterChange]);

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
        [],
    );

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
                {instructions.map((line) => (
                    <Text key={line} dimColor>
                        {line}
                    </Text>
                ))}
            </Box>

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

