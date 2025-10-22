import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// デプロイ関連のガイダンスを集約するセクション。
export const DeploySection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* タイトルと説明テキストを縦に並べてシンプルに提示する。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
