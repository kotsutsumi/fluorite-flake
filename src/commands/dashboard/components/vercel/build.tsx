import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// ビルド設定に関するプレースホルダーをまとめるセクション。
export const BuildSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* シンプルな段組でヘッダーと説明文を表示する。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
