import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

export const DomainSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        <Text color="cyanBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// EOF
