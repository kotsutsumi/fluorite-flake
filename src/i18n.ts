import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 現在のファイルのディレクトリを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type SupportedLocale = "en" | "ja";

const FALLBACK_LOCALE: SupportedLocale = "en";

// 正規表現パターンを定数として定義
const APPLE_LANGUAGE_PATTERN = /"([^"]+)"/;

// 明示的なロケール設定のみを対象とする（LANGは除外）
const EXPLICIT_LOCALE_ENV_KEYS = [
    "FLUORITE_LOCALE",
    "LC_ALL",
    "LC_MESSAGES",
    "LANGUAGE",
] as const;
const SYSTEM_LOCALE_ENV_KEYS = ["LANG"] as const;

function normalizeLocale(
    value: string | undefined
): SupportedLocale | undefined {
    if (!value) {
        return;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return;
    }

    if (
        normalized === "ja" ||
        normalized.startsWith("ja_") ||
        normalized.startsWith("ja-")
    ) {
        return "ja";
    }

    if (
        normalized === "en" ||
        normalized.startsWith("en_") ||
        normalized.startsWith("en-")
    ) {
        return "en";
    }

    return;
}

function detectLocaleFromExplicitEnv(): SupportedLocale | undefined {
    // 明示的に設定された環境変数のみをチェック
    for (const key of EXPLICIT_LOCALE_ENV_KEYS) {
        const locale = normalizeLocale(process.env[key]);
        if (locale) {
            return locale;
        }
    }

    return;
}

function detectLocaleFromSystemEnv(): SupportedLocale | undefined {
    // システムレベルの環境変数をチェック
    for (const key of SYSTEM_LOCALE_ENV_KEYS) {
        const locale = normalizeLocale(process.env[key]);
        if (locale) {
            return locale;
        }
    }

    return;
}

function detectLocaleFromIntl(): SupportedLocale | undefined {
    try {
        const intlLocale = normalizeLocale(
            Intl.DateTimeFormat().resolvedOptions().locale
        );
        if (intlLocale) {
            return intlLocale;
        }
    } catch (_error) {
        // 一部の環境ではIntlが利用できない場合があるため、無視して後でフォールバック
    }

    return;
}

function detectLocaleFromMacOS(): SupportedLocale | undefined {
    // macOSでのみ実行
    if (process.platform !== "darwin") {
        return;
    }

    try {
        // macOSのシステム設定から言語設定を取得
        const appleLocale = execSync("defaults read -g AppleLocale", {
            encoding: "utf8",
            timeout: 1000,
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();

        const normalizedAppleLocale = normalizeLocale(appleLocale);
        if (normalizedAppleLocale) {
            return normalizedAppleLocale;
        }

        // AppleLanguagesからも試行
        const appleLanguages = execSync("defaults read -g AppleLanguages", {
            encoding: "utf8",
            timeout: 1000,
            stdio: ["ignore", "pipe", "ignore"],
        });

        // 配列の最初の言語を抽出（括弧とクォートを除去）
        const firstLanguage = appleLanguages.match(APPLE_LANGUAGE_PATTERN)?.[1];
        if (firstLanguage) {
            const normalizedFirstLanguage = normalizeLocale(firstLanguage);
            if (normalizedFirstLanguage) {
                return normalizedFirstLanguage;
            }
        }
    } catch (_error) {
        // macOS設定の読み取りに失敗した場合は無視してフォールバック
    }

    return;
}

export function detectLocale(): SupportedLocale {
    // 優先順位：
    // 1. 明示的な環境変数 (FLUORITE_LOCALE, LC_ALL, LC_MESSAGES, LANGUAGE)
    // 2. macOS システム設定 (AppleLocale, AppleLanguages)
    // 3. Intl API (ブラウザロケール)
    // 4. システム環境変数 (LANG)
    // 5. フォールバック (英語)
    return (
        detectLocaleFromExplicitEnv() ??
        detectLocaleFromMacOS() ??
        detectLocaleFromIntl() ??
        detectLocaleFromSystemEnv() ??
        FALLBACK_LOCALE
    );
}

// 外部JSONファイルからの型定義用のベースインターフェース
type RawLocaleMessages = {
    cli: {
        metaDescription: string;
        usage: string;
        commandsHeading: string;
        commandLines: string[];
        projectTypes: string;
        examplesHeading: string;
        exampleLines: string[];
        helpHint: string;
        devNoSubcommand: string;
    };
    create: {
        commandDescription: string;
        newCommandDescription: string;
        args: {
            type: string;
            name: string;
            template: string;
            dir: string;
            force: string;
            monorepo: string;
            simple?: string;
        };
        invalidProjectType: string;
        availableProjectTypes: string;
        invalidTemplate: string;
        availableTemplates: string;
        spinnerCreating: string;
        spinnerSettingUp: string;
        spinnerInstallingDeps: string;
        spinnerConfiguringTemplate: string;
        spinnerSuccess: string;
        spinnerFailure: string;
        errorPrefix: string;
        nextStepsHeading: string;
        nextStepsCd: string;
        nextStepCommands: {
            expo: string;
            tauri: string;
            default: string;
        };
        debugCommandCalled: string;
        debugProjectConfig: string;
        debugGenerationSuccess: string;
        debugGenerationFailure: string;
        pnpmNotFound: string;
        pnpmVersionTooOld: string;
        pnpmVersionValid: string;
        pnpmInstallGuide: string;
        pnpmInstallCommands: string[];
        pnpmMoreInfo: string;
    };
    readme: {
        title: string;
        description: string;
        gettingStartedHeading: string;
        gettingStartedCommands: string[];
        learnMoreHeading: string;
        templateDescription: string;
        convertToMonorepoHeading: string;
        convertToMonorepoDescription: string;
        convertToMonorepoCommand: string;
        monorepoDescription: string;
        workspaceStructureHeading: string;
        workspaceStructureDescription: string;
        developmentHeading: string;
        developmentCommands: string[];
        buildingHeading: string;
        buildingCommands: string[];
        testingHeading: string;
        testingCommands: string[];
    };
    debug: {
        devModeEnabled: string;
        cwdLabel: string;
        nodeVersionLabel: string;
        argsLabel: string;
        changedDirectory: string;
        debugMessage: string;
    };
};

// 実際に使用するメッセージインターフェース（関数を含む）
export type LocaleMessages = {
    cli: {
        metaDescription: string;
        usage: string;
        commandsHeading: string;
        commandLines: string[];
        projectTypes: string;
        examplesHeading: string;
        exampleLines: string[];
        helpHint: string;
        devNoSubcommand: string;
    };
    create: {
        commandDescription: string;
        newCommandDescription: string;
        args: {
            type: string;
            name: string;
            template: string;
            dir: string;
            force: string;
            monorepo: string;
        };
        invalidProjectType: (type: string) => string;
        availableProjectTypes: string;
        invalidTemplate: (template: string, projectType: string) => string;
        availableTemplates: (templates: readonly string[]) => string;
        spinnerCreating: (type: string, name: string) => string;
        spinnerSettingUp: (type: string) => string;
        spinnerInstallingDeps: string;
        spinnerConfiguringTemplate: (template: string | undefined) => string;
        spinnerSuccess: (type: string, name: string) => string;
        spinnerFailure: string;
        errorPrefix: string;
        nextStepsHeading: string;
        nextStepsCd: (directory: string) => string;
        nextStepCommand: (type: "nextjs" | "expo" | "tauri") => string;
        debugCommandCalled: string;
        debugProjectConfig: string;
        debugGenerationSuccess: string;
        debugGenerationFailure: string;
        pnpmNotFound: string;
        pnpmVersionTooOld: (version: string, minVersion: string) => string;
        pnpmVersionValid: (version: string) => string;
        pnpmInstallGuide: string;
        pnpmInstallCommands: string[];
        pnpmMoreInfo: string;
    };
    readme: {
        title: string;
        description: string;
        gettingStartedHeading: string;
        gettingStartedCommands: string[];
        learnMoreHeading: string;
        templateDescription: string;
        convertToMonorepoHeading: string;
        convertToMonorepoDescription: string;
        convertToMonorepoCommand: string;
        monorepoDescription: string;
        workspaceStructureHeading: string;
        workspaceStructureDescription: string;
        developmentHeading: string;
        developmentCommands: string[];
        buildingHeading: string;
        buildingCommands: string[];
        testingHeading: string;
        testingCommands: string[];
    };
    debug: {
        devModeEnabled: string;
        cwdLabel: string;
        nodeVersionLabel: string;
        argsLabel: string;
        changedDirectory: string;
        debugMessage: (message: string) => string;
    };
};

// JSONファイルを読み込んでメッセージを生成する関数
function loadMessagesFromFile(locale: SupportedLocale): RawLocaleMessages {
    try {
        const filePath = join(__dirname, "i18n", `${locale}.json`);
        const fileContent = readFileSync(filePath, "utf-8");
        return JSON.parse(fileContent) as RawLocaleMessages;
    } catch (error) {
        // ファイル読み込みエラーの場合はフォールバックロケールを使用
        if (locale !== FALLBACK_LOCALE) {
            return loadMessagesFromFile(FALLBACK_LOCALE);
        }
        // フォールバックロケールでも失敗した場合はエラーを投げる
        throw new Error(
            `Failed to load locale messages for ${locale}: ${error}`
        );
    }
}

// 文字列テンプレートを処理する補助関数
function formatMessage(
    template: string,
    params: Record<string, string>
): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
}

// RawLocaleMessagesをLocaleMessagesに変換する関数
function transformMessages(rawMessages: RawLocaleMessages): LocaleMessages {
    return {
        cli: {
            metaDescription: rawMessages.cli.metaDescription,
            usage: rawMessages.cli.usage,
            commandsHeading: rawMessages.cli.commandsHeading,
            commandLines: rawMessages.cli.commandLines,
            projectTypes: rawMessages.cli.projectTypes,
            examplesHeading: rawMessages.cli.examplesHeading,
            exampleLines: rawMessages.cli.exampleLines,
            helpHint: rawMessages.cli.helpHint,
            devNoSubcommand: rawMessages.cli.devNoSubcommand,
        },
        create: {
            commandDescription: rawMessages.create.commandDescription,
            newCommandDescription: rawMessages.create.newCommandDescription,
            args: {
                type: rawMessages.create.args.type,
                name: rawMessages.create.args.name,
                template: rawMessages.create.args.template,
                dir: rawMessages.create.args.dir,
                force: rawMessages.create.args.force,
                monorepo: rawMessages.create.args.monorepo,
            },
            invalidProjectType: (type: string) =>
                formatMessage(rawMessages.create.invalidProjectType, { type }),
            availableProjectTypes: rawMessages.create.availableProjectTypes,
            invalidTemplate: (template: string, projectType: string) =>
                formatMessage(rawMessages.create.invalidTemplate, {
                    template,
                    projectType,
                }),
            availableTemplates: (templates: readonly string[]) =>
                formatMessage(rawMessages.create.availableTemplates, {
                    templates: templates.join(", "),
                }),
            spinnerCreating: (type: string, name: string) =>
                formatMessage(rawMessages.create.spinnerCreating, {
                    type,
                    name,
                }),
            spinnerSettingUp: (type: string) =>
                formatMessage(rawMessages.create.spinnerSettingUp, { type }),
            spinnerInstallingDeps: rawMessages.create.spinnerInstallingDeps,
            spinnerConfiguringTemplate: (template: string | undefined) =>
                formatMessage(rawMessages.create.spinnerConfiguringTemplate, {
                    template: template ?? "template",
                }),
            spinnerSuccess: (type: string, name: string) =>
                formatMessage(rawMessages.create.spinnerSuccess, {
                    type,
                    name,
                }),
            spinnerFailure: rawMessages.create.spinnerFailure,
            errorPrefix: rawMessages.create.errorPrefix,
            nextStepsHeading: rawMessages.create.nextStepsHeading,
            nextStepsCd: (directory: string) =>
                formatMessage(rawMessages.create.nextStepsCd, { directory }),
            nextStepCommand: (type: "nextjs" | "expo" | "tauri") => {
                switch (type) {
                    case "expo":
                        return rawMessages.create.nextStepCommands.expo;
                    case "tauri":
                        return rawMessages.create.nextStepCommands.tauri;
                    default:
                        return rawMessages.create.nextStepCommands.default;
                }
            },
            debugCommandCalled: rawMessages.create.debugCommandCalled,
            debugProjectConfig: rawMessages.create.debugProjectConfig,
            debugGenerationSuccess: rawMessages.create.debugGenerationSuccess,
            debugGenerationFailure: rawMessages.create.debugGenerationFailure,
            pnpmNotFound: rawMessages.create.pnpmNotFound,
            pnpmVersionTooOld: (version: string, minVersion: string) =>
                formatMessage(rawMessages.create.pnpmVersionTooOld, {
                    version,
                    minVersion,
                }),
            pnpmVersionValid: (version: string) =>
                formatMessage(rawMessages.create.pnpmVersionValid, { version }),
            pnpmInstallGuide: rawMessages.create.pnpmInstallGuide,
            pnpmInstallCommands: rawMessages.create.pnpmInstallCommands,
            pnpmMoreInfo: rawMessages.create.pnpmMoreInfo,
        },
        readme: {
            title: rawMessages.readme.title,
            description: rawMessages.readme.description,
            gettingStartedHeading: rawMessages.readme.gettingStartedHeading,
            gettingStartedCommands: rawMessages.readme.gettingStartedCommands,
            learnMoreHeading: rawMessages.readme.learnMoreHeading,
            templateDescription: rawMessages.readme.templateDescription,
            convertToMonorepoHeading:
                rawMessages.readme.convertToMonorepoHeading,
            convertToMonorepoDescription:
                rawMessages.readme.convertToMonorepoDescription,
            convertToMonorepoCommand:
                rawMessages.readme.convertToMonorepoCommand,
            monorepoDescription: rawMessages.readme.monorepoDescription,
            workspaceStructureHeading:
                rawMessages.readme.workspaceStructureHeading,
            workspaceStructureDescription:
                rawMessages.readme.workspaceStructureDescription,
            developmentHeading: rawMessages.readme.developmentHeading,
            developmentCommands: rawMessages.readme.developmentCommands,
            buildingHeading: rawMessages.readme.buildingHeading,
            buildingCommands: rawMessages.readme.buildingCommands,
            testingHeading: rawMessages.readme.testingHeading,
            testingCommands: rawMessages.readme.testingCommands,
        },
        debug: {
            devModeEnabled: rawMessages.debug.devModeEnabled,
            cwdLabel: rawMessages.debug.cwdLabel,
            nodeVersionLabel: rawMessages.debug.nodeVersionLabel,
            argsLabel: rawMessages.debug.argsLabel,
            changedDirectory: rawMessages.debug.changedDirectory,
            debugMessage: (message: string) =>
                formatMessage(rawMessages.debug.debugMessage, { message }),
        },
    };
}

// メッセージキャッシュ
const messagesCache = new Map<SupportedLocale, LocaleMessages>();

export function getMessages(locale?: SupportedLocale): LocaleMessages {
    const resolvedLocale = locale ?? detectLocale();

    // キャッシュから取得を試行
    if (messagesCache.has(resolvedLocale)) {
        const cached = messagesCache.get(resolvedLocale);
        if (cached) {
            return cached;
        }
    }

    // JSONファイルから読み込み
    const rawMessages = loadMessagesFromFile(resolvedLocale);
    const transformedMessages = transformMessages(rawMessages);

    // キャッシュに保存
    messagesCache.set(resolvedLocale, transformedMessages);

    return transformedMessages;
}

export function getMessagesForLocale(locale: SupportedLocale): LocaleMessages {
    // キャッシュから取得を試行
    if (messagesCache.has(locale)) {
        const cached = messagesCache.get(locale);
        if (cached) {
            return cached;
        }
    }

    // JSONファイルから読み込み
    const rawMessages = loadMessagesFromFile(locale);
    const transformedMessages = transformMessages(rawMessages);

    // キャッシュに保存
    messagesCache.set(locale, transformedMessages);

    return transformedMessages;
}

// EOF
