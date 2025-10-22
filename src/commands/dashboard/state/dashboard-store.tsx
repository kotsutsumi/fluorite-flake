import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { JSX, PropsWithChildren } from "react";

import type { TursoLogLevel } from "../../create/database-provisioning/index.js";
import { SERVICE_ORDER, getNextService, isPrimaryService, type ServiceType } from "../types/common.js";

type DashboardLogEntry = {
    id: string;
    level: TursoLogLevel;
    message: string;
    timestamp: Date;
};

type DashboardLogInput = {
    level: TursoLogLevel;
    message: string;
    timestamp?: Date;
};

type DashboardContextValue = {
    activeService: ServiceType;
    services: readonly ServiceType[];
    setActiveService: (service: ServiceType) => void;
    cycleService: () => void;
    logs: readonly DashboardLogEntry[];
    appendLog: (entry: DashboardLogInput) => void;
    clearLogs: () => void;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

type DashboardProviderProps = PropsWithChildren<{
    initialService?: ServiceType;
}>;

const MAX_LOG_ENTRIES = 500;

export function DashboardProvider({ initialService, children }: DashboardProviderProps): JSX.Element {
    const defaultService = initialService ?? SERVICE_ORDER[0];
    const [activeService, setActiveService] = useState<ServiceType>(defaultService);
    const [logEntries, setLogEntries] = useState<DashboardLogEntry[]>([]);
    const logSequenceRef = useRef(0);

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

    const clearLogs = useCallback(() => {
        setLogEntries([]);
    }, []);

    const cycleService = useCallback(() => {
        setActiveService((current) => {
            if (!isPrimaryService(current)) {
                return SERVICE_ORDER[0];
            }
            return getNextService(current);
        });
    }, []);

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
        }),
        [activeService, appendLog, clearLogs, cycleService, logEntries, services],
    );

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
    const context = useContext(DashboardContext);

    if (!context) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }

    return context;
}

// EOF
