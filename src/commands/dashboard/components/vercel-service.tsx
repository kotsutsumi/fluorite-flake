import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { execa, type Options as ExecaOptions } from "execa";
import fsExtra from "fs-extra";
import { Box, Text, useInput } from "ink";
import os from "node:os";
import path from "node:path";
import openBrowser from "open";
import { Vercel } from "@vercel/sdk";

import { getMessages } from "../../../i18n.js";
import { useDashboard } from "../state/dashboard-store.js";
import { AccessSection } from "./vercel/access.js";
import { BuildSection } from "./vercel/build.js";
import { DeploySection } from "./vercel/deploy.js";
import { DnsSection } from "./vercel/dns.js";
import { DomainSection } from "./vercel/domain.js";
import { EnvironmentSection } from "./vercel/environment.js";
import { MiscSection } from "./vercel/misc.js";
import { ProjectSection } from "./vercel/project.js";
import { SecretsSection } from "./vercel/secrets.js";
import { TeamSection } from "./vercel/team.js";
import type { VercelSectionComponent } from "./vercel/types.js";
import { UserSection } from "./vercel/user.js";

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

const CONFIG_DIRECTORY_NAME = ".fluorite";
const CONFIG_FILE_NAME = "flake.json";
const TOKEN_URL = "https://vercel.com/account/settings/tokens";
const INPUT_CARET = "▋";

// Vercel 管理で扱う各セクションをメニューとして定義する。
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

type FluoriteConfig = {
    [key: string]: unknown;
    vercel?: {
        [key: string]: unknown;
        access_key?: string;
    };
};

type ConfigLoadResult = {
    path: string;
    data: FluoriteConfig;
};

type TokenVerificationResult =
    | {
          valid: true;
      }
    | {
          valid: false;
          statusCode?: number;
          errorMessage: string;
      };

// 取得した値がプレーンオブジェクトかどうかを判定する小さな型ガード。
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

// ユーザーのホームディレクトリ配下から Fluorite の設定ファイルを読み出す。
async function loadConfig(): Promise<ConfigLoadResult> {
    const configDir = path.join(os.homedir(), CONFIG_DIRECTORY_NAME);
    await fsExtra.ensureDir(configDir);

    const configPath = path.join(configDir, CONFIG_FILE_NAME);

    if (!(await fsExtra.pathExists(configPath))) {
        await writeJsonAtomic(configPath, {});
        return {
            path: configPath,
            data: {},
        };
    }

    const raw = await fsExtra.readJson(configPath);
    const data = isRecord(raw) ? (raw as FluoriteConfig) : {};

    return {
        path: configPath,
        data,
    };
}

// 一時ファイルを利用して JSON を安全に保存し、書き込み途中の破損を防ぐ。
async function writeJsonAtomic(filePath: string, payload: unknown): Promise<void> {
    const serialized = `${JSON.stringify(payload, null, 4)}\n`;
    const tempPath = `${filePath}.tmp`;

    await fsExtra.writeFile(tempPath, serialized, "utf8");
    await fsExtra.move(tempPath, filePath, { overwrite: true });
}

// 検証済みのアクセストークンを設定ファイルに書き戻すか、無効化する。
async function persistVercelAccessKey(token: string | undefined): Promise<void> {
    const { path: configPath, data } = await loadConfig();

    const nextData: FluoriteConfig = {
        ...data,
    };
    const existingVercel = isRecord(nextData.vercel) ? { ...nextData.vercel } : {};

    if (token) {
        existingVercel.access_key = token;
        nextData.vercel = existingVercel;
    } else if (isRecord(nextData.vercel)) {
        delete existingVercel.access_key;
        if (Object.keys(existingVercel).length === 0) {
            delete nextData.vercel;
        } else {
            nextData.vercel = existingVercel;
        }
    } else {
        delete nextData.vercel;
    }

    await writeJsonAtomic(configPath, nextData);
}

// 保存済みトークンを読み込み、利用可能な文字列のみ返す。
async function loadStoredVercelAccessKey(): Promise<string | undefined> {
    const { data } = await loadConfig();
    const vercelSection = isRecord(data.vercel) ? data.vercel : undefined;
    const candidate = vercelSection?.access_key;
    return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : undefined;
}

// 例外オブジェクトからユーザーに提示できるメッセージを抽出する。
function extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    return "unknown error";
}

// SDK 経由でアクセストークンの妥当性を検証し、HTTP ステータスも拾う。
async function verifyVercelToken(token: string): Promise<TokenVerificationResult> {
    try {
        const client = new Vercel({ bearerToken: token });
        await client.user.getAuthUser();
        return { valid: true };
    } catch (error) {
        const errorMessage = extractErrorMessage(error);
        const statusCandidate = (error as { statusCode?: number }).statusCode;
        const statusCode = typeof statusCandidate === "number" ? statusCandidate : undefined;
        return {
            valid: false,
            statusCode,
            errorMessage,
        };
    }
}

// Vercel 連携を行うダッシュボード画面の本体。トークン検証やメニュー切替を担う。
export function VercelService({
    instructions,
    placeholder,
    defaultFooterLabel,
    onFooterChange,
}: ServiceProps): JSX.Element {
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
    const hasAttemptedInitRef = useRef(false);

    // アンマウント時に入力モードを解除し、非同期処理の後続更新を防ぐ。
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            setInputMode(false);
        };
    }, [setInputMode]);

    useEffect(() => {
        if (initState !== "pending" || hasAttemptedInitRef.current) {
            return;
        }

        hasAttemptedInitRef.current = true;

        // 保存されているトークンを検証し、状態とログを適切に更新する初期化処理。
        const initialize = async (): Promise<void> => {
            try {
                const storedToken = await loadStoredVercelAccessKey();

                if (!isMountedRef.current) {
                    return;
                }

                if (!storedToken) {
                    setStatusMessage(vercelMessages.needsToken);
                    setDetailMessage(undefined);
                    setInitState("needs-token");
                    return;
                }

                setStatusMessage(vercelMessages.initializing);
                setDetailMessage(undefined);

                const verification = await verifyVercelToken(storedToken);

                if (!isMountedRef.current) {
                    return;
                }

                if (!verification.valid) {
                    const message = verification.errorMessage;
                    const logLevel = verification.statusCode === 401 ? "warn" : "error";
                    appendLog({ level: logLevel, message: vercelMessages.logTokenValidationFailed(message) });

                    try {
                        await persistVercelAccessKey(undefined);
                    } catch (clearError) {
                        const clearMessage = extractErrorMessage(clearError);
                        appendLog({ level: "error", message: vercelMessages.logTokenSaveFailed(clearMessage) });
                    }

                    if (!isMountedRef.current) {
                        return;
                    }

                    setStatusMessage(vercelMessages.tokenValidationError);
                    setDetailMessage(vercelMessages.tokenValidateFailed(message));
                    setInitState("needs-token");
                    return;
                }

                setVercelCredentials({ token: storedToken });
                setStatusMessage(vercelMessages.ready);
                setDetailMessage(undefined);
                setInitState("ready");
                appendLog({ level: "success", message: vercelMessages.logTokenLoaded });
            } catch (error) {
                const message = extractErrorMessage(error);
                appendLog({ level: "error", message: vercelMessages.logTokenLoadFailed(message) });

                if (!isMountedRef.current) {
                    return;
                }

                setStatusMessage(vercelMessages.tokenLoadFailed(message));
                setDetailMessage(undefined);
                setInitState("needs-token");
            }
        };

        void initialize();
    }, [appendLog, initState, vercelMessages]);

    // 再度トークンを要求する状態に遷移した際はアクションリストを先頭に戻す。
    useEffect(() => {
        if (initState === "needs-token" || initState === "error") {
            setSelectedActionIndex(0);
        }
    }, [initState]);

    // 入力モード中は Ink のグローバルショートカットを抑制する。
    useEffect(() => {
        setInputMode(initState === "input");
    }, [initState, setInputMode]);

    const actionItems = useMemo<readonly ActionItem[]>(
        () => [
            { id: "open-token", label: vercelMessages.openTokenPage },
            { id: "enter-token", label: vercelMessages.enterToken },
        ],
        [vercelMessages.enterToken, vercelMessages.openTokenPage]
    );

    // フッターには標準ショートカットに加えて上下移動キーを追記する。
    const navigationFooter = useMemo(() => `${defaultFooterLabel}  j:↓  k:↑`, [defaultFooterLabel]);
    const activeItem = MENU_ITEMS[activeIndex];

    // トークン入力中はカーソル風の文字を末尾に追加し、状況を視覚化する。
    const inputDisplay = useMemo(() => {
        if (!tokenDraft) {
            return `${vercelMessages.inputPromptEmpty}${INPUT_CARET}`;
        }
        return `${vercelMessages.inputPromptValue(tokenDraft)}${INPUT_CARET}`;
    }, [tokenDraft, vercelMessages]);

    // ブラウザ起動を試み、失敗時はフォールバックコマンドを順に試す。
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

    // 入力されたトークンを検証・保存し、成功時には準備完了へ遷移させる。
    const submitToken = useCallback(async () => {
        const trimmed = tokenDraft.trim();

        if (!trimmed) {
            setInputError(vercelMessages.tokenMissingError);
            return;
        }

        if (/\s/.test(trimmed)) {
            setInputError(vercelMessages.tokenValidationError);
            return;
        }

        setTokenDraft("");
        setInputError(undefined);
        setDetailMessage(undefined);
        setStatusMessage(vercelMessages.initializing);
        setInitState("pending");
        setInputMode(false);

        const verification = await verifyVercelToken(trimmed);

        if (!isMountedRef.current) {
            return;
        }

        if (!verification.valid) {
            const message = verification.errorMessage;
            const logLevel = verification.statusCode === 401 ? "warn" : "error";
            appendLog({ level: logLevel, message: vercelMessages.logTokenValidationFailed(message) });

            try {
                await persistVercelAccessKey(undefined);
            } catch (clearError) {
                const clearMessage = extractErrorMessage(clearError);
                appendLog({ level: "error", message: vercelMessages.logTokenSaveFailed(clearMessage) });
            }

            if (!isMountedRef.current) {
                return;
            }

            setStatusMessage(vercelMessages.tokenValidationError);
            setDetailMessage(vercelMessages.tokenValidateFailed(message));
            setInitState("needs-token");
            return;
        }

        try {
            await persistVercelAccessKey(trimmed);
        } catch (error) {
            const message = extractErrorMessage(error);
            appendLog({ level: "error", message: vercelMessages.logTokenSaveFailed(message) });

            if (!isMountedRef.current) {
                return;
            }

            setStatusMessage(vercelMessages.tokenSaveFailed(message));
            setDetailMessage(undefined);
            setInitState("needs-token");
            return;
        }

        if (!isMountedRef.current) {
            return;
        }

        setVercelCredentials({ token: trimmed });
        setStatusMessage(vercelMessages.ready);
        setDetailMessage(vercelMessages.tokenSaved);
        setInitState("ready");
        appendLog({ level: "success", message: vercelMessages.logTokenSaved });
    }, [appendLog, setInputMode, tokenDraft, vercelMessages]);

    // 途中で入力を取りやめた場合は状態を初期要求へ巻き戻す。
    const cancelTokenInput = useCallback(() => {
        setTokenDraft("");
        setInputError(undefined);
        setDetailMessage(undefined);
        setStatusMessage(vercelMessages.needsToken);
        setInitState("needs-token");
        appendLog({ level: "info", message: vercelMessages.logTokenInputCancelled });
    }, [appendLog, vercelMessages.logTokenInputCancelled, vercelMessages.needsToken]);

    // アクションメニューの選択結果を具体的な操作に解決する。
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
        [launchBrowser, vercelMessages.inputPromptEmpty]
    );

    // 初期化状況に応じたキー操作をまとめて処理する。
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
                void submitToken();
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

    // 状態に応じたフッター文言を統一的に管理する。
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

    // アクティブなメニュー項目に紐づくセクションを動的に差し替える。
    const ActiveSection = activeItem.Component;

    // 初期化が完了するまでは、状態ごとのフィードバックをカードで表示する。
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
                    : "blueBright";

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
            <Box flexDirection="row" flexGrow={1}>
                {/* 左側にメニュー一覧を表示し、現在のカーソルを強調する。 */}
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

                {/* 右側の表示領域にアクティブセクションをレンダリングする。 */}
                <Box
                    marginLeft={1}
                    borderStyle="single"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                    flexGrow={1}
                >
                    <ActiveSection
                        sectionLabel={activeItem.label}
                        placeholder={placeholder}
                        credentials={vercelCredentials}
                    />
                </Box>
            </Box>
        </Box>
    );
}

// ファイル終端
