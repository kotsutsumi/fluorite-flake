import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Box, Text, useInput } from "ink";
import { execa, type Options as ExecaOptions } from "execa";
import openBrowser from "open";

import { getMessages } from "../../../i18n.js";
import { useDashboard } from "../state/dashboard-store.js";
import { AccessSection } from "./vercel/access.js";
import { BuildSection } from "./vercel/build.js";
import { DeploySection } from "./vercel/deploy.js";
import { DomainSection } from "./vercel/domain.js";
import { DnsSection } from "./vercel/dns.js";
import { EnvironmentSection } from "./vercel/environment.js";
import { MiscSection } from "./vercel/misc.js";
import { ProjectSection } from "./vercel/project.js";
import { SecretsSection } from "./vercel/secrets.js";
import { TeamSection } from "./vercel/team.js";
import { UserSection } from "./vercel/user.js";
import type { VercelSectionComponent } from "./vercel/types.js";

type ServiceProps = {
    instructions: readonly string[];
    placeholder: string;
    defaultFooterLabel: string;
    onFooterChange: (label: string) => void;
};

type MenuItem = {
    id: string;
    label: string;
    Component: VercelSectionComponent;
};

type InitState = "pending" | "needs-token" | "input" | "ready" | "error";
type ActionId = "open-token" | "enter-token";

type ActionItem = {
    id: ActionId;
    label: string;
};

type BrowserCommand = {
    command: string;
    args: string[];
    options?: ExecaOptions;
};

const TOKEN_URL = "https://vercel.com/account/settings/tokens";
const INPUT_CARET = "▋";

const MENU_ITEMS: readonly MenuItem[] = [
    { id: "project", label: "プロジェクト管理", Component: ProjectSection },
    { id: "domain", label: "ドメイン", Component: DomainSection },
    { id: "dns", label: "DNS管理", Component: DnsSection },
    { id: "deploy", label: "デプロイ", Component: DeploySection },
    { id: "build", label: "ビルド管理", Component: BuildSection },
    { id: "environment", label: "環境変数", Component: EnvironmentSection },
    { id: "secrets", label: "シークレット管理", Component: SecretsSection },
    { id: "team", label: "チーム", Component: TeamSection },
    { id: "user", label: "ユーザー", Component: UserSection },
    { id: "access", label: "アクセス管理", Component: AccessSection },
    { id: "misc", label: "その他", Component: MiscSection },
];

export function VercelService({ instructions, placeholder, defaultFooterLabel, onFooterChange }: ServiceProps): JSX.Element {
    const { dashboard } = useMemo(() => getMessages(), []);
    const vercelMessages = dashboard.vercel;
    const { appendLog, setInputMode } = useDashboard();

    const [activeIndex, setActiveIndex] = useState(0);
    const [initState, setInitState] = useState<InitState>("pending");
    const [statusMessage, setStatusMessage] = useState(vercelMessages.initializing);
    const [detailMessage, setDetailMessage] = useState<string | undefined>(undefined);
    const [vercelCredentials, setVercelCredentials] = useState<{ token?: string }>({});
    const [tokenDraft, setTokenDraft] = useState("");
    const [inputError, setInputError] = useState<string | undefined>(undefined);
    const [selectedActionIndex, setSelectedActionIndex] = useState(0);
    const [isLaunchingBrowser, setIsLaunchingBrowser] = useState(false);

    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            setInputMode(false);
        };
    }, [setInputMode]);

    useEffect(() => {
        if (initState !== "pending") {
            return;
        }

        if (vercelCredentials.token) {
            setStatusMessage(vercelMessages.ready);
            setDetailMessage(undefined);
            setInitState("ready");
            return;
        }

        setStatusMessage(vercelMessages.needsToken);
        setInitState("needs-token");
    }, [initState, vercelCredentials.token, vercelMessages.needsToken, vercelMessages.ready]);

    useEffect(() => {
        if (initState === "needs-token" || initState === "error") {
            setSelectedActionIndex(0);
        }
    }, [initState]);

    useEffect(() => {
        setInputMode(initState === "input");
    }, [initState, setInputMode]);

    const actionItems = useMemo<readonly ActionItem[]>(
        () => [
            { id: "open-token", label: vercelMessages.openTokenPage },
            { id: "enter-token", label: vercelMessages.enterToken },
        ],
        [vercelMessages.enterToken, vercelMessages.openTokenPage],
    );

    const navigationFooter = useMemo(() => `${defaultFooterLabel}  j:↓  k:↑`, [defaultFooterLabel]);
    const activeItem = MENU_ITEMS[activeIndex];

    const inputDisplay = useMemo(() => {
        if (!tokenDraft) {
            return `${vercelMessages.inputPromptEmpty} ${INPUT_CARET}`;
        }
        return `${vercelMessages.inputPromptValue(tokenDraft)} ${INPUT_CARET}`;
    }, [tokenDraft, vercelMessages]);

    const launchBrowser = useCallback(async () => {
        if (isLaunchingBrowser) {
            return;
        }

        setIsLaunchingBrowser(true);
        setDetailMessage(undefined);
        setStatusMessage(vercelMessages.browserOpening);
        setInitState((current) => (current === "error" ? "needs-token" : current));
        appendLog({ level: "info", message: vercelMessages.logBrowserOpenStart });

        const fallbackCommands: BrowserCommand[] =
            process.platform === "win32"
                ? [
                      {
                          command: "cmd",
                          args: ["/c", "start", "", TOKEN_URL],
                          options: { windowsVerbatimArguments: false, shell: false },
                      },
                      {
                          command: "powershell",
                          args: ["-Command", "Start-Process", TOKEN_URL],
                      },
                  ]
                : [
                      { command: "xdg-open", args: [TOKEN_URL] },
                      { command: "open", args: [TOKEN_URL] },
                  ];

        let succeeded = false;
        let failure: unknown;

        try {
            try {
                await openBrowser(TOKEN_URL, { wait: false });
                succeeded = true;
            } catch (error) {
                failure = error;
                for (const entry of fallbackCommands) {
                    try {
                        await execa(entry.command, entry.args, {
                            stdio: "ignore",
                            detached: false,
                            ...entry.options,
                        });
                        succeeded = true;
                        failure = undefined;
                        break;
                    } catch (fallbackError) {
                        failure = fallbackError;
                    }
                }
            }

            if (!isMountedRef.current) {
                return;
            }

            if (!succeeded) {
                const errorMessage = failure instanceof Error ? failure.message : String(failure ?? "unknown error");
                setDetailMessage(errorMessage);
                setStatusMessage(vercelMessages.browserOpenFailed(errorMessage));
                setInitState("error");
                appendLog({ level: "error", message: vercelMessages.logBrowserOpenFailed(errorMessage) });
                return;
            }

            setStatusMessage(vercelMessages.needsToken);
            setInitState("needs-token");
        } finally {
            if (isMountedRef.current) {
                setIsLaunchingBrowser(false);
            }
        }
    }, [appendLog, isLaunchingBrowser, vercelMessages]);

    const submitToken = useCallback(() => {
        const trimmed = tokenDraft.trim();

        if (!trimmed) {
            setInputError(vercelMessages.tokenMissingError);
            return;
        }

        if (/\s/.test(trimmed)) {
            setInputError(vercelMessages.tokenValidationError);
            return;
        }

        setVercelCredentials({ token: trimmed });
        setTokenDraft("");
        setInputError(undefined);
        setDetailMessage(undefined);
        setStatusMessage(vercelMessages.ready);
        setInitState("ready");
        setInputMode(false);
        appendLog({ level: "success", message: vercelMessages.logTokenSaved });
    }, [appendLog, setInputMode, tokenDraft, vercelMessages]);

    const cancelTokenInput = useCallback(() => {
        setTokenDraft("");
        setInputError(undefined);
        setDetailMessage(undefined);
        setStatusMessage(vercelMessages.needsToken);
        setInitState("needs-token");
        appendLog({ level: "info", message: vercelMessages.logTokenInputCancelled });
    }, [appendLog, vercelMessages.logTokenInputCancelled, vercelMessages.needsToken]);

    const handleAction = useCallback(
        (actionId: ActionId) => {
            if (actionId === "open-token") {
                void launchBrowser();
                return;
            }

            if (actionId === "enter-token") {
                setStatusMessage(vercelMessages.inputPromptEmpty);
                setDetailMessage(undefined);
                setTokenDraft("");
                setInputError(undefined);
                setInitState("input");
            }
        },
        [launchBrowser, vercelMessages.inputPromptEmpty],
    );

    useInput((input, key) => {
        if (isLaunchingBrowser) {
            return;
        }

        if (initState === "needs-token" || initState === "error") {
            if (input?.toLowerCase() === "j" || key.downArrow) {
                setSelectedActionIndex((current) => (current + 1) % actionItems.length);
                return;
            }

            if (input?.toLowerCase() === "k" || key.upArrow) {
                setSelectedActionIndex((current) => (current - 1 + actionItems.length) % actionItems.length);
                return;
            }

            if (key.return) {
                const selected = actionItems[selectedActionIndex];
                if (selected) {
                    handleAction(selected.id);
                }
                return;
            }

            if (key.escape && initState === "error") {
                setStatusMessage(vercelMessages.needsToken);
                setDetailMessage(undefined);
                setInitState("needs-token");
            }

            return;
        }

        if (initState === "input") {
            if (key.escape) {
                cancelTokenInput();
                return;
            }

            if (key.return) {
                submitToken();
                return;
            }

            if (key.backspace || key.delete) {
                setTokenDraft((current) => current.slice(0, -1));
                setInputError(undefined);
                return;
            }

            if (input) {
                setTokenDraft((current) => current + input);
                setInputError(undefined);
            }

            return;
        }

        if (initState !== "ready" || MENU_ITEMS.length === 0) {
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

    useEffect(() => {
        if (initState === "ready") {
            onFooterChange(`${navigationFooter}  • ${vercelMessages.footerReady}  • ${activeItem.label}`);
            return;
        }

        let footerSuffix = vercelMessages.footerInitializing;

        if (initState === "needs-token") {
            footerSuffix = isLaunchingBrowser ? vercelMessages.browserOpening : vercelMessages.footerNeedsToken;
        } else if (initState === "input") {
            footerSuffix = vercelMessages.footerInput;
        } else if (initState === "error") {
            footerSuffix = vercelMessages.footerError;
        }

        onFooterChange(`${defaultFooterLabel}  • ${footerSuffix}`);
    }, [
        activeItem.label,
        defaultFooterLabel,
        initState,
        isLaunchingBrowser,
        navigationFooter,
        onFooterChange,
        vercelMessages,
    ]);

    const ActiveSection = activeItem.Component;

    if (initState !== "ready") {
        const borderColor =
            initState === "error"
                ? "red"
                : initState === "needs-token"
                    ? "yellow"
                    : initState === "input"
                        ? "magenta"
                        : "cyan";
        const highlightColor =
            initState === "error"
                ? "redBright"
                : initState === "needs-token"
                    ? "yellowBright"
                    : initState === "input"
                        ? "magentaBright"
                        : "cyanBright";

        return (
            <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0} justifyContent="center" alignItems="center">
                <Box borderStyle="round" borderColor={borderColor} flexDirection="column" paddingX={3} paddingY={2} minWidth={36}>
                    <Text color={highlightColor}>Vercel</Text>
                    <Box marginTop={1} flexDirection="column" minHeight={2}>
                        {initState === "input" ? (
                            <>
                                <Text color={highlightColor}>{inputDisplay}</Text>
                                <Text dimColor>{vercelMessages.inputHint}</Text>
                                {inputError ? <Text color="redBright">{inputError}</Text> : null}
                            </>
                        ) : (
                            <>
                                <Text color={highlightColor}>{statusMessage}</Text>
                                {detailMessage ? (
                                    <Text color={initState === "error" ? "redBright" : "white"}>{detailMessage}</Text>
                                ) : null}
                            </>
                        )}

                        {initState === "needs-token" || initState === "error" ? (
                            <Box marginTop={1} flexDirection="column">
                                {actionItems.map((item, index) => {
                                    const isActive = index === selectedActionIndex;
                                    return (
                                        <Text key={item.id} color={isActive ? highlightColor : undefined}>
                                            {isActive ? "▸ " : "  "}
                                            {item.label}
                                        </Text>
                                    );
                                })}
                            </Box>
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
                    <ActiveSection sectionLabel={activeItem.label} placeholder={placeholder} credentials={vercelCredentials} />
                </Box>
            </Box>
        </Box>
    );
}
