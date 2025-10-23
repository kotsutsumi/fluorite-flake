import { Box, Text } from "ink";

import type { TursoSectionComponent } from "./types.js";

// Turso のグループ管理に関する説明セクション。
export const GroupSection: TursoSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* シンプルな縦並びで見出しと補足テキストを描画する。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// EOF
