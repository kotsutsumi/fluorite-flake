import type { JSX } from "react";
import { Box, Text } from "ink";

type FooterProps = {
    shortcutsLabel: string;
    versionLabel: string;
};

export function Footer({ shortcutsLabel, versionLabel }: FooterProps): JSX.Element {
    return (
        <Box marginTop={0} justifyContent="space-between">
            <Text dimColor>{shortcutsLabel}</Text>
            <Text dimColor>{versionLabel}</Text>
        </Box>
    );
}
