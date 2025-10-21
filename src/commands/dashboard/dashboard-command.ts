/**
 * Dashboard command placeholder
 */

import { defineCommand } from "citty";

import { getMessages } from "../../i18n.js";

export const dashboardCommand = defineCommand({
    meta: {
        name: "dashboard",
        description: getMessages().dashboard.commandDescription,
    },
    run() {
        const { dashboard } = getMessages();
        console.log(dashboard.placeholderMessage);
    },
});

// EOF
