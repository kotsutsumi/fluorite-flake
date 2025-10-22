import type { JSX } from "react";
import { Box, Text } from "ink";

type HeaderProps = {
    title: string;
    activeServiceLabel: string;
    serviceName: string;
};

export function Header({ title, activeServiceLabel, serviceName }: HeaderProps): JSX.Element {
    return (
        <Box justifyContent="space-between">
            <Text color="blackBright">🚀 {title}</Text>
            <Text color="blackBright">
                {activeServiceLabel}: <Text color="green">{serviceName}</Text>
            </Text>
        </Box>
    );
}
