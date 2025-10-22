import type { JSX } from "react";
import { Box, Text } from "ink";

type ServiceProps = {
    instructions: readonly string[];
    placeholder: string;
};

export function TursoService({ instructions, placeholder }: ServiceProps): JSX.Element {
    return (
        <Box
            marginTop={0}
            borderStyle="classic"
            borderColor="gray"
            flexDirection="column"
            paddingX={1}
            paddingY={1}
            flexGrow={1}
        >
            <Text>{placeholder}</Text>
        </Box>
    );
}
