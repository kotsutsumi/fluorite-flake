import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// 環境変数を扱うセクション。まだ取得できていない情報の placeholder を描画する。
export const EnvironmentSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* レイアウトは他セクションと揃え、統一感を保つ。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
