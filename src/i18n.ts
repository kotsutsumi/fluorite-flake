/**
 * Internationalization (i18n) utilities
 * - ロケールの検出
 * - メッセージのロードとフォーマット
 */
import { type ExecSyncOptions, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getShellForPlatform } from "./utils/shell-helper/index.js";

// 現在のファイルのディレクトリを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type SupportedLocale = "en" | "ja";

const FALLBACK_LOCALE: SupportedLocale = "ja";

// 正規表現パターンを定数として定義
const APPLE_LANGUAGE_PATTERN = /"([^"]+)"/;

// 明示的なロケール設定のみを対象とする（LANGは除外）
const EXPLICIT_LOCALE_ENV_KEYS = ["FLUORITE_LOCALE", "LC_ALL", "LC_MESSAGES", "LANGUAGE"] as const;
const SYSTEM_LOCALE_ENV_KEYS = ["LANG"] as const;

function normalizeLocale(value: string | undefined): SupportedLocale | undefined {
    if (!value) {
        return;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return;
    }

    if (normalized === "ja" || normalized.startsWith("ja_") || normalized.startsWith("ja-")) {
        return "ja";
    }

    if (normalized === "en" || normalized.startsWith("en_") || normalized.startsWith("en-")) {
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
        const intlLocale = normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale);
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
            shell: getShellForPlatform(), // クロスプラットフォーム対応：プラットフォーム固有のシェルを使用
        } satisfies ExecSyncOptions).trim();

        const normalizedAppleLocale = normalizeLocale(appleLocale);
        if (normalizedAppleLocale) {
            return normalizedAppleLocale;
        }

        // AppleLanguagesからも試行
        const appleLanguages = execSync("defaults read -g AppleLanguages", {
            encoding: "utf8",
            timeout: 1000,
            stdio: ["ignore", "pipe", "ignore"],
            shell: getShellForPlatform(), // クロスプラットフォーム対応：プラットフォーム固有のシェルを使用
        } satisfies ExecSyncOptions);

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
    dashboard: {
        commandDescription: string;
        headerTitle: string;
        instructions: string[];
        logsInstructions: string[];
        activeServiceLabel: string;
        footerShortcuts: {
            vercel: string;
            turso: string;
            logs: string;
        };
        footerVersionLabel: string;
        services: {
            vercel: string;
            turso: string;
            logs: string;
        };
        placeholders: {
            vercel: string;
            turso: string;
            logs: string;
        };
        nonInteractiveError: string[];
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
            database: string;
        };
        invalidProjectType: string;
        availableProjectTypes: string;
        invalidTemplate: string;
        availableTemplates: string;
        selectProjectTypePrompt: string;
        selectTemplatePrompt: string;
        selectDatabasePrompt: string;
        confirmMonorepoPrompt: string;
        invalidDatabase: string;
        availableDatabases: string;
        spinnerCreating: string;
        spinnerSettingUp: string;
        spinnerInstallingDeps: string;
        spinnerConfiguringTemplate: string;
        spinnerPostInstalling: string;
        spinnerSuccess: string;
        spinnerFailure: string;
        postInstallFailed: string;
        postInstallSkipped: string;
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
        promptProjectName: string;
        projectNamePlaceholder: string;
        projectNameRequired: string;
        projectAlreadyExists: string;
        usingDefaultProjectName: string;
        invalidProjectName: string;
        directoryExists: string;
        confirmOverwrite: string;
        directoryRemoved: string;
        failedToRemoveDirectory: string;
        operationCancelled: string;
        vercelLinkConfirm: string;
        vercelLinkSkipped: string;
        vercelLinkProjectListFailed: string;
        vercelLinkSelectProject: string;
        vercelLinkManualChoice: string;
        vercelLinkProjectIdPrompt: string;
        vercelLinkProjectIdError: string;
        vercelLinkProjectNamePrompt: string;
        vercelLinkProjectNameError: string;
        vercelLinkCreateRepoPrompt: string;
        vercelLinkToggleYes: string;
        vercelLinkToggleNo: string;
        vercelLinkDirectoryPrompt: string;
        vercelLinkDirectoryError: string;
        vercelLinkRemotePrompt: string;
        vercelLinkRemoteError: string;
        vercelLinkOrgIdPrompt: string;
        vercelLinkOrgIdError: string;
        vercelLinkCancelled: string;
        vercelLinkSuccess: string;
        turso: {
            validTokenReused: string;
            invalidTokenDetected: string;
            noExistingToken: string;
            promptLoginTitle: string;
            promptLogin: string;
            cliNotFound: string;
            cliTokenFailed: string;
            cliTokenEmpty: string;
            cliLoginConfirmed: string;
            initializing: string;
            ready: string;
            initializationFailed: string;
            footerInitializing: string;
            footerLoginRequired: string;
            footerError: string;
            retryHint: string;
            apiError: string;
            tokenRevoked: string;
            tokenRegenerated: string;
            tokenCreateEmpty: string;
            tokenStored: string;
        };
        blob: {
            setupPrompt: string;
            modeNew: string;
            modeExisting: string;
            modeNone: string;
            tokenPrompt: string;
            tokenPlaceholder: string;
            tokenRequired: string;
            tokenInvalidFormat: string;
            tokenTooShort: string;
            tokenValidating: string;
            tokenInvalid: string;
            storeNamePrompt: string;
            storeNameRequired: string;
            storeNameTooShort: string;
            storeNameTooLong: string;
            storeNameInvalidChars: string;
            storeCreating: string;
            storeCreated: string;
            storeCreateFailed: string;
            storeListFetching: string;
            storeListEmpty: string;
            storeSelectPrompt: string;
            storeSelected: string;
            storeSelectFailed: string;
            configSkipped: string;
            configCompleted: string;
            apiError: string;
            fallbackPrompt: string;
            retryPrompt: string;
            fallbackDisable: string;
            fallbackRetry: string;
            tokenAutoGenerated: string;
            tokenAutoGenerationFailed: string;
        };
        envEncryption: {
            confirmPrompt: string;
            processing: string;
            success: string;
            failed: string;
            skipped: string;
            manualCommand: string;
            shareInstruction: string;
        };
        confirmation: {
            title: string;
            projectInfo: string;
            databaseInfo: string;
            continuePrompt: string;
            cancelled: string;
            vercelLink: string;
        };
    };
    new: {
        commandDescription: string;
        projectNamePrompt: string;
        projectNamePlaceholder: string;
        projectNameRequired: string;
        invalidProjectName: string;
        directoryExists: string;
        confirmOverwrite: string;
        operationCancelled: string;
        generatingProject: string;
        setupComplete: string;
        setupFailed: string;
        nextStepsTitle: string;
        nextStepsCommands: string[];
        serverInfo: string;
        serverList: string[];
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
    common: {
        enabled: string;
        disabled: string;
        projectName: string;
        projectType: string;
        template: string;
        monorepo: string;
        outputDir: string;
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
    dashboard: {
        commandDescription: string;
        headerTitle: string;
        instructions: string[];
        logsInstructions: string[];
        activeServiceLabel: string;
        footerShortcuts: {
            vercel: string;
            turso: string;
            logs: string;
        };
        footerVersionLabel: (version: string) => string;
        services: {
            vercel: string;
            turso: string;
            logs: string;
        };
        placeholders: {
            vercel: string;
            turso: string;
            logs: string;
        };
        nonInteractiveError: string[];
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
            database: string;
        };
        invalidProjectType: (type: string) => string;
        availableProjectTypes: string;
        invalidTemplate: (template: string, projectType: string) => string;
        availableTemplates: (templates: readonly string[]) => string;
        selectProjectTypePrompt: string;
        selectTemplatePrompt: (typeName: string) => string;
        selectDatabasePrompt: string;
        confirmMonorepoPrompt: (templateName: string) => string;
        invalidDatabase: (database: string) => string;
        availableDatabases: string;
        spinnerCreating: (type: string, name: string) => string;
        spinnerSettingUp: (type: string) => string;
        spinnerInstallingDeps: string;
        spinnerConfiguringTemplate: (template: string | undefined) => string;
        spinnerPostInstalling: string;
        spinnerSuccess: (type: string, name: string) => string;
        spinnerFailure: string;
        postInstallFailed: string;
        postInstallSkipped: string;
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
        promptProjectName: string;
        projectNamePlaceholder: string;
        projectNameRequired: string;
        projectAlreadyExists: string;
        usingDefaultProjectName: string;
        invalidProjectName: string;
        directoryExists: string;
        confirmOverwrite: string;
        directoryRemoved: string;
        failedToRemoveDirectory: string;
        operationCancelled: string;
        vercelLinkConfirm: string;
        vercelLinkSkipped: string;
        vercelLinkProjectListFailed: string;
        vercelLinkSelectProject: string;
        vercelLinkManualChoice: string;
        vercelLinkProjectIdPrompt: string;
        vercelLinkProjectIdError: string;
        vercelLinkProjectNamePrompt: string;
        vercelLinkProjectNameError: string;
        vercelLinkCreateRepoPrompt: string;
        vercelLinkToggleYes: string;
        vercelLinkToggleNo: string;
        vercelLinkDirectoryPrompt: string;
        vercelLinkDirectoryError: string;
        vercelLinkRemotePrompt: string;
        vercelLinkRemoteError: string;
        vercelLinkOrgIdPrompt: string;
        vercelLinkOrgIdError: string;
        vercelLinkCancelled: string;
        vercelLinkSuccess: (projectName: string) => string;
        turso: {
            validTokenReused: string;
            invalidTokenDetected: string;
            noExistingToken: string;
            promptLoginTitle: string;
            promptLogin: string;
            cliNotFound: string;
            cliTokenFailed: string;
            cliTokenEmpty: string;
            cliLoginConfirmed: string;
            initializing: string;
            ready: string;
            initializationFailed: string;
            footerInitializing: string;
            footerLoginRequired: string;
            footerError: string;
            retryHint: string;
            apiError: (status: string) => string;
            tokenRevoked: (tokenName: string) => string;
            tokenRegenerated: (tokenName: string) => string;
            tokenCreateEmpty: string;
            tokenStored: (configPath: string) => string;
        };
        blob: {
            setupPrompt: string;
            modeNew: string;
            modeExisting: string;
            modeNone: string;
            tokenPrompt: string;
            tokenPlaceholder: string;
            tokenRequired: string;
            tokenInvalidFormat: string;
            tokenTooShort: string;
            tokenValidating: string;
            tokenInvalid: string;
            storeNamePrompt: string;
            storeNameRequired: string;
            storeNameTooShort: string;
            storeNameTooLong: string;
            storeNameInvalidChars: string;
            storeCreating: string;
            storeCreated: string;
            storeCreateFailed: string;
            storeListFetching: string;
            storeListEmpty: string;
            storeSelectPrompt: string;
            storeSelected: string;
            storeSelectFailed: string;
            configSkipped: string;
            configCompleted: string;
            apiError: string;
            fallbackPrompt: string;
            retryPrompt: string;
            fallbackDisable: string;
            fallbackRetry: string;
            tokenAutoGenerated: string;
            tokenAutoGenerationFailed: string;
        };
        envEncryption: {
            confirmPrompt: string;
            processing: string;
            success: (zipPath: string) => string;
            failed: string;
            skipped: string;
            manualCommand: string;
            shareInstruction: string;
        };
        confirmation: {
            title: string;
            projectInfo: string;
            databaseInfo: string;
            continuePrompt: string;
            cancelled: string;
            vercelLink: string;
        };
    };
    new: {
        commandDescription: string;
        projectNamePrompt: string;
        projectNamePlaceholder: string;
        projectNameRequired: string;
        invalidProjectName: string;
        directoryExists: string;
        confirmOverwrite: string;
        operationCancelled: string;
        generatingProject: string;
        setupComplete: string;
        setupFailed: string;
        nextStepsTitle: string;
        nextStepsCommands: string[];
        serverInfo: string;
        serverList: string[];
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
    common: {
        enabled: string;
        disabled: string;
        projectName: string;
        projectType: string;
        template: string;
        monorepo: string;
        outputDir: string;
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
        throw new Error(`Failed to load locale messages for ${locale}: ${error}`);
    }
}

// 文字列テンプレートを処理する補助関数
function formatMessage(template: string, params: Record<string, string>): string {
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
        dashboard: {
            commandDescription: rawMessages.dashboard.commandDescription,
            headerTitle: rawMessages.dashboard.headerTitle,
            instructions: rawMessages.dashboard.instructions,
            logsInstructions: rawMessages.dashboard.logsInstructions,
            activeServiceLabel: rawMessages.dashboard.activeServiceLabel,
            footerShortcuts: {
                vercel: rawMessages.dashboard.footerShortcuts.vercel,
                turso: rawMessages.dashboard.footerShortcuts.turso,
                logs: rawMessages.dashboard.footerShortcuts.logs,
            },
            footerVersionLabel: (version: string) =>
                formatMessage(rawMessages.dashboard.footerVersionLabel, { version }),
            services: {
                vercel: rawMessages.dashboard.services.vercel,
                turso: rawMessages.dashboard.services.turso,
                logs: rawMessages.dashboard.services.logs,
            },
            placeholders: {
                vercel: rawMessages.dashboard.placeholders.vercel,
                turso: rawMessages.dashboard.placeholders.turso,
                logs: rawMessages.dashboard.placeholders.logs,
            },
            nonInteractiveError: rawMessages.dashboard.nonInteractiveError,
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
                database: rawMessages.create.args.database,
            },
            invalidProjectType: (type: string) => formatMessage(rawMessages.create.invalidProjectType, { type }),
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
            selectProjectTypePrompt: rawMessages.create.selectProjectTypePrompt,
            selectTemplatePrompt: (typeName: string) =>
                formatMessage(rawMessages.create.selectTemplatePrompt, {
                    typeName,
                }),
            selectDatabasePrompt: rawMessages.create.selectDatabasePrompt,
            confirmMonorepoPrompt: (templateName: string) =>
                formatMessage(rawMessages.create.confirmMonorepoPrompt, {
                    template: templateName,
                }),
            invalidDatabase: (database: string) => formatMessage(rawMessages.create.invalidDatabase, { database }),
            availableDatabases: rawMessages.create.availableDatabases,
            spinnerCreating: (type: string, name: string) =>
                formatMessage(rawMessages.create.spinnerCreating, {
                    type,
                    name,
                }),
            spinnerSettingUp: (type: string) => formatMessage(rawMessages.create.spinnerSettingUp, { type }),
            spinnerInstallingDeps: rawMessages.create.spinnerInstallingDeps,
            spinnerConfiguringTemplate: (template: string | undefined) =>
                formatMessage(rawMessages.create.spinnerConfiguringTemplate, {
                    template: template ?? "template",
                }),
            spinnerPostInstalling: rawMessages.create.spinnerPostInstalling,
            spinnerSuccess: (type: string, name: string) =>
                formatMessage(rawMessages.create.spinnerSuccess, {
                    type,
                    name,
                }),
            spinnerFailure: rawMessages.create.spinnerFailure,
            postInstallFailed: rawMessages.create.postInstallFailed,
            postInstallSkipped: rawMessages.create.postInstallSkipped,
            errorPrefix: rawMessages.create.errorPrefix,
            nextStepsHeading: rawMessages.create.nextStepsHeading,
            nextStepsCd: (directory: string) => formatMessage(rawMessages.create.nextStepsCd, { directory }),
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
            pnpmVersionValid: (version: string) => formatMessage(rawMessages.create.pnpmVersionValid, { version }),
            pnpmInstallGuide: rawMessages.create.pnpmInstallGuide,
            pnpmInstallCommands: rawMessages.create.pnpmInstallCommands,
            pnpmMoreInfo: rawMessages.create.pnpmMoreInfo,
            promptProjectName: rawMessages.create.promptProjectName,
            projectNamePlaceholder: rawMessages.create.projectNamePlaceholder,
            projectNameRequired: rawMessages.create.projectNameRequired,
            projectAlreadyExists: rawMessages.create.projectAlreadyExists,
            usingDefaultProjectName: rawMessages.create.usingDefaultProjectName,
            invalidProjectName: rawMessages.create.invalidProjectName,
            directoryExists: rawMessages.create.directoryExists,
            confirmOverwrite: rawMessages.create.confirmOverwrite,
            directoryRemoved: rawMessages.create.directoryRemoved,
            failedToRemoveDirectory: rawMessages.create.failedToRemoveDirectory,
            operationCancelled: rawMessages.create.operationCancelled,
            vercelLinkConfirm: rawMessages.create.vercelLinkConfirm,
            vercelLinkSkipped: rawMessages.create.vercelLinkSkipped,
            vercelLinkProjectListFailed: rawMessages.create.vercelLinkProjectListFailed,
            vercelLinkSelectProject: rawMessages.create.vercelLinkSelectProject,
            vercelLinkManualChoice: rawMessages.create.vercelLinkManualChoice,
            vercelLinkProjectIdPrompt: rawMessages.create.vercelLinkProjectIdPrompt,
            vercelLinkProjectIdError: rawMessages.create.vercelLinkProjectIdError,
            vercelLinkProjectNamePrompt: rawMessages.create.vercelLinkProjectNamePrompt,
            vercelLinkProjectNameError: rawMessages.create.vercelLinkProjectNameError,
            vercelLinkCreateRepoPrompt: rawMessages.create.vercelLinkCreateRepoPrompt,
            vercelLinkToggleYes: rawMessages.create.vercelLinkToggleYes,
            vercelLinkToggleNo: rawMessages.create.vercelLinkToggleNo,
            vercelLinkDirectoryPrompt: rawMessages.create.vercelLinkDirectoryPrompt,
            vercelLinkDirectoryError: rawMessages.create.vercelLinkDirectoryError,
            vercelLinkRemotePrompt: rawMessages.create.vercelLinkRemotePrompt,
            vercelLinkRemoteError: rawMessages.create.vercelLinkRemoteError,
            vercelLinkOrgIdPrompt: rawMessages.create.vercelLinkOrgIdPrompt,
            vercelLinkOrgIdError: rawMessages.create.vercelLinkOrgIdError,
            vercelLinkCancelled: rawMessages.create.vercelLinkCancelled,
            vercelLinkSuccess: (projectName: string) =>
                formatMessage(rawMessages.create.vercelLinkSuccess, { projectName }),
            turso: {
                validTokenReused: rawMessages.create.turso.validTokenReused,
                invalidTokenDetected: rawMessages.create.turso.invalidTokenDetected,
                noExistingToken: rawMessages.create.turso.noExistingToken,
                promptLoginTitle: rawMessages.create.turso.promptLoginTitle,
                promptLogin: rawMessages.create.turso.promptLogin,
                cliNotFound: rawMessages.create.turso.cliNotFound,
                cliTokenFailed: rawMessages.create.turso.cliTokenFailed,
                cliTokenEmpty: rawMessages.create.turso.cliTokenEmpty,
                cliLoginConfirmed: rawMessages.create.turso.cliLoginConfirmed,
                initializing: rawMessages.create.turso.initializing,
                ready: rawMessages.create.turso.ready,
                initializationFailed: rawMessages.create.turso.initializationFailed,
                footerInitializing: rawMessages.create.turso.footerInitializing,
                footerLoginRequired: rawMessages.create.turso.footerLoginRequired,
                footerError: rawMessages.create.turso.footerError,
                retryHint: rawMessages.create.turso.retryHint,
                apiError: (status: string) => formatMessage(rawMessages.create.turso.apiError, { status }),
                tokenRevoked: (tokenName: string) =>
                    formatMessage(rawMessages.create.turso.tokenRevoked, { tokenName }),
                tokenRegenerated: (tokenName: string) =>
                    formatMessage(rawMessages.create.turso.tokenRegenerated, { tokenName }),
                tokenCreateEmpty: rawMessages.create.turso.tokenCreateEmpty,
                tokenStored: (configPath: string) =>
                    formatMessage(rawMessages.create.turso.tokenStored, { configPath }),
            },
            blob: {
                setupPrompt: "Vercel Blobの設定方法を選択してください:",
                modeNew: "新規Blobストアを作成",
                modeExisting: "既存Blobストアを利用",
                modeNone: "Blob機能を使用しない",
                tokenPrompt: "BLOB_READ_WRITE_TOKEN を入力してください：",
                tokenPlaceholder: "vercel_blob_rw_xxxxxxxxxxxxxxx",
                tokenRequired: "トークンを入力してください",
                tokenInvalidFormat: "無効なトークン形式です（vercel_blob_rw_またはblob_rw_で始まる必要があります）",
                tokenTooShort: "トークンが短すぎます",
                tokenValidating: "トークンを検証中...",
                tokenInvalid: "無効なトークンです",
                storeNamePrompt: "ストア名を入力してください：",
                storeNameRequired: "ストア名を入力してください",
                storeNameTooShort: "ストア名は3-32文字で入力してください",
                storeNameTooLong: "ストア名は3-32文字で入力してください",
                storeNameInvalidChars: "ストア名は英小文字、数字、ハイフンのみ使用可能です",
                storeCreating: "Blobストアを作成中...",
                storeCreated: "Blobストアを作成しました",
                storeCreateFailed: "ストア作成に失敗しました",
                storeListFetching: "Blobストア一覧を取得中...",
                storeListEmpty: "利用可能なBlobストアが見つかりません。新規作成を選択してください。",
                storeSelectPrompt: "利用するBlobストアを選択してください：",
                storeSelected: "Blobストアを選択しました",
                storeSelectFailed: "ストア選択に失敗しました",
                configSkipped: "Blob設定をスキップしました",
                configCompleted: "Vercel Blob設定完了",
                apiError: "Vercel API呼び出しでエラーが発生しました",
                fallbackPrompt: "エラーが発生しました。どうしますか？",
                retryPrompt: "操作をリトライしますか？",
                fallbackDisable: "Blob機能を無効にして続行",
                fallbackRetry: "もう一度試す",
                tokenAutoGenerated: "新しいトークンを自動生成しました",
                tokenAutoGenerationFailed: "トークン自動生成に失敗しました",
            },
            envEncryption: {
                confirmPrompt: rawMessages.create.envEncryption.confirmPrompt,
                processing: rawMessages.create.envEncryption.processing,
                success: (zipPath: string) =>
                    formatMessage(rawMessages.create.envEncryption.success, {
                        zipPath,
                    }),
                failed: rawMessages.create.envEncryption.failed,
                skipped: rawMessages.create.envEncryption.skipped,
                manualCommand: rawMessages.create.envEncryption.manualCommand,
                shareInstruction: rawMessages.create.envEncryption.shareInstruction,
            },
            confirmation: {
                title: rawMessages.create.confirmation.title,
                projectInfo: rawMessages.create.confirmation.projectInfo,
                databaseInfo: rawMessages.create.confirmation.databaseInfo,
                continuePrompt: rawMessages.create.confirmation.continuePrompt,
                cancelled: rawMessages.create.confirmation.cancelled,
                vercelLink: rawMessages.create.confirmation.vercelLink,
            },
        },
        new: {
            commandDescription: rawMessages.new.commandDescription,
            projectNamePrompt: rawMessages.new.projectNamePrompt,
            projectNamePlaceholder: rawMessages.new.projectNamePlaceholder,
            projectNameRequired: rawMessages.new.projectNameRequired,
            invalidProjectName: rawMessages.new.invalidProjectName,
            directoryExists: rawMessages.new.directoryExists,
            confirmOverwrite: rawMessages.new.confirmOverwrite,
            operationCancelled: rawMessages.new.operationCancelled,
            generatingProject: rawMessages.new.generatingProject,
            setupComplete: rawMessages.new.setupComplete,
            setupFailed: rawMessages.new.setupFailed,
            nextStepsTitle: rawMessages.new.nextStepsTitle,
            nextStepsCommands: rawMessages.new.nextStepsCommands,
            serverInfo: rawMessages.new.serverInfo,
            serverList: rawMessages.new.serverList,
        },
        readme: {
            title: rawMessages.readme.title,
            description: rawMessages.readme.description,
            gettingStartedHeading: rawMessages.readme.gettingStartedHeading,
            gettingStartedCommands: rawMessages.readme.gettingStartedCommands,
            learnMoreHeading: rawMessages.readme.learnMoreHeading,
            templateDescription: rawMessages.readme.templateDescription,
            convertToMonorepoHeading: rawMessages.readme.convertToMonorepoHeading,
            convertToMonorepoDescription: rawMessages.readme.convertToMonorepoDescription,
            convertToMonorepoCommand: rawMessages.readme.convertToMonorepoCommand,
            monorepoDescription: rawMessages.readme.monorepoDescription,
            workspaceStructureHeading: rawMessages.readme.workspaceStructureHeading,
            workspaceStructureDescription: rawMessages.readme.workspaceStructureDescription,
            developmentHeading: rawMessages.readme.developmentHeading,
            developmentCommands: rawMessages.readme.developmentCommands,
            buildingHeading: rawMessages.readme.buildingHeading,
            buildingCommands: rawMessages.readme.buildingCommands,
            testingHeading: rawMessages.readme.testingHeading,
            testingCommands: rawMessages.readme.testingCommands,
        },
        common: {
            enabled: rawMessages.common.enabled,
            disabled: rawMessages.common.disabled,
            projectName: rawMessages.common.projectName,
            projectType: rawMessages.common.projectType,
            template: rawMessages.common.template,
            monorepo: rawMessages.common.monorepo,
            outputDir: rawMessages.common.outputDir,
        },
        debug: {
            devModeEnabled: rawMessages.debug.devModeEnabled,
            cwdLabel: rawMessages.debug.cwdLabel,
            nodeVersionLabel: rawMessages.debug.nodeVersionLabel,
            argsLabel: rawMessages.debug.argsLabel,
            changedDirectory: rawMessages.debug.changedDirectory,
            debugMessage: (message: string) => formatMessage(rawMessages.debug.debugMessage, { message }),
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
