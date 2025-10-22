import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// アクセス管理周りのヒントを表示する Vercel セクション。
export const AccessSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* 見出しとプレースホルダーを縦方向に整列して読みやすくする。 */}
        <Text color="cyanBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
