import { Box, Text } from "ink";

import type { TursoSectionComponent } from "./types.js";

// Turso のデータベース設定を案内するセクション。
export const DatabaseSection: TursoSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* Ink で縦に並べ、見出しとプレースホルダーを分かりやすく配置する。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// EOF
