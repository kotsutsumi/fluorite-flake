import { Box, Text } from "ink";

import type { TursoSectionComponent } from "./types.js";

// 招待フローに関するチュートリアルを表示するセクション。
export const InviteSection: TursoSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* プレースホルダーがそのまま解説文になる想定。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// EOF
