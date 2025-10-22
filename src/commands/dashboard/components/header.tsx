import { Box, Text } from "ink";
import type { JSX } from "react";

type HeaderProps = {
    title: string;
    activeServiceLabel: string;
    serviceName: string;
};

export function Header({ title, activeServiceLabel, serviceName }: HeaderProps): JSX.Element {
    return (
        <Box justifyContent="space-between">
            <Text color="cyanBright">{title}</Text>
            <Text>
                {activeServiceLabel}: <Text color="green">{serviceName}</Text>
            </Text>
        </Box>
    );
}

