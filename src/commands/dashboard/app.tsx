import { useEffect, useMemo, useState } from "react";
import type { JSX, PropsWithChildren } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";

import { getMessages } from "../../i18n.js";
import { useDashboard } from "./state/dashboard-store.js";
import type { ServiceType } from "./types/common.js";

function useDashboardShortcuts(): void {
    const { exit } = useApp();
    const { cycleService } = useDashboard();

    useInput((input, key) => {
        if (!input) {
            return;
        }

        const normalized = input.toLowerCase();

        if (normalized === "s") {
            cycleService();
        }

        if (normalized === "q" || key.escape) {
            exit();
        }
    });
}

type TerminalSize = {
    columns: number | undefined;
    rows: number | undefined;
};

function useTerminalSize(): TerminalSize {
    const { stdout } = useStdout();
    const [size, setSize] = useState<TerminalSize>({
        columns: stdout?.columns,
        rows: stdout?.rows,
    });

    useEffect(() => {
        if (!stdout) {
            return;
        }

        const updateSize = () => {
            setSize({
                columns: stdout.columns,
                rows: stdout.rows,
            });
        };

        stdout.on("resize", updateSize);
        updateSize();

        return () => {
            stdout.off("resize", updateSize);
        };
    }, [stdout]);

    return size;
}

function FullscreenContainer({ children }: PropsWithChildren): JSX.Element {
    const { stdout } = useStdout();
    const size = useTerminalSize();

    useEffect(() => {
        if (!stdout) {
            return;
        }

        stdout.write("\u001b[2J\u001b[3J\u001b[H");
    }, [stdout]);

    return (
        <Box flexDirection="column" width={size.columns ?? undefined} height={size.rows ?? undefined} flexGrow={1}>
            {children}
        </Box>
    );
}

function getServiceLabel(service: ServiceType, labels: Record<ServiceType, string>): string {
    return labels[service];
}

function getPlaceholder(service: ServiceType, placeholders: Record<ServiceType, string>): string {
    return placeholders[service];
}

export function DashboardApp(): JSX.Element {
    const { activeService } = useDashboard();
    const { dashboard } = getMessages();

    useDashboardShortcuts();

    const serviceLabel = useMemo(
        () => getServiceLabel(activeService, dashboard.services),
        [activeService, dashboard.services]
    );

    const placeholder = useMemo(
        () => getPlaceholder(activeService, dashboard.placeholders),
        [activeService, dashboard.placeholders]
    );

    return (
        <FullscreenContainer>
            <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
                <Box
                    borderStyle="round"
                    borderColor="cyan"
                    flexDirection="column"
                    paddingX={2}
                    paddingY={1}
                    flexGrow={1}
                >
                    <Box justifyContent="space-between">
                        <Text color="cyanBright">{dashboard.headerTitle}</Text>
                        <Text>
                            {dashboard.activeServiceLabel}: <Text color="green">{serviceLabel}</Text>
                        </Text>
                    </Box>

                    <Box marginTop={1} flexDirection="column">
                        {dashboard.instructions.map((line) => (
                            <Text key={line} dimColor>
                                {line}
                            </Text>
                        ))}
                    </Box>

                    <Box
                        marginTop={1}
                        borderStyle="classic"
                        borderColor="gray"
                        flexDirection="column"
                        paddingX={1}
                        paddingY={1}
                        flexGrow={1}
                    >
                        <Text>{placeholder}</Text>
                    </Box>
                </Box>
            </Box>
        </FullscreenContainer>
    );
}

// EOF
