import { createContext, useContext, useMemo, useState } from "react";
import type { JSX, PropsWithChildren } from "react";

import { SERVICE_ORDER, getNextService, type ServiceType } from "../types/common.js";

type DashboardContextValue = {
    activeService: ServiceType;
    services: readonly ServiceType[];
    setActiveService: (service: ServiceType) => void;
    cycleService: () => void;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

type DashboardProviderProps = PropsWithChildren<{
    initialService?: ServiceType;
}>;

export function DashboardProvider({ initialService, children }: DashboardProviderProps): JSX.Element {
    const defaultService = initialService ?? SERVICE_ORDER[0];
    const [activeService, setActiveService] = useState<ServiceType>(defaultService);

    const value = useMemo<DashboardContextValue>(
        () => ({
            activeService,
            services: SERVICE_ORDER,
            setActiveService,
            cycleService: () => {
                setActiveService((current) => getNextService(current));
            },
        }),
        [activeService],
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
