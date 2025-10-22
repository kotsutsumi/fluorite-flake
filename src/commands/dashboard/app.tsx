import { useMemo } from "react";
import type { JSX } from "react";
import packageJson from "../../../package.json" assert { type: "json" };
import { Box, Text } from "ink";

import { getMessages } from "../../i18n.js";
import { Footer } from "./components/footer.js";
import { FullscreenContainer } from "./components/fullscreen-container.js";
import { Header } from "./components/header.js";
import { useDashboard } from "./state/dashboard-store.js";
import { getPlaceholder } from "./utils/getPlaceholder.js";
import { getServiceLabel } from "./utils/getServiceLabel.js";
import { useDashboardShortcuts } from "./utils/useDashboardShortcuts.js";

export function DashboardApp(): JSX.Element {
    const { activeService } = useDashboard();
    const { dashboard } = getMessages();

    useDashboardShortcuts();

    const serviceLabel = useMemo(
        () => getServiceLabel(activeService, dashboard.services),
        [activeService, dashboard.services]
    );

    const placeholder = useMemo(
        () => getPlaceholder(activeService, dashboard.placeholders),
        [activeService, dashboard.placeholders]
    );

    const versionLabel = dashboard.footerVersionLabel(packageJson.version);

    return (
        <FullscreenContainer>
            <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
                <Header
                    title={dashboard.headerTitle}
                    activeServiceLabel={dashboard.activeServiceLabel}
                    serviceName={serviceLabel}
                />

                <Box
                    borderStyle="round"
                    borderColor="cyan"
                    flexDirection="column"
                    paddingX={2}
                    paddingY={1}
                    flexGrow={1}
                >
                    <Box marginTop={1} flexDirection="column">
                        {dashboard.instructions.map((line) => (
                            <Text key={line} dimColor>
                                {line}
                            </Text>
                        ))}
                    </Box>

                    <Box
                        marginTop={1}
                        borderStyle="classic"
                        borderColor="gray"
                        flexDirection="column"
                        paddingX={1}
                        paddingY={1}
                        flexGrow={1}
                    >
                        <Text>{placeholder}</Text>
                    </Box>
                </Box>

                <Footer
                    shortcutsLabel={dashboard.footerShortcutsLabel}
                    versionLabel={versionLabel}
                />
            </Box>
        </FullscreenContainer>
    );
}

// EOF
