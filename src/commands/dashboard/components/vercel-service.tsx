import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Box, Text, useInput } from "ink";

import { AccessSection } from "./vercel/access.js";
import { BuildSection } from "./vercel/build.js";
import { DeploySection } from "./vercel/deploy.js";
import { DomainSection } from "./vercel/domain.js";
import { DnsSection } from "./vercel/dns.js";
import { EnvironmentSection } from "./vercel/environment.js";
import { MiscSection } from "./vercel/misc.js";
import { ProjectSection } from "./vercel/project.js";
import { SecretsSection } from "./vercel/secrets.js";
import { TeamSection } from "./vercel/team.js";
import { UserSection } from "./vercel/user.js";
import type { VercelSectionComponent } from "./vercel/types.js";

type ServiceProps = {
    instructions: readonly string[];
    placeholder: string;
    defaultFooterLabel: string;
    onFooterChange: (label: string) => void;
};

type MenuItem = {
    id: string;
    label: string;
    Component: VercelSectionComponent;
};

const MENU_ITEMS: readonly MenuItem[] = [
    { id: "project", label: "プロジェクト管理", Component: ProjectSection },
    { id: "domain", label: "ドメイン", Component: DomainSection },
    { id: "dns", label: "DNS管理", Component: DnsSection },
    { id: "deploy", label: "デプロイ", Component: DeploySection },
    { id: "build", label: "ビルド管理", Component: BuildSection },
    { id: "environment", label: "環境変数", Component: EnvironmentSection },
    { id: "secrets", label: "シークレット管理", Component: SecretsSection },
    { id: "team", label: "チーム", Component: TeamSection },
    { id: "user", label: "ユーザー", Component: UserSection },
    { id: "access", label: "アクセス管理", Component: AccessSection },
    { id: "misc", label: "その他", Component: MiscSection }
];

export function VercelService({ instructions, placeholder, defaultFooterLabel, onFooterChange }: ServiceProps): JSX.Element {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isInitializing] = useState(true);

    const navigationFooter = useMemo(() => `${defaultFooterLabel}  j:↓  k:↑`, [defaultFooterLabel]);
    const activeItem = MENU_ITEMS[activeIndex];

    useInput((input, key) => {
        if (isInitializing) {
            return;
        }

        if (MENU_ITEMS.length === 0) {
            return;
        }

        if (input?.toLowerCase() === "j" || key.downArrow) {
            setActiveIndex((current) => (current + 1) % MENU_ITEMS.length);
            return;
        }

        if (input?.toLowerCase() === "k" || key.upArrow) {
            setActiveIndex((current) => (current - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
        }
    });

    useEffect(() => {
        if (isInitializing) {
            onFooterChange(`${defaultFooterLabel}  • 初期化中`);
            return;
        }

        onFooterChange(`${navigationFooter}  • ${activeItem.label}`);
    }, [activeItem.label, defaultFooterLabel, isInitializing, navigationFooter, onFooterChange]);

    const ActiveSection = activeItem.Component;

    if (isInitializing) {
        return (
            <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0} justifyContent="center" alignItems="center">
                <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={3} paddingY={2} minWidth={30}>
                    <Text color="cyanBright">Vercel</Text>
                    <Box marginTop={1}>
                        <Text>初期化処理をここに実装予定...</Text>
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            <Box marginBottom={1} flexDirection="column">
                {instructions.map((line) => (
                    <Text key={line} dimColor>
                        {line}
                    </Text>
                ))}
            </Box>

            <Box flexDirection="row" flexGrow={1}>
                <Box
                    width={24}
                    borderStyle="classic"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                    paddingY={1}
                >
                    {MENU_ITEMS.map((item, index) => {
                        const isActive = index === activeIndex;
                        return (
                            <Text key={item.id} color={isActive ? "cyanBright" : undefined}>
                                {isActive ? "▸ " : "  "}
                                {item.label}
                            </Text>
                        );
                    })}
                </Box>

                <Box
                    marginLeft={1}
                    borderStyle="classic"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                    paddingY={1}
                    flexGrow={1}
                >
                    <ActiveSection sectionLabel={activeItem.label} placeholder={placeholder} />
                </Box>
            </Box>
        </Box>
    );
}
