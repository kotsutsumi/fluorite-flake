import { Box, Text } from "ink";

import type { TursoSectionComponent } from "./types.js";

// Turso 内でのログ出力方針を示すプレースホルダーセクション。
export const LogSection: TursoSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* ログ概要と補足情報を縦に並べて強調する。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
