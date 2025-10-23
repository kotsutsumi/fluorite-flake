import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// ユーザーアカウントに関する情報をまとめるセクション。
export const UserSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* タイトルと本文をわかりやすく縦方向へ配置する。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// EOF
