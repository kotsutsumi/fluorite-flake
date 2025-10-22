import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// プロジェクト管理に関連するヒントを表示するセクション。
export const ProjectSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* タイトルと説明文を縦方向に配置し、統一した UI を保つ。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// EOF
