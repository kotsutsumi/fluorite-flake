import { Box, Text } from "ink";

import type { TursoSectionComponent } from "./types.js";

// データベースのロケーション関連設定をまとめたセクション。
export const LocationSection: TursoSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* 付随情報を段落として表示しやすいよう縦に配置する。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// EOF
