import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { JSX, PropsWithChildren } from "react";

import type { TursoLogLevel } from "../../create/database-provisioning/index.js";
import { SERVICE_ORDER, getNextService, isPrimaryService, type ServiceType } from "../types/common.js";

// Ink 上で扱うログエントリの最小構成。
type DashboardLogEntry = {
    id: string;
    level: TursoLogLevel;
    message: string;
    timestamp: Date;
};

// ログ追加時に入力できるパラメータ。タイムスタンプは省略可能にしておく。
type DashboardLogInput = {
    level: TursoLogLevel;
    message: string;
    timestamp?: Date;
};

// ダッシュボード全体で共有する状態と操作をまとめたコンテキスト値。
type DashboardContextValue = {
    activeService: ServiceType;
    services: readonly ServiceType[];
    setActiveService: (service: ServiceType) => void;
    cycleService: () => void;
    logs: readonly DashboardLogEntry[];
    appendLog: (entry: DashboardLogInput) => void;
    clearLogs: () => void;
    isInputMode: boolean;
    setInputMode: (value: boolean) => void;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

type DashboardProviderProps = PropsWithChildren<{
    initialService?: ServiceType;
}>;

// ログが増えすぎないよう保持上限を決めておく。
const MAX_LOG_ENTRIES = 500;

// CLI ダッシュボード全体にサービス状態とログを供給するプロバイダー。
export function DashboardProvider({ initialService, children }: DashboardProviderProps): JSX.Element {
    const defaultService = initialService ?? SERVICE_ORDER[0];
    const [activeService, setActiveService] = useState<ServiceType>(defaultService);
    const [logEntries, setLogEntries] = useState<DashboardLogEntry[]>([]);
    const [isInputMode, setIsInputMode] = useState(false);
    const logSequenceRef = useRef(0);

    // ログを安全に追加しつつ、上限を超えた古いものは先頭から削除する。
    const appendLog = useCallback((entry: DashboardLogInput) => {
        if (!entry.message) {
            return;
        }

        setLogEntries((prev) => {
            const id = `${Date.now()}-${logSequenceRef.current++}`;
            const nextEntry: DashboardLogEntry = {
                id,
                level: entry.level,
                message: entry.message,
                timestamp: entry.timestamp ?? new Date(),
            };

            const next = [...prev, nextEntry];
            if (next.length > MAX_LOG_ENTRIES) {
                next.splice(0, next.length - MAX_LOG_ENTRIES);
            }
            return next;
        });
    }, []);

    // 画面をリセットしたい場合に備えてログを全消去する操作。
    const clearLogs = useCallback(() => {
        setLogEntries([]);
    }, []);

    // メインサービス間を順番に切り替えるためのヘルパー。
    const cycleService = useCallback(() => {
        setActiveService((current) => {
            if (!isPrimaryService(current)) {
                return SERVICE_ORDER[0];
            }
            return getNextService(current);
        });
    }, []);

    // メニュー表示用にサービス一覧をメモ化しておく。
    const services = useMemo<readonly ServiceType[]>(() => [...SERVICE_ORDER, "logs"] as ServiceType[], []);

    const value = useMemo<DashboardContextValue>(
        () => ({
            activeService,
            services,
            setActiveService,
            cycleService,
            logs: logEntries,
            appendLog,
            clearLogs,
            isInputMode,
            setInputMode: setIsInputMode,
        }),
        [activeService, appendLog, clearLogs, cycleService, isInputMode, logEntries, services]
    );

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

// ダッシュボードコンテキストを安全に取得するためのカスタムフック。
export function useDashboard(): DashboardContextValue {
    const context = useContext(DashboardContext);

    if (!context) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }

    return context;
}

// EOF
