import type { JSX } from "react";
import { Box, Text } from "ink";

type FooterProps = {
    text: string;
};

export function Footer({ text }: FooterProps): JSX.Element {
    return (
        <Box marginTop={0}>
            <Text dimColor>{text}</Text>
        </Box>
    );
}
