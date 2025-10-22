import { useApp, useInput } from "ink";

import { useDashboard } from "../state/dashboard-store.js";

export function useDashboardShortcuts(): void {
    const { exit } = useApp();
    const { cycleService, setActiveService } = useDashboard();

    useInput((input, key) => {
        if (!input) {
            return;
        }

        const normalized = input.toLowerCase();

        if (normalized === "s") {
            cycleService();
        }

        if (normalized === "l") {
            setActiveService("logs");
        }

        if (normalized === "q" || key.escape) {
            exit();
        }
    });
}
