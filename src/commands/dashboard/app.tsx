import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Box } from "ink";

import packageJson from "../../../package.json";
import { getMessages } from "../../i18n.js";
import { Footer } from "./components/footer.js";
import { FullscreenContainer } from "./components/fullscreen-container.js";
import { Header } from "./components/header.js";
import { LogsService } from "./components/logs-service.js";
import { TursoService } from "./components/turso-service.js";
import { VercelService } from "./components/vercel-service.js";
import { useDashboard } from "./state/dashboard-store.js";
import { getPlaceholder } from "./utils/getPlaceholder.js";
import { getServiceLabel } from "./utils/getServiceLabel.js";
import { useDashboardShortcuts } from "./utils/useDashboardShortcuts.js";

// ダッシュボード全体の Ink レイアウトを組み立てるトップレベルコンポーネント。
export function DashboardApp(): JSX.Element {
    const { activeService } = useDashboard();
    const { dashboard } = getMessages();

    useDashboardShortcuts();

    // サービスごとのショートカット表記を参照しやすいようにマッピングしておく。
    const { vercel: vercelShortcuts, turso: tursoShortcuts, logs: logsShortcuts } = dashboard.footerShortcuts;

    const footerShortcutsMap = useMemo(
        () => ({
            vercel: vercelShortcuts,
            turso: tursoShortcuts,
            logs: logsShortcuts,
        }),
        [logsShortcuts, tursoShortcuts, vercelShortcuts]
    );

    // 初期値として現在のサービスに対応したショートカットラベルを設定する。
    const [footerShortcutsLabel, setFooterShortcutsLabel] = useState(() => footerShortcutsMap[activeService]);

    useEffect(() => {
        // フッターのショートカット表示はアクティブサービスの切り替えに追従させる。
        setFooterShortcutsLabel(footerShortcutsMap[activeService]);
    }, [activeService, footerShortcutsMap]);

    // メッセージ辞書からアクティブサービスの表示名を取り出す。
    const serviceLabel = useMemo(
        () => getServiceLabel(activeService, dashboard.services),
        [activeService, dashboard.services]
    );

    // サービスごとの説明プレースホルダーもキャッシュして渡す。
    const placeholder = useMemo(
        () => getPlaceholder(activeService, dashboard.placeholders),
        [activeService, dashboard.placeholders]
    );

    // パッケージのバージョンをローカライズされた表記に整形する。
    const versionLabel = dashboard.footerVersionLabel(packageJson.version);

    return (
        <FullscreenContainer>
            <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
                <Header
                    title={dashboard.headerTitle}
                    activeServiceLabel={dashboard.activeServiceLabel}
                    serviceName={serviceLabel}
                />

                <Box flexGrow={1}>
                    {activeService === "vercel" ? (
                        <VercelService
                            instructions={dashboard.instructions}
                            placeholder={placeholder}
                            defaultFooterLabel={vercelShortcuts}
                            onFooterChange={setFooterShortcutsLabel}
                        />
                    ) : activeService === "turso" ? (
                        <TursoService
                            instructions={dashboard.instructions}
                            placeholder={placeholder}
                            defaultFooterLabel={tursoShortcuts}
                            onFooterChange={setFooterShortcutsLabel}
                        />
                    ) : (
                        <LogsService
                            instructions={dashboard.logsInstructions}
                            placeholder={placeholder}
                            defaultFooterLabel={logsShortcuts}
                            onFooterChange={setFooterShortcutsLabel}
                        />
                    )}
                </Box>

                <Footer shortcutsLabel={footerShortcutsLabel} versionLabel={versionLabel} />
            </Box>
        </FullscreenContainer>
    );
}

// EOF
