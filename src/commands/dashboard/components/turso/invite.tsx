import { Box, Text } from "ink";

import type { TursoSectionComponent } from "./types.js";

export const InviteSection: TursoSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        <Text color="cyanBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

