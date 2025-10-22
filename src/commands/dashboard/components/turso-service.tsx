import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Box, Text, useInput } from "ink";

import { DatabaseSection } from "./turso/database.js";
import { GroupSection } from "./turso/group.js";
import { InviteSection } from "./turso/invite.js";
import { LocationSection } from "./turso/location.js";
import { LogSection } from "./turso/log.js";
import { MemberSection } from "./turso/member.js";
import { OrganizationSection } from "./turso/organization.js";
import type { TursoSectionComponent } from "./turso/types.js";

type ServiceProps = {
    instructions: readonly string[];
    placeholder: string;
    defaultFooterLabel: string;
    onFooterChange: (label: string) => void;
};

type MenuItem = {
    id: string;
    label: string;
    Component: TursoSectionComponent;
};

const MENU_ITEMS: readonly MenuItem[] = [
    { id: "database", label: "データベース", Component: DatabaseSection },
    { id: "group", label: "グループ", Component: GroupSection },
    { id: "location", label: "ロケーション", Component: LocationSection },
    { id: "organization", label: "組織", Component: OrganizationSection },
    { id: "member", label: "メンバー", Component: MemberSection },
    { id: "invite", label: "招待", Component: InviteSection },
    { id: "log", label: "ログ", Component: LogSection }
];

export function TursoService({ instructions, placeholder, defaultFooterLabel, onFooterChange }: ServiceProps): JSX.Element {
    const [activeIndex, setActiveIndex] = useState(0);

    const navigationFooter = useMemo(() => `${defaultFooterLabel}  j:↓  k:↑`, [defaultFooterLabel]);
    const activeItem = MENU_ITEMS[activeIndex];

    useInput((input, key) => {
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
        onFooterChange(`${navigationFooter}  • ${activeItem.label}`);
    }, [activeItem.label, navigationFooter, onFooterChange]);

    const ActiveSection = activeItem.Component;

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
