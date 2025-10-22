import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// カスタムドメイン周りの設定をガイドするセクション。
export const DomainSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* 単純な構造だが、色分けで情報を識別しやすくする。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
