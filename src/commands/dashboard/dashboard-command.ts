import React from "react";
import { defineCommand } from "citty";
import { render } from "ink";

import { getMessages } from "../../i18n.js";
import { DashboardApp } from "./app.js";
import { DashboardProvider } from "./state/dashboard-store.js";
import { parseService, type ServiceType } from "./types/common.js";

export type { ServiceType } from "./types/common.js";

/**
 * Launch the dashboard UI.
 */
export async function launchDashboard(initialService?: ServiceType): Promise<void> {
    const { dashboard } = getMessages();

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        for (const line of dashboard.nonInteractiveError) {
            console.log(line);
        }
        process.exitCode = 1;
        return;
    }

    const tree = React.createElement(DashboardProvider, { initialService }, React.createElement(DashboardApp));

    const { waitUntilExit } = render(tree, {
        patchConsole: false,
    });

    await waitUntilExit();
}

export const dashboardCommand = defineCommand({
    meta: {
        name: "dashboard",
        description: getMessages().dashboard.commandDescription,
    },
    args: {
        service: {
            type: "string",
            description: "Initial service to display (vercel|turso)",
        },
    },
    async run({ args }) {
        const initialService = parseService(args.service);
        await launchDashboard(initialService);
    },
});

// EOF
