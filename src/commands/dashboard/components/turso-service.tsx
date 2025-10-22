import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Box, Text, useInput } from "ink";

import { getMessages } from "../../../i18n.js";
import { initializeTursoCloud } from "../../create/database-provisioning/index.js";
import { useDashboard } from "../state/dashboard-store.js";
import type { TursoLogEntry } from "../../create/database-provisioning/index.js";
import { DatabaseSection } from "./turso/database.js";
import { GroupSection } from "./turso/group.js";
import { InviteSection } from "./turso/invite.js";
import { LocationSection } from "./turso/location.js";
import { LogSection } from "./turso/log.js";
import { MemberSection } from "./turso/member.js";
import { OrganizationSection } from "./turso/organization.js";
import type { TursoSectionComponent } from "./turso/types.js";

type ServiceProps = {
    instructions: readonly string[];
    placeholder: string;
    defaultFooterLabel: string;
    onFooterChange: (label: string) => void;
};

type MenuItem = {
    id: string;
    label: string;
    Component: TursoSectionComponent;
};

type InitState = "pending" | "ready" | "blocked" | "error";

const MENU_ITEMS: readonly MenuItem[] = [
    { id: "database", label: "データベース", Component: DatabaseSection },
    { id: "group", label: "グループ", Component: GroupSection },
    { id: "location", label: "ロケーション", Component: LocationSection },
    { id: "organization", label: "組織", Component: OrganizationSection },
    { id: "member", label: "メンバー", Component: MemberSection },
    { id: "invite", label: "招待", Component: InviteSection },
    { id: "log", label: "ログ", Component: LogSection }
];

export function TursoService({ instructions, placeholder, defaultFooterLabel, onFooterChange }: ServiceProps): JSX.Element {
    const turso = useMemo(() => getMessages().create.turso, []);
    const { appendLog } = useDashboard();
    const [activeIndex, setActiveIndex] = useState(0);
    const [initState, setInitState] = useState<InitState>("pending");
    const [initLogs, setInitLogs] = useState<string[]>([]);
    const [initErrorDetail, setInitErrorDetail] = useState<string | undefined>(undefined);

    const initInFlightRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const navigationFooter = useMemo(() => `${defaultFooterLabel}  j:↓  k:↑`, [defaultFooterLabel]);
    const activeItem = MENU_ITEMS[activeIndex];

    const handleLog = useCallback(
        (entry: TursoLogEntry) => {
            if (!isMountedRef.current) {
                return;
            }
            setInitLogs((prev) => [...prev, entry.message]);
            appendLog({ level: entry.level, message: entry.message });
        },
        [appendLog]
    );

    const runInitialization = useCallback(async () => {
        if (initInFlightRef.current || !isMountedRef.current) {
            return;
        }

        initInFlightRef.current = true;
        setInitErrorDetail(undefined);
        setInitState("pending");
        setInitLogs([]);

        try {
            const result = await initializeTursoCloud({
                onLog: handleLog,
                suppressPrompts: true,
                suppressStdout: true,
            });

            if (!isMountedRef.current) {
                return;
            }

            if (result.status === "login-required") {
                setInitState("blocked");
                return;
            }

            if (result.status === "reused") {
                setInitState("ready");
                return;
            }

            setInitState("ready");
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            const detail = error instanceof Error ? error.message : String(error);
            setInitErrorDetail(detail);
            setInitState("error");
            appendLog({ level: "error", message: detail ?? turso.initializationFailed });
        } finally {
            initInFlightRef.current = false;
        }
    }, [appendLog, handleLog, turso.initializationFailed]);

    useEffect(() => {
        void runInitialization();
    }, [runInitialization]);

    useInput((input, key) => {
        if (initState !== "ready") {
            if (input?.toLowerCase() === "r") {
                void runInitialization();
            }
            return;
        }

        if (MENU_ITEMS.length === 0) {
            return;
        }

        if (input?.toLowerCase() === "j" || key.downArrow) {
            setActiveIndex((current) => (current + 1) % MENU_ITEMS.length);
            return;
        }

        if (input?.toLowerCase() === "k" || key.upArrow) {
            setActiveIndex((current) => (current - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
        }
    });

    const lastLog = initLogs[initLogs.length - 1] ?? turso.initializing;

    const [displayLine, setDisplayLine] = useState(lastLog);

    useEffect(() => {
        setDisplayLine(lastLog);
    }, [lastLog]);

    useEffect(() => {
        if (initState === "ready") {
            onFooterChange(`${navigationFooter}  • ${activeItem.label}`);
            return;
        }

        onFooterChange(`${defaultFooterLabel}  • ${displayLine}`);
    }, [activeItem.label, defaultFooterLabel, displayLine, initState, navigationFooter, onFooterChange]);

    const ActiveSection = activeItem.Component;

    if (initState !== "ready") {
        const borderColor = initState === "error" ? "red" : initState === "blocked" ? "yellow" : "cyan";
        const titleColor = initState === "error" ? "redBright" : initState === "blocked" ? "yellowBright" : "cyanBright";

        return (
            <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0} justifyContent="center" alignItems="center">
                <Box borderStyle="round" borderColor={borderColor} flexDirection="column" paddingX={3} paddingY={2} minWidth={36}>
                    <Text color={titleColor}>Turso Cloud</Text>
                    <Box marginTop={1} flexDirection="column" minHeight={1}>
                        <Text>{displayLine}</Text>
                        {initState === "error" && initErrorDetail ? (
                            <Text color="red">{initErrorDetail}</Text>
                        ) : null}
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            <Box marginBottom={1} flexDirection="column">
                {instructions.map((line) => (
                    <Text key={line} dimColor>
                        {line}
                    </Text>
                ))}
            </Box>

            <Box flexDirection="row" flexGrow={1}>
                <Box
                    width={24}
                    borderStyle="classic"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                    paddingY={1}
                >
                    {MENU_ITEMS.map((item, index) => {
                        const isActive = index === activeIndex;
                        return (
                            <Text key={item.id} color={isActive ? "cyanBright" : undefined}>
                                {isActive ? "▸ " : "  "}
                                {item.label}
                            </Text>
                        );
                    })}
                </Box>

                <Box
                    marginLeft={1}
                    borderStyle="classic"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                    paddingY={1}
                    flexGrow={1}
                >
                    <ActiveSection sectionLabel={activeItem.label} placeholder={placeholder} />
                </Box>
            </Box>
        </Box>
    );
}
