import { useEffect, useMemo, useState } from "react";
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

    const { vercel: vercelShortcuts, turso: tursoShortcuts } = dashboard.footerShortcuts;

    const [footerShortcutsLabel, setFooterShortcutsLabel] = useState(() =>
        activeService === "vercel" ? vercelShortcuts : tursoShortcuts
    );

    useEffect(() => {
        setFooterShortcutsLabel(activeService === "vercel" ? vercelShortcuts : tursoShortcuts);
    }, [activeService, vercelShortcuts, tursoShortcuts]);

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
                    paddingX={2}
                    paddingY={1}
                    flexGrow={1}
                >
                    {activeService === "vercel" ? (
                        <VercelService
                            instructions={dashboard.instructions}
                            placeholder={placeholder}
                            defaultFooterLabel={vercelShortcuts}
                            onFooterChange={setFooterShortcutsLabel}
                        />
                    ) : (
                        <TursoService
                            instructions={dashboard.instructions}
                            placeholder={placeholder}
                            defaultFooterLabel={tursoShortcuts}
                            onFooterChange={setFooterShortcutsLabel}
                        />
                    )}
                </Box>

                <Footer
                    shortcutsLabel={footerShortcutsLabel}
                    versionLabel={versionLabel}
                />
            </Box>
        </FullscreenContainer>
    );
}

// EOF
