import { useMemo } from "react";
import type { JSX } from "react";
import { Box } from "ink";

import packageJson from "../../../package.json" assert { type: "json" };
import { getMessages } from "../../i18n.js";
import { Footer } from "./components/footer.js";
import { FullscreenContainer } from "./components/fullscreen-container.js";
import { Header } from "./components/header.js";
import { TursoService } from "./components/turso-service.js";
import { VercelService } from "./components/vercel-service.js";
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
                    borderStyle="single"
                    borderColor="grey"
                    flexDirection="column"
                    paddingX={0}
                    paddingY={0}
                    flexGrow={1}
                >
                    {activeService === "vercel" ? (
                        <VercelService instructions={dashboard.instructions} placeholder={placeholder} />
                    ) : (
                        <TursoService instructions={dashboard.instructions} placeholder={placeholder} />
                    )}
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
