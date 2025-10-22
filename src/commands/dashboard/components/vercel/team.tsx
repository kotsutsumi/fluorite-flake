import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// チーム管理用のガイドを表示するセクション。
export const TeamSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* 最低限の UI でも情報が伝わるよう統一フォーマットにする。 */}
        <Text color="cyanBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
