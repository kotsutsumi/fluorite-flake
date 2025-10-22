import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Box, Text, useInput } from "ink";

import { getMessages } from "../../../i18n.js";
import { initializeTursoCloud } from "../../create/database-provisioning/index.js";
import type { TursoLogEntry } from "../../create/database-provisioning/index.js";
import { useDashboard } from "../state/dashboard-store.js";
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

// Turso 関連のセクションをメニューとして定義し、カーソル移動で切り替える。
const MENU_ITEMS: readonly MenuItem[] = [
    { id: "database", label: "データベース", Component: DatabaseSection },
    { id: "group", label: "グループ", Component: GroupSection },
    { id: "location", label: "ロケーション", Component: LocationSection },
    { id: "organization", label: "組織", Component: OrganizationSection },
    { id: "member", label: "メンバー", Component: MemberSection },
    { id: "invite", label: "招待", Component: InviteSection },
    { id: "log", label: "ログ", Component: LogSection },
];

// Turso 連携の状態確認や初期化を担うダッシュボードセクション。
export function TursoService({
    instructions,
    placeholder,
    defaultFooterLabel,
    onFooterChange,
}: ServiceProps): JSX.Element {
    const turso = useMemo(() => getMessages().create.turso, []);
    const { appendLog } = useDashboard();
    const [activeIndex, setActiveIndex] = useState(0);
    const [initState, setInitState] = useState<InitState>("pending");
    const [initLogs, setInitLogs] = useState<string[]>([]);
    const [initErrorDetail, setInitErrorDetail] = useState<string | undefined>(undefined);

    const initInFlightRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        // コンポーネントのアンマウントを検知して非同期処理での状態更新を抑制する。
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // フッターメッセージにナビゲーション用のキー操作表示を追加する。
    const navigationFooter = useMemo(() => `${defaultFooterLabel}  j:↓  k:↑`, [defaultFooterLabel]);
    const activeItem = MENU_ITEMS[activeIndex];

    // Turso 初期化中に出力されるログをダッシュボード全体にも転記する。
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

    // Turso Cloud を自動初期化し、状態に応じて進捗メッセージを更新する。
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

    // 初期化の有無に応じてキー入力の挙動を切り替える。
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
        // 初期化未完了時は進捗メッセージをフッターに表示し、完了後はメニュー情報を載せる。
        if (initState === "ready") {
            onFooterChange(`${navigationFooter}  • ${activeItem.label}`);
            return;
        }

        onFooterChange(`${defaultFooterLabel}  • ${displayLine}`);
    }, [activeItem.label, defaultFooterLabel, displayLine, initState, navigationFooter, onFooterChange]);

    // 現在選択されているメニューに応じた描画コンポーネントを取り出す。
    const ActiveSection = activeItem.Component;

    if (initState !== "ready") {
        const borderColor = initState === "error" ? "red" : initState === "blocked" ? "yellow" : "cyan";
        const titleColor =
            initState === "error" ? "redBright" : initState === "blocked" ? "yellowBright" : "blueBright";

        return (
            <Box
                flexDirection="column"
                flexGrow={1}
                paddingX={0}
                paddingY={0}
                justifyContent="center"
                alignItems="center"
            >
                <Box
                    borderStyle="round"
                    borderColor={borderColor}
                    flexDirection="column"
                    paddingX={3}
                    paddingY={2}
                    minWidth={36}
                >
                    <Text color={titleColor}>Turso Cloud</Text>
                    <Box marginTop={1} flexDirection="column" minHeight={1}>
                        <Text>{displayLine}</Text>
                        {initState === "error" && initErrorDetail ? <Text color="red">{initErrorDetail}</Text> : null}
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            <Box flexDirection="row" flexGrow={1}>
                {/* 左側はメニュー一覧。アクティブ項目を色付きで示す。 */}
                <Box width={24} borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1}>
                    {MENU_ITEMS.map((item, index) => {
                        const isActive = index === activeIndex;
                        return (
                            <Text key={item.id} color={isActive ? "blueBright" : undefined}>
                                {isActive ? "▸ " : "  "}
                                {item.label}
                            </Text>
                        );
                    })}
                </Box>

                {/* 右側のパネルに選択中のセクションを動的に描画する。 */}
                <Box
                    marginLeft={1}
                    borderStyle="single"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                    flexGrow={1}
                >
                    <ActiveSection sectionLabel={activeItem.label} placeholder={placeholder} />
                </Box>
            </Box>
        </Box>
    );
}

// ファイル終端
