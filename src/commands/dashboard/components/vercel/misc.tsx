import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// その他の情報を集約する汎用セクション。
export const MiscSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* 追加情報が無い場合はプレースホルダー文言のみを表示する。 */}
        <Text color="cyanBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
